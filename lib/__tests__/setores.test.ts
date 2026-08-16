/**
 * Setores são apresentação (Caminho A), não modelo clínico.
 *
 * O que estes testes garantem: nenhum dos tipos de DOC_TYPES pode sumir da
 * interface por causa do agrupamento por setor, e nenhum setor pode apontar
 * para tipo inexistente.
 */
import { DOC_TYPES } from '../evolucao/document-types';
import { FIELD_SCHEMAS } from '../evolucao/field-schemas';
import {
  SETORES,
  TIPOS_GLOBAIS,
  setoresVisiveis,
  setoresPorGrupo,
  tiposDoSetor,
  getSetor,
} from '../evolucao/setores';

describe('integridade do mapeamento de setores', () => {
  it('não aponta para nenhum tipo inexistente', () => {
    const ids = DOC_TYPES.map((d) => d.id);
    for (const setor of SETORES) {
      for (const tipo of setor.tipos) {
        expect(ids).toContain(tipo);
      }
    }
  });

  it('não repete o mesmo tipo em dois setores', () => {
    const vistos = new Map<string, string>();
    for (const setor of SETORES) {
      for (const tipo of setor.tipos) {
        expect(vistos.has(tipo)).toBe(false);
        vistos.set(tipo, setor.id);
      }
    }
  });

  it('cobre TODOS os tipos — nenhum fica órfão', () => {
    const cobertos = new Set([...SETORES.flatMap((s) => s.tipos), ...TIPOS_GLOBAIS]);
    const orfaos = DOC_TYPES.filter((d) => !cobertos.has(d.id)).map((d) => d.id);

    expect(orfaos).toEqual([]);
  });

  it('não deixa um tipo ser específico de setor e global ao mesmo tempo', () => {
    for (const setor of SETORES) {
      for (const tipo of setor.tipos) {
        expect(TIPOS_GLOBAIS).not.toContain(tipo);
      }
    }
  });

  it('usa ids de setor únicos', () => {
    const ids = SETORES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('setores pendentes de validação clínica', () => {
  it('exibe Pediatria e UTI Neonatal — liberados com fonte COFEN', () => {
    const visiveis = setoresVisiveis().map((s) => s.id);
    expect(visiveis).toContain('pediatria');
    expect(visiveis).toContain('neonatal');
  });

  it('não expõe setor pendente no agrupamento da tela', () => {
    const naTela = setoresPorGrupo().flatMap((g) => g.setores.map((s) => s.id));
    for (const s of SETORES.filter((x) => x.pendenteValidacao)) {
      expect(naTela).not.toContain(s.id);
    }
  });
});

describe('faixas de referência não são embutidas em lugar nenhum', () => {
  // Trava de projeto: min/max só pode existir como limite da própria escala,
  // nunca como "valor normal" por idade. Faixa de referência transformaria
  // número em rótulo clínico, que é o que o produto proíbe.
  const LIMITES_DE_ESCALA = new Set([
    'glasgow',        // 3–15, definição da escala
    'dor_procedimento', // 0–10, definição da escala
    'peso_g',         // min 0, sanidade de unidade
    'dias_vida',
    'comprimento',
    'perimetro_cefalico',
    'perimetro_toracico',
    'dilatacao',      // 0-10 cm, a dilatação se completa aos 10
    'dia_puerperio',
    'horas_pos_parto',
  ]);

  it('nenhum campo novo introduz min/max fora de limite de escala', () => {
    const suspeitos: string[] = [];
    for (const schema of FIELD_SCHEMAS) {
      for (const campo of schema.campos) {
        const temLimite = campo.min !== undefined || campo.max !== undefined;
        if (temLimite && !LIMITES_DE_ESCALA.has(campo.id)) {
          suspeitos.push(`${schema.tipoId}/${campo.id}`);
        }
      }
    }
    expect(suspeitos).toEqual([]);
  });

  it('sinais vitais de pediatria e neonatal são texto livre, sem classificação', () => {
    for (const tipoId of ['evolucao_pediatrica', 'evolucao_neonatal']) {
      const schema = FIELD_SCHEMAS.find((s) => s.tipoId === tipoId);
      const sv = schema?.campos.find((c) => c.id === 'sinais_vitais');
      expect(sv?.type).toBe('textarea');
      expect(sv?.min).toBeUndefined();
      expect(sv?.max).toBeUndefined();
      expect(sv?.hint).toContain('não classifica');
    }
  });

  it('registra o peso neonatal em gramas, não em quilos', () => {
    const schema = FIELD_SCHEMAS.find((s) => s.tipoId === 'evolucao_neonatal');
    const peso = schema?.campos.find((c) => c.id === 'peso_g');
    expect(peso?.unit).toBe('g');
    expect(peso?.required).toBe(true);
  });
});

describe('campos obstétricos e sua procedência', () => {
  const schema = (id: string) => FIELD_SCHEMAS.find((s) => s.tipoId === id);
  const campo = (tipoId: string, campoId: string) =>
    schema(tipoId)?.campos.find((c) => c.id === campoId);

  it('usa as fases do parto do Manual MDER, não nomenclatura inventada', () => {
    const valores = campo('evolucao_gestante', 'periodo_clinico')?.options?.map((o) => o.value);
    expect(valores).toEqual([
      'fase_latente',
      'fase_ativa',
      'fase_transicao',
      'expulsivo_pelvica',
      'expulsivo_perineal',
      'dequitacao',
    ]);
  });

  it('limita a dilatação em 10 cm, que é onde ela se completa', () => {
    const d = campo('evolucao_gestante', 'dilatacao');
    expect(d?.min).toBe(0);
    expect(d?.max).toBe(10);
  });

  it('trata o BCF como referência de leitura, nunca como validação', () => {
    const bcf = campo('evolucao_gestante', 'bcf');
    // A faixa do manual aparece para o enfermeiro ler...
    expect(bcf?.hint).toContain('110');
    expect(bcf?.hint).toContain('160');
    // ...mas o sistema não classifica o valor aferido.
    expect(bcf?.min).toBeUndefined();
    expect(bcf?.max).toBeUndefined();
  });

  it('usa a classificação de lóquios do Manual MDER', () => {
    const valores = campo('evolucao_puerperio', 'loquios')?.options?.map((o) => o.value);
    expect(valores).toEqual(['rubra', 'fusca', 'flava', 'alba']);
  });

  it('usa as fases do puerpério do Manual MDER', () => {
    const valores = campo('evolucao_puerperio', 'fase_puerperio')?.options?.map((o) => o.value);
    expect(valores).toEqual(['imediato', 'tardio', 'remoto']);
  });

  it('mantém a transição puerperal como tipo dentro do setor Puerpério', () => {
    const puerperio = getSetor('puerperio');
    expect(puerperio?.tipos).toContain('transicao_puerperal');
    // Não pode ter virado setor próprio.
    expect(SETORES.some((s) => s.id === 'transicao_puerperal')).toBe(false);
  });
});

describe('tipos oferecidos dentro de um setor', () => {
  it('coloca os tipos do próprio setor antes dos globais', () => {
    const tipos = tiposDoSetor('uti').map((t) => t.id);
    const proprios = getSetor('uti')!.tipos;

    expect(tipos.slice(0, proprios.length)).toEqual(proprios);
  });

  it('oferece os globais em qualquer setor', () => {
    for (const setor of setoresVisiveis()) {
      const tipos = tiposDoSetor(setor.id).map((t) => t.id);
      expect(tipos).toContain('avaliacao_ferida_ostomia');
      expect(tipos).toContain('intercorrencia_queda');
    }
  });

  it('não duplica tipo dentro de um setor', () => {
    for (const setor of SETORES) {
      const tipos = tiposDoSetor(setor.id).map((t) => t.id);
      expect(new Set(tipos).size).toBe(tipos.length);
    }
  });

  it('devolve lista vazia para setor inexistente', () => {
    expect(tiposDoSetor('nao_existe')).toEqual([]);
  });
});
