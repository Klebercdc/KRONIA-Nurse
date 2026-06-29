/**
 * Geração de embeddings via OpenAI text-embedding-3-small (1536 dims).
 * Groq não oferece endpoint de embeddings — provider separado obrigatório.
 * Importar apenas em pages/api/**.
 */

const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings';
const EMBED_MODEL = 'text-embedding-3-small';

export async function gerarEmbedding(texto: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada no ambiente do servidor.');

  const resp = await fetch(OPENAI_EMBED_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: texto }),
  });

  if (!resp.ok) {
    const corpo = await resp.text().catch(() => '');
    throw new Error(`OpenAI Embeddings falhou (${resp.status}): ${corpo}`);
  }

  const data = await resp.json();
  const vetor = data?.data?.[0]?.embedding;
  if (!Array.isArray(vetor)) throw new Error('Resposta de embedding inválida.');
  return vetor as number[];
}

/** Formata o texto para embedding: título + resumo + conteúdo (sem referências). */
export function textoParaEmbedding(titulo: string, resumo: string, conteudo: string): string {
  return [titulo, resumo, conteudo].filter(Boolean).join('\n\n');
}
