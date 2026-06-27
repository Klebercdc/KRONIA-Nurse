import { useState } from 'react';
import Layout from '../components/Layout';
import { useTurno } from '../components/useTurno';

export default function Registrar() {
  const { turno, carregado, capturar, editarEvento, excluirEvento } = useTurno();
  const [texto, setTexto] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editTexto, setEditTexto] = useState('');
  const [editPatientId, setEditPatientId] = useState<string | null>(null);

  function handleCapturar() {
    const t = texto.trim();
    if (!t) return;
    capturar(t);
    setTexto('');
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

  if (!carregado) return <Layout><div className="estado-vazio">Carregando...</div></Layout>;

  return (
    <Layout>
      <div className="tela-header">
        <h1 className="tela-titulo">Registrar</h1>
      </div>

      {/* Captura */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="campo" style={{ marginBottom: 10 }}>
          <label>Anotação (voz ou texto)</label>
          <textarea
            placeholder={'ex: "leito 5, PA 130x80, paciente refere dor 3/10"\n\nO leito é detectado automaticamente.'}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
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
            onClick={() => setTexto('')}
            disabled={!texto}
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Lista de eventos */}
      {eventosOrdenados.length === 0 ? (
        <div className="estado-vazio">Nenhum registro neste turno.</div>
      ) : (
        <div className="card">
          <p className="card-titulo">{turno.eventos.length} registro{turno.eventos.length !== 1 ? 's' : ''} neste turno</p>
          {eventosOrdenados.map((ev) => {
            const paciente = turno.pacientes.find((p) => p.id === ev.patientId);

            if (editandoId === ev.id) {
              return (
                <div key={ev.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--cinza-200)' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                    <span className="evento-hora">{ev.hora}</span>
                    <span className="tipo-tag">{ev.tipo}</span>
                  </div>
                  <div className="campo" style={{ marginBottom: 8 }}>
                    <textarea
                      value={editTexto}
                      onChange={(e) => setEditTexto(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="campo" style={{ marginBottom: 8 }}>
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
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-primario" style={{ flex: 1, padding: '8px' }} onClick={salvarEdicao}>
                      Salvar
                    </button>
                    <button className="btn btn-secundario" style={{ padding: '8px 12px' }} onClick={() => setEditandoId(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={ev.id} className="evento-linha">
                <span className="evento-hora">{ev.hora}</span>
                <div style={{ flex: 1 }}>
                  {paciente && (
                    <span className="tipo-tag">{paciente.leito} · </span>
                  )}
                  <span className="evento-texto">{ev.texto}</span>
                  <div style={{ marginTop: 2 }}>
                    <span className="tipo-tag">{ev.tipo}</span>
                    {!paciente && (
                      <span className="tipo-tag" style={{ color: 'var(--amarelo)', marginLeft: 6 }}>
                        ⚠ sem leito
                      </span>
                    )}
                  </div>
                </div>
                <div className="evento-acoes">
                  <button
                    className="btn-icone"
                    onClick={() => iniciarEdicao(ev.id, ev.texto, ev.patientId)}
                    aria-label="Editar"
                  >
                    <IconLapis />
                  </button>
                  <button
                    className="btn-icone perigo"
                    onClick={() => excluirEvento(ev.id)}
                    aria-label="Excluir"
                  >
                    <IconLixeira />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
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
