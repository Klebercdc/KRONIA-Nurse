import { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import { getSupabaseBrowser } from '../lib/supabase-browser';

type Mensagem = {
  tipo: 'pergunta' | 'resposta' | 'erro';
  texto: string;
  fontes?: { titulo: string; categoria: string }[];
};

export default function KronosPage() {
  const [pergunta, setPergunta] = useState('');
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, carregando]);

  async function enviar() {
    const texto = pergunta.trim();
    if (!texto || carregando) return;

    setPergunta('');
    setMensagens((m) => [...m, { tipo: 'pergunta', texto }]);
    setCarregando(true);

    try {
      const sessaoResult = await getSupabaseBrowser().auth.getSession();
      const token = sessaoResult.data.session?.access_token ?? '';
      const resp = await fetch('/api/kronos/professor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pergunta: texto }),
      });
      const respData = await resp.json() as { erro?: string; resposta?: string; fontes?: { titulo: string; categoria: string }[] };
      if (!resp.ok) {
        setMensagens((m) => [...m, { tipo: 'erro', texto: respData.erro || 'Erro inesperado.' }]);
      } else {
        setMensagens((m) => [...m, { tipo: 'resposta', texto: respData.resposta ?? '', fontes: respData.fontes }]);
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
      <div className="tela-header">
        <h1 className="tela-titulo">KRONOS</h1>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--cinza-400)', marginBottom: 16 }}>
        Aprendizado e Direcionamento de Procedimentos — respostas baseadas exclusivamente no conteúdo cadastrado pela equipe.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {mensagens.length === 0 && (
          <div className="estado-vazio" style={{ padding: '32px 0' }}>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Faça uma pergunta sobre técnicas ou procedimentos de enfermagem.</p>
          </div>
        )}

        {mensagens.map((m, i) => (
          <BubbleMensagem key={i} mensagem={m} />
        ))}

        {carregando && (
          <div className="card" style={{ padding: '10px 14px', color: 'var(--cinza-400)', fontSize: '0.82rem' }}>
            Consultando base de conhecimento...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={{ position: 'sticky', bottom: 0, background: 'var(--fundo)', paddingTop: 8, paddingBottom: 4 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            className="campo-texto"
            style={{ flex: 1, resize: 'none', minHeight: 48, maxHeight: 120, fontSize: '0.9rem', padding: '10px 12px' }}
            placeholder="Pergunte sobre um procedimento, técnica ou protocolo..."
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={carregando}
          />
          <button
            className="btn btn-primario"
            style={{ alignSelf: 'flex-end', padding: '10px 16px' }}
            onClick={enviar}
            disabled={!pergunta.trim() || carregando}
          >
            Enviar
          </button>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--cinza-400)', marginTop: 4 }}>
          O KRONOS não interpreta casos clínicos nem recomenda condutas.
        </p>
      </div>
    </Layout>
  );
}

function BubbleMensagem({ mensagem }: { mensagem: Mensagem }) {
  if (mensagem.tipo === 'pergunta') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          background: 'var(--azul)',
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
      <div className="card" style={{ borderLeft: '3px solid var(--vermelho, #e53e3e)', padding: '10px 14px', fontSize: '0.85rem', color: 'var(--cinza-600, #4a5568)' }}>
        {mensagem.texto}
      </div>
    );
  }

  // resposta
  return (
    <div className="card" style={{ padding: '12px 14px' }}>
      <RespostaMarkdown texto={mensagem.texto} />
      {mensagem.fontes && mensagem.fontes.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--borda)', fontSize: '0.75rem', color: 'var(--cinza-400)' }}>
          <strong>Fonte(s):</strong>{' '}
          {mensagem.fontes.map((f, i) => (
            <span key={i}>{f.titulo}{i < mensagem.fontes!.length - 1 ? ' · ' : ''}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function RespostaMarkdown({ texto }: { texto: string }) {
  // Renderização simples de markdown: negrito, cabeçalhos, parágrafos
  const linhas = texto.split('\n');
  return (
    <div style={{ fontSize: '0.88rem', lineHeight: 1.65 }}>
      {linhas.map((linha, i) => {
        if (linha.startsWith('## ')) {
          return <h3 key={i} style={{ fontSize: '0.92rem', fontWeight: 700, marginTop: 10, marginBottom: 4, color: 'var(--azul)' }}>{linha.slice(3)}</h3>;
        }
        if (linha.startsWith('### ')) {
          return <h4 key={i} style={{ fontSize: '0.88rem', fontWeight: 700, marginTop: 8, marginBottom: 2 }}>{linha.slice(4)}</h4>;
        }
        if (linha.startsWith('**') && linha.endsWith('**')) {
          return <p key={i} style={{ fontWeight: 700, margin: '6px 0 2px' }}>{linha.slice(2, -2)}</p>;
        }
        if (linha.startsWith('- ') || linha.startsWith('* ')) {
          return <li key={i} style={{ marginLeft: 16, marginBottom: 2 }}>{renderInline(linha.slice(2))}</li>;
        }
        if (linha.trim() === '') return <div key={i} style={{ height: 6 }} />;
        return <p key={i} style={{ margin: '2px 0' }}>{renderInline(linha)}</p>;
      })}
    </div>
  );
}

function renderInline(texto: string): React.ReactNode {
  // Substitui **negrito** por <strong>
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((parte, i) => {
    if (parte.startsWith('**') && parte.endsWith('**')) {
      return <strong key={i}>{parte.slice(2, -2)}</strong>;
    }
    return parte;
  });
}
