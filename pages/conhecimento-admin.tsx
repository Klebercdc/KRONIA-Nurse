import { useState, useEffect } from 'react';
import Head from 'next/head';

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
  updated_at: string;
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
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);

  useEffect(() => { carregarLista(); }, []);

  async function carregarLista() {
    setCarregandoLista(true);
    try {
      const resp = await fetch('/api/conhecimento/listar');
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
      const resp = await fetch('/api/conhecimento/salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch('/api/conhecimento/arquivar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await carregarLista();
    } catch {
      alert('Falha ao arquivar. Tente novamente.');
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
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.88rem', margin: 0 }}>{e.titulo}</p>
                    <p style={{ fontSize: '0.75rem', color: '#718096', margin: '2px 0 0' }}>
                      {[e.categoria, e.subcategoria].filter(Boolean).join(' / ')}
                      {e.updated_at ? ` · ${new Date(e.updated_at).toLocaleDateString('pt-BR')}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
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
