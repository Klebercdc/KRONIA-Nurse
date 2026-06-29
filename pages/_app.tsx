import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import '../styles/globals.css';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

const ROTAS_PUBLICAS = ['/', '/login', '/cadastro'];

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const rotaPublica = ROTAS_PUBLICAS.includes(router.pathname);

  useEffect(() => {
    if (!loading && !user && !rotaPublica) {
      router.replace('/login');
    }
  }, [loading, user, rotaPublica, router]);

  // Enquanto verifica sessão, não renderiza nada para evitar flash de conteúdo protegido
  if (loading) return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--cinza-100)',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--azul)' }}>KRONIA Nurse</div>
      <div className="spinner" style={{ borderColor: 'rgba(0,85,255,0.2)', borderTopColor: 'var(--azul)' }} />
    </div>
  );

  if (!user && !rotaPublica) return null;

  return <>{children}</>;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <AuthGate>
        <Component {...pageProps} />
      </AuthGate>
    </AuthProvider>
  );
}
