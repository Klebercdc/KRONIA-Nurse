import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import {
  proximaPergunta,
  responder,
  pular,
  desfazer,
  progresso,
  gerarDocumento,
  type Respostas,
  type Pergunta,
  type Valor,
} from '../../../lib/evolucao/adaptive-engine';
import { schemaEvolucaoGeral, TITULOS_DE_BLOCO } from '../../../lib/evolucao/adaptive-schemas';

const DRAFT_KEY = 'evolucao-geral-respostas';
const RESULT_KEY = 'evolucao-geral-documento';

export default function EvolucaoGeralPage() {
  const router = useRouter();
  const [respostas, setRespostas] = useState<Respostas>({});
  const [historico, setHistorico] = useState<string[]>([]);
  const [valorTexto, setValorTexto] = useState('');
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const draft = sessionStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const { respostas: r, historico: h } = JSON.parse(draft);
        if (r) setRespostas(r);
        if (h) setHistorico(h);
      } catch {
        // ignore
      }
    }
    setPronto(true);
  }, []);

  useEffect(() => {
    if (!pronto) return;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ respostas, historico }));
  }, [respostas, historico, pronto]);

  if (!pronto) return null;

  const pergunta = proximaPergunta(schemaEvolucaoGeral, respostas);
  const prog = progresso(schemaEvolucaoGeral, respostas);

  function registrar(id: string, valor: Valor) {
    setRespostas((prev) => responder(prev, id, valor));
    setHistorico((prev) => [...prev, id]);
    setValorTexto('');
  }

  function pularAtual() {
    if (!pergunta) return;
    setRespostas((prev) => pular(prev, pergunta.id));
    setHistorico((prev) => [...prev, pergunta.id]);
    setValorTexto('');
  }

  function voltarPergunta() {
    if (historico.length === 0) return;
    const ultimoId = historico[historico.length - 1];
    setRespostas((prev) => desfazer(schemaEvolucaoGeral, prev, ultimoId));
    setHistorico((prev) => prev.slice(0, -1));
    setValorTexto('');
  }

  function finalizar() {
    const doc = gerarDocumento(schemaEvolucaoGeral, respostas, TITULOS_DE_BLOCO);
    sessionStorage.setItem(RESULT_KEY, JSON.stringify(doc));
    sessionStorage.removeItem(DRAFT_KEY);
    router.push('/evolucao-avulsa/geral/preview');
  }

  return (
    <Layout>
      <div className="tela-header">
        <button onClick={() => router.push('/evolucao-avulsa')} style={backBtnStyle} aria-label="Voltar">
          <IconChevronLeft />
        </button>
        <h1 className="tela-titulo" style={{ flex: 1 }}>Evolução — motor adaptativo</h1>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {prog.respondidas} de {prog.visiveis} perguntas
          </span>
          {historico.length > 0 && (
            <button onClick={voltarPergunta} style={linkBtnStyle}>← Pergunta anterior</button>
          )}
        </div>
        <div style={{ height: 6, background: 'var(--color-line)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.round(prog.fracao * 100)}%`,
            background: 'var(--color-clinical)',
            transition: 'width 0.25s',
          }} />
        </div>
      </div>

      {pergunta ? (
        <PerguntaCard
          pergunta={pergunta}
          valorTexto={valorTexto}
          onValorTextoChange={setValorTexto}
          onResponder={(valor) => registrar(pergunta.id, valor)}
          onPular={pularAtual}
        />
      ) : (
        <div style={{
          background: 'var(--color-clinical-tint)',
          border: '1px solid var(--color-clinical)',
          borderRadius: 14,
          padding: '20px 16px',
          textAlign: 'center',
          marginBottom: 16,
        }}>
          <p style={{ fontWeight: 700, color: 'var(--color-clinical)', marginBottom: 4 }}>
            Todas as perguntas visíveis foram respondidas.
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-ink-muted)' }}>
            Revise o documento gerado antes de copiar.
          </p>
        </div>
      )}

      <button
        className="btn btn-primario btn-bloco"
        style={{ marginBottom: 24 }}
        disabled={!!pergunta}
        onClick={finalizar}
      >
        Gerar documento
      </button>
    </Layout>
  );
}

// ── Pergunta ─────────────────────────────────────────────────────────────

function PerguntaCard({
  pergunta,
  valorTexto,
  onValorTextoChange,
  onResponder,
  onPular,
}: {
  pergunta: Pergunta;
  valorTexto: string;
  onValorTextoChange: (v: string) => void;
  onResponder: (valor: Valor) => void;
  onPular: () => void;
}) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-line)',
      borderRadius: 14,
      padding: '18px 16px',
      marginBottom: 16,
    }}>
      <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
        {TITULOS_DE_BLOCO[pergunta.bloco] ?? pergunta.bloco}
      </p>
      <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-ink)', marginBottom: 4 }}>
        {pergunta.texto}
      </p>
      {pergunta.ajuda && (
        <p style={{ fontSize: '0.78rem', color: 'var(--color-ink-faint)', marginBottom: 12 }}>{pergunta.ajuda}</p>
      )}

      <div style={{ marginTop: 14 }}>
        {pergunta.tipo === 'bool' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button className="btn btn-secundario" onClick={() => onResponder(true)}>Sim</button>
            <button className="btn btn-secundario" onClick={() => onResponder(false)}>Não</button>
          </div>
        )}

        {pergunta.tipo === 'opcao' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pergunta.opcoes?.map((opcao) => (
              <button key={opcao} className="btn btn-secundario" style={{ textAlign: 'left' }} onClick={() => onResponder(opcao)}>
                {opcao}
              </button>
            ))}
          </div>
        )}

        {pergunta.tipo === 'texto' && (
          <>
            <textarea
              className="campo-texto"
              style={{ width: '100%', minHeight: 90, resize: 'vertical', boxSizing: 'border-box' }}
              value={valorTexto}
              onChange={(e) => onValorTextoChange(e.target.value)}
              placeholder="Descreva..."
            />
            <button
              className="btn btn-primario btn-bloco"
              style={{ marginTop: 10 }}
              disabled={!valorTexto.trim()}
              onClick={() => onResponder(valorTexto.trim())}
            >
              Continuar
            </button>
          </>
        )}

        {pergunta.tipo === 'numero' && (
          <>
            <input
              type="number"
              value={valorTexto}
              onChange={(e) => onValorTextoChange(e.target.value)}
              min={pergunta.min}
              max={pergunta.max}
              placeholder={pergunta.unidade ? `Valor em ${pergunta.unidade}` : 'Valor'}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
            <button
              className="btn btn-primario btn-bloco"
              style={{ marginTop: 10 }}
              disabled={valorTexto.trim() === '' || Number.isNaN(Number(valorTexto))}
              onClick={() => onResponder(Number(valorTexto))}
            >
              Continuar
            </button>
          </>
        )}
      </div>

      <button onClick={onPular} style={{ ...linkBtnStyle, marginTop: 14, display: 'block' }}>
        Pular — marcar para conferir depois
      </button>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const backBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px 8px 4px 0',
  color: 'var(--color-clinical)',
  display: 'flex',
  alignItems: 'center',
};

const linkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-clinical)',
  fontSize: '0.8rem',
  fontWeight: 600,
  padding: 0,
  fontFamily: 'var(--font-body)',
};

function IconChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
