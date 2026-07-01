import { useRouter } from 'next/router';
import ShiftPulseBar from './ShiftPulseBar';

const ROTAS_SEM_PULSE = ['/login', '/cadastro', '/'];

interface Props {
  children: React.ReactNode;
  showPulseBar?: boolean;
}

export default function Layout({ children, showPulseBar = true }: Props) {
  const router = useRouter();
  const rota = router.pathname;

  function navegar(href: string) {
    router.push(href);
  }

  return (
    <div className="app-shell">
      {showPulseBar && !ROTAS_SEM_PULSE.includes(rota) && <ShiftPulseBar />}

      <main className="main-content">{children}</main>

      <nav className="bottom-nav">
        {/* Home */}
        <button
          className={`nav-item${rota === '/plantao' ? ' ativo' : ''}`}
          onClick={() => navegar('/plantao')}
        >
          <IconHome />
          Home
        </button>

        {/* Pacientes */}
        <button
          className={`nav-item${rota === '/pacientes' ? ' ativo' : ''}`}
          onClick={() => navegar('/pacientes')}
        >
          <IconPacientes />
          Pacientes
        </button>

        {/* FAB */}
        <button
          className="nav-fab"
          onClick={() => navegar('/registrar')}
          aria-label="Registrar"
        >
          <IconMais />
        </button>

        {/* KRONOS */}
        <button
          className={`nav-item${rota === '/kronos' || rota === '/escalas' ? ' ativo' : ''}`}
          onClick={() => navegar('/kronos')}
        >
          <IconKronos />
          KRONOS
        </button>

        {/* Perfil */}
        <button
          className={`nav-item${rota === '/perfil' || rota === '/encerramento' ? ' ativo' : ''}`}
          onClick={() => navegar('/perfil')}
        >
          <IconPerfil />
          Perfil
        </button>
      </nav>
    </div>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconPacientes() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconMais() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconKronos() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function IconPerfil() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
