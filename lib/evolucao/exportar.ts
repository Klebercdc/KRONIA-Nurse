/**
 * Montagem do texto de exportação das evoluções guardadas no plantão.
 *
 * Puro e sem IA de propósito: o texto de cada evolução já foi gerado e revisado
 * pelo enfermeiro. Aqui só concatenamos. Nada é reescrito, resumido ou
 * reinterpretado na exportação — o que o enfermeiro leu é exatamente o que ele
 * copia.
 */

import type { EvolucaoSalva, Paciente } from '../types';

export interface GrupoDeEvolucoes {
  patientId: string;
  /** Leito, codinome ou iniciais — nunca nome real. */
  rotulo: string;
  evolucoes: EvolucaoSalva[];
}

/** Rótulo do paciente, com fallback para o caso de o paciente ter sido apagado. */
export function rotuloPaciente(patientId: string, pacientes: Paciente[]): string {
  return pacientes.find((p) => p.id === patientId)?.leito ?? 'Paciente removido';
}

/**
 * Agrupa por paciente, mantendo a ordem em que os pacientes aparecem no turno,
 * e cada evolução em ordem cronológica.
 */
export function agruparEvolucoesPorPaciente(
  evolucoes: EvolucaoSalva[],
  pacientes: Paciente[],
): GrupoDeEvolucoes[] {
  const grupos: GrupoDeEvolucoes[] = [];

  const ordemPaciente = (id: string) => {
    const i = pacientes.findIndex((p) => p.id === id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };

  for (const ev of [...evolucoes].sort((a, b) => a.ts - b.ts)) {
    const existente = grupos.find((g) => g.patientId === ev.patientId);
    if (existente) existente.evolucoes.push(ev);
    else {
      grupos.push({
        patientId: ev.patientId,
        rotulo: rotuloPaciente(ev.patientId, pacientes),
        evolucoes: [ev],
      });
    }
  }

  return grupos.sort((a, b) => ordemPaciente(a.patientId) - ordemPaciente(b.patientId));
}

const SEPARADOR = '─'.repeat(40);

/**
 * Texto único com todas as evoluções, agrupadas por paciente.
 * Cada bloco identifica paciente, tipo e horário — para o enfermeiro conseguir
 * separar de novo depois de colar.
 */
export function montarExportacao(evolucoes: EvolucaoSalva[], pacientes: Paciente[]): string {
  const grupos = agruparEvolucoesPorPaciente(evolucoes, pacientes);
  if (grupos.length === 0) return '';

  return grupos
    .map((grupo) => {
      const blocos = grupo.evolucoes.map(
        (ev) => `[${ev.hora}] ${ev.tipoNome}\n\n${ev.texto.trim()}`,
      );
      return [`${SEPARADOR}\n${grupo.rotulo}\n${SEPARADOR}`, ...blocos].join('\n\n');
    })
    .join('\n\n\n');
}
