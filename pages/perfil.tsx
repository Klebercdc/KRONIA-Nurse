import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../lib/theme-context';
import { useTurno } from '../components/useTurno';

export default function PerfilPage() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { turno } = useTurno();
  const router = useRouter();

  const nome = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Enfermeiro(a)';
  const iniciais = nome.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
  const email = user?.email || '';

  async function handleSair() {
    await signOut();
    router.replace('/login');
  }

  const hora = new Date();
  const horaInicio = new Date(turno.iniciadoEm);
  const duracaoHoras = Math.floor((hora.getTime() - horaInicio.getTime()) / 3600000);

  return (
    <Layout>
      {/* Header */}
      <div className="tela-header">
        <h1 className="tela-titulo">Perfil</h1>
      </div>

      {/* Avatar + info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
        padding: '16px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        borderRadius: 16,
      }}>
        <div className="avatar">{iniciais}</div>
        <div>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'var(--color-ink)',
            margin: '0 0 3px',
          }}>
            {nome}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', margin: '0 0 2px' }}>
            {email}
          </p>
          <span style={{
            background: 'var(--color-clinical-tint)',
            color: 'var(--color-clinical)',
            fontSize: '0.68rem',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 20,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            Enfermagem
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div className="stat-card">
          <span className="stat-card-label">Turno atual</span>
          <span className="stat-card-value">{turno.pacientes.length}p</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Registros</span>
          <span className="stat-card-value">{turno.eventos.length}</span>
        </div>
      </div>

      {/* Conta section */}
      <div className="card" style={{ marginBottom: 12 }}>
        <p className="card-titulo">Conta</p>
        <div className="profile-row" onClick={() => {}}>
          <div className="profile-row-icon"><IconPessoa /></div>
          <span className="profile-row-label">Dados pessoais</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
        <div className="profile-row" onClick={() => {}}>
          <div className="profile-row-icon"><IconEscudo /></div>
          <span className="profile-row-label">Privacidade e dados</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      {/* Preferências section */}
      <div className="card" style={{ marginBottom: 12 }}>
        <p className="card-titulo">Preferências</p>

        {/* Theme toggle row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid var(--color-line)' }}>
          <div className="profile-row-icon"><IconTema /></div>
          <span className="profile-row-label">Tema</span>
          <div style={{
            display: 'flex',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-line)',
            borderRadius: 999,
            padding: 3,
            gap: 2,
          }}>
            <button
              onClick={() => setTheme('light')}
              style={{
                background: theme === 'light' ? 'var(--color-clinical)' : 'transparent',
                border: 'none',
                borderRadius: 999,
                width: 30,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              aria-label="Modo claro"
            >
              <IconSol color={theme === 'light' ? '#fff' : 'var(--color-ink-faint)'} />
            </button>
            <button
              onClick={() => setTheme('dark')}
              style={{
                background: theme === 'dark' ? 'var(--color-clinical-deep)' : 'transparent',
                border: 'none',
                borderRadius: 999,
                width: 30,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              aria-label="Modo escuro"
            >
              <IconLua color={theme === 'dark' ? '#fff' : 'var(--color-ink-faint)'} />
            </button>
          </div>
        </div>

        <div className="profile-row" onClick={() => {}}>
          <div className="profile-row-icon"><IconConfig /></div>
          <span className="profile-row-label">Configurações</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
        <div className="profile-row" onClick={() => {}}>
          <div className="profile-row-icon"><IconSino /></div>
          <span className="profile-row-label">Notificações</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      {/* Encerrar turno */}
      <div className="card" style={{ marginBottom: 12 }}>
        <p className="card-titulo">Plantão</p>
        <div className="profile-row" onClick={() => router.push('/encerramento')} style={{ borderBottom: 'none' }}>
          <div className="profile-row-icon" style={{ background: 'var(--color-ok-tint)', color: 'var(--color-ok)' }}>
            <IconCheck />
          </div>
          <div style={{ flex: 1 }}>
            <p className="profile-row-label" style={{ marginBottom: 1 }}>Encerrar turno</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-faint)' }}>
              Gerar evolução SAE/COFEN · {duracaoHoras}h de plantão
            </p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      {/* Sair */}
      <button
        onClick={handleSair}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '14px 16px',
          background: 'var(--color-danger-tint)',
          border: '1px solid rgba(197,41,58,.2)',
          borderRadius: 14,
          cursor: 'pointer',
          color: 'var(--color-danger)',
          fontWeight: 600,
          fontSize: '0.92rem',
          fontFamily: 'var(--font-body)',
        }}
      >
        <IconSair />
        Sair da conta
      </button>
    </Layout>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────

function IconPessoa() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconEscudo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconTema() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function IconConfig() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconSino() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconSair() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconSol({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function IconLua({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
