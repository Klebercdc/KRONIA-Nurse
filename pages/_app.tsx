import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';

// Shell mínimo: sem provider de tema (o app é escuro por definição), sem
// AuthProvider e sem AuthGate — não há sessão, não há backend, não há rota
// privada. A aplicação inteira é a árvore de perguntas em pages/index.tsx.
export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
