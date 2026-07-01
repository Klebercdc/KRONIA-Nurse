import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useTurno } from '../components/useTurno';
import { Complexidade, COMPLEXIDADE_LABEL } from '../lib/types';

/** Maps clinical complexity to simple display tags per spec */
function complexityTag(c: Complexidade): { label: string; cls: string } {
  if (c === 'minimos') return { label: 'Estável', cls: 'badge-estavel' };
  if (c === 'intensivos') return { label: 'Crítico', cls: 'badge-critico' };
  return { label: 'Intermediário', cls: 'badge-intermediario' };
}

const FILTROS = ['Todos', 'UTI', 'Semi-intensiva', 'Enfermaria'] as const;
type Filtro = typeof FILTROS[number];

export default function Pacientes() {
  const { turno, carregado, adicionarPaciente, removerPaciente } = useTurno();
  const router = useRouter();
  const [leito, setLeito] = useState('');
  const [dx, setDx] = useState('');
  const [complexidade, setComplexidade] = useState<Complexidade>('intermediarios');
  const [confirmandoRemover, setConfirmandoRemover] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('Todos');
  const [mostrarForm, setMostrarForm] = useState(false);

  function handleAdicionar() {
    const l = leito.trim();
    if (!l) return;
    adicionarPaciente(l, dx.trim(), complexidade);
    setLeito('');
    setDx('');
    setComplexidade('intermediarios');
    setMostrarForm(false);
  }

  if (!carregado) return <Layout><div className="estado-vazio">Carregando...</div></Layout>;

  const pacientesFiltrados = turno.pacientes; // Filtering is UI-only; clinical category filters can be added later

  return (
    <Layout>
      {/* Header */}
      <div className="tela-header">
        <h1 className="tela-titulo">Pacientes</h1>
        <span style={{ fontSize: '0.82rem', color: 'var(--color-ink-faint)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
          {turno.pacientes.length}
        </span>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 14, scrollbarWidth: 'none' }}>
        {FILTROS.map((f) => (
          <button
            key={f}
            className={`pill${filtro === f ? ' ativo' : ''}`}
            onClick={() => setFiltro(f)}
          >
            {f}
          </button>
        ))}
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
          const tag = complexityTag(p.complexidade);

          return (
            <div key={p.id} className="card" style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => router.push(`/registrar?leito=${p.id}`)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <strong style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.05rem',
                      fontWeight: 600,
                      color: 'var(--color-ink)',
                    }}>
                      {p.leito}
                    </strong>
                    <span className={`badge ${tag.cls}`}>{tag.label}</span>
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
                    {nEventos} registro{nEventos !== 1 ? 's' : ''} · {COMPLEXIDADE_LABEL[p.complexidade]}
                  </p>
                </div>

                {confirmandoRemover === p.id ? (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
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
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn-icone perigo"
                    onClick={() => setConfirmandoRemover(p.id)}
                    aria-label="Remover paciente"
                    style={{ marginTop: 2 }}
                  >
                    <IconLixeira />
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Add patient form */}
      {mostrarForm ? (
        <div className="card" style={{ marginTop: 8 }}>
          <p className="card-titulo">Novo paciente</p>

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
              Adicionar
            </button>
            <button className="btn btn-secundario" style={{ padding: '12px 16px' }} onClick={() => setMostrarForm(false)}>
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
