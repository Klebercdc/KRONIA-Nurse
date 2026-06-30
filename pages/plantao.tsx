import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useTurno } from '../components/useTurno';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const { turno, carregado } = useTurno();
  const { user } = useAuth();
  const router = useRouter();

  if (!carregado) return <Layout><div className="estado-vazio">Carregando...</div></Layout>;

  const nome = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Enfermeiro(a)';
  const primeiroNome = nome.split(' ')[0];

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'BOM DIA' : hora < 18 ? 'BOA TARDE' : 'BOA NOITE';

  const ultimosEventos = [...turno.eventos].sort((a, b) => b.ts - a.ts).slice(0, 5);

  return (
    <Layout>
      {/* Header */}
      <div style={{ padding: '18px 0 10px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            color: 'var(--color-ink-faint)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '0 0 2px',
          }}>
            {saudacao}
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.45rem',
            fontWeight: 700,
            color: 'var(--color-ink)',
            margin: 0,
            lineHeight: 1.15,
          }}>
            {primeiroNome}
          </h1>
        </div>
        <button
          onClick={() => router.push('/perfil')}
          style={{
            background: 'var(--color-clinical-tint)',
            border: 'none',
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--color-clinical)',
            marginTop: 4,
          }}
          aria-label="Notificações"
        >
          <IconSino />
        </button>
      </div>

      {/* StatCards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div className="stat-card">
          <span className="stat-card-label">Pacientes</span>
          <span className="stat-card-value">{turno.pacientes.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Registros</span>
          <span className="stat-card-value">{turno.eventos.length}</span>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <button
          className="btn btn-primario"
          style={{ borderRadius: 14, padding: '14px 12px', fontSize: '0.88rem', justifyContent: 'center' }}
          onClick={() => router.push('/registrar')}
        >
          <IconMais />
          Novo registro
        </button>
        <button
          className="btn btn-secundario"
          style={{ borderRadius: 14, padding: '14px 12px', fontSize: '0.88rem', justifyContent: 'center' }}
          onClick={() => router.push('/pacientes')}
        >
          <IconPacientes />
          Pacientes
        </button>
      </div>

      {/* Escalas quick access */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => router.push('/escalas')}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-line)',
            borderRadius: 14,
            padding: '14px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.88rem',
            fontWeight: 600,
            color: 'var(--color-ink)',
          }}
        >
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: 'var(--color-clinical-tint)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-clinical)',
            flexShrink: 0,
          }}>
            <IconRelogio />
          </div>
          Escalas
        </button>
        <button
          onClick={() => router.push('/kronos')}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-line)',
            borderRadius: 14,
            padding: '14px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.88rem',
            fontWeight: 600,
            color: 'var(--color-ink)',
          }}
        >
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: 'var(--color-clinical-tint)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-clinical)',
            flexShrink: 0,
          }}>
            <IconKronos />
          </div>
          KRONOS
        </button>
      </div>

      {/* Encerrar turno card */}
      <div
        style={{
          background: 'var(--color-clinical-tint)',
          border: '1px solid rgba(11,79,138,.18)',
          borderRadius: 14,
          padding: '16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.95rem',
            fontWeight: 700,
            color: 'var(--color-ink)',
            margin: '0 0 3px',
          }}>
            Encerrar turno
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', margin: 0 }}>
            Gere a evolução SAE/COFEN do plantão
          </p>
        </div>
        <button
          className="btn btn-primario"
          style={{ padding: '10px 16px', fontSize: '0.85rem', borderRadius: 10, whiteSpace: 'nowrap', flexShrink: 0 }}
          onClick={() => router.push('/encerramento')}
        >
          Gerar evolução
        </button>
      </div>

      {/* Atividade recente */}
      {ultimosEventos.length > 0 && (
        <div className="card">
          <p className="card-titulo">Atividade recente</p>
          {ultimosEventos.map((ev) => {
            const paciente = turno.pacientes.find((p) => p.id === ev.patientId);
            return (
              <div key={ev.id} className="evento-linha">
                <span className="evento-hora">{ev.hora}</span>
                <div style={{ flex: 1 }}>
                  {paciente && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: 'var(--color-clinical)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {paciente.leito} ·{' '}
                    </span>
                  )}
                  <span className="evento-texto">{ev.texto}</span>
                </div>
                <span style={{
                  background: 'var(--color-ok-tint)',
                  color: 'var(--color-ok)',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 20,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  flexShrink: 0,
                }}>
                  Registrado
                </span>
              </div>
            );
          })}
        </div>
      )}

      {turno.pacientes.length === 0 && turno.eventos.length === 0 && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-line)',
          borderRadius: 14,
          padding: '32px 16px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'var(--color-clinical-tint)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            color: 'var(--color-clinical)',
          }}>
            <IconPlantao />
          </div>
          <p style={{ fontWeight: 700, color: 'var(--color-ink)', marginBottom: 4, fontSize: '0.95rem' }}>
            Plantão iniciado
          </p>
          <p style={{ fontSize: '0.83rem', color: 'var(--color-ink-muted)', lineHeight: 1.5 }}>
            Use o botão + para registrar o primeiro evento do turno
          </p>
        </div>
      )}
    </Layout>
  );
}

function IconSino() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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

function IconPacientes() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconRelogio() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 15" />
    </svg>
  );
}

function IconKronos() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function IconPlantao() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
