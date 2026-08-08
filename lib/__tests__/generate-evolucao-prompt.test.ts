/**
 * Testes da estrutura de saída do Motor B (evolução avulsa).
 *
 * O que está sendo protegido aqui é a trava clínica, não o texto: o bloco
 * Diagnóstico é ESTRUTURAL, nunca interpretativo. A IA não pode inferir
 * diagnóstico a partir de valor numérico ou achado isolado. Ver
 * CHECKLIST_NAO_REGRESSAO.md — mudar isto muda o comportamento clínico do
 * produto.
 */
import { DOC_TYPES } from '../evolucao/document-types';
import { montarPromptSistema, usaEstruturaPE } from '../evolucao/generate-evolucao';

const tipo = (id: string) => {
  const t = DOC_TYPES.find((d) => d.id === id);
  if (!t) throw new Error(`tipo inexistente no teste: ${id}`);
  return t;
};

describe('trava anti-diagnóstico — vale para TODOS os tipos', () => {
  it('proíbe criar diagnóstico em todos os 36 tipos, sem exceção', () => {
    for (const t of DOC_TYPES) {
      const prompt = montarPromptSistema(t);
      expect(prompt).toContain('É PROIBIDO criar diagnósticos de enfermagem');
      expect(prompt).toContain('NUNCA podem virar rótulo clínico');
    }
  });

  it('nunca deixa a IA inventar data ou horário', () => {
    for (const t of DOC_TYPES) {
      expect(montarPromptSistema(t)).toContain('NUNCA invente data ou horário');
    }
  });
});

describe('estrutura do Processo de Enfermagem (COFEN 736/2024)', () => {
  const comEstrutura = DOC_TYPES.filter(usaEstruturaPE);

  it('aplica os quatro blocos aos tipos de admissão e evolução', () => {
    expect(comEstrutura.length).toBeGreaterThan(0);
    for (const t of comEstrutura) {
      const prompt = montarPromptSistema(t);
      expect(prompt).toContain('Dados');
      expect(prompt).toContain('Diagnóstico de Enfermagem');
      expect(prompt).toContain('Intervenção');
      expect(prompt).toContain('Resultado');
    }
  });

  it('mantém os quatro blocos na ordem correta', () => {
    const prompt = montarPromptSistema(tipo('evolucao_plantao'));
    const ordem = ['\nDados\n', '\nDiagnóstico de Enfermagem\n', '\nIntervenção\n', '\nResultado\n'];
    const posicoes = ordem.map((bloco) => prompt.indexOf(bloco));

    expect(posicoes.every((p) => p > -1)).toBe(true);
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });

  it('obriga o bloco vazio a aparecer, em vez de ser omitido', () => {
    const prompt = montarPromptSistema(tipo('evolucao_uti'));
    expect(prompt).toContain('Sem registro para esta seção');
    expect(prompt).toContain('nunca omita o bloco, nunca preencha com suposição');
  });

  it('mantém o bloco Diagnóstico ESTRUTURAL, não interpretativo', () => {
    const prompt = montarPromptSistema(tipo('evolucao_plantao'));
    // Só entra diagnóstico que o enfermeiro nomeou em palavras.
    expect(prompt).toContain('APENAS se o enfermeiro informou explicitamente um diagnóstico nomeado');
    // E a proibição de inferir tem de estar dentro do próprio bloco.
    expect(prompt).toContain('É PROIBIDO inferir, deduzir ou criar diagnóstico a partir dos dados');
  });

  it('separa dado de intervenção — medicação nunca cai no bloco Dados', () => {
    const prompt = montarPromptSistema(tipo('admissao_uti'));
    expect(prompt).toContain('medicações e condutas vão SEMPRE aqui, nunca no bloco Dados');
  });
});

describe('tipos que não são avaliação', () => {
  it('não impõe os quatro blocos a procedimento e intercorrência', () => {
    for (const id of ['cateter_venoso_central', 'intercorrencia_queda']) {
      const t = tipo(id);
      expect(usaEstruturaPE(t)).toBe(false);
      expect(montarPromptSistema(t)).not.toContain('ESTRUTURA OBRIGATÓRIA DA SAÍDA');
    }
  });

  it('ainda assim mantém a trava anti-diagnóstico neles', () => {
    const prompt = montarPromptSistema(tipo('cateter_venoso_central'));
    expect(prompt).toContain('É PROIBIDO criar diagnósticos de enfermagem');
  });
});
