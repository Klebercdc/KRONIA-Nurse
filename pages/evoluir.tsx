import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import {
  Activity,
  Baby,
  ChevronLeft,
  ChevronRight,
  Droplets,
  MonitorDot,
  Ribbon,
  Search,
  Siren,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import Layout from '../components/Layout';
import { setoresPorGrupo, tiposDoSetor, getSetor, type Setor } from '../lib/evolucao/setores';
import { getFieldSchema, hasSchema } from '../lib/evolucao/field-schemas';
import type { DocType } from '../lib/evolucao/document-types';

const ICONES: Record<string, LucideIcon> = {
  activity: Activity,
  'monitor-dot': MonitorDot,
  stethoscope: Stethoscope,
  droplets: Droplets,
  ribbon: Ribbon,
  siren: Siren,
  baby: Baby,
};

const FAVORITOS_KEY = 'kronia-setores-favoritos';
/** Default até haver escolha do usuário — não há dado de frequência de uso no app. */
const FAVORITOS_PADRAO = ['uti', 'emergencia', 'clinica', 'hemodialise'];

function lerFavoritos(): string[] {
  if (typeof window === 'undefined') return FAVORITOS_PADRAO;
  try {
    const bruto = localStorage.getItem(FAVORITOS_KEY);
    if (!bruto) return FAVORITOS_PADRAO;
    const lista = JSON.parse(bruto);
    return Array.isArray(lista) && lista.length > 0 ? lista : FAVORITOS_PADRAO;
  } catch {
    return FAVORITOS_PADRAO;
  }
}

function IconeSetor({ nome }: { nome: string }) {
  const Icone = ICONES[nome] ?? Activity;
  return <Icone strokeWidth={2} />;
}

/**
 * Campos-preview: os 3 primeiros rótulos REAIS do primeiro tipo do setor que
 * tenha FIELD_SCHEMA. Setor sem schema não mostra tag — card sem preview é
 * melhor que preview inventado.
 */
function camposPreview(setor: Setor): string[] {
  for (const tipoId of setor.tipos) {
    if (!hasSchema(tipoId)) continue;
    const schema = getFieldSchema(tipoId);
    if (schema) return schema.campos.slice(0, 3).map((c) => c.label);
  }
  return [];
}

export default function Evoluir() {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [favoritos] = useState<string[]>(lerFavoritos);
  const [setorAberto, setSetorAberto] = useState<string | null>(null);
  const [tipoSelecionado, setTipoSelecionado] = useState<string | null>(null);

  const grupos = useMemo(() => setoresPorGrupo(), []);

  const gruposFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return grupos;
    return grupos
      .map((g) => ({
        ...g,
        setores: g.setores.filter((s) =>
          `${s.nome} ${s.descricao} ${camposPreview(s).join(' ')}`.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.setores.length > 0);
  }, [busca, grupos]);

  const setorAtual = setorAberto ? getSetor(setorAberto) : undefined;
  const tiposDisponiveis: DocType[] = setorAberto ? tiposDoSetor(setorAberto) : [];

  function abrirSetor(id: string) {
    setSetorAberto(id);
    setTipoSelecionado(tiposDoSetor(id)[0]?.id ?? null);
  }

  function fechar() {
    setSetorAberto(null);
    setTipoSelecionado(null);
  }

  function continuar() {
    if (!tipoSelecionado) return;
    router.push(`/evolucao-avulsa/${tipoSelecionado}`);
  }

  const favoritosVisiveis = grupos
    .flatMap((g) => g.setores)
    .filter((s) => favoritos.includes(s.id));

  return (
    <Layout>
      <div className="tela-header">
        <button
          className="btn-icone"
          onClick={() => router.push('/plantao')}
          aria-label="Voltar"
          style={{ marginRight: 4 }}
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 className="tela-titulo">Evoluir paciente</h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)', marginTop: 1 }}>
            Escolha o setor — o formulário se ajusta sozinho
          </p>
        </div>
      </div>

      <div className="auth-input-wrap" style={{ marginBottom: 16 }}>
        <Search size={18} strokeWidth={2} style={{ color: 'var(--color-ink-faint)', flexShrink: 0 }} />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar setor ou especialidade"
          aria-label="Pesquisar setor"
        />
      </div>

      {!busca && favoritosVisiveis.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <p className="section-label">Favoritos</p>
          <div className="fav-row">
            {favoritosVisiveis.map((s) => (
              <button key={s.id} className="fav-chip" onClick={() => abrirSetor(s.id)}>
                <IconeSetor nome={s.icone} />
                {s.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      {gruposFiltrados.length === 0 && (
        <div className="estado-vazio">Nenhum setor encontrado.</div>
      )}

      {gruposFiltrados.map((grupo) => (
        <div key={grupo.grupo} className="setor-grupo">
          <p className="section-label">{grupo.grupo}</p>
          <div className="setor-lista">
            {grupo.setores.map((setor) => {
              const campos = camposPreview(setor);
              return (
                <button key={setor.id} className="setor-card" onClick={() => abrirSetor(setor.id)}>
                  <span className="setor-icone">
                    <IconeSetor nome={setor.icone} />
                  </span>
                  <span className="setor-texto">
                    <span className="setor-titulo" style={{ display: 'block' }}>
                      {setor.nome}
                    </span>
                    <span className="setor-desc" style={{ display: 'block' }}>
                      {setor.descricao}
                    </span>
                    {campos.length > 0 && (
                      <span className="campo-tags">
                        {campos.map((c) => (
                          <span key={c} className="campo-tag">
                            {c}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  <span className="setor-chev">
                    <ChevronRight strokeWidth={2} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div
        className={`sheet-backdrop${setorAberto ? ' aberto' : ''}`}
        onClick={fechar}
        aria-hidden="true"
      />
      <div className={`sheet${setorAberto ? ' aberto' : ''}`} role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        <p className="sheet-eyebrow">{setorAtual?.nome ?? ''}</p>
        <p className="sheet-titulo">O que registrar?</p>
        <p className="sheet-sub">
          Os tipos do setor vêm primeiro; procedimentos e intercorrências valem em qualquer unidade.
        </p>

        <div>
          {tiposDisponiveis.map((tipo) => (
            <button
              key={tipo.id}
              className={`reg-opcao${tipoSelecionado === tipo.id ? ' selecionada' : ''}`}
              onClick={() => setTipoSelecionado(tipo.id)}
            >
              <span className="reg-radio" />
              <span className="reg-texto">
                <span className="reg-label" style={{ display: 'block' }}>
                  {tipo.nome}
                </span>
                {!hasSchema(tipo.id) && (
                  <span className="reg-hint" style={{ display: 'block' }}>
                    Sem formulário estruturado — texto livre.
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>

        <div className="sheet-acoes">
          <button className="btn btn-primario btn-bloco" onClick={continuar} disabled={!tipoSelecionado}>
            Continuar
          </button>
          <button className="btn btn-secundario btn-bloco" onClick={fechar}>
            Cancelar
          </button>
        </div>
      </div>
    </Layout>
  );
}
