import { useRouter } from 'next/router';
import { House, Users, Plus, BookOpen, CircleUser } from 'lucide-react';
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
          <House strokeWidth={2} />
          Home
        </button>

        {/* Pacientes */}
        <button
          className={`nav-item${rota === '/pacientes' ? ' ativo' : ''}`}
          onClick={() => navegar('/pacientes')}
        >
          <Users strokeWidth={2} />
          Pacientes
        </button>

        {/* FAB — entrada única de evolução (tela de seleção de setor) */}
        <button
          className="nav-fab"
          onClick={() => navegar('/evoluir')}
          aria-label="Evoluir paciente"
        >
          <Plus strokeWidth={2.5} />
        </button>

        {/* KRONOS — aponta para Conhecimento, que também dá acesso a Escalas */}
        <button
          className={`nav-item${rota === '/biblioteca' || rota.startsWith('/conhecimento') || rota === '/escalas' ? ' ativo' : ''}`}
          onClick={() => navegar('/biblioteca')}
        >
          <BookOpen strokeWidth={2} />
          KRONOS
        </button>

        {/* Perfil */}
        <button
          className={`nav-item${rota === '/perfil' || rota === '/encerramento' ? ' ativo' : ''}`}
          onClick={() => navegar('/perfil')}
        >
          <CircleUser strokeWidth={2} />
          Perfil
        </button>
      </nav>
    </div>
  );
}
