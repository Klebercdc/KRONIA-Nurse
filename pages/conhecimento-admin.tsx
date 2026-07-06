import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseBrowser } from '../lib/supabase-browser';

const CATEGORIAS = ['Procedimentos', 'Administração de Medicamentos', 'Aprazamento', 'Protocolos', 'Segurança do Paciente', 'Perguntas Frequentes'];

const SUBCATEGORIAS: Record<string, string[]> = {
  'Procedimentos': ['Sonda Vesical', 'Cateter Venoso', 'Curativos', 'Aspiração', 'Oxigenoterapia', 'Coleta de Exames'],
  'Administração de Medicamentos': ['EV', 'IM', 'SC', 'VO', 'Diluições'],
};

type Entrada = {
  id: string;
  titulo: string;
  categoria: string;
  subcategoria: string;
  autor: string;
  data_revisao: string;
  cover_url: string | null;
  updated_at: string;
};

type CandidataFoto = {
  thumbUrl: string;
  url: string;
  credito: string;
  downloadLocation: string | null;
};

type FormState = {
  id: string;
  titulo: string;
  resumo: string;
  categoria: string;
  subcategoria: string;
  especialidade: string;
  palavras_chave: string;
  conteudo: string;
  referencias: string;
  autor: string;
  data_revisao: string;
};

const FORM_VAZIO: FormState = {
  id: '', titulo: '', resumo: '', categoria: '', subcategoria: '',
  especialidade: '', palavras_chave: '', conteudo: '', referencias: '', autor: '', data_revisao: '',
};

export default function ConhecimentoAdmin() {
  const { user, session } = useAuth();
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);

  const [entradaEscolhendoFoto, setEntradaEscolhendoFoto] = useState<Entrada | null>(null);
  const [candidatas, setCandidatas] = useState<CandidataFoto[]>([]);
  const [buscandoFotos, setBuscandoFotos] = useState(false);
  const [erroFotos, setErroFotos] = useState('');
  const [salvandoFoto, setSalvandoFoto] = useState(false);

  // Preencher autor automaticamente com o usuário logado
  useEffect(() => {
    if (user && !form.autor) {
      const nome = (user.user_metadata?.nome as string | undefined) || user.email?.split('@')[0] || '';
      setForm((f) => ({ ...f, autor: nome }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => { carregarLista(); }, []);

  async function getToken(): Promise<string> {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  }

  async function carregarLista() {
    setCarregandoLista(true);
    try {
      const token = await getToken();
      const resp = await fetch('/api/conhecimento/listar', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      setEntradas(data.entradas ?? []);
    } catch {
      // lista vazia em caso de falha
    } finally {
      setCarregandoLista(false);
    }
  }

  function set(campo: keyof FormState, valor: string) {
    setForm((f) => {
      const novo = { ...f, [campo]: valor };
      // Limpar subcategoria ao trocar categoria
      if (campo === 'categoria') novo.subcategoria = '';
      return novo;
    });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim() || !form.conteudo.trim()) {
      setMensagem('Título e conteúdo são obrigatórios.');
      return;
    }
    setSalvando(true);
    setMensagem('');
    try {
      const token = await getToken();
      const resp = await fetch('/api/conhecimento/salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setMensagem(`Erro: ${data.erro}`);
      } else {
        setMensagem(form.id ? '✓ Entrada atualizada (nova versão registrada).' : '✓ Entrada cadastrada com sucesso.');
        setForm(FORM_VAZIO);
        await carregarLista();
      }
    } catch {
      setMensagem('Falha de rede. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  function editar(entrada: Entrada) {
    // Buscar conteúdo completo para edição não é necessário aqui — o backend recebe os campos do form
    setForm({ ...FORM_VAZIO, id: entrada.id, titulo: entrada.titulo, categoria: entrada.categoria, subcategoria: entrada.subcategoria, autor: entrada.autor, data_revisao: entrada.data_revisao });
    setMensagem('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function arquivar(id: string) {
    if (!confirm('Arquivar esta entrada? Ela não aparecerá mais nas buscas do KRONOS.')) return;
    try {
      const token = await getToken();
      await fetch('/api/conhecimento/arquivar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      await carregarLista();
    } catch {
      alert('Falha ao arquivar. Tente novamente.');
    }
  }

  async function abrirEscolhaFoto(entrada: Entrada) {
    setEntradaEscolhendoFoto(entrada);
    setCandidatas([]);
    setErroFotos('');
    setBuscandoFotos(true);
    try {
      const token = await getToken();
      const resp = await fetch('/api/conhecimento/buscar-fotos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: entrada.id }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.erro ?? 'Falha ao buscar fotos.');
      setCandidatas(data.candidatas ?? []);
      if (!data.candidatas?.length) setErroFotos('Nenhuma foto encontrada para este tema.');
    } catch (err) {
      setErroFotos(err instanceof Error ? err.message : 'Falha ao buscar fotos.');
    } finally {
      setBuscandoFotos(false);
    }
  }

  async function escolherFoto(candidata: CandidataFoto) {
    if (!entradaEscolhendoFoto) return;
    setSalvandoFoto(true);
    try {
      const token = await getToken();
      const resp = await fetch('/api/conhecimento/definir-foto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: entradaEscolhendoFoto.id,
          url: candidata.url,
          credito: candidata.credito,
          downloadLocation: candidata.downloadLocation,
        }),
      });
      if (!resp.ok) throw new Error('Falha ao salvar a foto escolhida.');
      setEntradaEscolhendoFoto(null);
      await carregarLista();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao salvar a foto escolhida.');
    } finally {
      setSalvandoFoto(false);
    }
  }

  const subcatsDisponiveis = SUBCATEGORIAS[form.categoria] ?? [];
  const ehProcedimento = form.categoria.toLowerCase() === 'procedimentos';

  return (
    <>
      <Head><title>Admin KRONOS — Base de Conhecimento</title></Head>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 80px' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>
          Base de Conhecimento — KRONOS
        </h1>
        <p style={{ fontSize: '0.78rem', color: '#718096', marginBottom: 20 }}>
          Formulário de administração — não visível na navegação principal.
        </p>

        {/* Aviso legal */}
        <div style={{ background: '#FFFBEB', border: '1px solid #F6E05E', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: '0.8rem', color: '#744210' }}>
          <strong>Aviso:</strong> Todo conteúdo deve possuir redação própria. É proibida a cópia integral de livros, artigos, protocolos, normas, manuais, PDFs ou documentos oficiais. As referências servem apenas como fundamentação técnica.
        </div>

        <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {form.id && (
            <div style={{ background: '#EBF8FF', border: '1px solid #90CDF4', borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem', color: '#2B6CB0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Editando entrada existente — será criada nova versão.</span>
              <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2B6CB0', fontWeight: 600 }} onClick={() => setForm(FORM_VAZIO)}>Cancelar</button>
            </div>
          )}

          <Campo label="Título *">
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => set('titulo', e.target.value)}
              required
              placeholder="Ex: Cateterismo Vesical de Demora"
            />
          </Campo>

          <Campo label="Categoria">
            <input
              list="lista-categorias"
              value={form.categoria}
              onChange={(e) => set('categoria', e.target.value)}
              placeholder="Selecione ou digite"
            />
            <datalist id="lista-categorias">
              {CATEGORIAS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </Campo>

          {subcatsDisponiveis.length > 0 && (
            <Campo label="Subcategoria">
              <input
                list="lista-subcategorias"
                value={form.subcategoria}
                onChange={(e) => set('subcategoria', e.target.value)}
                placeholder="Selecione ou digite"
              />
              <datalist id="lista-subcategorias">
                {subcatsDisponiveis.map((s) => <option key={s} value={s} />)}
              </datalist>
            </Campo>
          )}

          <Campo label="Especialidade (opcional)">
            <input
              type="text"
              value={form.especialidade}
              onChange={(e) => set('especialidade', e.target.value)}
              placeholder="Ex: UTI, Clínica Médica, Centro Cirúrgico"
            />
          </Campo>

          <Campo label="Resumo">
            <textarea
              rows={2}
              value={form.resumo}
              onChange={(e) => set('resumo', e.target.value)}
              placeholder="Breve descrição do conteúdo"
            />
          </Campo>

          <Campo label={`Conteúdo *${ehProcedimento ? ' — use os subtítulos "Material necessário" e "Como fazer"' : ''}`}>
            {ehProcedimento && (
              <p style={{ fontSize: '0.75rem', color: '#2B6CB0', marginBottom: 6, background: '#EBF8FF', borderRadius: 6, padding: '4px 8px' }}>
                Sugestão para procedimentos: organize o conteúdo com os subtítulos <strong>Material necessário</strong> e <strong>Como fazer</strong>.
              </p>
            )}
            <textarea
              rows={10}
              value={form.conteudo}
              onChange={(e) => set('conteudo', e.target.value)}
              required
              placeholder={ehProcedimento
                ? 'Material necessário:\n- ...\n\nComo fazer:\n1. ...'
                : 'Descreva o conteúdo com suas próprias palavras...'}
              style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
            />
          </Campo>

          <Campo label="Referências (separadas do conteúdo)">
            <textarea
              rows={3}
              value={form.referencias}
              onChange={(e) => set('referencias', e.target.value)}
              placeholder="Ex: BRASIL. Ministério da Saúde. Manual de...  POTTER, P. A.; PERRY, A. G. Fundamentos de Enfermagem. 8. ed. ..."
            />
          </Campo>

          <div style={{ display: 'flex', gap: 12 }}>
            <Campo label="Autor / Revisor" style={{ flex: 1 }}>
              <input
                type="text"
                value={form.autor}
                onChange={(e) => set('autor', e.target.value)}
                placeholder="Nome do responsável"
              />
            </Campo>
            <Campo label="Data de revisão" style={{ flex: 1 }}>
              <input
                type="date"
                value={form.data_revisao}
                onChange={(e) => set('data_revisao', e.target.value)}
              />
            </Campo>
          </div>

          <Campo label="Palavras-chave (opcional)">
            <input
              type="text"
              value={form.palavras_chave}
              onChange={(e) => set('palavras_chave', e.target.value)}
              placeholder="Ex: cateter, sonda, infecção, assepsia"
            />
          </Campo>

          {mensagem && (
            <div style={{ padding: '8px 12px', borderRadius: 8, background: mensagem.startsWith('Erro') ? '#FFF5F5' : '#F0FFF4', color: mensagem.startsWith('Erro') ? '#C53030' : '#276749', fontSize: '0.85rem' }}>
              {mensagem}
            </div>
          )}

          <button
            type="submit"
            disabled={salvando}
            style={{ background: 'var(--azul, #3182CE)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px', fontWeight: 700, fontSize: '0.9rem', cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}
          >
            {salvando ? 'Salvando e gerando embedding...' : (form.id ? 'Salvar nova versão' : 'Cadastrar entrada')}
          </button>
        </form>

        {/* Lista de entradas */}
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Entradas cadastradas</h2>
          {carregandoLista ? (
            <p style={{ fontSize: '0.85rem', color: '#718096' }}>Carregando...</p>
          ) : entradas.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#718096' }}>Nenhuma entrada cadastrada ainda.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {entradas.map((e) => (
                <div key={e.id} style={{ background: '#F7FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0 }}>
                    {e.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.cover_url} alt="" width={40} height={40} style={{ borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 6, background: '#E2E8F0', flexShrink: 0 }} />
                    )}
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.88rem', margin: 0 }}>{e.titulo}</p>
                      <p style={{ fontSize: '0.75rem', color: '#718096', margin: '2px 0 0' }}>
                        {[e.categoria, e.subcategoria].filter(Boolean).join(' / ')}
                        {e.updated_at ? ` · ${new Date(e.updated_at).toLocaleDateString('pt-BR')}` : ''}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => abrirEscolhaFoto(e)}
                      style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #CBD5E0', background: '#fff', cursor: 'pointer' }}
                    >
                      {e.cover_url ? 'Trocar foto' : 'Escolher foto'}
                    </button>
                    <button
                      onClick={() => editar(e)}
                      style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #CBD5E0', background: '#fff', cursor: 'pointer' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => arquivar(e.id)}
                      style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #FC8181', background: '#fff', color: '#C53030', cursor: 'pointer' }}
                    >
                      Arquivar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {entradaEscolhendoFoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Escolher foto de capa"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1000 }}
          onClick={() => !salvandoFoto && setEntradaEscolhendoFoto(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 12, padding: 20, maxWidth: 420, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px' }}>Escolher foto de capa</h3>
            <p style={{ fontSize: '0.8rem', color: '#718096', margin: '0 0 14px' }}>{entradaEscolhendoFoto.titulo}</p>

            {buscandoFotos && <p style={{ fontSize: '0.85rem', color: '#718096' }}>Buscando fotos...</p>}
            {!buscandoFotos && erroFotos && <p style={{ fontSize: '0.85rem', color: '#C53030' }}>{erroFotos}</p>}

            {!buscandoFotos && candidatas.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {candidatas.map((c) => (
                  <button
                    key={c.url}
                    onClick={() => escolherFoto(c)}
                    disabled={salvandoFoto}
                    style={{ padding: 0, border: '2px solid transparent', borderRadius: 8, overflow: 'hidden', cursor: salvandoFoto ? 'not-allowed' : 'pointer', opacity: salvandoFoto ? 0.6 : 1 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.thumbUrl} alt="" width={180} height={120} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setEntradaEscolhendoFoto(null)}
              disabled={salvandoFoto}
              style={{ marginTop: 16, fontSize: '0.85rem', padding: '8px 14px', borderRadius: 8, border: '1px solid #CBD5E0', background: '#fff', cursor: 'pointer', width: '100%' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Campo({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#4A5568' }}>{label}</label>
      <div style={{ display: 'contents' }}>
        {children}
      </div>
    </div>
  );
}
