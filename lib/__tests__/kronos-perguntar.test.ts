/**
 * Testes do endpoint /api/kronos/perguntar (Response Engine mínimo).
 * Sem lib de mock HTTP no projeto — req/res são objetos mínimos que
 * satisfazem só o que o handler usa (padrão consistente com o resto do
 * repo, que também não usa node-mocks-http/supertest).
 */
import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('../auth-server');
jest.mock('../rate-limit', () => ({
  dentroDoRateLimit: jest.fn(),
  LIMITE_PROFESSOR: { limite: 20, janelaSegundos: 600 },
  MSG_RATE_LIMIT: 'rate limit atingido',
}));
jest.mock('../knowledge-retrieval', () => ({
  buscarFragmentos: jest.fn(),
}));

import handler from '../../pages/api/kronos/perguntar';
import { getUsuarioAutenticado } from '../auth-server';
import { dentroDoRateLimit } from '../rate-limit';
import { buscarFragmentos, type FragmentoEncontrado } from '../knowledge-retrieval';

const mockGetUsuario = getUsuarioAutenticado as jest.Mock;
const mockRateLimit = dentroDoRateLimit as jest.Mock;
const mockBuscarFragmentos = buscarFragmentos as jest.Mock;

function fragmento(overrides: Partial<FragmentoEncontrado> = {}): FragmentoEncontrado {
  return {
    fragmento_id: 'f1',
    documento_id: 'd1',
    nome_arquivo: 'processo_de_enfermagem.pdf',
    tipo_documento: 'Guia',
    instituicao: 'COREN-SP',
    versao: null,
    ano_publicacao: null,
    descricao: null,
    numero_sequencia: 1,
    pagina_inicio: 12,
    pagina_fim: 12,
    conteudo: 'trecho de exemplo',
    similarity: 0.8,
    ...overrides,
  };
}

function criarReqRes(body: unknown) {
  const req = { method: 'POST', body } as unknown as NextApiRequest;
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status } as unknown as NextApiResponse;
  return { req, res, status, json };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUsuario.mockResolvedValue({ id: 'u1', email: 'ana@ex.com', nome: 'Ana' });
  mockRateLimit.mockResolvedValue(true);
});

describe('POST /api/kronos/perguntar', () => {
  test('401 sem usuário autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null);
    const { req, res, status } = criarReqRes({ pergunta: 'oi' });

    await handler(req, res);

    expect(status).toHaveBeenCalledWith(401);
  });

  test('429 acima do rate limit', async () => {
    mockRateLimit.mockResolvedValue(false);
    const { req, res, status } = criarReqRes({ pergunta: 'oi' });

    await handler(req, res);

    expect(status).toHaveBeenCalledWith(429);
  });

  test('400 sem campo pergunta', async () => {
    const { req, res, status } = criarReqRes({});

    await handler(req, res);

    expect(status).toHaveBeenCalledWith(400);
  });

  test('sem fragmento acima do limiar → 200 com aviso, nunca inventa conteúdo', async () => {
    mockBuscarFragmentos.mockResolvedValue([]);
    const { req, res, status, json } = criarReqRes({ pergunta: 'como fazer X?' });

    await handler(req, res);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ resposta: null, motivo: expect.any(String) })
    );
  });

  test('fragmentos válidos → 200 com evidências citáveis e página formatada', async () => {
    mockBuscarFragmentos.mockResolvedValue([
      fragmento({ pagina_inicio: 12, pagina_fim: 13 }),
      fragmento({ fragmento_id: 'f2', pagina_inicio: null, pagina_fim: null }),
    ]);
    const { req, res, status, json } = criarReqRes({ pergunta: 'como puncionar fístula?' });

    await handler(req, res);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      resposta: {
        evidencias: [
          expect.objectContaining({ documento: 'processo_de_enfermagem.pdf', pagina: '12-13' }),
          expect.objectContaining({ pagina: null }),
        ],
      },
    });
  });
});
