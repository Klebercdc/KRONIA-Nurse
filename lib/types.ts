/**
 * Tipos centrais do Caderno de Plantão Inteligente.
 * De propósito: só existem 2 entidades. Nada de Tenant, Organization,
 * EHRConnection, etc. — isso é Camada B (ver KRONIA_NURSE_CADERNO_INTELIGENTE.md).
 */

export type Complexidade =
  | 'minimos'
  | 'intermediarios'
  | 'alta_dependencia'
  | 'semi_intensivos'
  | 'intensivos';

export const COMPLEXIDADE_LABEL: Record<Complexidade, string> = {
  minimos: 'Cuidados Mínimos',
  intermediarios: 'Intermediários',
  alta_dependencia: 'Alta Dependência',
  semi_intensivos: 'Semi-Intensivos',
  intensivos: 'Intensivos',
};

export interface Paciente {
  id: string;
  /** Leito ou codinome — NUNCA nome real ou CPF. */
  leito: string;
  dx?: string;
  complexidade: Complexidade;
}

export type TipoEvento =
  | 'Nota'
  | 'Avaliação'
  | 'Sinal Vital'
  | 'Procedimento'
  | 'Intercorrência'
  | 'Medicação';

export interface EventoTurno {
  id: string;
  /** null = ainda não associado a nenhum paciente (vira "Notas Gerais"). */
  patientId: string | null;
  tipo: TipoEvento;
  texto: string;
  /** Exibição, formato HH:MM. */
  hora: string;
  /** Epoch ms — usado para ordenação e nunca exibido ao usuário. */
  ts: number;
}

export interface Turno {
  iniciadoEm: number;
  pacientes: Paciente[];
  eventos: EventoTurno[];
}

export function turnoVazio(): Turno {
  return { iniciadoEm: Date.now(), pacientes: [], eventos: [] };
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function horaAgora(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
