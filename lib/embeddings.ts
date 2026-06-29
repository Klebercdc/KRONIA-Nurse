/**
 * Geração de embeddings via Cohere embed-multilingual-v3.0 (1024 dims).
 * Suporta português nativamente. Free tier: 100 req/min.
 * Importar apenas em pages/api/**.
 */

const COHERE_EMBED_URL = 'https://api.cohere.com/v2/embed';
const EMBED_MODEL = 'embed-multilingual-v3.0';

export async function gerarEmbedding(
  texto: string,
  tipo: 'search_document' | 'search_query' = 'search_query'
): Promise<number[]> {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) throw new Error('COHERE_API_KEY não configurada no ambiente do servidor.');

  const resp = await fetch(COHERE_EMBED_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      texts: [texto],
      input_type: tipo,
      embedding_types: ['float'],
    }),
  });

  if (!resp.ok) {
    const corpo = await resp.text().catch(() => '');
    throw new Error(`Cohere Embeddings falhou (${resp.status}): ${corpo}`);
  }

  const data = await resp.json();
  const vetor = data?.embeddings?.float?.[0];
  if (!Array.isArray(vetor)) throw new Error('Resposta de embedding inválida.');
  return vetor as number[];
}

/** Formata o texto para embedding: título + resumo + conteúdo (sem referências). */
export function textoParaEmbedding(titulo: string, resumo: string, conteudo: string): string {
  return [titulo, resumo, conteudo].filter(Boolean).join('\n\n');
}
