/**
 * useTurno — o hook que junta tudo. As 5 telas (Plantão/Pacientes/Registrar/
 * Escalas/Encerramento) só leem estado e chamam ações daqui; nenhuma delas
 * deve falar direto com storage.ts ou com as rotas de API.
 *
 * Port direto da lógica já testada no protótipo (artifact), só reorganizada
 * em módulos e trocando fetch direto à Anthropic por chamadas às rotas
 * /api/plantao/* (que por sua vez chamam a Groq no servidor).
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Turno, Paciente, EventoTurno, Complexidade,
  turnoVazio, uid, horaAgora,
} from '../lib/types';
import { carregarTurno, salvarTurno, encerrarTurno as apagarStorage } from '../lib/storage';
import { detectarLeito } from '../lib/leito-parser';

export function useTurno() {
  const [turno, setTurno] = useState<Turno>(turnoVazio());
  const [carregado, setCarregado] = useState(false);

  // Carrega o turno em andamento (se houver) ao montar — é o que resolve
  // "perdi tudo ao recarregar a página", problema real visto no protótipo.
  useEffect(() => {
    setTurno(carregarTurno());
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (carregado) salvarTurno(turno);
  }, [turno, carregado]);

  // ---- Pacientes ----
  const adicionarPaciente = useCallback((leito: string, dx: string, complexidade: Complexidade) => {
    setTurno((t) => ({ ...t, pacientes: [...t.pacientes, { id: uid(), leito, dx, complexidade }] }));
  }, []);

  const removerPaciente = useCallback((id: string) => {
    setTurno((t) => ({
      pacientes: t.pacientes.filter((p) => p.id !== id),
      eventos: t.eventos.filter((e) => e.patientId !== id),
      iniciadoEm: t.iniciadoEm,
    }));
  }, []);

  // ---- Captura rápida: detecta leito localmente e cria/associa paciente ----
  const capturar = useCallback((textoFalado: string) => {
    const texto = textoFalado.trim();
    if (!texto) return;

    const deteccao = detectarLeito(texto);
    let patientId: string | null = null;
    let textoFinal = texto;

    setTurno((t) => {
      let pacientes = t.pacientes;
      if (deteccao) {
        let p = pacientes.find((x) => x.leito.toLowerCase() === deteccao.leito.toLowerCase());
        if (!p) {
          p = { id: uid(), leito: deteccao.leito, dx: '', complexidade: 'intermediarios' };
          pacientes = [...pacientes, p];
        }
        patientId = p.id;
        textoFinal = deteccao.resto;
      }
      const novoEvento: EventoTurno = {
        id: uid(), patientId, tipo: 'Nota', texto: textoFinal, hora: horaAgora(), ts: Date.now(),
      };
      return { ...t, pacientes, eventos: [...t.eventos, novoEvento] };
    });
  }, []);

  const editarEvento = useCallback((id: string, texto: string, patientId: string | null) => {
    setTurno((t) => ({ ...t, eventos: t.eventos.map((e) => (e.id === id ? { ...e, texto, patientId } : e)) }));
  }, []);

  const excluirEvento = useCallback((id: string) => {
    setTurno((t) => ({ ...t, eventos: t.eventos.filter((e) => e.id !== id) }));
  }, []);

  const atualizarComplexidade = useCallback((id: string, complexidade: Complexidade) => {
    setTurno((t) => ({
      ...t,
      pacientes: t.pacientes.map((p) => p.id === id ? { ...p, complexidade } : p),
    }));
  }, []);

  // ---- Encerramento ----
  /** Apaga toda a memória local. Chamar só depois que o enfermeiro confirmou
   *  ter copiado os documentos gerados — não há undo. */
  const encerrarPlantao = useCallback(() => {
    apagarStorage();
    setTurno(turnoVazio());
  }, []);

  return {
    turno,
    carregado,
    adicionarPaciente,
    removerPaciente,
    atualizarComplexidade,
    capturar,
    editarEvento,
    excluirEvento,
    encerrarPlantao,
  };
}

// ---- Helpers de montagem de dados para as rotas de API (texto, não objeto) ----

export function montarDadosPaciente(p: Paciente, eventos: EventoTurno[]): string {
  const evs = eventos.filter((e) => e.patientId === p.id).sort((a, b) => a.ts - b.ts);
  const linhas = [
    `Leito: ${p.leito}`,
    `Diagnóstico principal informado: ${p.dx || '(não informado)'}`,
    `Complexidade: ${p.complexidade}`,
    '',
    'Eventos registrados neste turno, em ordem cronológica:',
  ];
  if (evs.length === 0) linhas.push('(nenhum evento registrado)');
  else evs.forEach((e) => linhas.push(`[${e.hora}] (${e.tipo}) ${e.texto}`));
  return linhas.join('\n');
}

const ORDEM_COMPLEXIDADE: Complexidade[] = ['intensivos', 'semi_intensivos', 'alta_dependencia', 'intermediarios', 'minimos'];

export function montarDadosRelatorioFinal(pacientes: Paciente[], eventos: EventoTurno[]): string {
  const ordenados = [...pacientes].sort(
    (a, b) => ORDEM_COMPLEXIDADE.indexOf(a.complexidade) - ORDEM_COMPLEXIDADE.indexOf(b.complexidade)
  );
  const blocos = ordenados.map((p) => {
    const evs = eventos.filter((e) => e.patientId === p.id).sort((a, b) => a.ts - b.ts);
    const linhas = [`=== ${p.leito} ===`, `Complexidade: ${p.complexidade}`, 'Eventos:'];
    if (evs.length === 0) linhas.push('(nenhum evento registrado)');
    else evs.forEach((e) => linhas.push(`[${e.hora}] ${e.texto}`));
    return linhas.join('\n');
  });
  const semLeito = eventos.filter((e) => !e.patientId).sort((a, b) => a.ts - b.ts);
  if (semLeito.length > 0) {
    blocos.push(['=== NOTAS GERAIS (sem leito identificado) ===', ...semLeito.map((e) => `[${e.hora}] ${e.texto}`)].join('\n'));
  }
  return blocos.join('\n\n');
}

export function montarListaParaReclassificacao(eventos: EventoTurno[], pacientes: Paciente[]): string {
  return [...eventos]
    .sort((a, b) => a.ts - b.ts)
    .map((e, i) => {
      const p = pacientes.find((x) => x.id === e.patientId);
      return `${i}. [${e.hora}]${p ? ' (marcado localmente: ' + p.leito + ')' : ' (sem marcação local)'} ${e.texto}`;
    })
    .join('\n');
}
