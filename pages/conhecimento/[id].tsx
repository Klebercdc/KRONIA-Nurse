import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import Layout from '../../components/Layout';
import { getSupabaseBrowser } from '../../lib/supabase-browser';
import type { ConhecimentoCompleto } from '../api/biblioteca/obter';

/** Separa "{nome}|{link}" salvo em cover_credito nos dois componentes. */
function parseCredito(credito: string): { nome: string; link: string } | null {
  const [nome, link] = credito.split('|');
  if (!nome || !link) return null;
  return { nome, link };
}

const SECOES: { chave: keyof ConhecimentoCompleto; titulo: string }[] = [
  { chave: 'resumo', titulo: 'Resumo' },
  { chave: 'indicacoes', titulo: 'Indicações' },
  { chave: 'contraindicacoes', titulo: 'Contraindicações' },
  { chave: 'materiais', titulo: 'Materiais' },
  { chave: 'preparacao', titulo: 'Preparo' },
  { chave: 'procedimento', titulo: 'Passo a passo' },
  { chave: 'cuidados', titulo: 'Cuidados' },
  { chave: 'complicacoes', titulo: 'Complicações' },
  { chave: 'prevencao_eventos_adversos', titulo: 'Prevenção de eventos adversos' },
  { chave: 'pontos_criticos', titulo: 'Pontos críticos' },
  { chave: 'observacoes', titulo: 'Observações' },
  { chave: 'limitacoes', titulo: 'Limitações' },
  { chave: 'variacoes_institucionais', titulo: 'Variações institucionais' },
  { chave: 'referencias', titulo: 'Referências' },
];

export default function ConhecimentoDetalhe() {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : undefined;

  const [item, setItem] = useState<ConhecimentoCompleto | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!id) return;
    carregar(id);
  }, [id]);

  async function carregar(idAlvo: string) {
    setCarregando(true);
    setErro('');
    try {
      const { data } = await getSupabaseBrowser().auth.getSession();
      const token = data.session?.access_token ?? '';
      const resp = await fetch(`/api/biblioteca/obter?id=${encodeURIComponent(idAlvo)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await resp.json() as ConhecimentoCompleto & { erro?: string };
      if (!resp.ok) throw new Error(json.erro ?? 'Erro ao carregar conhecimento.');
      setItem(json);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar conhecimento.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <Head><title>{item ? `${item.titulo} — KRONIA Nurse` : 'Conhecimento — KRONIA Nurse'}</title></Head>
      <Layout>
        <div className="tela-header">
          <button className="btn-icone" onClick={() => router.push('/biblioteca')} aria-label="Voltar para Conhecimento" style={{ marginRight: 2 }}>
            <IconVoltar />
          </button>
          <h1 className="tela-titulo" style={{ fontSize: '1.05rem' }}>{item?.titulo ?? 'Conhecimento'}</h1>
        </div>

        {carregando && (
          <div className="estado-vazio">
            <div className="spinner spinner-clinical" style={{ margin: '0 auto 10px' }} />
            Carregando conhecimento...
          </div>
        )}

        {!carregando && erro && (
          <div className="card" style={{ borderLeft: '3px solid var(--color-danger)', color: 'var(--color-ink-muted)' }}>
            {erro}
          </div>
        )}

        {!carregando && !erro && item && (
          <>
            {item.cover_url && (
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 14, overflow: 'hidden', marginBottom: item.cover_credito ? 4 : 14 }}>
                <Image src={item.cover_url} alt={item.titulo} fill sizes="(max-width: 430px) 100vw, 430px" style={{ objectFit: 'cover' }} priority />
              </div>
            )}
            {item.cover_url && item.cover_credito && (() => {
              const credito = parseCredito(item.cover_credito);
              return credito ? (
                <p style={{ fontSize: '0.68rem', color: 'var(--color-ink-faint)', marginBottom: 14, textAlign: 'right' }}>
                  Foto:{' '}
                  <a href={credito.link} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
                    {credito.nome}
                  </a>
                  {' '}/{' '}
                  <a href="https://unsplash.com/?utm_source=kronia_nurse&utm_medium=referral" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
                    Unsplash
                  </a>
                </p>
              ) : null;
            })()}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <span className="badge" style={{ background: 'var(--color-clinical-tint)', color: 'var(--color-clinical)' }}>
                {item.categoria}{item.subcategoria ? ` · ${item.subcategoria}` : ''}
              </span>
              {item.data_revisao && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-faint)' }}>
                  Revisado em {formatarData(item.data_revisao)}
                </span>
              )}
            </div>

            {SECOES.map(({ chave, titulo }) => {
              const texto = item[chave];
              if (!texto || typeof texto !== 'string' || !texto.trim()) return null;
              return (
                <div key={chave} className="card" style={{ marginBottom: 10 }}>
                  <p className="card-titulo">{titulo}</p>
                  <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--color-ink)', whiteSpace: 'pre-wrap' }}>
                    {texto}
                  </p>
                </div>
              );
            })}

            <p style={{ fontSize: '0.72rem', color: 'var(--color-ink-faint)', textAlign: 'center', marginTop: 8 }}>
              Atualizado em {formatarData(item.updated_at)}{item.autor ? ` · ${item.autor}` : ''}
            </p>
          </>
        )}
      </Layout>
    </>
  );
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function IconVoltar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
