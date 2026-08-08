import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import {
  Activity,
  Baby,
  ChevronLeft,
  ChevronRight,
  Droplets,
  MonitorDot,
  Plus,
  Ribbon,
  Search,
  Siren,
  Stethoscope,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import Layout from '../../components/Layout';
import { useTurno } from '../../components/useTurno';
import {
  setoresPorGrupo,
  tiposDoSetor,
  tiposIntercorrencia,
  getSetor,
  type Setor,
} from '../../lib/evolucao/setores';
import { getFieldSchema, hasSchema } from '../../lib/evolucao/field-schemas';
import type { DocType } from '../../lib/evolucao/document-types';

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

/** Origem do bottom sheet: um setor da lista, ou o atalho de intercorrência. */
type Origem = { tipo: 'setor'; setorId: string } | { tipo: 'intercorrencia' };

export default function Evoluir() {
  const router = useRouter();
  const { turno, carregado, garantirPaciente } = useTurno();

  const [busca, setBusca] = useState('');
  const [favoritos] = useState<string[]>(lerFavoritos);
  const [origem, setOrigem] = useState<Origem | null>(null);
  const [tipoSelecionado, setTipoSelecionado] = useState<string | null>(null);
  const [pacienteId, setPacienteId] = useState<string>('');
  const [novoRotulo, setNovoRotulo] = useState('');
  const [criandoPaciente, setCriandoPaciente] = useState(false);

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

  const tiposDisponiveis: DocType[] = useMemo(() => {
    if (!origem) return [];
    return origem.tipo === 'intercorrencia' ? tiposIntercorrencia() : tiposDoSetor(origem.setorId);
  }, [origem]);

  const tituloSheet =
    origem?.tipo === 'intercorrencia' ? 'Intercorrência' : getSetor(origem?.setorId ?? '')?.nome ?? '';

  function abrir(nova: Origem) {
    setOrigem(nova);
    const tipos = nova.tipo === 'intercorrencia' ? tiposIntercorrencia() : tiposDoSetor(nova.setorId);
    setTipoSelecionado(tipos[0]?.id ?? null);
    setPacienteId(turno.pacientes[0]?.id ?? '');
    setCriandoPaciente(turno.pacientes.length === 0);
    setNovoRotulo('');
  }

  function fechar() {
    setOrigem(null);
    setTipoSelecionado(null);
    setCriandoPaciente(false);
    setNovoRotulo('');
  }

  const pacienteResolvido = criandoPaciente ? novoRotulo.trim() !== '' : pacienteId !== '';
  const podeContinuar = tipoSelecionado !== null && pacienteResolvido;

  function continuar() {
    if (!tipoSelecionado) return;
    const id = criandoPaciente ? garantirPaciente(novoRotulo) : pacienteId;
    if (!id) return;
    router.push(`/evoluir/${tipoSelecionado}?paciente=${encodeURIComponent(id)}`);
  }

  const favoritosVisiveis = grupos
    .flatMap((g) => g.setores)
    .filter((s) => favoritos.includes(s.id));

  const evolucoesSalvas = turno.evolucoes ?? [];

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

      <div className="auth-input-wrap" style={{ marginBottom: 14 }}>
        <Search size={18} strokeWidth={2} style={{ color: 'var(--color-ink-faint)', flexShrink: 0 }} />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar setor ou especialidade"
          aria-label="Pesquisar setor"
        />
      </div>

      {/* Intercorrência — entrada própria, fora da lista de setores.
          É urgente: não deve exigir navegar setor → tipo. */}
      {!busca && (
        <button className="intercorrencia-card" onClick={() => abrir({ tipo: 'intercorrencia' })}>
          <span className="intercorrencia-icone">
            <TriangleAlert strokeWidth={2} />
          </span>
          <span className="setor-texto">
            <span className="setor-titulo" style={{ display: 'block' }}>
              Registrar intercorrência
            </span>
            <span className="setor-desc" style={{ display: 'block' }}>
              Queda, LPP, extubação, reação a medicamento ou PCR — em qualquer setor.
            </span>
          </span>
          <span className="setor-chev">
            <ChevronRight strokeWidth={2} />
          </span>
        </button>
      )}

      {/* Evoluções já geradas neste plantão */}
      {!busca && carregado && evolucoesSalvas.length > 0 && (
        <button className="setor-card" style={{ marginBottom: 4 }} onClick={() => router.push('/evolucoes')}>
          <span className="setor-icone">
            <Activity strokeWidth={2} />
          </span>
          <span className="setor-texto">
            <span className="setor-titulo" style={{ display: 'block' }}>
              Evoluções do plantão
            </span>
            <span className="setor-desc" style={{ display: 'block' }}>
              {evolucoesSalvas.length} guardada(s) — copiar separadas ou todas juntas.
            </span>
          </span>
          <span className="setor-chev">
            <ChevronRight strokeWidth={2} />
          </span>
        </button>
      )}

      {!busca && favoritosVisiveis.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p className="section-label">Favoritos</p>
          <div className="fav-row">
            {favoritosVisiveis.map((s) => (
              <button
                key={s.id}
                className="fav-chip"
                onClick={() => abrir({ tipo: 'setor', setorId: s.id })}
              >
                <IconeSetor nome={s.icone} />
                {s.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      {gruposFiltrados.length === 0 && <div className="estado-vazio">Nenhum setor encontrado.</div>}

      {gruposFiltrados.map((grupo) => (
        <div key={grupo.grupo} className="setor-grupo">
          <p className="section-label">{grupo.grupo}</p>
          <div className="setor-lista">
            {grupo.setores.map((setor) => {
              const campos = camposPreview(setor);
              return (
                <button
                  key={setor.id}
                  className="setor-card"
                  onClick={() => abrir({ tipo: 'setor', setorId: setor.id })}
                >
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

      <div className={`sheet-backdrop${origem ? ' aberto' : ''}`} onClick={fechar} aria-hidden="true" />
      <div className={`sheet${origem ? ' aberto' : ''}`} role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        <p className="sheet-eyebrow">{tituloSheet}</p>
        <p className="sheet-titulo">O que registrar?</p>
        <p className="sheet-sub">
          {origem?.tipo === 'intercorrencia'
            ? 'A intercorrência vale para qualquer setor.'
            : 'Os tipos do setor vêm primeiro; procedimentos e intercorrências valem em qualquer unidade.'}
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

        {/* Paciente — obrigatório. Não existe evolução sem dono. */}
        <div className="sheet-paciente">
          <p className="section-label" style={{ marginBottom: 8 }}>
            Paciente
          </p>

          {!criandoPaciente && turno.pacientes.length > 0 && (
            <>
              <select
                className="contexto-select"
                style={{ width: '100%' }}
                value={pacienteId}
                onChange={(e) => setPacienteId(e.target.value)}
                aria-label="Escolher paciente"
              >
                {turno.pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.leito}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-secundario"
                style={{ marginTop: 8, padding: '9px 14px', fontSize: '0.82rem' }}
                onClick={() => setCriandoPaciente(true)}
              >
                <Plus size={15} strokeWidth={2} />
                Outro paciente
              </button>
            </>
          )}

          {criandoPaciente && (
            <>
              <input
                type="text"
                value={novoRotulo}
                onChange={(e) => setNovoRotulo(e.target.value)}
                placeholder="Leito, codinome ou iniciais"
                aria-label="Identificação do paciente"
                style={{
                  width: '100%',
                  padding: '11px 13px',
                  border: '1.5px solid var(--color-line)',
                  borderRadius: 10,
                  background: 'var(--color-surface)',
                  color: 'var(--color-ink)',
                  outline: 'none',
                }}
              />
              {turno.pacientes.length > 0 && (
                <button
                  className="btn btn-secundario"
                  style={{ marginTop: 8, padding: '9px 14px', fontSize: '0.82rem' }}
                  onClick={() => setCriandoPaciente(false)}
                >
                  Escolher da lista
                </button>
              )}
            </>
          )}

          <p className="aviso-privacidade" style={{ marginTop: 10 }}>
            Use apenas leito, codinome ou iniciais. Nunca nome completo, CPF ou dado que
            identifique o paciente.
          </p>
        </div>

        <div className="sheet-acoes">
          <button className="btn btn-primario btn-bloco" onClick={continuar} disabled={!podeContinuar}>
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
