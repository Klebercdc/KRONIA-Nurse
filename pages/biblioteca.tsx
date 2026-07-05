import { useEffect, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Layout from '../components/Layout';
import { getSupabaseBrowser } from '../lib/supabase-browser';
import type { GuiaResumo } from './api/biblioteca/listar';

type CategoriaResumo = { categoria: string; total: number };

type RespostaListar = {
  categorias: CategoriaResumo[];
  destaque: GuiaResumo | null;
  guias: GuiaResumo[];
};

const ICONE_CATEGORIA: Record<string, JSX.Element> = {
  'Fundamentos de Enfermagem': <IconProtocolo />,
  'Procedimentos Gerais': <IconProcedimento />,
  'Administração de Medicamentos': <IconMedicamento />,
  'Segurança do Paciente': <IconEscudo />,
  'Controle de Infecção': <IconEscudo />,
  Curativos: <IconCurativo />,
  'Punção Venosa': <IconGota />,
  'Cateter Venoso Central': <IconGota />,
  'Cateter de Hemodiálise': <IconGota />,
  'Fístula Arteriovenosa': <IconGota />,
  Hemodiálise: <IconGota />,
  Nefrologia: <IconGota />,
  'Terapia Intensiva (UTI)': <IconProcedimento />,
  'Urgência e Emergência': <IconProcedimento />,
  Dispositivos: <IconDispositivo />,
};

export default function BibliotecaPage() {
  const [dados, setDados] = useState<RespostaListar | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    setErro('');
    try {
      const { data } = await getSupabaseBrowser().auth.getSession();
      const token = data.session?.access_token ?? '';
      const resp = await fetch('/api/biblioteca/listar', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await resp.json() as RespostaListar & { erro?: string };
      if (!resp.ok) throw new Error(json.erro ?? 'Erro ao carregar biblioteca.');
      setDados(json);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar biblioteca.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <Head><title>Biblioteca KRONOS — KRONIA Nurse</title></Head>
      <Layout>
        <div className="tela-header">
          <h1 className="tela-titulo">Biblioteca KRONOS</h1>
        </div>

        {carregando && (
          <div className="estado-vazio">
            <div className="spinner spinner-clinical" style={{ margin: '0 auto 10px' }} />
            Carregando biblioteca...
          </div>
        )}

        {!carregando && erro && (
          <div className="card" style={{ borderLeft: '3px solid var(--color-danger)', color: 'var(--color-ink-muted)' }}>
            {erro}
          </div>
        )}

        {!carregando && !erro && dados && (
          <>
            {dados.categorias.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  overflowX: 'auto',
                  paddingBottom: 6,
                  marginBottom: 18,
                }}
              >
                {dados.categorias.map((c) => (
                  <div
                    key={c.categoria}
                    className="card"
                    style={{
                      margin: 0,
                      flex: '0 0 auto',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      padding: '12px 16px',
                      minWidth: 88,
                    }}
                  >
                    <div className="kronos-grid-item-icon">
                      {ICONE_CATEGORIA[c.categoria] ?? <IconProtocolo />}
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-ink)', textAlign: 'center' }}>
                      {c.categoria}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {dados.destaque && (
              <>
                <p className="card-titulo" style={{ marginBottom: 8 }}>Em destaque</p>
                <GuiaDestaqueCard guia={dados.destaque} />
              </>
            )}

            {dados.guias.length > 0 && (
              <>
                <p className="card-titulo" style={{ marginTop: 20, marginBottom: 8 }}>Todos os guias</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {dados.guias.map((g) => (
                    <GuiaListaCard key={g.id} guia={g} />
                  ))}
                </div>
              </>
            )}

            {dados.categorias.length === 0 && !dados.destaque && (
              <div className="estado-vazio">Nenhum guia publicado ainda.</div>
            )}
          </>
        )}
      </Layout>
    </>
  );
}

function GuiaDestaqueCard({ guia }: { guia: GuiaResumo }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9' }}>
        {guia.cover_url ? (
          <Image
            src={guia.cover_url}
            alt={guia.titulo}
            fill
            priority
            sizes="(max-width: 430px) 100vw, 430px"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <CapaPlaceholder />
        )}
      </div>
      <div style={{ padding: '14px 16px' }}>
        <span className="badge" style={{ background: 'var(--color-clinical-tint)', color: 'var(--color-clinical)' }}>
          {guia.categoria}
        </span>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, marginTop: 8 }}>
          {guia.titulo}
        </h2>
        {guia.resumo && (
          <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)', marginTop: 6, lineHeight: 1.5 }}>
            {guia.resumo}
          </p>
        )}
      </div>
    </div>
  );
}

function GuiaListaCard({ guia }: { guia: GuiaResumo }) {
  return (
    <div className="card" style={{ margin: 0, display: 'flex', gap: 12, alignItems: 'center', padding: 10 }}>
      <div style={{ position: 'relative', width: 64, height: 64, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
        {guia.cover_url ? (
          <Image
            src={guia.cover_url}
            alt={guia.titulo}
            fill
            loading="lazy"
            sizes="64px"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <CapaPlaceholder />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {guia.titulo}
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-faint)', marginTop: 2 }}>
          {guia.categoria}{guia.subcategoria ? ` · ${guia.subcategoria}` : ''}
        </p>
      </div>
    </div>
  );
}

function CapaPlaceholder() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(160deg, var(--color-clinical-tint), var(--color-clinical))',
      }}
    />
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────

function IconProtocolo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconProcedimento() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function IconMedicamento() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M18 15v6M15 18h6" />
    </svg>
  );
}

function IconCurativo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2.5" y="9" width="19" height="6" rx="3" transform="rotate(-30 12 12)" />
      <path d="M8.2 10.2l7.6 4.4M9.8 8.4l6 3.4" opacity=".55" />
    </svg>
  );
}

function IconGota() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 3s6 6.5 6 11a6 6 0 11-12 0c0-4.5 6-11 6-11z" />
    </svg>
  );
}

function IconDispositivo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function IconEscudo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
    </svg>
  );
}
