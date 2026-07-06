import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useTurno } from '../components/useTurno';
import { Complexidade, COMPLEXIDADE_LABEL } from '../lib/types';

export default function Pacientes() {
  const { turno, carregado, adicionarPaciente, removerPaciente, editarPaciente } = useTurno();
  const router = useRouter();
  const [leito, setLeito] = useState('');
  const [dx, setDx] = useState('');
  const [complexidade, setComplexidade] = useState<Complexidade>('intermediarios');
  const [confirmandoRemover, setConfirmandoRemover] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  function handleAdicionar() {
    const l = leito.trim();
    if (!l) return;
    if (editandoId) {
      editarPaciente(editandoId, l, dx.trim(), complexidade);
    } else {
      adicionarPaciente(l, dx.trim(), complexidade);
    }
    fecharForm();
  }

  function abrirEdicao(id: string) {
    const p = turno.pacientes.find((x) => x.id === id);
    if (!p) return;
    setEditandoId(id);
    setLeito(p.leito);
    setDx(p.dx ?? '');
    setComplexidade(p.complexidade);
    setMostrarForm(true);
  }

  function fecharForm() {
    setLeito('');
    setDx('');
    setComplexidade('intermediarios');
    setEditandoId(null);
    setMostrarForm(false);
  }

  if (!carregado) return <Layout><div className="estado-vazio">Carregando...</div></Layout>;

  const pacientesFiltrados = turno.pacientes;

  return (
    <Layout>
      {/* Header */}
      <div className="tela-header">
        <h1 className="tela-titulo">Pacientes</h1>
        <span style={{ fontSize: '0.82rem', color: 'var(--color-ink-faint)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
          {turno.pacientes.length}
        </span>
      </div>

      <div className="aviso-privacidade">
        Use apenas leito ou identificador interno. Nunca nome, CPF ou dados que identifiquem o paciente.
      </div>

      {/* Patient cards */}
      {pacientesFiltrados.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-line)',
          borderRadius: 14,
          padding: '32px 16px',
          textAlign: 'center',
          marginBottom: 16,
        }}>
          <p style={{ fontWeight: 700, color: 'var(--color-ink)', marginBottom: 4 }}>Nenhum paciente</p>
          <p style={{ fontSize: '0.83rem', color: 'var(--color-ink-muted)' }}>
            Use o botão abaixo para adicionar o primeiro leito
          </p>
        </div>
      ) : (
        pacientesFiltrados.map((p) => {
          const nEventos = turno.eventos.filter((e) => e.patientId === p.id).length;

          return (
            <div key={p.id} className="card" style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => router.push(`/registrar?leito=${p.id}`)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                    <strong style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.05rem',
                      fontWeight: 600,
                      color: 'var(--color-ink)',
                    }}>
                      {p.leito}
                    </strong>
                    <span className={`badge badge-${p.complexidade}`}>{COMPLEXIDADE_LABEL[p.complexidade]}</span>
                  </div>
                  {p.dx && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-ink-muted)', marginBottom: 4 }}>
                      {p.dx}
                    </p>
                  )}
                  <p style={{
                    fontSize: '0.72rem',
                    color: 'var(--color-ink-faint)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {nEventos} registro{nEventos !== 1 ? 's' : ''}
                  </p>
                </div>

                {confirmandoRemover === p.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0, maxWidth: 150 }}>
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-danger)', textAlign: 'right', margin: 0, lineHeight: 1.4 }}>
                      {nEventos > 0
                        ? `Apaga também ${nEventos} registro${nEventos !== 1 ? 's' : ''}. Não pode ser desfeito.`
                        : 'Não pode ser desfeito.'}
                    </p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-perigo"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => { removerPaciente(p.id); setConfirmandoRemover(null); }}
                      >
                        Remover
                      </button>
                      <button
                        className="btn btn-secundario"
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        onClick={() => setConfirmandoRemover(null)}
                        aria-label="Cancelar remoção"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0, marginTop: 2 }}>
                    <button
                      className="btn-icone"
                      onClick={() => abrirEdicao(p.id)}
                      aria-label="Editar paciente"
                    >
                      <IconLapis />
                    </button>
                    <button
                      className="btn-icone perigo"
                      onClick={() => setConfirmandoRemover(p.id)}
                      aria-label="Remover paciente"
                    >
                      <IconLixeira />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Add/edit patient form */}
      {mostrarForm ? (
        <div className="card" style={{ marginTop: 8 }}>
          <p className="card-titulo">{editandoId ? 'Editar paciente' : 'Novo paciente'}</p>

          <div className="campo">
            <label>Leito / identificador *</label>
            <input
              placeholder="ex: Leito 5, UTI 3A, LT-02"
              value={leito}
              onChange={(e) => setLeito(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdicionar()}
              autoFocus
            />
          </div>

          <div className="campo">
            <label>Diagnóstico / condição (opcional)</label>
            <input
              placeholder="ex: ICC descompensada"
              value={dx}
              onChange={(e) => setDx(e.target.value)}
            />
          </div>

          <div className="campo">
            <label>Complexidade</label>
            <select value={complexidade} onChange={(e) => setComplexidade(e.target.value as Complexidade)}>
              {Object.entries(COMPLEXIDADE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primario" style={{ flex: 1 }} onClick={handleAdicionar} disabled={!leito.trim()}>
              {editandoId ? 'Salvar' : 'Adicionar'}
            </button>
            <button className="btn btn-secundario" style={{ padding: '12px 16px' }} onClick={fecharForm}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn btn-primario btn-bloco"
          style={{ marginTop: 8 }}
          onClick={() => setMostrarForm(true)}
        >
          <IconMais />
          Novo paciente
        </button>
      )}
    </Layout>
  );
}

function IconLapis() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
    </svg>
  );
}

function IconLixeira() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function IconMais() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
