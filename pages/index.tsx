import Head from 'next/head';
import KroniaNurseApp from '../components/KroniaNurseApp.jsx';

export default function Home() {
  return (
    <>
      <Head>
        <title>KRONIA Nurse</title>
        <meta
          name="description"
          content="Evolução de enfermagem por perguntas adaptativas. Um caminho, toda a clínica."
        />
      </Head>
      {/* O app pinta o próprio fundo, mas o body ainda é do tema claro herdado
          de styles/globals.css — sem isto, o overscroll mostra faixa branca.
          height/overflow: hidden tira o scroll do documento — o iOS Safari
          rola a página inteira (às vezes revelando conteúdo atrás da status
          bar) ao focar um input perto do topo, mesmo sem necessidade. Quem
          rola de verdade agora é o .kn-tela interno, com overflow-y:auto. */}
      <style jsx global>{`
        html,
        body {
          background: #020b08;
          height: 100%;
          overflow: hidden;
          overscroll-behavior: none;
        }
      `}</style>
      <KroniaNurseApp />
    </>
  );
}
