/**
 * Memória do turno — LOCAL e EFÊMERA por design. Esta é a peça que resolve
 * a maior parte dos riscos de LGPD/ANVISA discutidos no blueprint: o dado de
 * paciente nunca fica retido em servidor. Vive no aparelho do enfermeiro
 * enquanto o plantão está aberto; encerrarTurno() apaga tudo, sem undo.
 *
 * MVP: localStorage (simples, suficiente para o volume de texto de um turno).
 * Upgrade natural se necessário: IndexedDB (mais capacidade, mais robusto a
 * fechamentos abruptos) — trocar só esta implementação, a interface não muda.
 */

import { Turno, turnoVazio } from './types';

const CHAVE = 'kronia_nurse_turno_ativo';

export function carregarTurno(): Turno {
  if (typeof window === 'undefined') return turnoVazio();
  try {
    const raw = window.localStorage.getItem(CHAVE);
    return raw ? (JSON.parse(raw) as Turno) : turnoVazio();
  } catch {
    return turnoVazio();
  }
}

export function salvarTurno(turno: Turno): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(turno));
  } catch {
    // Armazenamento cheio ou indisponível — falha silenciosa é aceitável aqui;
    // o pior caso é perder o último registro, não dado de paciente vazando.
  }
}

/** Encerramento do plantão: apaga toda a memória local. Ação irreversível. */
export function encerrarTurno(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CHAVE);
}

export function turnoTemDados(turno: Turno): boolean {
  return turno.pacientes.length > 0 || turno.eventos.length > 0;
}
