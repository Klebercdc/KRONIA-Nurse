import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import type { DocumentoGerado } from '../../../lib/evolucao/adaptive-engine';

const RESULT_KEY = 'evolucao-geral-documento';

export default function EvolucaoGeralPreviewPage() {
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentoGerado | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(RESULT_KEY);
    if (raw) {
      try {
        setDoc(JSON.parse(raw));
      } catch {
        // ignore
      }
    }
  }, []);

  async function handleCopiar() {
    if (!doc) return;
    try {
      await navigator.clipboard.writeText(doc.texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      // fallback: user selects manually
    }
  }

  function handleNovoDocumento() {
    sessionStorage.removeItem(RESULT_KEY);
    router.push('/evolucao-avulsa/geral');
  }

  if (!doc) {
    return (
      <Layout>
        <div className="estado-vazio">
          <p>Documento não encontrado. Refaça o fluxo de perguntas.</p>
          <button className="btn btn-primario" style={{ marginTop: 12 }} onClick={() => router.push('/evolucao-avulsa/geral')}>
            Voltar ao fluxo
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="tela-header">
        <button onClick={() => router.back()} style={backBtnStyle} aria-label="Voltar">
          <IconChevronLeft />
        </button>
        <h1 className="tela-titulo" style={{ flex: 1 }}>Documento gerado</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{
          background: 'var(--color-clinical-tint)',
          color: 'var(--color-clinical)',
          fontSize: '0.72rem',
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: 20,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          {doc.titulo}
        </span>
        {doc.totalConferir > 0 && (
          <span style={{
            background: 'var(--color-warn-tint)',
            color: 'var(--color-warn-ink)',
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 20,
          }}>
            {doc.totalConferir} para conferir
          </span>
        )}
      </div>

      <div style={{
        background: 'var(--color-warn-tint)',
        border: '1px solid var(--color-warn)',
        borderRadius: 10,
        padding: '10px 13px',
        fontSize: '0.78rem',
        color: 'var(--color-ink-muted)',
        marginBottom: 16,
        lineHeight: 1.5,
      }}>
        <strong style={{ color: 'var(--color-ink)' }}>Revise antes de usar.</strong>{' '}
        Trechos com borda tracejada foram pulados ou ficaram ambíguos — complete-os manualmente.
        Assine conforme protocolo institucional (COREN) antes de registrar no prontuário.
      </div>

      {/* Document content, section by section, with (CONFERIR) spans highlighted */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        borderRadius: 14,
        padding: '16px',
        marginBottom: 12,
        fontSize: '0.85rem',
        color: 'var(--color-ink)',
        lineHeight: 1.8,
      }}>
        {doc.secoes.map((secao, i) => (
          <div key={i} style={{ marginBottom: i < doc.secoes.length - 1 ? 16 : 0 }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
              {secao.titulo}
            </p>
            <p style={{ margin: 0 }}>
              {secao.trechos.map((trecho, j) => (
                <span
                  key={j}
                  style={trecho.conferir ? {
                    border: '1px dashed var(--color-warn)',
                    borderRadius: 6,
                    padding: '1px 4px',
                    color: 'var(--color-warn-ink)',
                  } : undefined}
                >
                  {trecho.texto}{' '}
                </span>
              ))}
            </p>
          </div>
        ))}
      </div>

      <button className="btn btn-primario btn-bloco" onClick={handleCopiar} style={{ marginBottom: 24, marginTop: 16 }}>
        {copiado ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <IconCheck />
            Copiado!
          </span>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <IconCopy />
            Copiar para área de transferência
          </span>
        )}
      </button>

      <button className="btn btn-secundario btn-bloco" style={{ marginBottom: 24 }} onClick={handleNovoDocumento}>
        Novo documento
      </button>
    </Layout>
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

// ── Icons ──────────────────────────────────────────────────────────────────

function IconChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
