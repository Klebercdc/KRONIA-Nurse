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
const MAX_TENTATIVAS_429 = 4;

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function chamarGroq(
  system: string,
  content: string,
  opcoes?: { json?: boolean }
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY não configurada no ambiente do servidor.');

  const usarJson = opcoes?.json ?? true;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_429; tentativa++) {
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
        max_tokens: 4096,
        ...(usarJson ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (resp.status === 429 && tentativa < MAX_TENTATIVAS_429) {
      const corpo = await resp.text().catch(() => '');
      const espera = extrairEsperaSugerida(corpo) ?? 1000 * tentativa;
      await esperar(espera);
      continue;
    }

    if (!resp.ok) {
      const corpo = await resp.text().catch(() => '');
      throw new Error(`Groq falhou (${resp.status}): ${corpo}`);
    }

    const data = await resp.json();
    const escolha = data?.choices?.[0];
    const texto = escolha?.message?.content?.trim();
    if (!texto) throw new Error('Resposta vazia da Groq.');
    if (escolha?.finish_reason === 'length') {
      throw new Error('Resposta da Groq truncada por limite de max_tokens.');
    }
    return texto;
  }

  throw new Error('Groq falhou: limite de tentativas por rate limit (429) excedido.');
}

/** Lê "Please try again in 495ms"/"in 1.2s" da mensagem de erro 429 da Groq. */
function extrairEsperaSugerida(corpoErro: string): number | null {
  const match = corpoErro.match(/try again in ([\d.]+)(ms|s)/i);
  if (!match) return null;
  const valor = parseFloat(match[1]);
  return match[2].toLowerCase() === 's' ? valor * 1000 : valor;
}

/** Extrai um array JSON da resposta, tolerando blocos ```json acidentais. */
export function extrairJson<T>(texto: string): T {
  const limpo = texto.replace(/^```json\s*|```\s*$/g, '').trim();
  return JSON.parse(limpo) as T;
}
