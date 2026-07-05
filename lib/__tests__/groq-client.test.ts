/**
 * Testes do cliente Groq: modelo migrado (openai/gpt-oss-120b), envio de
 * reasoning_effort por etapa e retry determinístico no 524 (timeout do
 * Cloudflare da Groq, registrado em produção em 04/07/2026).
 */
import { chamarGroq } from '../groq-client';

function respostaOk(texto: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: texto }, finish_reason: 'stop' }] }),
    text: async () => '',
  } as unknown as Response;
}

function respostaErro(status: number) {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => `erro ${status}`,
  } as unknown as Response;
}

describe('chamarGroq', () => {
  const fetchOriginal = global.fetch;

  beforeEach(() => {
    process.env.GROQ_API_KEY = 'chave-de-teste';
  });

  afterEach(() => {
    global.fetch = fetchOriginal;
    jest.useRealTimers();
  });

  it('usa o modelo openai/gpt-oss-120b e envia reasoning_effort', async () => {
    let corpo: Record<string, unknown> = {};
    global.fetch = jest.fn(async (_url: unknown, init?: RequestInit) => {
      corpo = JSON.parse(init?.body as string);
      return respostaOk('ok');
    }) as unknown as typeof fetch;

    const texto = await chamarGroq('sys', 'user', { json: false, reasoningEffort: 'low' });

    expect(texto).toBe('ok');
    expect(corpo.model).toBe('openai/gpt-oss-120b');
    expect(corpo.reasoning_effort).toBe('low');
    expect(corpo.response_format).toBeUndefined();
  });

  it('omite reasoning_effort quando não configurado (rotas fora do plantão)', async () => {
    let corpo: Record<string, unknown> = {};
    global.fetch = jest.fn(async (_url: unknown, init?: RequestInit) => {
      corpo = JSON.parse(init?.body as string);
      return respostaOk('{"a":1}');
    }) as unknown as typeof fetch;

    await chamarGroq('sys', 'user');
    expect(corpo.reasoning_effort).toBeUndefined();
    expect(corpo.response_format).toEqual({ type: 'json_object' });
  });

  it('retenta após 524 e devolve o texto na tentativa seguinte', async () => {
    jest.useFakeTimers();
    const mock = jest
      .fn()
      .mockResolvedValueOnce(respostaErro(524))
      .mockResolvedValueOnce(respostaOk('recuperado'));
    global.fetch = mock as unknown as typeof fetch;

    const promessa = chamarGroq('sys', 'user', { json: false });
    await jest.advanceTimersByTimeAsync(1000); // backoff da 1ª tentativa
    await expect(promessa).resolves.toBe('recuperado');
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('erro não retryável (ex: 413) falha imediatamente', async () => {
    const mock = jest.fn().mockResolvedValue(respostaErro(413));
    global.fetch = mock as unknown as typeof fetch;

    await expect(chamarGroq('sys', 'user', { json: false })).rejects.toThrow('Groq falhou (413)');
    expect(mock).toHaveBeenCalledTimes(1);
  });
});
