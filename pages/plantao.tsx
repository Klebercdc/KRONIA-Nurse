import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { useTurno, montarDadosRelatorioFinal } from '../components/useTurno';
import { COMPLEXIDADE_LABEL } from '../lib/types';

interface TermoSemValor {
  termo: string;
  parametro: string;
}

interface ResultadoAlerta {
  leito: string;
  news2: { total: number; risco: string } | null;
  qsofa: { total: number; risco: string } | null;
  fontes: string;
  termosSemValor: TermoSemValor[];
}

export default function Plantao() {
  const { turno, carregado } = useTurno();
  const [alertas, setAlertas] = useState<ResultadoAlerta[]>([]);
  const [carregandoAlertas, setCarregandoAlertas] = useState(false);
  const [erroAlertas, setErroAlertas] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function verificarAlertas() {
    setCarregandoAlertas(true);
    setErroAlertas('');
    try {
      const dados = montarDadosRelatorioFinal(turno.pacientes, turno.eventos);
      const resp = await fetch('/api/plantao/calcular-alertas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dados }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.erro);
      setAlertas(json.resultado);
    } catch (e: unknown) {
      setErroAlertas(e instanceof Error ? e.message : 'Erro ao calcular alertas.');
    } finally {
      setCarregandoAlertas(false);
    }
  }

  // Recalcula 2 s após cada alteração no total de registros (add ou delete).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!carregado || turno.eventos.length === 0) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(verificarAlertas, 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [turno.eventos.length, carregado]); // verificarAlertas lê turno via closure — estável

  if (!carregado) return <Layout><div className="estado-vazio">Carregando...</div></Layout>;

  const { pacientes, eventos } = turno;
  const totalEventos = eventos.length;
  const ultimosEventos = [...eventos].sort((a, b) => b.ts - a.ts).slice(0, 5);

  const contagemComplexidade = Object.entries(COMPLEXIDADE_LABEL).reduce<Record<string, number>>(
    (acc, [chave]) => {
      acc[chave] = pacientes.filter((p) => p.complexidade === chave).length;
      return acc;
    },
    {}
  );

  return (
    <Layout>
      <div className="tela-header">
        <h1 className="tela-titulo">Plantão</h1>
        <span style={{ fontSize: '0.8rem', color: 'var(--cinza-400)' }}>
          {pacientes.length} paciente{pacientes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {pacientes.length === 0 ? (
        <div className="estado-vazio">
          <p>Nenhum paciente registrado ainda.</p>
          <p style={{ marginTop: 8, fontSize: '0.8rem' }}>Use o botão + para registrar o primeiro evento.</p>
        </div>
      ) : (
        <>
          {/* Contagem por complexidade */}
          <div className="card">
            <p className="card-titulo">Distribuição por complexidade</p>
            {Object.entries(COMPLEXIDADE_LABEL).map(([chave, label]) => {
              const n = contagemComplexidade[chave];
              if (!n) return null;
              return (
                <div key={chave} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
                  <span className={`badge badge-${chave}`}>{label}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{n}</span>
                </div>
              );
            })}
          </div>

          {/* Últimos registros */}
          {ultimosEventos.length > 0 && (
            <div className="card">
              <p className="card-titulo">Últimos registros ({totalEventos} total)</p>
              {ultimosEventos.map((ev) => {
                const p = pacientes.find((x) => x.id === ev.patientId);
                return (
                  <div key={ev.id} className="evento-linha">
                    <span className="evento-hora">{ev.hora}</span>
                    <div style={{ flex: 1 }}>
                      {p && <span className="tipo-tag">{p.leito} · </span>}
                      <span className="evento-texto">{ev.texto}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Alertas NEWS2/qSOFA — calculados automaticamente a cada novo registro */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cinza-400)' }}>
              Alertas NEWS2/qSOFA
            </span>
            {carregandoAlertas && (
              <span
                className="spinner"
                style={{ width: 13, height: 13, borderTopColor: 'var(--azul)', borderColor: 'var(--cinza-200)' }}
              />
            )}
          </div>

          {erroAlertas && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <p style={{ color: 'var(--vermelho)', fontSize: '0.85rem', flex: 1 }}>{erroAlertas}</p>
              <button
                className="btn btn-secundario"
                style={{ padding: '4px 10px', fontSize: '0.78rem', flexShrink: 0 }}
                onClick={verificarAlertas}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {alertas.map((a) => {
            const temScore = a.news2 !== null || a.qsofa !== null;
            const temTermos = a.termosSemValor.length > 0;
            const risco = a.news2?.risco ?? a.qsofa?.risco ?? 'Baixo';
            const cls = risco === 'Alto' ? 'alerta-alto' : risco === 'Médio' ? 'alerta-medio' : 'alerta-baixo';
            const badgeCls = risco === 'Alto' ? 'badge-risco-alto' : risco === 'Médio' ? 'badge-risco-medio' : 'badge-risco-baixo';

            return (
              <div key={a.leito}>
                {/* Score NEWS2 / qSOFA — só exibe se houver dados numéricos suficientes */}
                {temScore && (
                  <div className={`alerta-card ${cls}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <strong style={{ fontSize: '0.9rem' }}>{a.leito}</strong>
                      <span className={`badge ${badgeCls}`}>{risco}</span>
                    </div>
                    {a.news2 && (
                      <p style={{ fontSize: '0.8rem' }}>NEWS2: {a.news2.total} pts</p>
                    )}
                    {a.qsofa && (
                      <p style={{ fontSize: '0.8rem' }}>qSOFA: {a.qsofa.total} pts — {a.qsofa.risco}</p>
                    )}
                    {a.fontes && (
                      <p style={{ fontSize: '0.72rem', color: 'var(--cinza-700)', marginTop: 4 }}>{a.fontes}</p>
                    )}
                  </div>
                )}

                {/* Termos qualitativos sem valor numérico — alerta separado, não pontua */}
                {temTermos && (
                  <div className="alerta-card" style={{
                    background: '#FFFBEB',
                    borderColor: '#D97706',
                    borderLeft: '4px solid #D97706',
                    marginBottom: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: '0.85rem' }}>⚠</span>
                      <strong style={{ fontSize: '0.875rem', color: '#92400E' }}>
                        {!temScore ? a.leito + ' — ' : ''}Termos sem valor numérico
                      </strong>
                    </div>

                    {a.termosSemValor.map((t) => (
                      <div key={t.termo} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        padding: '4px 0',
                        borderBottom: '1px solid #FDE68A',
                      }}>
                        <span style={{ fontSize: '0.82rem', color: '#78350F', fontWeight: 600 }}>
                          &ldquo;{t.termo}&rdquo;
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#92400E' }}>
                          → {t.parametro}
                        </span>
                      </div>
                    ))}

                    <p style={{
                      fontSize: '0.72rem',
                      color: '#92400E',
                      marginTop: 8,
                      lineHeight: 1.5,
                      fontStyle: 'italic',
                    }}>
                      Termo citado sem valor numérico — verificar manualmente e registrar o valor com o botão +.
                    </p>
                  </div>
                )}

                {/* Leito sem score E sem termos: dados insuficientes */}
                {!temScore && !temTermos && (
                  <div className="alerta-card alerta-baixo">
                    <strong style={{ fontSize: '0.875rem' }}>{a.leito}</strong>
                    <p style={{ fontSize: '0.78rem', color: 'var(--cinza-700)', marginTop: 4 }}>
                      Dados insuficientes para calcular NEWS2/qSOFA neste turno.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </Layout>
  );
}
