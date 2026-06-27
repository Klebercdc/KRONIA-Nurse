import { useState } from 'react';
import Layout from '../components/Layout';
import { useTurno } from '../components/useTurno';
import { Complexidade, COMPLEXIDADE_LABEL } from '../lib/types';

export default function Pacientes() {
  const { turno, carregado, adicionarPaciente, removerPaciente } = useTurno();
  const [leito, setLeito] = useState('');
  const [dx, setDx] = useState('');
  const [complexidade, setComplexidade] = useState<Complexidade>('intermediarios');
  const [confirmandoRemover, setConfirmandoRemover] = useState<string | null>(null);

  function handleAdicionar() {
    const l = leito.trim();
    if (!l) return;
    adicionarPaciente(l, dx.trim(), complexidade);
    setLeito('');
    setDx('');
    setComplexidade('intermediarios');
  }

  if (!carregado) return <Layout><div className="estado-vazio">Carregando...</div></Layout>;

  return (
    <Layout>
      <div className="tela-header">
        <h1 className="tela-titulo">Pacientes</h1>
      </div>

      <div className="aviso-privacidade">
        Use apenas leito ou identificador interno. Nunca nome completo, CPF ou qualquer dado que identifique o paciente fora do contexto do turno.
      </div>

      {/* Formulário de adição */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p className="card-titulo">Adicionar paciente</p>

        <div className="campo">
          <label>Leito / identificador *</label>
          <input
            placeholder="ex: Leito 5, UTI 3A, LT-02"
            value={leito}
            onChange={(e) => setLeito(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdicionar()}
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

        <button className="btn btn-primario btn-bloco" onClick={handleAdicionar} disabled={!leito.trim()}>
          Adicionar
        </button>
      </div>

      {/* Lista de pacientes */}
      {turno.pacientes.length === 0 ? (
        <div className="estado-vazio">Nenhum paciente registrado.</div>
      ) : (
        turno.pacientes.map((p) => {
          const nEventos = turno.eventos.filter((e) => e.patientId === p.id).length;
          return (
            <div key={p.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <strong style={{ fontSize: '1rem' }}>{p.leito}</strong>
                    <span className={`badge badge-${p.complexidade}`}>{COMPLEXIDADE_LABEL[p.complexidade]}</span>
                  </div>
                  {p.dx && <p style={{ fontSize: '0.82rem', color: 'var(--cinza-700)', marginBottom: 3 }}>{p.dx}</p>}
                  <p style={{ fontSize: '0.75rem', color: 'var(--cinza-400)' }}>
                    {nEventos} registro{nEventos !== 1 ? 's' : ''} neste turno
                  </p>
                </div>

                {confirmandoRemover === p.id ? (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn btn-perigo"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => { removerPaciente(p.id); setConfirmandoRemover(null); }}
                    >
                      Confirmar
                    </button>
                    <button
                      className="btn btn-secundario"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => setConfirmandoRemover(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn-icone perigo"
                    onClick={() => setConfirmandoRemover(p.id)}
                    aria-label="Remover paciente"
                  >
                    <IconLixeira />
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </Layout>
  );
}

function IconLixeira() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}
