/**
 * Setores são apresentação (Caminho A), não modelo clínico.
 *
 * O que estes testes garantem: nenhum dos tipos de DOC_TYPES pode sumir da
 * interface por causa do agrupamento por setor, e nenhum setor pode apontar
 * para tipo inexistente.
 */
import { DOC_TYPES } from '../evolucao/document-types';
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
  it('mantém Pediatria e UTI Neonatal ocultos até liberação', () => {
    const ocultos = SETORES.filter((s) => s.pendenteValidacao).map((s) => s.id);
    expect(ocultos).toEqual(['pediatria', 'neonatal']);

    const visiveis = setoresVisiveis().map((s) => s.id);
    expect(visiveis).not.toContain('pediatria');
    expect(visiveis).not.toContain('neonatal');
  });

  it('não expõe setor pendente no agrupamento da tela', () => {
    const naTela = setoresPorGrupo().flatMap((g) => g.setores.map((s) => s.id));
    for (const s of SETORES.filter((x) => x.pendenteValidacao)) {
      expect(naTela).not.toContain(s.id);
    }
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
