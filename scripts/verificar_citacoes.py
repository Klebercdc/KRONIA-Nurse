#!/usr/bin/env python3
"""
Verifica, mecanicamente, se cada citacao de um rascunho de knowledge_specs
e real: para cada referencias_oficiais[i] com fragmento_id, confere se
trecho_citado (ou "trecho") e substring OU >=90% similar (difflib) do
conteudo real da linha em conhecimento_fragmentos.

Uso:
  python verificar_citacoes.py --rascunho rascunho_ASSUNTO.json

O rascunho e um JSON com pelo menos:
{
  "titulo": "...",
  "referencias_oficiais": [
    {"fragmento_id": "<uuid>", "documento": "...", "pagina": 12,
     "trecho_citado": "<copia literal>"}
  ]
}

Precisa de DATABASE_URL (connection string do Postgres do projeto Supabase)
no ambiente. Sem isso o script nao roda -- nao ha fallback silencioso.

Saida: JSON no stdout com status "aprovado" ou "reprovado" e o motivo de
cada citacao reprovada. Exit code 1 se reprovado, 0 se aprovado.
"""
import argparse
import json
import os
import sys
from difflib import SequenceMatcher

SIMILARITY_THRESHOLD = 0.90


def similaridade(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


def carregar_conteudo_fragmento(cur, fragmento_id: str):
    cur.execute(
        "SELECT conteudo, documento_id, pagina_inicio, pagina_fim "
        "FROM conhecimento_fragmentos WHERE id = %s",
        (fragmento_id,),
    )
    return cur.fetchone()


def verificar_referencia(cur, ref: dict, indice: int) -> dict:
    fragmento_id = ref.get("fragmento_id")
    trecho = ref.get("trecho_citado") or ref.get("trecho")

    if not fragmento_id:
        return {
            "indice": indice,
            "ok": False,
            "motivo": "sem fragmento_id -- referencia nao rastreavel, tratar como nao confirmada",
        }
    if not trecho or not trecho.strip():
        return {
            "indice": indice,
            "ok": False,
            "motivo": "fragmento_id presente mas trecho_citado vazio",
        }

    linha = carregar_conteudo_fragmento(cur, fragmento_id)
    if linha is None:
        return {
            "indice": indice,
            "ok": False,
            "motivo": f"fragmento_id {fragmento_id} nao existe em conhecimento_fragmentos -- referencia inventada",
        }

    conteudo_real = linha[0] or ""
    is_substring = trecho.strip() in conteudo_real
    sim = similaridade(trecho.strip(), conteudo_real)

    if is_substring or sim >= SIMILARITY_THRESHOLD:
        return {
            "indice": indice,
            "ok": True,
            "fragmento_id": fragmento_id,
            "substring": is_substring,
            "similaridade": round(sim, 4),
        }

    return {
        "indice": indice,
        "ok": False,
        "fragmento_id": fragmento_id,
        "similaridade": round(sim, 4),
        "motivo": (
            f"trecho_citado nao e substring nem >={SIMILARITY_THRESHOLD:.0%} "
            f"similar ao conteudo real do fragmento (similaridade {sim:.2%})"
        ),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rascunho", required=True, help="Caminho do JSON do rascunho")
    args = parser.parse_args()

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print(json.dumps({
            "status": "erro",
            "motivo": "DATABASE_URL nao configurada -- sem isso o script nao consegue "
                      "confirmar nenhuma citacao contra o banco real. Nao ha modo offline: "
                      "citacao nao verificada contra o dado real e exatamente o problema "
                      "que este script existe para prevenir.",
        }, ensure_ascii=False, indent=2))
        sys.exit(2)

    import psycopg2  # import tardio: falha cedo e com mensagem clara se faltar DATABASE_URL

    with open(args.rascunho, encoding="utf-8") as f:
        rascunho = json.load(f)

    referencias = rascunho.get("referencias_oficiais", [])
    if not referencias:
        print(json.dumps({
            "status": "reprovado",
            "motivo": "rascunho nao tem nenhuma referencias_oficiais -- nada para verificar",
        }, ensure_ascii=False, indent=2))
        sys.exit(1)

    conn = psycopg2.connect(database_url)
    resultados = []
    try:
        with conn.cursor() as cur:
            for i, ref in enumerate(referencias):
                resultados.append(verificar_referencia(cur, ref, i))
    finally:
        conn.close()

    aprovadas = [r for r in resultados if r["ok"]]
    reprovadas = [r for r in resultados if not r["ok"]]

    saida = {
        "status": "reprovado" if reprovadas else "aprovado",
        "titulo": rascunho.get("titulo"),
        "total_referencias": len(referencias),
        "aprovadas": len(aprovadas),
        "reprovadas": len(reprovadas),
        "detalhe_reprovadas": reprovadas,
    }
    print(json.dumps(saida, ensure_ascii=False, indent=2))
    sys.exit(1 if reprovadas else 0)


if __name__ == "__main__":
    main()
