import { useRouter } from 'next/router';

interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props) {
  const router = useRouter();
  const rota = router.pathname;

  function navegar(href: string) {
    router.push(href);
  }

  return (
    <div className="app-shell">
      <main className="main-content">{children}</main>

      <nav className="bottom-nav">
        <button
          className={`nav-item${rota === '/plantao' ? ' ativo' : ''}`}
          onClick={() => navegar('/plantao')}
        >
          <IconPlantao />
          Plantão
        </button>

        <button
          className={`nav-item${rota === '/pacientes' ? ' ativo' : ''}`}
          onClick={() => navegar('/pacientes')}
        >
          <IconPacientes />
          Pacientes
        </button>

        <button
          className="nav-registrar"
          onClick={() => navegar('/registrar')}
          aria-label="Registrar"
        >
          <IconMais />
        </button>

        <button
          className={`nav-item${rota === '/kronos' ? ' ativo' : ''}`}
          onClick={() => navegar('/kronos')}
        >
          <IconKronos />
          Escalas
        </button>

        <button
          className={`nav-item${rota === '/encerramento' ? ' ativo' : ''}`}
          onClick={() => navegar('/encerramento')}
        >
          <IconEncerramento />
          Encerrar
        </button>
      </nav>
    </div>
  );
}

function IconPlantao() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
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
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 15" />
    </svg>
  );
}

function IconEncerramento() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
