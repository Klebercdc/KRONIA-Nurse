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
import { getSupabaseBrowser } from '../lib/supabase-browser';

/**
 * Aplica o texto organizado que voltou da rota /api/plantao/organizar-registro
 * a um evento do turno. Pura e exportada para ser testável.
 * Regra "edição humana vence máquina": só aplica se o evento ainda existe E
 * seu texto continua sendo exatamente o texto cru enviado — se o enfermeiro
 * editou (ou excluiu) o registro enquanto a organização rodava, a resposta
 * async é descartada e o turno volta inalterado.
 */
export function aplicarTextoOrganizado(
  t: Turno,
  eventoId: string,
  textoCru: string,
  textoOrganizado: string
): Turno {
  const organizado = textoOrganizado.trim();
  if (!organizado || organizado === textoCru) return t;
  return {
    ...t,
    eventos: t.eventos.map((e) =>
      e.id === eventoId && e.texto === textoCru
        ? { ...e, texto: organizado, textoOriginal: textoCru }
        : e
    ),
  };
}

export function useTurno() {
  const [turno, setTurno] = useState<Turno>(turnoVazio());
  const [carregado, setCarregado] = useState(false);
  /** Ids de eventos com organização automática em andamento (indicador na UI). */
  const [organizandoIds, setOrganizandoIds] = useState<string[]>([]);

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

  const editarPaciente = useCallback((id: string, leito: string, dx: string, complexidade: Complexidade) => {
    setTurno((t) => ({
      ...t,
      pacientes: t.pacientes.map((p) => (p.id === id ? { ...p, leito, dx, complexidade } : p)),
    }));
  }, []);

  // ---- Organização automática do registro (async, melhor esforço) ----
  // Chamada DEPOIS que o evento cru já está salvo. Qualquer falha (rede,
  // timeout, 4xx/5xx) nunca bloqueia nem reverte a captura — mas marca
  // `organizacaoFalhou` pra UI poder mostrar que o registro ficou sem
  // revisão, em vez de ficar indistinguível de um registro já revisado.
  const organizarRegistro = useCallback(async (eventoId: string, textoCru: string) => {
    setOrganizandoIds((ids) => [...ids, eventoId]);
    try {
      const { data: sessao } = await getSupabaseBrowser().auth.getSession();
      const resp = await fetch('/api/plantao/organizar-registro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessao.session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ texto: textoCru }),
      });
      if (!resp.ok) {
        setTurno((t) => ({ ...t, eventos: t.eventos.map((e) => (e.id === eventoId ? { ...e, organizacaoFalhou: true } : e)) }));
        return;
      }
      const json = await resp.json();
      if (typeof json?.textoOrganizado !== 'string') return;
      setTurno((t) => aplicarTextoOrganizado(t, eventoId, textoCru, json.textoOrganizado));
    } catch {
      setTurno((t) => ({ ...t, eventos: t.eventos.map((e) => (e.id === eventoId ? { ...e, organizacaoFalhou: true } : e)) }));
    } finally {
      setOrganizandoIds((ids) => ids.filter((id) => id !== eventoId));
    }
  }, []);

  // ---- Captura rápida: detecta leito localmente e cria/associa paciente ----
  // `contextoFallbackId` é o leito selecionado manualmente na barra de contexto
  // da tela Registrar — só é usado quando o texto não tem leito detectável,
  // pra a nota realmente ir pro leito que a UI mostrou no preview.
  const capturar = useCallback((textoFalado: string, contextoFallbackId?: string | null) => {
    const texto = textoFalado.trim();
    if (!texto) return;

    // Detecção de leito roda sobre o texto CRU, antes de qualquer organização.
    const deteccao = detectarLeito(texto);
    const textoCru = deteccao ? deteccao.resto : texto;
    const eventoId = uid();

    setTurno((t) => {
      let pacientes = t.pacientes;
      let patientId: string | null = null;
      if (deteccao) {
        let p = pacientes.find((x) => x.leito.toLowerCase() === deteccao.leito.toLowerCase());
        if (!p) {
          p = { id: uid(), leito: deteccao.leito, dx: '', complexidade: 'intermediarios' };
          pacientes = [...pacientes, p];
        }
        patientId = p.id;
      } else if (contextoFallbackId && pacientes.some((p) => p.id === contextoFallbackId)) {
        patientId = contextoFallbackId;
      }
      const novoEvento: EventoTurno = {
        id: eventoId, patientId, tipo: 'Nota', texto: textoCru, hora: horaAgora(), ts: Date.now(),
      };
      return { ...t, pacientes, eventos: [...t.eventos, novoEvento] };
    });

    if (textoCru.trim()) void organizarRegistro(eventoId, textoCru);
  }, [organizarRegistro]);

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
    organizandoIds,
    adicionarPaciente,
    removerPaciente,
    editarPaciente,
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
