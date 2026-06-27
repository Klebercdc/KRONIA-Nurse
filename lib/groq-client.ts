/**
 * Cliente fino para a Groq API (Llama 3.3 70B). No protótipo (artifact da
 * Claude) as chamadas iam para a Anthropic; aqui usam a stack que o KRONIA
 * já tem em produção. Mesmo contrato: system + conteúdo do usuário -> texto.
 *
 * IMPORTANTE: GROQ_API_KEY só existe no servidor. Este módulo só deve ser
 * importado por código que roda em pages/api/** (nunca em componente client).
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODELO = 'llama-3.3-70b-versatile';

export async function chamarGroq(system: string, content: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY não configurada no ambiente do servidor.');

  const resp = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODELO,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content },
      ],
      temperature: 0.2,
    }),
  });

  if (!resp.ok) {
    const corpo = await resp.text().catch(() => '');
    throw new Error(`Groq falhou (${resp.status}): ${corpo}`);
  }

  const data = await resp.json();
  const texto = data?.choices?.[0]?.message?.content?.trim();
  if (!texto) throw new Error('Resposta vazia da Groq.');
  return texto;
}

/** Extrai um array JSON da resposta, tolerando blocos ```json acidentais. */
export function extrairJson<T>(texto: string): T {
  const limpo = texto.replace(/^```json\s*|```\s*$/g, '').trim();
  return JSON.parse(limpo) as T;
}
