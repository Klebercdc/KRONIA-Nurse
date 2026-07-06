/**
 * Testes da rastreabilidade por página no chunking do scripts/rag-pipeline.js
 * (migration 20260706_fragmentos_pagina — Validation Engine precisa saber
 * "existe página?" por fragmento).
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ragPipeline = require('../../scripts/rag-pipeline.js');

const {
  chunkTextComPaginas,
  dividirPaginasEmSentencasTageadas,
  estimarTokens,
} = ragPipeline;

function fraseLonga(n: number): string {
  return `Esta é a sentença número ${n} usada para preencher o texto de teste com conteúdo suficiente para forçar a divisão em múltiplos fragmentos durante o processamento.`;
}

function paginaComFrases(pagina: number, quantidade: number): string {
  const linhas: string[] = [];
  for (let i = 0; i < quantidade; i++) linhas.push(fraseLonga(pagina * 100 + i));
  return linhas.join('\n');
}

describe('dividirPaginasEmSentencasTageadas', () => {
  test('cada sentença carrega o número da página de origem (1-based)', () => {
    const paginas = ['Primeira frase.\nSegunda frase.', 'Terceira frase.'];
    const sentencas = dividirPaginasEmSentencasTageadas(paginas);

    expect(sentencas.map((s: { pagina: number }) => s.pagina)).toEqual([1, 1, 2]);
  });
});

describe('chunkTextComPaginas', () => {
  test('documento curto (1 chunk) cobre da primeira à última página', () => {
    const paginas = [
      'Este é o texto da primeira página.\nTem duas linhas aqui.',
      'Segunda página começa aqui.\nMais conteúdo nesta página.',
      'Terceira página, última do teste.\nFim do documento.',
    ];
    const chunks = chunkTextComPaginas(paginas);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].paginaInicio).toBe(1);
    expect(chunks[0].paginaFim).toBe(3);
  });

  test('documento longo gera vários chunks com página crescente', () => {
    const paginas = Array.from({ length: 6 }, (_, i) => paginaComFrases(i + 1, 8));
    const chunks = chunkTextComPaginas(paginas);

    expect(chunks.length).toBeGreaterThan(1);
    // paginaInicio nunca decresce de um chunk para o próximo
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].paginaInicio).toBeGreaterThanOrEqual(chunks[i - 1].paginaInicio);
    }
    // primeiro chunk começa na página 1, último termina na última página
    expect(chunks[0].paginaInicio).toBe(1);
    expect(chunks[chunks.length - 1].paginaFim).toBe(6);
  });

  test('nenhum chunk excede o teto de tokens', () => {
    const paginas = Array.from({ length: 4 }, (_, i) => paginaComFrases(i + 1, 10));
    const chunks = chunkTextComPaginas(paginas);

    for (const chunk of chunks) {
      expect(estimarTokens(chunk.texto)).toBeLessThanOrEqual(480);
    }
  });

  test('paginaInicio nunca é maior que paginaFim', () => {
    const paginas = Array.from({ length: 5 }, (_, i) => paginaComFrases(i + 1, 6));
    const chunks = chunkTextComPaginas(paginas);

    for (const chunk of chunks) {
      expect(chunk.paginaInicio).toBeLessThanOrEqual(chunk.paginaFim);
    }
  });
});
