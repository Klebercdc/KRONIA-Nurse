import { useEffect, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { getSupabaseBrowser } from '../lib/supabase-browser';
import type { GuiaResumo, StatusConhecimento } from './api/biblioteca/listar';

type CategoriaResumo = { categoria: string; total: number };

type RespostaListar = {
  totalConhecimentos: number;
  atualizadosRecentes: number;
  categorias: CategoriaResumo[];
  itens: GuiaResumo[];
  totalFiltrado: number;
  atualizacoes: GuiaResumo[];
};

const LIMITE_POR_PAGINA = 20;

export const ICONE_CATEGORIA: Record<string, JSX.Element> = {
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

const ROTULO_STATUS: Record<Exclude<StatusConhecimento, null>, string> = {
  novo: 'NOVO',
  atualizado: 'ATUALIZADO',
  revisado: 'REVISADO',
};

const CHAVE_FAVORITOS = 'kronia:conhecimento:favoritos';

/**
 * Favoritos são só locais (localStorage) — não existe tabela de favoritos
 * no Supabase. Se precisar sincronizar entre dispositivos, isso vira uma
 * migration nova (perguntar antes).
 */
function useFavoritos() {
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
  const [persisteOk, setPersisteOk] = useState(true);

  useEffect(() => {
    try {
      const bruto = window.localStorage.getItem(CHAVE_FAVORITOS);
      if (bruto) setFavoritos(new Set(JSON.parse(bruto)));
    } catch {
      setPersisteOk(false);
    }
  }, []);

  const alternar = useCallback((id: string) => {
    setFavoritos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id); else novo.add(id);
      try {
        window.localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(Array.from(novo)));
      } catch {
        setPersisteOk(false);
      }
      return novo;
    });
  }, []);

  return { favoritos, alternar, persisteOk };
}

export default function BibliotecaPage() {
  const router = useRouter();
  const [dados, setDados] = useState<RespostaListar | null>(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(
    () => (typeof router.query.categoria === 'string' ? router.query.categoria : null)
  );
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState('');
  const [somenteFavoritos, setSomenteFavoritos] = useState(false);
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const { favoritos, alternar, persisteOk } = useFavoritos();

  // O peek do próximo card já sugere "tem mais", mas depende de quantas
  // categorias existem — o fade garante o mesmo sinal mesmo quando o
  // conteúdo quase cabe na largura da tela.
  const carrosselRef = useRef<HTMLDivElement>(null);
  const [temMaisDireita, setTemMaisDireita] = useState(false);

  const atualizarFadeCarrossel = useCallback(() => {
    const el = carrosselRef.current;
    if (!el) return;
    setTemMaisDireita(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const carregar = useCallback(async (categoria: string | null, offset: number, substituir: boolean, termoBusca: string) => {
    if (offset === 0) setCarregando(true); else setCarregandoMais(true);
    setErro('');
    try {
      const { data } = await getSupabaseBrowser().auth.getSession();
      const token = data.session?.access_token ?? '';
      const params = new URLSearchParams({ offset: String(offset), limit: String(LIMITE_POR_PAGINA) });
      if (categoria) params.set('categoria', categoria);
      if (termoBusca) params.set('busca', termoBusca);
      const resp = await fetch(`/api/biblioteca/listar?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await resp.json() as RespostaListar & { erro?: string };
      if (!resp.ok) throw new Error(json.erro ?? 'Erro ao carregar conhecimento.');
      setDados((atual) => {
        if (substituir || !atual) return json;
        return { ...json, itens: [...atual.itens, ...json.itens] };
      });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar conhecimento.');
    } finally {
      setCarregando(false);
      setCarregandoMais(false);
    }
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const daUrl = typeof router.query.categoria === 'string' ? router.query.categoria : null;
    setCategoriaFiltro((atual) => (atual === daUrl ? atual : daUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  // Debounce — evita uma requisição por tecla digitada.
  useEffect(() => {
    const t = setTimeout(() => setBuscaAplicada(busca.trim()), 350);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    carregar(categoriaFiltro, 0, true, buscaAplicada);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriaFiltro, buscaAplicada]);

  useEffect(() => {
    atualizarFadeCarrossel();
    window.addEventListener('resize', atualizarFadeCarrossel);
    return () => window.removeEventListener('resize', atualizarFadeCarrossel);
  }, [dados?.categorias, atualizarFadeCarrossel]);

  function selecionarCategoria(categoria: string) {
    setCategoriaFiltro((atual) => (atual === categoria ? null : categoria));
  }

  const temMais = !!dados && dados.itens.length < dados.totalFiltrado;
  const itensExibidos = !dados
    ? []
    : somenteFavoritos
      ? dados.itens.filter((item) => favoritos.has(item.id))
      : dados.itens;

  // Com catálogo pequeno, "Atualizações recentes" pode repetir 100% da lista
  // principal — só vale a seção quando ela mostra algo que a lista de baixo não mostra.
  const idsExibidos = new Set(dados?.itens.map((i) => i.id));
  const atualizacoesRedundantes = !!dados && dados.atualizacoes.every((a) => idsExibidos.has(a.id));

  return (
    <>
      <Head><title>Conhecimento — KRONIA Nurse</title></Head>
      <Layout>
        <div className="tela-header">
          <h1 className="tela-titulo">Conhecimento</h1>
        </div>

        <div className="auth-input-wrap" style={{ marginBottom: 16 }}>
          <IconBusca />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar procedimento, tema ou palavra-chave..."
            aria-label="Pesquisar conhecimento"
          />
        </div>

        {dados && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div className="stat-card">
              <span className="stat-card-label">Conhecimentos</span>
              <span className="stat-card-value">{dados.totalConhecimentos}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Atualizados (14d)</span>
              <span className="stat-card-value">{dados.atualizadosRecentes}</span>
            </div>
          </div>
        )}

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

        {!carregando && !erro && dados && (
          <>
            <div style={{ position: 'relative', marginBottom: 18 }}>
              <div
                ref={carrosselRef}
                onScroll={atualizarFadeCarrossel}
                style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}
              >
                {dados.categorias.length > 0 && (
                  <>
                    <CardCategoria
                      label="Todos"
                      ativo={categoriaFiltro === null}
                      onClick={() => setCategoriaFiltro(null)}
                    />
                    <CardCategoria
                      label="Escalas"
                      icone={<IconRelogio />}
                      ativo={false}
                      destaque
                      onClick={() => router.push('/escalas')}
                    />
                    {dados.categorias.map((c) => (
                      <CardCategoria
                        key={c.categoria}
                        label={c.categoria}
                        total={c.total}
                        icone={ICONE_CATEGORIA[c.categoria] ?? <IconProtocolo />}
                        ativo={categoriaFiltro === c.categoria}
                        onClick={() => selecionarCategoria(c.categoria)}
                      />
                    ))}
                  </>
                )}
                {/* Espaçador — garante que sempre sobre um pedaço de card cortado
                    na borda, mesmo quando os itens cabem certinho na largura da tela. */}
                <div aria-hidden style={{ flexShrink: 0, width: 24 }} />
              </div>
              {temMaisDireita && (
                <div aria-hidden style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 6,
                  width: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: 4,
                  background: 'linear-gradient(to left, rgba(0,0,0,.14), transparent)',
                  pointerEvents: 'none',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              )}
            </div>

            {!categoriaFiltro && !buscaAplicada && dados.atualizacoes.length > 0 && !atualizacoesRedundantes && (
              <>
                <p className="card-titulo" style={{ marginBottom: 8 }}>Atualizações recentes</p>
                <div className="card" style={{ padding: 0 }}>
                  {dados.atualizacoes.map((item) => (
                    <div key={item.id} className="evento-linha" style={{ padding: '10px 14px' }}>
                      {item.status && (
                        <span className={`badge badge-${item.status}`}>{ROTULO_STATUS[item.status]}</span>
                      )}
                      <span className="evento-texto">{item.titulo}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-faint)', flexShrink: 0 }}>
                        {formatarData(item.updated_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 }}>
              <p className="card-titulo" style={{ margin: 0 }}>
                {buscaAplicada
                  ? `Resultados para "${buscaAplicada}" (${dados.totalFiltrado})`
                  : categoriaFiltro
                    ? `${categoriaFiltro} (${dados.totalFiltrado})`
                    : `Conhecimentos recentes (${dados.totalFiltrado})`}
              </p>
              <button
                className={`pill${somenteFavoritos ? ' ativo' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: '0.72rem' }}
                onClick={() => setSomenteFavoritos((v) => !v)}
              >
                <IconEstrela preenchida={somenteFavoritos} />
                Favoritos
              </button>
            </div>

            {!persisteOk && (
              <p style={{ fontSize: '0.72rem', color: 'var(--color-warn)', marginTop: -4, marginBottom: 10 }}>
                Favoritos não puderam ser salvos neste navegador (modo privado?) — vão se perder ao recarregar.
              </p>
            )}

            {itensExibidos.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {itensExibidos.map((item) => (
                  <ConhecimentoCard
                    key={item.id}
                    item={item}
                    favorito={favoritos.has(item.id)}
                    onAlternarFavorito={() => alternar(item.id)}
                    onAbrir={() => router.push(`/conhecimento/${item.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="estado-vazio">
                {somenteFavoritos
                  ? 'Você ainda não marcou nenhum conhecimento como favorito.'
                  : buscaAplicada
                    ? `Nenhum conhecimento encontrado para "${buscaAplicada}".`
                    : categoriaFiltro
                      ? `Nenhum conhecimento publicado ainda em "${categoriaFiltro}".`
                      : 'Nenhum conhecimento publicado ainda.'}
              </div>
            )}

            {!somenteFavoritos && temMais && (
              <button
                className="btn btn-secundario btn-bloco"
                style={{ marginTop: 12 }}
                disabled={carregandoMais}
                onClick={() => carregar(categoriaFiltro, dados.itens.length, false, buscaAplicada)}
              >
                {carregandoMais ? 'Carregando...' : `Carregar mais (${dados.totalFiltrado - dados.itens.length} restantes)`}
              </button>
            )}
          </>
        )}
      </Layout>
    </>
  );
}

function CardCategoria({
  label, total, icone, ativo, destaque, onClick,
}: {
  label: string;
  total?: number;
  icone?: React.ReactNode;
  ativo: boolean;
  destaque?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        width: icone ? 116 : 88,
        background: ativo ? 'var(--color-clinical)' : 'var(--color-surface)',
        border: ativo
          ? 'none'
          : destaque
            ? '1.5px solid var(--color-clinical)'
            : '1px solid var(--color-line)',
        borderRadius: 14,
        padding: '12px 10px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: icone ? 'flex-start' : 'flex-end',
        minHeight: 76,
        boxShadow: 'var(--shadow-card)',
        gap: 8,
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      {icone && (
        <div style={{
          width: 26,
          height: 26,
          borderRadius: 7,
          background: ativo ? 'rgba(255,255,255,.2)' : 'var(--color-clinical-tint)',
          color: ativo ? '#fff' : 'var(--color-clinical)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icone}
        </div>
      )}
      <span style={{
        fontFamily: icone ? 'var(--font-body)' : 'var(--font-display)',
        fontSize: '0.78rem',
        fontWeight: icone ? 600 : 700,
        color: ativo ? '#fff' : 'var(--color-ink)',
        lineHeight: 1.25,
      }}>
        {label}
      </span>
      {total !== undefined && (
        <span style={{ fontSize: '0.68rem', color: ativo ? 'rgba(255,255,255,.75)' : 'var(--color-ink-faint)' }}>
          {total} {total === 1 ? 'item' : 'itens'}
        </span>
      )}
    </button>
  );
}

function ConhecimentoCard({
  item, favorito, onAlternarFavorito, onAbrir,
}: {
  item: GuiaResumo;
  favorito: boolean;
  onAlternarFavorito: () => void;
  onAbrir: () => void;
}) {
  return (
    <div className="card" style={{ margin: 0, display: 'flex', gap: 12, alignItems: 'center', padding: 10 }}>
      <div
        role="button"
        tabIndex={0}
        onClick={onAbrir}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbrir(); } }}
        style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0, cursor: 'pointer' }}
      >
        <div style={{ position: 'relative', width: 56, height: 56, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
          {item.cover_url ? (
            <Image
              src={item.cover_url}
              alt={item.titulo}
              fill
              loading="lazy"
              sizes="56px"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <CapaPlaceholder />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.titulo}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            {item.status && (
              <span className={`badge badge-${item.status}`}>{ROTULO_STATUS[item.status]}</span>
            )}
            <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-faint)' }}>
              {item.categoria}{item.subcategoria ? ` · ${item.subcategoria}` : ''}
            </span>
          </div>
        </div>
      </div>
      <button
        className="btn-icone"
        aria-label={favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        aria-pressed={favorito}
        onClick={onAlternarFavorito}
        style={{ flexShrink: 0, color: favorito ? 'var(--color-warn)' : 'var(--color-ink-faint)' }}
      >
        <IconEstrela preenchida={favorito} />
      </button>
    </div>
  );
}

function IconEstrela({ preenchida }: { preenchida: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={preenchida ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 2.5 15.1 8.8 22 9.8 17 14.7 18.2 21.5 12 18.2 5.8 21.5 7 14.7 2 9.8 8.9 8.8z" />
    </svg>
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

function formatarData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// ── Icons ────────────────────────────────────────────────────────────────────

function IconBusca() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconRelogio() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 15" />
    </svg>
  );
}

export function IconProtocolo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconProcedimento() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function IconMedicamento() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M18 15v6M15 18h6" />
    </svg>
  );
}

function IconCurativo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2.5" y="9" width="19" height="6" rx="3" transform="rotate(-30 12 12)" />
      <path d="M8.2 10.2l7.6 4.4M9.8 8.4l6 3.4" opacity=".55" />
    </svg>
  );
}

function IconGota() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 3s6 6.5 6 11a6 6 0 11-12 0c0-4.5 6-11 6-11z" />
    </svg>
  );
}

function IconDispositivo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function IconEscudo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
    </svg>
  );
}
