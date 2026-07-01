import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { DOC_TYPES, GROUP_LABEL, type DocGroup } from '../../lib/evolucao/document-types';

const FAVORITES_KEY = 'kronia-evolucao-favoritos';

function getFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function toggleFavorite(id: string) {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.unshift(id);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

export default function EvolucaoAvulsaPage() {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [gruposAbertos, setGruposAbertos] = useState<Set<DocGroup>>(new Set(['admissao', 'evolucao']));
  const [favoritosState, setFavoritosState] = useState<string[]>(() => getFavorites());

  const docsFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return DOC_TYPES;
    return DOC_TYPES.filter(
      (d) =>
        d.nome.toLowerCase().includes(q) ||
        d.grupo.toLowerCase().includes(q) ||
        d.contexto.toLowerCase().includes(q),
    );
  }, [busca]);

  const docsPorGrupo = useMemo(() => {
    const map = new Map<DocGroup, typeof DOC_TYPES>();
    for (const doc of docsFiltrados) {
      const arr = map.get(doc.grupo) ?? [];
      arr.push(doc);
      map.set(doc.grupo, arr);
    }
    return map;
  }, [docsFiltrados]);

  const favoritos = useMemo(
    () => DOC_TYPES.filter((d) => favoritosState.includes(d.id)),
    [favoritosState],
  );

  function handleToggleFav(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    toggleFavorite(id);
    setFavoritosState(getFavorites());
  }

  function handleToggleGrupo(grupo: DocGroup) {
    setGruposAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(grupo)) next.delete(grupo);
      else next.add(grupo);
      return next;
    });
  }

  const gruposOrdenados = Array.from(docsPorGrupo.keys());

  return (
    <Layout>
      {/* Header */}
      <div className="tela-header">
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 0', color: 'var(--color-clinical)', display: 'flex', alignItems: 'center', gap: 4 }}
          aria-label="Voltar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="tela-titulo" style={{ flex: 1 }}>Evolução avulsa</h1>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar tipo de documento..."
          style={{
            width: '100%',
            padding: '11px 12px 11px 38px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-line)',
            borderRadius: 12,
            fontSize: '0.9rem',
            color: 'var(--color-ink)',
            fontFamily: 'var(--font-body)',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        {busca && (
          <button
            onClick={() => setBusca('')}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink-faint)', padding: 4 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Favorites */}
      {!busca && favoritos.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Favoritos
          </p>
          {favoritos.map((doc) => (
            <DocRow
              key={doc.id}
              nome={doc.nome}
              isFav
              onFavToggle={(e) => handleToggleFav(doc.id, e)}
              onClick={() => router.push(`/evolucao-avulsa/${doc.id}`)}
            />
          ))}
        </div>
      )}

      {/* No results */}
      {docsFiltrados.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-ink-muted)', fontSize: '0.9rem' }}>
          Nenhum documento encontrado para "{busca}"
        </div>
      )}

      {/* Groups */}
      {gruposOrdenados.map((grupo) => {
        const docs = docsPorGrupo.get(grupo)!;
        const aberto = busca ? true : gruposAbertos.has(grupo);
        return (
          <div key={grupo} style={{ marginBottom: 12 }}>
            <button
              onClick={() => !busca && handleToggleGrupo(grupo)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                background: 'none',
                border: 'none',
                cursor: busca ? 'default' : 'pointer',
                padding: '6px 0',
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {GROUP_LABEL[grupo]} · {docs.length}
              </span>
              {!busca && (
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-faint)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: aberto ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              )}
            </button>

            {aberto && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {docs.map((doc, idx) => (
                  <DocRow
                    key={doc.id}
                    nome={doc.nome}
                    isFav={favoritosState.includes(doc.id)}
                    onFavToggle={(e) => handleToggleFav(doc.id, e)}
                    onClick={() => router.push(`/evolucao-avulsa/${doc.id}`)}
                    noBorder={idx === docs.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ height: 16 }} />
    </Layout>
  );
}

function DocRow({
  nome,
  isFav,
  onFavToggle,
  onClick,
  noBorder,
}: {
  nome: string;
  isFav: boolean;
  onFavToggle: (e: React.MouseEvent) => void;
  onClick: () => void;
  noBorder?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '13px 14px',
        borderBottom: noBorder ? 'none' : '1px solid var(--color-line)',
        cursor: 'pointer',
      }}
    >
      <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--color-ink)', fontWeight: 500 }}>{nome}</span>
      <button
        onClick={onFavToggle}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', flexShrink: 0, color: isFav ? '#f59e0b' : 'var(--color-ink-faint)' }}
        aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </button>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  );
}
