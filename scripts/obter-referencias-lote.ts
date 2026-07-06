/**
 * Busca as referências reais (Retrieval + Validation Engine, só Cohere +
 * Supabase — SEM Groq) para uma lista de temas, e grava o resultado em JSON
 * pra consumo manual (Redator/Auditores feitos por um humano ou pelo agente,
 * sem chamada de LLM automatizada nesta etapa).
 *
 * Uso:
 *   npx tsx scripts/obter-referencias-lote.ts <temas.json> <saida.json>
 */
import fs from 'fs';
import { buscarFragmentos } from '../lib/knowledge-retrieval';
import { validarFragmentos, temPaginaRastreavel, formatarPagina } from '../lib/kronos-validation';
import type { ReferenciaOficial } from '../lib/knowledge-spec';

const MATCH_COUNT = 5;

async function main() {
  const [arquivoTemas, arquivoSaida] = process.argv.slice(2);
  if (!arquivoTemas || !arquivoSaida) {
    throw new Error('Uso: obter-referencias-lote.ts <temas.json> <saida.json>');
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configuradas.');
  }
  if (!process.env.COHERE_API_KEY) throw new Error('COHERE_API_KEY não configurada.');

  const temas: string[] = JSON.parse(fs.readFileSync(arquivoTemas, 'utf8'));
  const resultado: Array<{ tema: string; referencias: ReferenciaOficial[]; semFontesSuficientes: boolean }> = [];

  for (const [idx, tema] of temas.entries()) {
    console.log(`[${idx + 1}/${temas.length}] ${tema}`);
    const fragmentos = await buscarFragmentos(tema, { matchCount: MATCH_COUNT });
    const validacao = validarFragmentos(fragmentos);

    if (!validacao.valido) {
      resultado.push({ tema, referencias: [], semFontesSuficientes: true });
      console.log('  sem referências suficientes');
      continue;
    }

    const referencias: ReferenciaOficial[] = validacao.fragmentosValidos.map((f) => ({
      instituicao: f.instituicao,
      documento: f.nome_arquivo,
      ano: f.ano_publicacao != null ? String(f.ano_publicacao) : undefined,
      versao: f.versao ?? undefined,
      pagina: temPaginaRastreavel(f) ? (formatarPagina(f.pagina_inicio, f.pagina_fim) ?? undefined) : undefined,
      trecho: f.conteudo,
    }));

    resultado.push({ tema, referencias, semFontesSuficientes: referencias.length < 2 });
    console.log(`  ${referencias.length} referências`);
  }

  fs.writeFileSync(arquivoSaida, JSON.stringify(resultado, null, 2));
  console.log(`\n✓ Gravado em ${arquivoSaida}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
