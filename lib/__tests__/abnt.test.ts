import { formatarCitacaoAbnt, citacaoLiteralValida } from '../abnt';

describe('formatarCitacaoAbnt', () => {
  test('monta citação completa com instituição, título, versão, ano e página', () => {
    const citacao = formatarCitacaoAbnt(
      { instituicao: 'COFEN', titulo: 'Recomendações para Registros de Enfermagem no Exercício da Profissão', versao: '3ª edição', ano: 2023 },
      '63-64'
    );
    expect(citacao).toBe('COFEN. Recomendações para Registros de Enfermagem no Exercício da Profissão. 3ª edição. 2023. p. 63-64.');
  });

  test('omite versão quando é idêntica ao ano (dado só duplicado, não é edição de verdade)', () => {
    const citacao = formatarCitacaoAbnt({ instituicao: 'COFEN', titulo: 'Recomendações para Registros de Enfermagem', versao: '2023', ano: 2023 }, '63-64');
    expect(citacao).toBe('COFEN. Recomendações para Registros de Enfermagem. 2023. p. 63-64.');
    expect(citacao).not.toContain('2023. 2023');
  });

  test('sem ano conhecido usa [s.d.]', () => {
    const citacao = formatarCitacaoAbnt({ instituicao: 'COREN-SE', titulo: 'Modelo Padrão de Normas, Rotinas e POP', ano: null });
    expect(citacao).toBe('COREN-SE. Modelo Padrão de Normas, Rotinas e POP. [s.d.].');
  });

  test('sem página, não adiciona "p."', () => {
    const citacao = formatarCitacaoAbnt({ instituicao: 'ANVISA', titulo: 'RDC 11/2014', ano: 2014 });
    expect(citacao).not.toContain('p.');
  });

  test('título vindo de nome de arquivo: remove .pdf e underscores', () => {
    const citacao = formatarCitacaoAbnt({ instituicao: 'NANDA International', titulo: 'NANDA-I-2018_2020.pdf', ano: 2018 });
    expect(citacao).toBe('NANDA INTERNATIONAL. NANDA I 2018 2020. 2018.');
  });
});

describe('citacaoLiteralValida', () => {
  test('vazio/undefined é válido (campo opcional)', () => {
    expect(citacaoLiteralValida(undefined)).toBe(true);
    expect(citacaoLiteralValida('')).toBe(true);
  });

  test('até 20 palavras é válido', () => {
    const texto = new Array(20).fill('palavra').join(' ');
    expect(citacaoLiteralValida(texto)).toBe(true);
  });

  test('mais de 20 palavras é inválido — não é mais citação, é parágrafo colado', () => {
    const texto = new Array(21).fill('palavra').join(' ');
    expect(citacaoLiteralValida(texto)).toBe(false);
  });
});
