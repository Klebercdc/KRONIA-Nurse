import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Head from 'next/head';
import '../styles/globals.css';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider } from '../lib/theme-context';
import { fontVariables } from '../lib/fonts';

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

  if (loading) return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-clinical)', fontFamily: 'var(--font-display)' }}>
        KRONIA Nurse
      </div>
      <div className="spinner spinner-clinical" />
    </div>
  );

  if (!user && !rotaPublica) return null;

  return <>{children}</>;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      {/* Next.js injeta "width=device-width" por padrão, sem initial-scale.
          next/head dedupa por name="viewport", então isto substitui o default do framework. */}
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      {/* next/font não pode ser chamado de _document (Next lança "Font loaders
          cannot be called from _document"), então as variables entram por um
          wrapper. display:contents mantém o wrapper fora do layout — a caixa
          não existe, só a herança das custom properties. */}
      <div className={`${fontVariables} kronia-fontes`} style={{ display: 'contents' }}>
        <ThemeProvider>
          <AuthProvider>
            <AuthGate>
              <Component {...pageProps} />
            </AuthGate>
          </AuthProvider>
        </ThemeProvider>
      </div>
    </>
  );
}
