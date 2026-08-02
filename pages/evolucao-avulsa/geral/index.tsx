import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import {
  proximaPergunta,
  perguntasVisiveis,
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

/**
 * Perguntas visíveis, ainda sem resposta, que pertencem ao mesmo bloco da
 * primeira pendente — em ordem. Isso é o que vira UMA tela: o núcleo inteiro
 * (17 campos, nenhum depende do outro) cabe numa tela só; um bloco com
 * dependência interna (ex.: diagnóstico → qual o diagnóstico) revela o
 * segundo campo só depois que o lote for enviado e a tela recalcular.
 */
function loteAtual(schema: typeof schemaEvolucaoGeral, respostas: Respostas): Pergunta[] {
  const pendentes = perguntasVisiveis(schema, respostas).filter((p) => respostas[p.id] === undefined);
  if (pendentes.length === 0) return [];
  const bloco = pendentes[0].bloco;
  const lote: Pergunta[] = [];
  for (const p of pendentes) {
    if (p.bloco !== bloco) break;
    lote.push(p);
  }
  return lote;
}

export default function EvolucaoGeralPage() {
  const router = useRouter();
  const [respostas, setRespostas] = useState<Respostas>({});
  const [historico, setHistorico] = useState<string[]>([]);
  const [rascunho, setRascunho] = useState<Record<string, Valor>>({});
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

  const lote = loteAtual(schemaEvolucaoGeral, respostas);
  const terminou = proximaPergunta(schemaEvolucaoGeral, respostas) === null;
  const prog = progresso(schemaEvolucaoGeral, respostas);

  function marcar(id: string, valor: Valor) {
    setRascunho((prev) => ({ ...prev, [id]: valor }));
  }

  function limpar(id: string) {
    setRascunho((prev) => {
      const { [id]: _removido, ...resto } = prev;
      return resto;
    });
  }

  /** Envia o lote inteiro: o que tem rascunho vira resposta, o resto vira pulado. */
  function enviarLote() {
    let novasRespostas = respostas;
    const idsDoLote = lote.map((p) => p.id);
    for (const p of lote) {
      novasRespostas = p.id in rascunho ? responder(novasRespostas, p.id, rascunho[p.id]) : pular(novasRespostas, p.id);
    }
    setRespostas(novasRespostas);
    setHistorico((prev) => [...prev, ...idsDoLote]);
    setRascunho({});
  }

  /** Desfaz o último lote inteiro (não só a última pergunta), pra "voltar" ter efeito visível de uma tela. */
  function voltarLote() {
    if (historico.length === 0) return;
    // Descobre onde termina o lote anterior: perguntas consecutivas do mesmo bloco no fim do histórico.
    let corte = historico.length - 1;
    const blocoAlvo = schemaEvolucaoGeral.perguntas.find((p) => p.id === historico[corte])?.bloco;
    while (corte > 0) {
      const anteriorId = historico[corte - 1];
      const anteriorBloco = schemaEvolucaoGeral.perguntas.find((p) => p.id === anteriorId)?.bloco;
      if (anteriorBloco !== blocoAlvo) break;
      corte -= 1;
    }
    const idsDoLote = historico.slice(corte);
    let novasRespostas = respostas;
    for (const id of idsDoLote) novasRespostas = desfazer(schemaEvolucaoGeral, novasRespostas, id);
    setRespostas(novasRespostas);
    setHistorico((prev) => prev.slice(0, corte));
    setRascunho({});
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
            <button onClick={voltarLote} style={linkBtnStyle}>← Bloco anterior</button>
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

      {lote.length > 0 ? (
        <>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
            {TITULOS_DE_BLOCO[lote[0].bloco] ?? lote[0].bloco}
          </p>
          {lote.map((pergunta) => (
            <PerguntaCard
              key={pergunta.id}
              pergunta={pergunta}
              valor={rascunho[pergunta.id]}
              onMarcar={(valor) => marcar(pergunta.id, valor)}
              onLimpar={() => limpar(pergunta.id)}
            />
          ))}
          <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-faint)', marginBottom: 12 }}>
            Deixou algo em branco? Vira <strong>(CONFERIR)</strong> no documento — sem travar o fluxo.
          </p>
          <button className="btn btn-primario btn-bloco" style={{ marginBottom: 24 }} onClick={enviarLote}>
            Continuar
          </button>
        </>
      ) : (
        <>
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
          <button className="btn btn-primario btn-bloco" style={{ marginBottom: 24 }} disabled={!terminou} onClick={finalizar}>
            Gerar documento
          </button>
        </>
      )}
    </Layout>
  );
}

// ── Pergunta (dentro de um lote) ────────────────────────────────────────────

function PerguntaCard({
  pergunta,
  valor,
  onMarcar,
  onLimpar,
}: {
  pergunta: Pergunta;
  valor: Valor | undefined;
  onMarcar: (valor: Valor) => void;
  onLimpar: () => void;
}) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-line)',
      borderRadius: 14,
      padding: '16px',
      marginBottom: 12,
    }}>
      <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-ink)', marginBottom: 4 }}>
        {pergunta.texto}
      </p>
      {pergunta.ajuda && (
        <p style={{ fontSize: '0.76rem', color: 'var(--color-ink-faint)', marginBottom: 10 }}>{pergunta.ajuda}</p>
      )}

      <div style={{ marginTop: 10 }}>
        {pergunta.tipo === 'bool' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              className="btn btn-secundario"
              style={valor === true ? selecionadoStyle : undefined}
              onClick={() => onMarcar(true)}
            >
              Sim
            </button>
            <button
              className="btn btn-secundario"
              style={valor === false ? selecionadoStyle : undefined}
              onClick={() => onMarcar(false)}
            >
              Não
            </button>
          </div>
        )}

        {pergunta.tipo === 'opcao' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pergunta.opcoes?.map((opcao) => (
              <button
                key={opcao}
                className="btn btn-secundario"
                style={{ textAlign: 'left', ...(valor === opcao ? selecionadoStyle : {}) }}
                onClick={() => onMarcar(opcao)}
              >
                {opcao}
              </button>
            ))}
          </div>
        )}

        {pergunta.tipo === 'texto' && (
          <textarea
            className="campo-texto"
            style={{ width: '100%', minHeight: 70, resize: 'vertical', boxSizing: 'border-box' }}
            value={typeof valor === 'string' ? valor : ''}
            onChange={(e) => (e.target.value === '' ? onLimpar() : onMarcar(e.target.value))}
            placeholder="Descreva..."
          />
        )}

        {pergunta.tipo === 'numero' && (
          <input
            type="number"
            value={typeof valor === 'number' ? valor : ''}
            onChange={(e) => (e.target.value === '' ? onLimpar() : onMarcar(Number(e.target.value)))}
            min={pergunta.min}
            max={pergunta.max}
            placeholder={pergunta.unidade ? `Valor em ${pergunta.unidade}` : 'Valor'}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        )}
      </div>
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

const selecionadoStyle: React.CSSProperties = {
  borderColor: 'var(--color-clinical)',
  background: 'var(--color-clinical-tint)',
  color: 'var(--color-clinical)',
  fontWeight: 700,
};

function IconChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
