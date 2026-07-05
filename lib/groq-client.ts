/**
 * Cliente fino para a Groq API. No protótipo (artifact da Claude) as
 * chamadas iam para a Anthropic; aqui usam a stack que o KRONIA já tem
 * em produção. Mesmo contrato: system + conteúdo do usuário -> texto.
 *
 * O modelo é configurável via GROQ_MODEL (documentado no README). O default
 * é 'openai/gpt-oss-120b' — substituto indicado pela Groq para o
 * 'llama-3.3-70b-versatile', descontinuado em 16/08/2026.
 *
 * IMPORTANTE: GROQ_API_KEY só existe no servidor. Este módulo só deve ser
 * importado por código que roda em pages/api/** (nunca em componente client).
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODELO = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
// O tier on_demand da Groq limita TPM por modelo e conta max_tokens no
// tamanho da requisição: prompt + max_tokens acima do limite (8000 para o
// gpt-oss-120b) é rejeitado com 413 antes de gerar qualquer coisa. 4096
// deixa folga para o prompt; ajustável sem deploy via GROQ_MAX_TOKENS.
const MAX_TOKENS = Number(process.env.GROQ_MAX_TOKENS) || 4096;
const MAX_TENTATIVAS = 4;
// Timeout por tentativa. O 524 visto em produção (04/07) é o Cloudflare na
// frente da Groq desistindo aos ~100s — desistir antes, por conta própria,
// permite retentar dentro da mesma requisição em vez de estourar a rota.
const TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS) || 60000;
const MAX_TENTATIVAS_TIMEOUT = 2;
// Indisponibilidade transitória: 502/503/504 do upstream e 524 (timeout do
// Cloudflare da Groq, registrado em produção em 04/07/2026).
const STATUS_RETRYAVEL = new Set([502, 503, 504, 524]);

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Esforço de raciocínio do gpt-oss-120b: 'low' nas etapas rápidas
 * (organizar-registro, reclassificar), 'medium' na geração final
 * (evolução, relatório), onde a precisão clínica importa mais.
 */
export type ReasoningEffort = 'low' | 'medium' | 'high';

export async function chamarGroq(
  system: string,
  content: string,
  opcoes?: { json?: boolean; reasoningEffort?: ReasoningEffort }
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY não configurada no ambiente do servidor.');

  const usarJson = opcoes?.json ?? true;
  let timeouts = 0;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let resp: Response;
    try {
      resp = await fetch(GROQ_URL, {
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
          max_tokens: MAX_TOKENS,
          ...(opcoes?.reasoningEffort ? { reasoning_effort: opcoes.reasoningEffort } : {}),
          ...(usarJson ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timer);
      if (!(e instanceof Error && e.name === 'AbortError')) throw e;
      timeouts++;
      if (timeouts >= MAX_TENTATIVAS_TIMEOUT || tentativa === MAX_TENTATIVAS) {
        throw new Error(`Groq não respondeu em ${TIMEOUT_MS}ms (tentativa ${tentativa}).`);
      }
      continue; // sem backoff: o próprio timeout já foi a espera
    }
    clearTimeout(timer);

    if (resp.status === 429 && tentativa < MAX_TENTATIVAS) {
      const corpo = await resp.text().catch(() => '');
      const espera = extrairEsperaSugerida(corpo) ?? 1000 * tentativa;
      await esperar(espera);
      continue;
    }

    if (STATUS_RETRYAVEL.has(resp.status) && tentativa < MAX_TENTATIVAS) {
      await resp.text().catch(() => '');
      await esperar(1000 * 2 ** (tentativa - 1)); // 1s, 2s, 4s
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

  throw new Error('Groq falhou: limite de tentativas excedido (rate limit ou indisponibilidade).');
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
