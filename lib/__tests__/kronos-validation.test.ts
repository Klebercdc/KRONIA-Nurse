import { validarFragmentos, temPaginaRastreavel, MSG_SEM_EVIDENCIA } from '../kronos-validation';
import type { FragmentoEncontrado } from '../knowledge-retrieval';

function fragmento(overrides: Partial<FragmentoEncontrado> = {}): FragmentoEncontrado {
  return {
    fragmento_id: 'f1',
    documento_id: 'd1',
    nome_arquivo: 'doc.pdf',
    tipo_documento: 'Guia',
    instituicao: 'COREN-SP',
    versao: null,
    ano_publicacao: null,
    descricao: null,
    numero_sequencia: 1,
    pagina_inicio: 3,
    pagina_fim: 3,
    conteudo: 'trecho de exemplo',
    similarity: 0.8,
    ...overrides,
  };
}

describe('validarFragmentos', () => {
  test('lista vazia é sempre inválida', () => {
    const resultado = validarFragmentos([]);
    expect(resultado).toEqual({ valido: false, motivo: MSG_SEM_EVIDENCIA });
  });

  test('todos os fragmentos abaixo do limiar → inválido', () => {
    const resultado = validarFragmentos([fragmento({ similarity: 0.2 }), fragmento({ similarity: 0.3 })], 0.5);
    expect(resultado.valido).toBe(false);
  });

  test('descarta fragmentos abaixo do limiar mas aceita os que passam', () => {
    const acimaDoLimiar = fragmento({ fragmento_id: 'acima', similarity: 0.9 });
    const abaixoDoLimiar = fragmento({ fragmento_id: 'abaixo', similarity: 0.1 });
    const resultado = validarFragmentos([acimaDoLimiar, abaixoDoLimiar], 0.5);

    expect(resultado.valido).toBe(true);
    if (resultado.valido) {
      expect(resultado.fragmentosValidos).toEqual([acimaDoLimiar]);
    }
  });

  test('não confia cegamente no chamador — reaplica o limiar mesmo se o SQL já devolveu abaixo dele', () => {
    const resultado = validarFragmentos([fragmento({ similarity: 0.49 })], 0.5);
    expect(resultado.valido).toBe(false);
  });
});

describe('temPaginaRastreavel', () => {
  test('true quando pagina_inicio e pagina_fim existem', () => {
    expect(temPaginaRastreavel(fragmento({ pagina_inicio: 5, pagina_fim: 6 }))).toBe(true);
  });

  test('false quando página é null (documento indexado antes da migration)', () => {
    expect(temPaginaRastreavel(fragmento({ pagina_inicio: null, pagina_fim: null }))).toBe(false);
  });
});
