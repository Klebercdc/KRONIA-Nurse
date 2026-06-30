/**
 * /biblioteca-tecnica
 * Admin da Biblioteca Técnica — Pipeline de Knowledge Specifications.
 * Rota não listada no nav principal. Acesso direto via URL.
 *
 * Fluxo: Rascunho → Pipeline (Etapas 3–8) → Aguardando Aprovação → [Aprovado | Reprovado]
 * NUNCA publica conteúdo sem aprovação humana explícita.
 */
import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseBrowser } from '../lib/supabase-browser';
import {
  DOMINIOS_BIBLIOTECA,
  STATUS_LABEL,
  CLASSIFICACAO_LABEL,
  type KnowledgeSpec,
  type KnowledgeSpecSummary,
  type KnowledgeSpecStatus,
  type ClassificacaoPipeline,
  type ReferenciaOficial,
  type ResultadoPipeline,
  type ResultadoEstagio,
  type ResultadoDominio,
} from '../lib/knowledge-spec';

// ─── Helpers ───────────────────────────────────────────────────────────────

const COR_STATUS: Record<KnowledgeSpecStatus, { bg: string; cor: string; borda: string }> = {
  rascunho: { bg: '#F7FAFC', cor: '#4A5568', borda: '#CBD5E0' },
  em_auditoria: { bg: '#EBF8FF', cor: '#2B6CB0', borda: '#90CDF4' },
  aguardando_aprovacao: { bg: '#FFFBEB', cor: '#744210', borda: '#F6AD55' },
  aprovado: { bg: '#F0FFF4', cor: '#276749', borda: '#9AE6B4' },
  reprovado: { bg: '#FFF5F5', cor: '#C53030', borda: '#FC8181' },
  arquivado: { bg: '#F7FAFC', cor: '#718096', borda: '#E2E8F0' },
};

const COR_CLASSIFICACAO: Record<ClassificacaoPipeline, { bg: string; cor: string; emoji: string }> = {
  verde: { bg: '#F0FFF4', cor: '#276749', emoji: '🟢' },
  amarelo: { bg: '#FFFBEB', cor: '#744210', emoji: '🟡' },
  vermelho: { bg: '#FFF5F5', cor: '#C53030', emoji: '🔴' },
};

async function getToken(): Promise<string> {
  const { data } = await getSupabaseBrowser().auth.getSession();
  return data.session?.access_token ?? '';
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = await getToken();
  const resp = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts?.headers },
  });
  const data = await resp.json() as T & { erro?: string };
  if (!resp.ok) throw new Error((data as { erro?: string }).erro ?? 'Erro desconhecido.');
  return data;
}

// ─── Estado do formulário ──────────────────────────────────────────────────

const FORM_VAZIO: Omit<KnowledgeSpec, 'id' | 'status' | 'criado_por' | 'created_at' | 'updated_at' | 'historico'> = {
  titulo: '', categoria: '', subcategoria: '', resumo: '', objetivo: '', escopo: '',
  indicacoes: '', contraindicacoes: '', materiais: '', preparacao: '', procedimento: '',
  cuidados: '', complicacoes: '', prevencao_eventos_adversos: '', pontos_criticos: '',
  observacoes: '', limitacoes: '', variacoes_institucionais: '',
  referencias_oficiais: [],
};

type FormState = typeof FORM_VAZIO;

type Visao = 'lista' | 'form' | 'detalhe';

// ─── Componente principal ──────────────────────────────────────────────────

export default function BibliotecaTecnica() {
  const { user } = useAuth();
  const [visao, setVisao] = useState<Visao>('lista');
  const [specs, setSpecs] = useState<KnowledgeSpecSummary[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string>('rascunho,em_auditoria,aguardando_aprovacao,reprovado');
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [specSelecionada, setSpecSelecionada] = useState<KnowledgeSpec | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [executandoPipeline, setExecutandoPipeline] = useState(false);
  const [aprovando, setAprovando] = useState(false);
  const [motivoReprovacao, setMotivoReprovacao] = useState('');
  const [reprovando, setReprovando] = useState(false);
  const [refForm, setRefForm] = useState<ReferenciaOficial>({ instituicao: '', documento: '' });

  const carregarLista = useCallback(async () => {
    setCarregandoLista(true);
    try {
      const data = await apiFetch<{ specs: KnowledgeSpecSummary[] }>(`/api/knowledge-spec/listar?status=${filtroStatus}`);
      setSpecs(data.specs);
    } catch {
      setSpecs([]);
    } finally {
      setCarregandoLista(false);
    }
  }, [filtroStatus]);

  useEffect(() => { carregarLista(); }, [carregarLista]);

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setMensagem('');
  }

  function novaSpec() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setMensagem('');
    setVisao('form');
  }

  async function abrirDetalhe(id: string) {
    try {
      const data = await apiFetch<{ spec: KnowledgeSpec }>(`/api/knowledge-spec/obter?id=${id}`);
      setSpecSelecionada(data.spec);
      setMotivoReprovacao('');
      setVisao('detalhe');
    } catch (err) {
      alert(`Erro ao carregar spec: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function editarSpec(spec: KnowledgeSpec) {
    setEditandoId(spec.id);
    setForm({
      titulo: spec.titulo ?? '',
      categoria: spec.categoria ?? '',
      subcategoria: spec.subcategoria ?? '',
      resumo: spec.resumo ?? '',
      objetivo: spec.objetivo ?? '',
      escopo: spec.escopo ?? '',
      indicacoes: spec.indicacoes ?? '',
      contraindicacoes: spec.contraindicacoes ?? '',
      materiais: spec.materiais ?? '',
      preparacao: spec.preparacao ?? '',
      procedimento: spec.procedimento ?? '',
      cuidados: spec.cuidados ?? '',
      complicacoes: spec.complicacoes ?? '',
      prevencao_eventos_adversos: spec.prevencao_eventos_adversos ?? '',
      pontos_criticos: spec.pontos_criticos ?? '',
      observacoes: spec.observacoes ?? '',
      limitacoes: spec.limitacoes ?? '',
      variacoes_institucionais: spec.variacoes_institucionais ?? '',
      referencias_oficiais: spec.referencias_oficiais ?? [],
    });
    setMensagem('');
    setVisao('form');
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) { setMensagem('Título é obrigatório.'); return; }
    if (!form.categoria.trim()) { setMensagem('Categoria é obrigatória.'); return; }
    setSalvando(true);
    setMensagem('');
    try {
      if (editandoId) {
        await apiFetch('/api/knowledge-spec/atualizar', { method: 'POST', body: JSON.stringify({ id: editandoId, ...form }) });
        setMensagem('Rascunho atualizado. Pipeline reiniciado.');
      } else {
        const data = await apiFetch<{ id: string }>('/api/knowledge-spec/criar', { method: 'POST', body: JSON.stringify(form) });
        setMensagem(`Spec criada (ID: ${data.id}). Execute o pipeline para iniciar a auditoria.`);
        setEditandoId(data.id);
      }
      await carregarLista();
    } catch (err) {
      setMensagem(`Erro: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSalvando(false);
    }
  }

  async function executarPipelineAction() {
    if (!specSelecionada) return;
    if (!confirm('Executar o pipeline de auditoria? Isso executará 5 auditorias via IA (pode levar ~30s).')) return;
    setExecutandoPipeline(true);
    try {
      const data = await apiFetch<{ resultado: ResultadoPipeline; status: string }>(
        '/api/knowledge-spec/pipeline', { method: 'POST', body: JSON.stringify({ id: specSelecionada.id }) }
      );
      await abrirDetalhe(specSelecionada.id);
      await carregarLista();
      alert(`Pipeline concluído. Classificação: ${CLASSIFICACAO_LABEL[data.resultado.classificacao]}. Status: ${STATUS_LABEL[data.status as KnowledgeSpecStatus]}`);
    } catch (err) {
      alert(`Erro no pipeline: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExecutandoPipeline(false);
    }
  }

  async function aprovar() {
    if (!specSelecionada) return;
    if (!confirm('APROVAR esta especificação? Ela será publicada na Base de Conhecimento e ficará disponível para o KRONOS.')) return;
    setAprovando(true);
    try {
      await apiFetch('/api/knowledge-spec/aprovar', { method: 'POST', body: JSON.stringify({ id: specSelecionada.id }) });
      await abrirDetalhe(specSelecionada.id);
      await carregarLista();
      alert('Especificação aprovada e publicada na Base de Conhecimento.');
    } catch (err) {
      alert(`Erro ao aprovar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAprovando(false);
    }
  }

  async function reprovar() {
    if (!specSelecionada || !motivoReprovacao.trim()) { alert('Informe o motivo da reprovação.'); return; }
    if (!confirm('REPROVAR esta especificação manualmente?')) return;
    setReprovando(true);
    try {
      await apiFetch('/api/knowledge-spec/reprovar', { method: 'POST', body: JSON.stringify({ id: specSelecionada.id, motivo: motivoReprovacao }) });
      await abrirDetalhe(specSelecionada.id);
      await carregarLista();
      setMotivoReprovacao('');
    } catch (err) {
      alert(`Erro ao reprovar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setReprovando(false);
    }
  }

  function adicionarReferencia() {
    if (!refForm.instituicao.trim() || !refForm.documento.trim()) { alert('Instituição e documento são obrigatórios.'); return; }
    set('referencias_oficiais', [...form.referencias_oficiais, { ...refForm }]);
    setRefForm({ instituicao: '', documento: '' });
  }

  function removerReferencia(idx: number) {
    set('referencias_oficiais', form.referencias_oficiais.filter((_, i) => i !== idx));
  }

  const nomeUsuario = user?.user_metadata?.nome || user?.email?.split('@')[0] || '';

  return (
    <>
      <Head><title>Biblioteca Técnica — Pipeline KRONIA</title></Head>
      <div style={{ minHeight: '100vh', background: '#F7FAFC' }}>
        {/* Header */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Biblioteca Técnica</h1>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#718096' }}>Pipeline de Knowledge Specifications — {nomeUsuario}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {visao !== 'lista' && (
              <button onClick={() => setVisao('lista')} style={btnSecStyle}>
                ← Lista
              </button>
            )}
            {visao === 'lista' && (
              <button onClick={novaSpec} style={btnPrimStyle}>
                + Nova Spec
              </button>
            )}
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px 80px' }}>

          {/* ── VISTA: LISTA ── */}
          {visao === 'lista' && (
            <ListaView
              specs={specs}
              carregando={carregandoLista}
              filtroStatus={filtroStatus}
              onFiltroChange={setFiltroStatus}
              onAbrirDetalhe={abrirDetalhe}
            />
          )}

          {/* ── VISTA: FORMULÁRIO ── */}
          {visao === 'form' && (
            <FormularioView
              form={form}
              set={set}
              refForm={refForm}
              setRefForm={setRefForm}
              onAdicionarRef={adicionarReferencia}
              onRemoverRef={removerReferencia}
              onSalvar={salvar}
              salvando={salvando}
              mensagem={mensagem}
              editandoId={editandoId}
            />
          )}

          {/* ── VISTA: DETALHE ── */}
          {visao === 'detalhe' && specSelecionada && (
            <DetalheView
              spec={specSelecionada}
              executandoPipeline={executandoPipeline}
              aprovando={aprovando}
              reprovando={reprovando}
              motivoReprovacao={motivoReprovacao}
              onMotivoChange={setMotivoReprovacao}
              onEditar={() => editarSpec(specSelecionada)}
              onExecutarPipeline={executarPipelineAction}
              onAprovar={aprovar}
              onReprovar={reprovar}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ─── Sub-componentes ────────────────────────────────────────────────────────

function ListaView({
  specs, carregando, filtroStatus, onFiltroChange, onAbrirDetalhe,
}: {
  specs: KnowledgeSpecSummary[];
  carregando: boolean;
  filtroStatus: string;
  onFiltroChange: (v: string) => void;
  onAbrirDetalhe: (id: string) => void;
}) {
  const FILTROS: { label: string; valor: string }[] = [
    { label: 'Ativos', valor: 'rascunho,em_auditoria,aguardando_aprovacao,reprovado' },
    { label: 'Rascunho', valor: 'rascunho' },
    { label: 'Em Auditoria', valor: 'em_auditoria' },
    { label: 'Aguardando', valor: 'aguardando_aprovacao' },
    { label: 'Aprovados', valor: 'aprovado' },
    { label: 'Reprovados', valor: 'reprovado' },
  ];

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            onClick={() => onFiltroChange(f.valor)}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              border: '1px solid',
              fontSize: '0.78rem',
              cursor: 'pointer',
              borderColor: filtroStatus === f.valor ? '#3182CE' : '#CBD5E0',
              background: filtroStatus === f.valor ? '#EBF8FF' : '#fff',
              color: filtroStatus === f.valor ? '#2B6CB0' : '#4A5568',
              fontWeight: filtroStatus === f.valor ? 600 : 400,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {carregando ? (
        <p style={{ fontSize: '0.85rem', color: '#718096' }}>Carregando...</p>
      ) : specs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#718096' }}>
          <p style={{ fontSize: '0.9rem' }}>Nenhuma spec encontrada para este filtro.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {specs.map((s) => {
            const cor = COR_STATUS[s.status];
            const cls = s.pipeline_classificacao ? COR_CLASSIFICACAO[s.pipeline_classificacao] : null;
            return (
              <div
                key={s.id}
                onClick={() => onAbrirDetalhe(s.id)}
                style={{
                  background: '#fff',
                  border: `1px solid ${cor.borda}`,
                  borderRadius: 10,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.titulo}</p>
                  <p style={{ fontSize: '0.75rem', color: '#718096', margin: '3px 0 0' }}>
                    {s.categoria}{s.subcategoria ? ` / ${s.subcategoria}` : ''}
                    {' · '}{new Date(s.updated_at).toLocaleDateString('pt-BR')}
                    {s.aprovado_por ? ` · Aprovado por ${s.aprovado_por}` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                  {cls && (
                    <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 12, background: cls.bg, color: cls.cor }}>
                      {cls.emoji} {CLASSIFICACAO_LABEL[s.pipeline_classificacao!]}
                    </span>
                  )}
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 12, background: cor.bg, color: cor.cor }}>
                    {STATUS_LABEL[s.status]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FormularioView({
  form, set, refForm, setRefForm, onAdicionarRef, onRemoverRef,
  onSalvar, salvando, mensagem, editandoId,
}: {
  form: FormState;
  set: <K extends keyof FormState>(campo: K, valor: FormState[K]) => void;
  refForm: ReferenciaOficial;
  setRefForm: (r: ReferenciaOficial) => void;
  onAdicionarRef: () => void;
  onRemoverRef: (i: number) => void;
  onSalvar: (e: React.FormEvent) => void;
  salvando: boolean;
  mensagem: string;
  editandoId: string | null;
}) {
  return (
    <form onSubmit={onSalvar} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <p style={{ fontSize: '0.75rem', color: '#718096', marginBottom: 20 }}>
        {editandoId ? `Editando rascunho — Pipeline será reiniciado ao salvar.` : 'Nova Knowledge Specification — será salva como rascunho.'}
      </p>

      {/* ETAPA 1: PESQUISADOR */}
      <SecaoForm titulo="Etapa 1 — Pesquisador: Metadados e Fontes Oficiais">
        <Grid2>
          <Campo label="Título *">
            <input required value={form.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Ex: Cateterismo Vesical de Demora" />
          </Campo>
          <Campo label="Categoria *">
            <input list="lista-dominios" required value={form.categoria} onChange={(e) => set('categoria', e.target.value)} placeholder="Selecione ou digite" />
            <datalist id="lista-dominios">{DOMINIOS_BIBLIOTECA.map((d) => <option key={d} value={d} />)}</datalist>
          </Campo>
        </Grid2>
        <Grid2>
          <Campo label="Subcategoria">
            <input value={form.subcategoria ?? ''} onChange={(e) => set('subcategoria', e.target.value)} placeholder="Ex: Urológico, Hemodinâmica" />
          </Campo>
          <Campo label="Resumo">
            <input value={form.resumo ?? ''} onChange={(e) => set('resumo', e.target.value)} placeholder="Breve descrição (1–2 frases)" />
          </Campo>
        </Grid2>

        {/* Referências oficiais */}
        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Referências Oficiais (Etapa 1 — Pesquisador)</label>
          <div style={{ background: '#F7FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12, marginTop: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <input value={refForm.instituicao} onChange={(e) => setRefForm({ ...refForm, instituicao: e.target.value })} placeholder="Instituição *" style={inputStyle} />
              <input value={refForm.documento} onChange={(e) => setRefForm({ ...refForm, documento: e.target.value })} placeholder="Documento *" style={inputStyle} />
              <input value={refForm.numero ?? ''} onChange={(e) => setRefForm({ ...refForm, numero: e.target.value })} placeholder="Número (ex: RDC 36)" style={inputStyle} />
              <input value={refForm.ano ?? ''} onChange={(e) => setRefForm({ ...refForm, ano: e.target.value })} placeholder="Ano (ex: 2023)" style={inputStyle} />
              <input value={refForm.data_atualizacao ?? ''} onChange={(e) => setRefForm({ ...refForm, data_atualizacao: e.target.value })} placeholder="Última atualização" style={inputStyle} />
              <input value={refForm.url ?? ''} onChange={(e) => setRefForm({ ...refForm, url: e.target.value })} placeholder="URL (opcional)" style={inputStyle} />
            </div>
            <textarea value={refForm.trecho ?? ''} onChange={(e) => setRefForm({ ...refForm, trecho: e.target.value })} placeholder="Trecho relevante da fonte (cópia da fonte, não paráfrase)" rows={2} style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.78rem' }} />
            <button type="button" onClick={onAdicionarRef} style={{ ...btnSecStyle, marginTop: 8 }}>+ Adicionar Referência</button>
          </div>
          {form.referencias_oficiais.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {form.referencias_oficiais.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, padding: '6px 10px' }}>
                  <div style={{ flex: 1, fontSize: '0.78rem' }}>
                    <strong>{r.instituicao}</strong> — {r.documento}{r.numero ? ` Nº ${r.numero}` : ''}{r.ano ? ` (${r.ano})` : ''}
                    {r.trecho && <span style={{ display: 'block', color: '#718096', marginTop: 2 }}>"{r.trecho.slice(0, 100)}{r.trecho.length > 100 ? '…' : ''}"</span>}
                  </div>
                  <button type="button" onClick={() => onRemoverRef(i)} style={{ background: 'none', border: 'none', color: '#C53030', cursor: 'pointer', fontSize: '0.8rem', padding: '0 4px' }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SecaoForm>

      {/* ETAPA 2: REDATOR */}
      <SecaoForm titulo="Etapa 2 — Redator: Conteúdo Técnico">
        <div style={{ background: '#EBF8FF', border: '1px solid #90CDF4', borderRadius: 6, padding: '8px 12px', fontSize: '0.78rem', color: '#2B6CB0', marginBottom: 12 }}>
          Todo conteúdo deve ser parafraseado com suas próprias palavras, técnico e fiel às fontes. Proibido copiar textos. Proibido acrescentar conhecimento externo.
        </div>
        <Grid2>
          <Campo label="Objetivo"><textarea rows={3} value={form.objetivo ?? ''} onChange={(e) => set('objetivo', e.target.value)} placeholder="O que este procedimento visa alcançar" /></Campo>
          <Campo label="Escopo"><textarea rows={3} value={form.escopo ?? ''} onChange={(e) => set('escopo', e.target.value)} placeholder="A quem e em que contexto se aplica" /></Campo>
        </Grid2>
        <Grid2>
          <Campo label="Indicações"><textarea rows={3} value={form.indicacoes ?? ''} onChange={(e) => set('indicacoes', e.target.value)} placeholder="Quando é indicado" /></Campo>
          <Campo label="Contraindicações"><textarea rows={3} value={form.contraindicacoes ?? ''} onChange={(e) => set('contraindicacoes', e.target.value)} placeholder="Quando não deve ser realizado" /></Campo>
        </Grid2>
        <Campo label="Materiais Necessários">
          <textarea rows={4} value={form.materiais ?? ''} onChange={(e) => set('materiais', e.target.value)} placeholder="Liste todos os materiais necessários" />
        </Campo>
        <Campo label="Preparação">
          <textarea rows={4} value={form.preparacao ?? ''} onChange={(e) => set('preparacao', e.target.value)} placeholder="Higienização das mãos, paramentação, preparo do paciente e ambiente" />
        </Campo>
        <Campo label="Procedimento Técnico (passo a passo)">
          <textarea rows={8} value={form.procedimento ?? ''} onChange={(e) => set('procedimento', e.target.value)} placeholder="Descreva cada etapa técnica com precisão" style={{ fontFamily: 'monospace', fontSize: '0.82rem' }} />
        </Campo>
        <Grid2>
          <Campo label="Cuidados Durante e Após"><textarea rows={4} value={form.cuidados ?? ''} onChange={(e) => set('cuidados', e.target.value)} placeholder="Cuidados de enfermagem durante e após o procedimento" /></Campo>
          <Campo label="Complicações Possíveis"><textarea rows={4} value={form.complicacoes ?? ''} onChange={(e) => set('complicacoes', e.target.value)} placeholder="Complicações descritas na literatura" /></Campo>
        </Grid2>
        <Grid2>
          <Campo label="Prevenção de Eventos Adversos"><textarea rows={3} value={form.prevencao_eventos_adversos ?? ''} onChange={(e) => set('prevencao_eventos_adversos', e.target.value)} placeholder="Medidas preventivas específicas" /></Campo>
          <Campo label="Pontos Críticos"><textarea rows={3} value={form.pontos_criticos ?? ''} onChange={(e) => set('pontos_criticos', e.target.value)} placeholder="Etapas que exigem atenção redobrada" /></Campo>
        </Grid2>
        <Grid2>
          <Campo label="Observações"><textarea rows={3} value={form.observacoes ?? ''} onChange={(e) => set('observacoes', e.target.value)} placeholder="Informações adicionais relevantes" /></Campo>
          <Campo label="Limitações"><textarea rows={3} value={form.limitacoes ?? ''} onChange={(e) => set('limitacoes', e.target.value)} placeholder="O que esta spec NÃO cobre" /></Campo>
        </Grid2>
        <Campo label="Variações Institucionais">
          <textarea rows={3} value={form.variacoes_institucionais ?? ''} onChange={(e) => set('variacoes_institucionais', e.target.value)} placeholder="Se existem variações conhecidas de protocolo entre serviços, registre aqui todas as posições — nunca escolha automaticamente." />
        </Campo>
      </SecaoForm>

      {mensagem && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: mensagem.startsWith('Erro') ? '#FFF5F5' : '#F0FFF4', color: mensagem.startsWith('Erro') ? '#C53030' : '#276749', fontSize: '0.85rem', marginBottom: 8 }}>
          {mensagem}
        </div>
      )}

      <button type="submit" disabled={salvando} style={{ ...btnPrimStyle, marginTop: 8, padding: '12px 20px', fontSize: '0.9rem', opacity: salvando ? 0.7 : 1, cursor: salvando ? 'not-allowed' : 'pointer' }}>
        {salvando ? 'Salvando...' : (editandoId ? 'Salvar Alterações' : 'Salvar como Rascunho')}
      </button>
    </form>
  );
}

function DetalheView({
  spec, executandoPipeline, aprovando, reprovando,
  motivoReprovacao, onMotivoChange, onEditar, onExecutarPipeline, onAprovar, onReprovar,
}: {
  spec: KnowledgeSpec;
  executandoPipeline: boolean;
  aprovando: boolean;
  reprovando: boolean;
  motivoReprovacao: string;
  onMotivoChange: (v: string) => void;
  onEditar: () => void;
  onExecutarPipeline: () => void;
  onAprovar: () => void;
  onReprovar: () => void;
}) {
  const cor = COR_STATUS[spec.status];
  const cls = spec.pipeline_classificacao ? COR_CLASSIFICACAO[spec.pipeline_classificacao] : null;

  return (
    <div>
      {/* Header da spec */}
      <div style={{ background: '#fff', border: `1px solid ${cor.borda}`, borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{spec.titulo}</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#718096' }}>
              {spec.categoria}{spec.subcategoria ? ` / ${spec.subcategoria}` : ''}
              {' · Criado por '}{spec.criado_por}
              {spec.aprovado_por ? ` · Aprovado por ${spec.aprovado_por}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
            {cls && <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 12, background: cls.bg, color: cls.cor }}>{cls.emoji} {CLASSIFICACAO_LABEL[spec.pipeline_classificacao!]}</span>}
            <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 12, background: cor.bg, color: cor.cor }}>{STATUS_LABEL[spec.status]}</span>
          </div>
        </div>

        {spec.resumo && <p style={{ margin: '10px 0 0', fontSize: '0.85rem', color: '#4A5568' }}>{spec.resumo}</p>}

        {/* Ações */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {['rascunho', 'reprovado'].includes(spec.status) && (
            <button onClick={onEditar} style={btnSecStyle}>Editar</button>
          )}
          {['rascunho', 'reprovado'].includes(spec.status) && (
            <button onClick={onExecutarPipeline} disabled={executandoPipeline} style={{ ...btnPrimStyle, opacity: executandoPipeline ? 0.7 : 1, cursor: executandoPipeline ? 'not-allowed' : 'pointer' }}>
              {executandoPipeline ? 'Executando pipeline...' : 'Executar Pipeline (Etapas 3–8)'}
            </button>
          )}
        </div>
      </div>

      {/* Resultado do Pipeline */}
      {spec.pipeline_resultado && (
        <PipelineResultadoView resultado={spec.pipeline_resultado} classificacao={spec.pipeline_classificacao} />
      )}

      {/* Ações de Aprovação (só para aguardando_aprovacao e pipeline não-vermelho) */}
      {spec.status === 'aguardando_aprovacao' && spec.pipeline_classificacao !== 'vermelho' && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px', marginTop: 16 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 12px' }}>Decisão Humana Obrigatória</h3>
          <p style={{ fontSize: '0.82rem', color: '#4A5568', margin: '0 0 14px' }}>
            Nenhum conteúdo é publicado automaticamente. Sua aprovação explícita é mandatória.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={onAprovar}
              disabled={aprovando}
              style={{
                background: '#276749', color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 20px', fontWeight: 700, fontSize: '0.9rem',
                cursor: aprovando ? 'not-allowed' : 'pointer', opacity: aprovando ? 0.7 : 1,
              }}
            >
              {aprovando ? 'Aprovando...' : 'Aprovar e Publicar na Base de Conhecimento'}
            </button>
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
            <p style={{ fontSize: '0.8rem', color: '#718096', margin: '0 0 8px' }}>Reprovação manual (informe o motivo):</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={motivoReprovacao}
                onChange={(e) => onMotivoChange(e.target.value)}
                placeholder="Motivo da reprovação..."
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={onReprovar} disabled={reprovando || !motivoReprovacao.trim()} style={{ background: '#C53030', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', opacity: (reprovando || !motivoReprovacao.trim()) ? 0.6 : 1 }}>
                {reprovando ? 'Reprovando...' : 'Reprovar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Spec */}
      <SpecConteudoView spec={spec} />

      {/* Referências */}
      {spec.referencias_oficiais?.length > 0 && (
        <SecaoDetalhe titulo="Referências Oficiais Coletadas">
          {spec.referencias_oficiais.map((r, i) => (
            <div key={i} style={{ background: '#F7FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 12px', marginBottom: 6 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem' }}>{i + 1}. {r.instituicao} — {r.documento}{r.numero ? ` Nº ${r.numero}` : ''}{r.ano ? ` (${r.ano})` : ''}</p>
              {r.url && <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#3182CE' }}>{r.url}</p>}
              {r.trecho && <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#718096', fontStyle: 'italic' }}>"{r.trecho}"</p>}
              {r.data_atualizacao && <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#718096' }}>Última atualização: {r.data_atualizacao}</p>}
            </div>
          ))}
        </SecaoDetalhe>
      )}

      {/* Histórico */}
      {spec.historico?.length > 0 && (
        <SecaoDetalhe titulo="Histórico de Auditoria">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[...spec.historico].reverse().map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, fontSize: '0.78rem', padding: '6px 0', borderBottom: '1px solid #F0F0F0' }}>
                <span style={{ color: '#718096', flexShrink: 0 }}>{new Date(h.data).toLocaleString('pt-BR')}</span>
                <span style={{ color: '#4A5568', fontWeight: 600 }}>{h.acao}</span>
                <span style={{ color: '#718096' }}>{h.usuario}</span>
                {h.observacao && <span style={{ color: '#718096' }}>— {h.observacao}</span>}
              </div>
            ))}
          </div>
        </SecaoDetalhe>
      )}
    </div>
  );
}

function PipelineResultadoView({ resultado, classificacao }: { resultado: ResultadoPipeline; classificacao?: ClassificacaoPipeline }) {
  const cls = classificacao ? COR_CLASSIFICACAO[classificacao] : null;

  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Resultado do Pipeline (Etapas 3–8)</h3>
        {cls && (
          <span style={{ padding: '3px 12px', borderRadius: 12, background: cls.bg, color: cls.cor, fontSize: '0.8rem', fontWeight: 600 }}>
            {cls.emoji} {CLASSIFICACAO_LABEL[classificacao!]} — Score: {resultado.score}%
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.85rem', color: '#4A5568', margin: '0 0 14px', background: '#F7FAFC', padding: '8px 12px', borderRadius: 6 }}>
        {resultado.resumo_consolidacao}
      </p>

      {resultado.parado_em && (
        <div style={{ background: '#FFF5F5', border: '1px solid #FC8181', borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: '0.8rem', color: '#C53030' }}>
          Pipeline interrompido na etapa de <strong>{resultado.parado_em}</strong>. Etapas posteriores não foram executadas.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { key: 'auditor_origem', label: 'Etapa 3 — Auditor de Origem', estagio: resultado.auditor_origem },
          { key: 'auditor_escopo', label: 'Etapa 4 — Auditor de Escopo', estagio: resultado.auditor_escopo },
          { key: 'auditor_coerencia', label: 'Etapa 5 — Auditor de Coerência', estagio: resultado.auditor_coerencia },
          { key: 'auditor_atualizacao', label: 'Etapa 6 — Auditor de Atualização', estagio: resultado.auditor_atualizacao },
          { key: 'auditor_dominio', label: 'Etapa 7 — Auditor de Domínio e Variabilidade', estagio: resultado.auditor_dominio },
        ].map(({ key, label, estagio }) => estagio && (
          <EstagioCard key={key} label={label} estagio={estagio} />
        ))}
      </div>

      {resultado.auditor_dominio && (
        <div style={{ marginTop: 10, padding: '10px 14px', background: '#F7FAFC', borderRadius: 8, fontSize: '0.8rem' }}>
          <strong>Classificação de Domínio:</strong>{' '}
          Proximidade: <em>{resultado.auditor_dominio.dominio}</em>{' · '}
          Risco: <em>{resultado.auditor_dominio.risco_tecnico}</em>{' · '}
          Variabilidade: <em>{resultado.auditor_dominio.variabilidade}</em>
          {resultado.auditor_dominio.divergencias.length > 0 && (
            <div style={{ marginTop: 6, color: '#744210', background: '#FFFBEB', borderRadius: 4, padding: '6px 8px' }}>
              <strong>Divergências entre fontes:</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                {resultado.auditor_dominio.divergencias.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EstagioCard({ label, estagio }: { label: string; estagio: ResultadoEstagio | ResultadoDominio }) {
  const aprovado = estagio.aprovado;
  return (
    <div style={{ border: `1px solid ${aprovado ? '#9AE6B4' : '#FC8181'}`, borderRadius: 8, padding: '10px 14px', background: aprovado ? '#F0FFF4' : '#FFF5F5' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '1rem' }}>{aprovado ? '✓' : '✗'}</span>
        <span style={{ fontWeight: 600, fontSize: '0.82rem', color: aprovado ? '#276749' : '#C53030' }}>{label}</span>
      </div>
      {estagio.observacoes?.length > 0 && (
        <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: '0.78rem', color: '#4A5568' }}>
          {estagio.observacoes.map((o, i) => <li key={i}>{o}</li>)}
        </ul>
      )}
      {!aprovado && estagio.itens_reprovados?.length > 0 && (
        <div style={{ marginTop: 6, padding: '6px 8px', background: '#FED7D7', borderRadius: 4, fontSize: '0.78rem', color: '#822727' }}>
          <strong>Itens reprovados:</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
            {estagio.itens_reprovados.map((item, i) => <li key={i}><em>"{item}"</em></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function SpecConteudoView({ spec }: { spec: KnowledgeSpec }) {
  const secoes: [string, string | undefined][] = [
    ['Objetivo', spec.objetivo], ['Escopo', spec.escopo],
    ['Indicações', spec.indicacoes], ['Contraindicações', spec.contraindicacoes],
    ['Materiais Necessários', spec.materiais], ['Preparação', spec.preparacao],
    ['Procedimento Técnico', spec.procedimento], ['Cuidados', spec.cuidados],
    ['Complicações', spec.complicacoes], ['Prevenção de Eventos Adversos', spec.prevencao_eventos_adversos],
    ['Pontos Críticos', spec.pontos_criticos], ['Observações', spec.observacoes],
    ['Limitações', spec.limitacoes], ['Variações Institucionais', spec.variacoes_institucionais],
  ];
  const preenchidas = secoes.filter(([, v]) => v?.trim());
  if (preenchidas.length === 0) return null;

  return (
    <SecaoDetalhe titulo="Conteúdo Técnico">
      {preenchidas.map(([titulo, conteudo]) => (
        <div key={titulo} style={{ marginBottom: 12 }}>
          <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '0.82rem', color: '#2D3748' }}>{titulo}</p>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#4A5568', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{conteudo}</p>
        </div>
      ))}
    </SecaoDetalhe>
  );
}

// ─── Primitivas de UI ────────────────────────────────────────────────────────

function SecaoForm({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 14px', fontSize: '0.9rem', fontWeight: 700, color: '#2D3748', paddingBottom: 8, borderBottom: '1px solid #F0F0F0' }}>{titulo}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  );
}

function SecaoDetalhe({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px', marginTop: 16 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 700, color: '#2D3748', paddingBottom: 8, borderBottom: '1px solid #F0F0F0' }}>{titulo}</h3>
      {children}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'contents' }}>{children}</div>
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {children}
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: '0.78rem', fontWeight: 600, color: '#4A5568' };

const inputStyle: React.CSSProperties = {
  border: '1px solid #CBD5E0',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: '0.85rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const btnPrimStyle: React.CSSProperties = {
  background: '#3182CE', color: '#fff', border: 'none', borderRadius: 8,
  padding: '8px 16px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
};

const btnSecStyle: React.CSSProperties = {
  background: '#fff', color: '#4A5568', border: '1px solid #CBD5E0', borderRadius: 8,
  padding: '8px 16px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
};

// Global input/textarea style applied via head style tag
const globalInputStyles = `
  input, textarea, select {
    border: 1px solid #CBD5E0;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 0.85rem;
    outline: none;
    width: 100%;
    box-sizing: border-box;
    font-family: inherit;
    background: #fff;
  }
  input:focus, textarea:focus { border-color: #3182CE; }
`;

// Inject global styles
if (typeof document !== 'undefined') {
  const existing = document.getElementById('bt-global-styles');
  if (!existing) {
    const el = document.createElement('style');
    el.id = 'bt-global-styles';
    el.textContent = globalInputStyles;
    document.head.appendChild(el);
  }
}
