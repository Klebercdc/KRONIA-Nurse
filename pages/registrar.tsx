import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useTurno } from '../components/useTurno';
import { detectarLeito } from '../lib/leito-parser';
import { COMPLEXIDADE_LABEL } from '../lib/types';

export default function Registrar() {
  const { turno, carregado, organizandoIds, capturar, editarEvento, excluirEvento } = useTurno();

  const [texto, setTexto] = useState('');
  const [focado, setFocado] = useState(false);
  const [contextoId, setContextoId] = useState<string>('');

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editTexto, setEditTexto] = useState('');
  const [editPatientId, setEditPatientId] = useState<string | null>(null);
  const [confirmandoExcluirId, setConfirmandoExcluirId] = useState<string | null>(null);

  // Cards com o texto original (pré-organização) expandido
  const [originalAbertoIds, setOriginalAbertoIds] = useState<string[]>([]);

  function alternarOriginal(id: string) {
    setOriginalAbertoIds((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]
    );
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Leito detectado em tempo real enquanto o enfermeiro digita
  const deteccaoAoVivo = texto.trim() ? detectarLeito(texto) : null;

  // Paciente do contexto ativo (seletor no topo)
  const pacienteContexto = turno.pacientes.find((p) => p.id === contextoId) ?? null;

  function handleCapturar() {
    const t = texto.trim();
    if (!t) return;
    capturar(t, contextoId || null);
    setTexto('');
    textareaRef.current?.focus();

    // Atualiza contexto para o leito que acabou de ser detectado ou o já selecionado
    if (deteccaoAoVivo) {
      const p = turno.pacientes.find(
        (x) => x.leito.toLowerCase() === deteccaoAoVivo.leito.toLowerCase()
      );
      if (p) setContextoId(p.id);
    }
  }

  function iniciarEdicao(id: string, textoAtual: string, patientId: string | null) {
    setEditandoId(id);
    setEditTexto(textoAtual);
    setEditPatientId(patientId);
  }

  function salvarEdicao() {
    if (!editandoId) return;
    editarEvento(editandoId, editTexto.trim() || editTexto, editPatientId);
    setEditandoId(null);
  }

  const eventosOrdenados = [...turno.eventos].sort((a, b) => b.ts - a.ts);
  const temAtivo = focado || texto.length > 0;

  if (!carregado) return <Layout><div className="estado-vazio">Carregando...</div></Layout>;

  return (
    <Layout>
      {/* ── Contexto ativo ─────────────────────────────────────── */}
      <div className="contexto-bar">
        <div style={{ flex: 1, minWidth: 0 }}>
          {pacienteContexto ? (
            <>
              <div className="contexto-leito">{pacienteContexto.leito}</div>
              <div className="contexto-sub">
                {COMPLEXIDADE_LABEL[pacienteContexto.complexidade]}
                {pacienteContexto.dx ? ` · ${pacienteContexto.dx}` : ''}
              </div>
            </>
          ) : (
            <>
              <div className="contexto-leito" style={{ color: 'var(--color-ink-faint)', fontSize: '0.95rem', fontWeight: 600 }}>
                Nenhum leito selecionado
              </div>
              <div className="contexto-sub">O leito é detectado automaticamente pelo texto</div>
            </>
          )}
        </div>

        {turno.pacientes.length > 0 && (
          <select
            className="contexto-select"
            value={contextoId}
            onChange={(e) => setContextoId(e.target.value)}
            aria-label="Selecionar leito de contexto"
          >
            <option value="">— Geral —</option>
            {turno.pacientes.map((p) => (
              <option key={p.id} value={p.id}>{p.leito}</option>
            ))}
          </select>
        )}
      </div>

      {/* ── Área de captura ─────────────────────────────────────── */}
      <div className={`captura-wrapper${temAtivo ? ' ativa' : ''}`}>
        <div className="captura-status">
          <span className={`captura-dot${temAtivo ? ' pulsando' : ''}`} />
          <span className={`captura-label${temAtivo ? ' ativa' : ''}`}>
            {temAtivo ? 'Capturando' : 'Aguardando'}
          </span>
        </div>

        <textarea
          ref={textareaRef}
          className="captura-textarea"
          aria-label="Registrar nota do plantão"
          placeholder={'Dite ou escreva: "leito 5, PA 130x80, dor 3/10"\nO leito é detectado automaticamente pelo contexto.'}
          value={texto}
          rows={3}
          onChange={(e) => setTexto(e.target.value)}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleCapturar();
            }
          }}
        />

        {/* Preview de leito detectado em tempo real */}
        <div className="captura-preview">
          {deteccaoAoVivo
            ? `→ será associado a: ${deteccaoAoVivo.leito}`
            : pacienteContexto && texto.trim()
              ? `→ contexto: ${pacienteContexto.leito}`
              : texto.trim()
                ? '→ nota geral (sem leito detectado)'
                : ''}
        </div>

        <div className="captura-acoes">
          <button
            className="btn btn-primario"
            style={{ flex: 1 }}
            onClick={handleCapturar}
            disabled={!texto.trim()}
          >
            Adicionar
          </button>
          <button
            className="btn btn-secundario"
            style={{ padding: '10px 14px' }}
            onClick={() => setTexto('')}
            disabled={!texto}
            aria-label="Limpar"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Histórico estilo "Past Sessions" ────────────────────── */}
      {eventosOrdenados.length === 0 ? (
        <div className="estado-vazio">Nenhum registro neste turno.</div>
      ) : (
        <>
          <div className="sessoes-header">
            <span className="sessoes-titulo">
              {turno.eventos.length} registro{turno.eventos.length !== 1 ? 's' : ''} neste turno
            </span>
          </div>

          {eventosOrdenados.map((ev) => {
            const paciente = turno.pacientes.find((p) => p.id === ev.patientId);
            const estaEditando = editandoId === ev.id;
            const estaOrganizando = organizandoIds.includes(ev.id);
            const temConferir = ev.texto.includes('(CONFERIR');
            const originalAberto = originalAbertoIds.includes(ev.id);

            return (
              <div
                key={ev.id}
                className={`sessao-card${estaEditando ? ' editando' : ''}`}
                style={temConferir && !estaEditando ? { borderColor: 'var(--color-warn)' } : undefined}
              >
                {estaEditando ? (
                  /* ── Modo edição inline ────────────────────────── */
                  <>
                    <div className="sessao-card-header">
                      <span className="sessao-hora-pill">{ev.hora}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-ink-faint)' }}>Editando</span>
                    </div>

                    <div className="campo" style={{ marginBottom: 8 }}>
                      <textarea
                        value={editTexto}
                        onChange={(e) => setEditTexto(e.target.value)}
                        rows={2}
                        autoFocus
                      />
                    </div>

                    <div className="campo" style={{ marginBottom: 10 }}>
                      <label>Paciente</label>
                      <select
                        value={editPatientId ?? ''}
                        onChange={(e) => setEditPatientId(e.target.value || null)}
                      >
                        <option value="">— Notas gerais (sem leito) —</option>
                        {turno.pacientes.map((p) => (
                          <option key={p.id} value={p.id}>{p.leito}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primario" style={{ flex: 1 }} onClick={salvarEdicao}>
                        Salvar
                      </button>
                      <button className="btn btn-secundario" onClick={() => setEditandoId(null)}>
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  /* ── Modo visualização ─────────────────────────── */
                  <>
                    <div className="sessao-card-header">
                      <span className="sessao-hora-pill">{ev.hora}</span>

                      {paciente ? (
                        <span className="sessao-leito-pill">{paciente.leito}</span>
                      ) : (
                        <span className="sessao-sem-leito-pill">⚠ sem leito</span>
                      )}

                      <span className="sessao-tipo-pill">{ev.tipo}</span>

                      {temConferir && (
                        <span className="sessao-sem-leito-pill" title="Contém trecho ambíguo do ditado — conferir antes de usar">
                          ⚠ conferir
                        </span>
                      )}

                      {ev.organizacaoFalhou && (
                        <span className="sessao-sem-leito-pill" title="A organização automática falhou — o texto cru foi mantido sem revisão">
                          ⚠ não revisado
                        </span>
                      )}

                      <div className="sessao-acoes">
                        {confirmandoExcluirId === ev.id ? (
                          <>
                            <button
                              className="btn-icone perigo"
                              onClick={() => { excluirEvento(ev.id); setConfirmandoExcluirId(null); }}
                              aria-label="Confirmar exclusão"
                              style={{ fontSize: '0.7rem', width: 'auto', padding: '3px 8px', fontWeight: 700 }}
                            >
                              Excluir
                            </button>
                            <button
                              className="btn-icone"
                              onClick={() => setConfirmandoExcluirId(null)}
                              aria-label="Cancelar exclusão"
                              style={{ fontSize: '0.7rem', width: 'auto', padding: '3px 8px' }}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn-icone"
                              onClick={() => iniciarEdicao(ev.id, ev.texto, ev.patientId)}
                              aria-label="Editar"
                            >
                              <IconLapis />
                            </button>
                            <button
                              className="btn-icone perigo"
                              onClick={() => setConfirmandoExcluirId(ev.id)}
                              aria-label="Excluir"
                            >
                              <IconLixeira />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="sessao-texto" style={estaOrganizando ? { opacity: 0.55 } : undefined}>
                      {ev.texto}
                    </p>

                    {estaOrganizando && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--color-ink-faint)', marginTop: 4 }}>
                        Organizando registro…
                      </div>
                    )}

                    {ev.textoOriginal && (
                      <div style={{ marginTop: 6 }}>
                        <button
                          className="btn-icone"
                          style={{ fontSize: '0.74rem', width: 'auto', padding: '2px 6px' }}
                          onClick={() => alternarOriginal(ev.id)}
                        >
                          {originalAberto ? 'Ocultar original' : 'Ver original'}
                        </button>
                        {originalAberto && (
                          <p className="sessao-texto" style={{ opacity: 0.65, fontStyle: 'italic', marginTop: 4 }}>
                            {ev.textoOriginal}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </>
      )}
    </Layout>
  );
}

function IconLapis() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconLixeira() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}
