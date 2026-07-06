import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { getSupabaseBrowser } from '../lib/supabase-browser';

type Mensagem = {
  tipo: 'pergunta' | 'resposta' | 'erro';
  texto: string;
  fontes?: { titulo: string; categoria: string }[];
};

const QUICK_ACCESS = [
  { icon: <IconProtocolo />, label: 'Protocolos', query: 'Quais protocolos estão disponíveis?' },
  { icon: <IconProcedimento />, label: 'Procedimentos', query: 'Quais procedimentos estão disponíveis?' },
  { icon: <IconMedicamento />, label: 'Medicamentos', query: 'Quais medicamentos estão cadastrados?' },
  { icon: <IconDispositivo />, label: 'Dispositivos', query: 'Quais dispositivos estão cadastrados?' },
] as const;

const CHAVE_HISTORICO = 'kronia:kronos:historico';

export default function KronosPage() {
  const router = useRouter();
  const [pergunta, setPergunta] = useState('');
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Restaura a conversa se a página recarregar (interrupção comum em plantão) —
  // sessionStorage some quando a aba fecha de verdade, não é histórico permanente.
  useEffect(() => {
    try {
      const salvo = window.sessionStorage.getItem(CHAVE_HISTORICO);
      if (salvo) setMensagens(JSON.parse(salvo));
    } catch {
      // sessionStorage indisponível — segue com conversa vazia.
    }
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(CHAVE_HISTORICO, JSON.stringify(mensagens));
    } catch {
      // idem
    }
  }, [mensagens]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, carregando]);

  async function enviar(texto?: string) {
    const q = (texto ?? pergunta).trim();
    if (!q || carregando) return;
    setPergunta('');
    setMensagens((m) => [...m, { tipo: 'pergunta', texto: q }]);
    setCarregando(true);
    try {
      const { data } = await getSupabaseBrowser().auth.getSession();
      const token = data.session?.access_token ?? '';
      const resp = await fetch('/api/kronos/professor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pergunta: q }),
      });
      const json = await resp.json() as { erro?: string; resposta?: string; fontes?: { titulo: string; categoria: string }[] };
      if (!resp.ok) {
        setMensagens((m) => [...m, { tipo: 'erro', texto: json.erro || 'Erro inesperado.' }]);
      } else {
        setMensagens((m) => [...m, { tipo: 'resposta', texto: json.resposta ?? '', fontes: json.fontes }]);
      }
    } catch {
      setMensagens((m) => [...m, { tipo: 'erro', texto: 'Falha de rede. Tente novamente.' }]);
    } finally {
      setCarregando(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  return (
    <Layout>
      {/* Header */}
      <div className="tela-header">
        <h1 className="tela-titulo">KRONOS</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => router.push('/biblioteca')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--color-clinical-tint)',
              border: 'none',
              borderRadius: 10,
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--color-clinical)',
              cursor: 'pointer',
            }}
          >
            <IconConhecimento />
            Conhecimento
          </button>
          <button
            onClick={() => router.push('/escalas')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--color-clinical-tint)',
              border: 'none',
              borderRadius: 10,
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--color-clinical)',
              cursor: 'pointer',
            }}
          >
            <IconRelogio />
            Escalas
          </button>
        </div>
      </div>

      {/* Disclaimer — mesmo tratamento visual de aviso de responsabilidade clínica usado em Encerramento */}
      <div className="texto-responsabilidade">
        Respostas baseadas exclusivamente no conteúdo cadastrado pela equipe.
        O KRONOS não interpreta casos clínicos nem recomenda condutas.
      </div>

      {/* Quick access grid */}
      {mensagens.length === 0 && (
        <div className="kronos-grid">
          {QUICK_ACCESS.map((item) => (
            <button
              key={item.label}
              className="kronos-grid-item"
              onClick={() => enviar(item.query)}
            >
              <div className="kronos-grid-item-icon">{item.icon}</div>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-ink)' }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
        {mensagens.length === 0 && (
          <div className="estado-vazio" style={{ padding: '24px 0' }}>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              Faça uma pergunta ou use o acesso rápido acima
            </p>
          </div>
        )}

        {mensagens.map((m, i) => (
          <BubbleMensagem key={i} mensagem={m} />
        ))}

        {carregando && (
          <div className="card" style={{ padding: '10px 14px', color: 'var(--color-ink-muted)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="spinner spinner-clinical" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
            Consultando base de conhecimento...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ position: 'sticky', bottom: 0, background: 'var(--color-bg)', paddingTop: 8, paddingBottom: 4, borderTop: '1px solid var(--color-line)' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            className="campo-texto"
            style={{ flex: 1, resize: 'none', minHeight: 48, maxHeight: 120, fontSize: '0.9rem', padding: '10px 12px' }}
            placeholder="Pergunte sobre procedimento, técnica ou protocolo..."
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={carregando}
          />
          <button
            className="btn btn-primario"
            style={{ alignSelf: 'flex-end', padding: '12px 16px' }}
            onClick={() => enviar()}
            disabled={!pergunta.trim() || carregando}
            aria-label="Enviar pergunta"
          >
            <IconEnviar />
          </button>
        </div>
      </div>
    </Layout>
  );
}

function BubbleMensagem({ mensagem }: { mensagem: Mensagem }) {
  if (mensagem.tipo === 'pergunta') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          background: 'var(--color-clinical)',
          color: '#fff',
          borderRadius: '14px 14px 2px 14px',
          padding: '10px 14px',
          maxWidth: '85%',
          fontSize: '0.88rem',
          lineHeight: 1.5,
        }}>
          {mensagem.texto}
        </div>
      </div>
    );
  }

  if (mensagem.tipo === 'erro') {
    return (
      <div className="card" style={{ borderLeft: '3px solid var(--color-danger)', padding: '10px 14px', fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
        {mensagem.texto}
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '12px 14px' }}>
      <RespostaMarkdown texto={mensagem.texto} />
      {mensagem.fontes && mensagem.fontes.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--color-line)', fontSize: '0.75rem', color: 'var(--color-ink-faint)' }}>
          <strong style={{ color: 'var(--color-ink-muted)' }}>Fonte(s):</strong>{' '}
          {mensagem.fontes.map((f, i) => (
            <span key={i}>{f.titulo}{i < mensagem.fontes!.length - 1 ? ' · ' : ''}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function RespostaMarkdown({ texto }: { texto: string }) {
  const linhas = texto.split('\n');
  const blocos: React.ReactNode[] = [];
  let itensListaAtual: string[] = [];

  function fecharLista() {
    if (itensListaAtual.length === 0) return;
    blocos.push(
      <ul key={`ul-${blocos.length}`} style={{ margin: '2px 0', paddingLeft: 16 }}>
        {itensListaAtual.map((item, i) => (
          <li key={i} style={{ marginBottom: 2 }}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    itensListaAtual = [];
  }

  linhas.forEach((linha, i) => {
    const ehItemLista = linha.startsWith('- ') || linha.startsWith('* ');
    if (ehItemLista) {
      itensListaAtual.push(linha.slice(2));
      return;
    }
    fecharLista();

    if (linha.startsWith('## ')) {
      blocos.push(<h3 key={i} style={{ fontFamily: 'var(--font-display)', fontSize: '0.92rem', fontWeight: 700, marginTop: 10, marginBottom: 4, color: 'var(--color-clinical)' }}>{linha.slice(3)}</h3>);
    } else if (linha.startsWith('### ')) {
      blocos.push(<h4 key={i} style={{ fontSize: '0.88rem', fontWeight: 700, marginTop: 8, marginBottom: 2, color: 'var(--color-ink)' }}>{linha.slice(4)}</h4>);
    } else if (linha.trim() === '') {
      blocos.push(<div key={i} style={{ height: 6 }} />);
    } else {
      blocos.push(<p key={i} style={{ margin: '2px 0' }}>{renderInline(linha)}</p>);
    }
  });
  fecharLista();

  return (
    <div style={{ fontSize: '0.88rem', lineHeight: 1.65, color: 'var(--color-ink)' }}>
      {blocos}
    </div>
  );
}

function renderInline(texto: string): React.ReactNode {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((parte, i) => {
    if (parte.startsWith('**') && parte.endsWith('**')) {
      return <strong key={i}>{parte.slice(2, -2)}</strong>;
    }
    return parte;
  });
}

// ── Icons ────────────────────────────────────────────────────────────────────

function IconConhecimento() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="2.8" />
      <circle cx="6" cy="12" r="2.8" />
      <circle cx="18" cy="19" r="2.8" />
      <line x1="8.4" y1="13.4" x2="15.5" y2="17.6" />
      <line x1="15.5" y1="6.4" x2="8.4" y2="10.6" />
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

function IconEnviar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconProtocolo() {
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

function IconDispositivo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
