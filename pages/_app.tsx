import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';

/**
 * Shell mínimo. O app é a árvore de perguntas em pages/index.tsx, que traz o
 * próprio splash e a própria tela de entrada — não há AuthGate, não há rota
 * privada, não há provider de tema (a tela é escura por definição).
 *
 * O que continua no repositório, mas desligado da interface: contexts/
 * AuthContext, lib/theme-context, lib/fonts, e todo o pages/api (KRONOS,
 * conhecimento, geração por IA). Nada disso é chamado a partir daqui — fica
 * parado, à espera da decisão de usar ou não IA.
 */
export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        {/* interactive-widget=resizes-content: no iOS/Chrome que suportam,
            faz o layout viewport (e portanto 100dvh) encolher junto com o
            teclado, em vez de manter o viewport fixo e deixar o Safari
            rolar a página inteira pra manter o input focado visível — que é
            a causa do scroll indesejado ao focar um campo. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
