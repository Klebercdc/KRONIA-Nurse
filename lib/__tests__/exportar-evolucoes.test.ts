/**
 * Exportação das evoluções guardadas no plantão.
 *
 * Regra que estes testes protegem: a exportação NÃO reescreve nada. O texto
 * que o enfermeiro revisou é exatamente o que ele copia — nenhuma IA no meio.
 */
import { montarExportacao, agruparEvolucoesPorPaciente, rotuloPaciente } from '../evolucao/exportar';
import type { EvolucaoSalva, Paciente } from '../types';

const pacientes: Paciente[] = [
  { id: 'p1', leito: 'Leito 5', dx: '', complexidade: 'intermediarios' },
  { id: 'p2', leito: 'AB', dx: '', complexidade: 'intensivos' },
];

function ev(over: Partial<EvolucaoSalva> & { id: string; patientId: string; ts: number }): EvolucaoSalva {
  return {
    tipoId: 'evolucao_plantao',
    tipoNome: 'Evolução de Plantão',
    texto: 'texto qualquer',
    hora: '08:00',
    ...over,
  };
}

describe('agrupamento por paciente', () => {
  it('junta as evoluções do mesmo paciente num grupo só', () => {
    const grupos = agruparEvolucoesPorPaciente(
      [
        ev({ id: 'a', patientId: 'p1', ts: 1 }),
        ev({ id: 'b', patientId: 'p2', ts: 2 }),
        ev({ id: 'c', patientId: 'p1', ts: 3 }),
      ],
      pacientes,
    );

    expect(grupos).toHaveLength(2);
    expect(grupos[0].evolucoes.map((e) => e.id)).toEqual(['a', 'c']);
    expect(grupos[1].evolucoes.map((e) => e.id)).toEqual(['b']);
  });

  it('ordena cada grupo cronologicamente, não por ordem de chegada', () => {
    const grupos = agruparEvolucoesPorPaciente(
      [ev({ id: 'tarde', patientId: 'p1', ts: 900 }), ev({ id: 'cedo', patientId: 'p1', ts: 100 })],
      pacientes,
    );
    expect(grupos[0].evolucoes.map((e) => e.id)).toEqual(['cedo', 'tarde']);
  });

  it('usa o rótulo do paciente — nunca o id', () => {
    const grupos = agruparEvolucoesPorPaciente([ev({ id: 'a', patientId: 'p2', ts: 1 })], pacientes);
    expect(grupos[0].rotulo).toBe('AB');
  });

  it('não quebra quando o paciente já foi removido do turno', () => {
    expect(rotuloPaciente('sumiu', pacientes)).toBe('Paciente removido');
    const grupos = agruparEvolucoesPorPaciente([ev({ id: 'a', patientId: 'sumiu', ts: 1 })], pacientes);
    expect(grupos[0].rotulo).toBe('Paciente removido');
  });

  it('devolve vazio quando não há evolução', () => {
    expect(agruparEvolucoesPorPaciente([], pacientes)).toEqual([]);
  });
});

describe('texto exportado', () => {
  const lista = [
    ev({ id: 'a', patientId: 'p1', ts: 1, hora: '07:10', texto: 'Primeiro texto.' }),
    ev({ id: 'b', patientId: 'p2', ts: 2, hora: '09:30', texto: 'Segundo texto.', tipoNome: 'Evolução UTI' }),
  ];

  it('preserva o texto revisado, sem reescrever', () => {
    const saida = montarExportacao(lista, pacientes);
    expect(saida).toContain('Primeiro texto.');
    expect(saida).toContain('Segundo texto.');
  });

  it('identifica paciente, tipo e horário para dar para separar depois', () => {
    const saida = montarExportacao(lista, pacientes);
    expect(saida).toContain('Leito 5');
    expect(saida).toContain('AB');
    expect(saida).toContain('[07:10] Evolução de Plantão');
    expect(saida).toContain('[09:30] Evolução UTI');
  });

  it('mantém a ordem dos pacientes do turno', () => {
    const saida = montarExportacao(lista, pacientes);
    expect(saida.indexOf('Leito 5')).toBeLessThan(saida.indexOf('AB'));
  });

  it('devolve string vazia quando não há nada guardado', () => {
    expect(montarExportacao([], pacientes)).toBe('');
  });

  it('exporta uma evolução isolada sem separador sobrando no fim', () => {
    const saida = montarExportacao([lista[0]], pacientes);
    expect(saida.trim().endsWith('Primeiro texto.')).toBe(true);
  });
});
