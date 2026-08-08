/**
 * Trava de rastreabilidade dos campos clínicos não fundamentados.
 *
 * Motivo do teste: um marcador (CONFERIR) já se perdeu silenciosamente e
 * chegou em produção. Aqui o marcador só some se alguém apagar o item do
 * registro DE PROPÓSITO — se ele virar campo ativo sem liberação, o CI quebra.
 */
import { CAMPOS_A_CONFERIR, pendentes, resumoPendencias } from '../evolucao/campos-a-conferir';
import { FIELD_SCHEMAS } from '../evolucao/field-schemas';

/** Todos os rótulos de campo hoje ativos em qualquer schema. */
function rotulosAtivos(): string[] {
  return FIELD_SCHEMAS.flatMap((s) => s.campos.map((c) => c.label.toLowerCase()));
}

describe('registro de campos a conferir', () => {
  it('mantém todo item com motivo declarado e não-vazio', () => {
    for (const c of CAMPOS_A_CONFERIR) {
      expect(c.campo.trim()).not.toBe('');
      expect(c.setor.trim()).not.toBe('');
      expect(c.motivo.trim().length).toBeGreaterThan(20);
    }
  });

  it('não deixa campo pendente virar campo ativo sem liberação', () => {
    const ativos = rotulosAtivos();
    const vazados = pendentes().filter((c) => ativos.includes(c.campo.toLowerCase()));

    expect(vazados.map((c) => `${c.setor} / ${c.campo}`)).toEqual([]);
  });

  it('expõe as pendências num resumo legível', () => {
    const resumo = resumoPendencias();
    for (const c of pendentes()) {
      expect(resumo).toContain(c.campo);
    }
  });

  it('conta as pendências abertas — atualizar ao liberar cada campo', () => {
    // Este número é proposital: baixar exige mexer no registro, o que torna a
    // liberação de um campo clínico uma mudança visível no diff.
    expect(pendentes()).toHaveLength(6);
  });
});

describe('campos ativos de Ferida/Ostomia', () => {
  const schema = FIELD_SCHEMAS.find((s) => s.tipoId === 'avaliacao_ferida_ostomia');

  it('existe', () => {
    expect(schema).toBeDefined();
  });

  it('cobre os itens obrigatórios do COFEN §6.26', () => {
    const ids = schema!.campos.map((c) => c.id);
    for (const obrigatorio of [
      'localizacao',
      'dimensoes',
      'exsudato_quantidade',
      'exsudato_aspecto',
      'dor_procedimento',
      'desbridamento',
      'tipo_curativo',
      'material_utilizado',
      'data_avaliacao',
      'hora_avaliacao',
    ]) {
      expect(ids).toContain(obrigatorio);
    }
  });

  it('declara a procedência dos campos que vêm de conhecimento geral', () => {
    for (const id of ['estadiamento_lpp', 'tecido_leito']) {
      const campo = schema!.campos.find((c) => c.id === id);
      expect(campo?.hint).toContain('conhecimento geral');
    }
  });
});
