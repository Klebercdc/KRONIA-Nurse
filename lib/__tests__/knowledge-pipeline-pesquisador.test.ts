/**
 * Testes da Etapa 1 (Pesquisador) reescrita para buscar nos documentos
 * indexados via RAG em vez de recall do LLM — só a classificação
 * (categoria/subcategoria) ainda usa Groq; as referências vêm de
 * fragmentos reais.
 */
jest.mock('../knowledge-retrieval', () => ({ buscarFragmentos: jest.fn() }));
jest.mock('../groq-client', () => ({ chamarGroq: jest.fn(), extrairJson: jest.fn() }));

import { pesquisarFontes } from '../knowledge-pipeline';
import { buscarFragmentos, type FragmentoEncontrado } from '../knowledge-retrieval';
import { chamarGroq, extrairJson } from '../groq-client';

const mockBuscarFragmentos = buscarFragmentos as jest.Mock;
const mockChamarGroq = chamarGroq as jest.Mock;
const mockExtrairJson = extrairJson as jest.Mock;

const DOMINIOS = ['Fundamentos de Enfermagem', 'Punção Venosa'] as const;

function fragmento(overrides: Partial<FragmentoEncontrado> = {}): FragmentoEncontrado {
  return {
    fragmento_id: 'f1',
    documento_id: 'd1',
    nome_arquivo: 'NANDA-I-2018_2020.pdf',
    tipo_documento: 'Taxonomia',
    instituicao: 'NANDA International',
    versao: '2018-2020 (11ª edição)',
    ano_publicacao: 2018,
    descricao: null,
    numero_sequencia: 1,
    pagina_inicio: 89,
    pagina_fim: 89,
    conteudo: 'Características definidoras são indicadores observáveis...',
    similarity: 0.81,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('pesquisarFontes (grounded em RAG)', () => {
  test('sem fragmentos acima do limiar → referencias vazias, nunca chama Groq pra inventar fonte', async () => {
    mockBuscarFragmentos.mockResolvedValue([]);

    const resultado = await pesquisarFontes('tema inexistente na base', DOMINIOS);

    expect(resultado.referencias).toEqual([]);
    expect(resultado.observacao).toMatch(/Nenhuma fonte indexada/);
    expect(resultado.categoria).toBe(DOMINIOS[0]);
    expect(mockChamarGroq).not.toHaveBeenCalled();
  });

  test('com fragmentos válidos, monta referências reais (trecho, página, instituição) e classifica via Groq', async () => {
    mockBuscarFragmentos.mockResolvedValue([
      fragmento(),
      fragmento({ fragmento_id: 'f2', pagina_inicio: 90, pagina_fim: 90, similarity: 0.79 }),
    ]);
    mockChamarGroq.mockResolvedValue('{"categoria":"Fundamentos de Enfermagem","subcategoria":"Diagnóstico"}');
    mockExtrairJson.mockReturnValue({ categoria: 'Fundamentos de Enfermagem', subcategoria: 'Diagnóstico' });

    const resultado = await pesquisarFontes('características definidoras de diagnóstico de enfermagem', DOMINIOS);

    expect(resultado.observacao).toBe('');
    expect(resultado.categoria).toBe('Fundamentos de Enfermagem');
    expect(resultado.subcategoria).toBe('Diagnóstico');
    expect(resultado.referencias).toHaveLength(2);
    expect(resultado.referencias[0]).toEqual(
      expect.objectContaining({
        instituicao: 'NANDA International',
        documento: 'NANDA-I-2018_2020.pdf',
        pagina: '89',
        trecho: expect.stringContaining('Características definidoras'),
      })
    );
    expect(mockChamarGroq).toHaveBeenCalledTimes(1);
  });

  test('fragmento sem página rastreável não define pagina na referência', async () => {
    mockBuscarFragmentos.mockResolvedValue([fragmento({ pagina_inicio: null, pagina_fim: null })]);
    mockChamarGroq.mockResolvedValue('{}');
    mockExtrairJson.mockReturnValue({ categoria: 'Fundamentos de Enfermagem', subcategoria: '' });

    const resultado = await pesquisarFontes('tema qualquer', DOMINIOS);

    expect(resultado.referencias[0].pagina).toBeUndefined();
  });

  test('não confia cegamente no threshold do SQL — filtra similaridade abaixo de 0.5 mesmo se vier no resultado', async () => {
    mockBuscarFragmentos.mockResolvedValue([fragmento({ similarity: 0.3 })]);

    const resultado = await pesquisarFontes('tema fraco', DOMINIOS);

    expect(resultado.referencias).toEqual([]);
  });
});
