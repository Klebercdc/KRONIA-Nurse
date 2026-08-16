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
  /** Texto cru do ditado, preservado quando a organização automática
   *  reescreve `texto`. Ausente = registro nunca foi reorganizado. */
  textoOriginal?: string;
  /** true = a organização automática falhou (rede/timeout/erro); o texto
   *  cru foi mantido sem revisão. A captura nunca bloqueia por causa
   *  disso, mas o usuário precisa poder ver que ficou pendente. */
  organizacaoFalhou?: boolean;
  /** Exibição, formato HH:MM. */
  hora: string;
  /** Epoch ms — usado para ordenação e nunca exibido ao usuário. */
  ts: number;
}

/**
 * Evolução gerada e guardada no turno.
 *
 * Não existe evolução "avulsa": toda evolução pertence a um paciente. O
 * vínculo é `patientId`, e o rótulo legível vem do `leito` do paciente
 * (que já é leito OU codinome — nunca nome real ou CPF).
 *
 * Guardar é o que permite gerar várias no mesmo plantão e depois exportar
 * uma a uma ou todas juntas. Antes disso o resultado vivia em sessionStorage
 * numa chave por TIPO, então duas evoluções do mesmo tipo se sobrescreviam.
 */
export interface EvolucaoSalva {
  id: string;
  /** Paciente dono da evolução. Obrigatório — não existe evolução sem dono. */
  patientId: string;
  /** Id em DOC_TYPES. */
  tipoId: string;
  /** Nome do tipo no momento da geração, para o histórico não quebrar se o
   *  catálogo mudar depois. */
  tipoNome: string;
  /** Texto final, já com as edições manuais do enfermeiro. */
  texto: string;
  /** Exibição, formato HH:MM. */
  hora: string;
  /** Epoch ms — ordenação. */
  ts: number;
  /** true = o enfermeiro editou o texto depois de gerado. */
  editado?: boolean;
}

export interface Turno {
  iniciadoEm: number;
  pacientes: Paciente[];
  eventos: EventoTurno[];
  /** Ausente em turnos salvos antes desta versão — tratar como []. */
  evolucoes?: EvolucaoSalva[];
}

export function turnoVazio(): Turno {
  return { iniciadoEm: Date.now(), pacientes: [], eventos: [], evolucoes: [] };
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function horaAgora(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
