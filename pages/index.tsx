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
      <KroniaNurseApp />
    </>
  );
}
