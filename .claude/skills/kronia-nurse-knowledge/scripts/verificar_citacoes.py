#!/usr/bin/env python3
"""
verificar_citacoes.py

Confere, para um rascunho de knowledge_specs gerado pelo Claude Code, se cada
citação em `referencias_oficiais` de fato existe no texto-fonte
(conhecimento_fragmentos.conteudo) no Supabase. Nunca confia em citação que
não passe nessa checagem.

Uso:
    python verificar_citacoes.py --rascunho rascunho_punc_fav.json

Requer:
    pip install supabase --break-system-packages
    export SUPABASE_URL=...
    export SUPABASE_SERVICE_ROLE_KEY=...   # mesmas variáveis de scripts/rag-pipeline.js

Formato esperado do rascunho (json) — segue ReferenciaOficial de
lib/knowledge-spec.ts:
{
  "titulo": "...",
  "categoria": "...",
  ... (demais campos do knowledge_specs) ...,
  "referencias_oficiais": [
    {
      "fragmento_id": "uuid",
      "documento": "nome_arquivo.pdf",
      "pagina": "12",
      "trecho": "texto copiado literalmente do fragmento"
    }
  ]
}

Aceita também a chave legada "trecho_citado" no lugar de "trecho", pra
compatibilidade com rascunhos gerados antes desta versão do script.
"""

import argparse
import json
import os
import sys
import unicodedata
from difflib import SequenceMatcher

try:
    from supabase import create_client
except ImportError:
    print("Instale a lib: pip install supabase --break-system-packages", file=sys.stderr)
    sys.exit(2)

LIMIAR_SIMILARIDADE = 0.90  # 90% — cópia literal com pequenas variações de espaço/acentuação


def normalizar(texto: str) -> str:
    """Remove acentuação/caixa/espacos redundantes só para comparar, nunca para gravar."""
    if not texto:
        return ""
    texto = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")
    return " ".join(texto.lower().split())


def similaridade(a: str, b: str) -> float:
    return SequenceMatcher(None, normalizar(a), normalizar(b)).ratio()


def contem_como_substring(trecho: str, conteudo_real: str) -> bool:
    return normalizar(trecho) in normalizar(conteudo_real)


def carregar_supabase():
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print(
            "Defina SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) e "
            "SUPABASE_SERVICE_ROLE_KEY no ambiente.",
            file=sys.stderr,
        )
        sys.exit(2)
    return create_client(url, key)


def buscar_fragmento(supabase, fragmento_id: str):
    resp = (
        supabase.table("conhecimento_fragmentos")
        .select("id, conteudo, documento_id, pagina_inicio, pagina_fim")
        .eq("id", fragmento_id)
        .limit(1)
        .execute()
    )
    if not resp.data:
        return None
    return resp.data[0]


def verificar_rascunho(caminho_json: str) -> dict:
    with open(caminho_json, encoding="utf-8") as f:
        rascunho = json.load(f)

    referencias = rascunho.get("referencias_oficiais", [])
    if not referencias:
        return {
            "status": "sem_referencias",
            "total_citacoes": 0,
            "aprovadas": 0,
            "reprovadas": 0,
            "detalhes": [],
            "rascunho_ajustado": rascunho,
        }

    supabase = carregar_supabase()
    detalhes = []
    aprovadas = []

    for ref in referencias:
        fragmento_id = ref.get("fragmento_id")
        trecho = ref.get("trecho") or ref.get("trecho_citado", "")

        if not fragmento_id:
            detalhes.append({
                "trecho": trecho[:80],
                "resultado": "REPROVADA",
                "motivo": "sem fragmento_id — citação não rastreável a nenhuma fonte",
            })
            continue

        fragmento = buscar_fragmento(supabase, fragmento_id)
        if fragmento is None:
            detalhes.append({
                "fragmento_id": fragmento_id,
                "trecho": trecho[:80],
                "resultado": "REPROVADA",
                "motivo": "fragmento_id não existe em conhecimento_fragmentos — provável alucinação",
            })
            continue

        conteudo_real = fragmento["conteudo"]
        if contem_como_substring(trecho, conteudo_real):
            detalhes.append({
                "fragmento_id": fragmento_id,
                "trecho": trecho[:80],
                "resultado": "APROVADA",
                "motivo": "substring exata (normalizada) encontrada no fragmento",
            })
            aprovadas.append(ref)
            continue

        score = similaridade(trecho, conteudo_real)
        if score >= LIMIAR_SIMILARIDADE:
            detalhes.append({
                "fragmento_id": fragmento_id,
                "trecho": trecho[:80],
                "resultado": "APROVADA",
                "motivo": f"similaridade {score:.0%} >= limiar {LIMIAR_SIMILARIDADE:.0%}",
            })
            aprovadas.append(ref)
        else:
            detalhes.append({
                "fragmento_id": fragmento_id,
                "trecho": trecho[:80],
                "resultado": "REPROVADA",
                "motivo": f"similaridade {score:.0%} < limiar {LIMIAR_SIMILARIDADE:.0%} — texto não bate com a fonte",
            })

    total = len(referencias)
    n_aprovadas = len(aprovadas)
    n_reprovadas = total - n_aprovadas

    rascunho_ajustado = dict(rascunho)
    rascunho_ajustado["referencias_oficiais"] = aprovadas
    rascunho_ajustado.setdefault("pontos_criticos", "")
    if n_reprovadas:
        nota = f"\n[auto-verificação] {n_reprovadas} citação(ões) removida(s) por falha na checagem contra a fonte — ver log de verificação."
        rascunho_ajustado["pontos_criticos"] = (rascunho_ajustado["pontos_criticos"] or "") + nota

    status = "aprovado" if n_reprovadas == 0 else ("reprovado" if n_aprovadas == 0 else "parcial")

    return {
        "status": status,
        "total_citacoes": total,
        "aprovadas": n_aprovadas,
        "reprovadas": n_reprovadas,
        "detalhes": detalhes,
        "rascunho_ajustado": rascunho_ajustado,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rascunho", required=True, help="Caminho do JSON do rascunho gerado pelo Claude Code")
    parser.add_argument("--saida", default=None, help="Onde salvar o rascunho ajustado (default: <rascunho>.verificado.json)")
    args = parser.parse_args()

    resultado = verificar_rascunho(args.rascunho)

    print(json.dumps({
        "status": resultado["status"],
        "total_citacoes": resultado["total_citacoes"],
        "aprovadas": resultado["aprovadas"],
        "reprovadas": resultado["reprovadas"],
        "detalhes": resultado["detalhes"],
    }, ensure_ascii=False, indent=2))

    saida = args.saida or args.rascunho.replace(".json", ".verificado.json")
    with open(saida, "w", encoding="utf-8") as f:
        json.dump(resultado["rascunho_ajustado"], f, ensure_ascii=False, indent=2)
    print(f"\nRascunho ajustado salvo em: {saida}", file=sys.stderr)

    # Exit code != 0 se reprovado totalmente, pra travar pipeline/CI se for o caso
    if resultado["status"] == "reprovado":
        sys.exit(1)


if __name__ == "__main__":
    main()
