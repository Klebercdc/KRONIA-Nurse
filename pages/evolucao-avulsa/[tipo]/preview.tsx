import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import { getDocType } from '../../../lib/evolucao/document-types';

export default function EvolucaoPreviewPage() {
  const router = useRouter();
  const tipoId = router.query.tipo as string | undefined;

  const docType = tipoId ? getDocType(tipoId) : undefined;
  const [documento, setDocumento] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [textoEditado, setTextoEditado] = useState('');

  useEffect(() => {
    if (!tipoId) return;
    const resultado = sessionStorage.getItem(`evolucao-resultado-${tipoId}`);
    if (resultado) {
      setDocumento(resultado);
      setTextoEditado(resultado);
    }
  }, [tipoId]);

  async function handleCopiar() {
    const texto = editando ? textoEditado : documento;
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      // fallback: select text
    }
  }

  function handleSalvarEdicao() {
    setDocumento(textoEditado);
    if (tipoId) sessionStorage.setItem(`evolucao-resultado-${tipoId}`, textoEditado);
    setEditando(false);
  }

  function handleNovoDocumento() {
    if (tipoId) {
      sessionStorage.removeItem(`evolucao-resultado-${tipoId}`);
      sessionStorage.removeItem(`evolucao-draft-${tipoId}`);
    }
    router.push(`/evolucao-avulsa/${tipoId}`);
  }

  if (!documento && tipoId) {
    return (
      <Layout>
        <div className="estado-vazio">
          <p>Documento não encontrado. Preencha o formulário novamente.</p>
          <button className="btn btn-primario" style={{ marginTop: 12 }} onClick={() => router.push(`/evolucao-avulsa/${tipoId}`)}>
            Voltar ao formulário
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="tela-header">
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 0', color: 'var(--color-clinical)', display: 'flex', alignItems: 'center' }}
          aria-label="Voltar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="tela-titulo" style={{ flex: 1 }}>Documento gerado</h1>
      </div>

      {/* Doc type badge */}
      {docType && (
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
            {docType.nome}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-faint)', fontFamily: 'var(--font-mono)' }}>
            {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      {/* Disclaimer */}
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
        Este documento foi gerado por IA. Verifique os dados, complete se necessário e assine conforme protocolo institucional.
      </div>

      {/* Document content */}
      {editando ? (
        <div style={{ marginBottom: 12 }}>
          <textarea
            value={textoEditado}
            onChange={(e) => setTextoEditado(e.target.value)}
            style={{
              width: '100%',
              minHeight: 340,
              padding: '16px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-clinical)',
              borderRadius: 14,
              fontSize: '0.85rem',
              color: 'var(--color-ink)',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.7,
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primario" style={{ flex: 1 }} onClick={handleSalvarEdicao}>
              Salvar edição
            </button>
            <button className="btn btn-secundario" style={{ padding: '12px 16px' }} onClick={() => { setEditando(false); setTextoEditado(documento); }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-line)',
          borderRadius: 14,
          padding: '16px',
          marginBottom: 12,
          fontSize: '0.85rem',
          color: 'var(--color-ink)',
          lineHeight: 1.75,
          fontFamily: 'var(--font-mono)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {documento}
        </div>
      )}

      {/* Actions */}
      {!editando && (
        <>
          <button
            className="btn btn-primario btn-bloco"
            onClick={handleCopiar}
            style={{ marginBottom: 10 }}
          >
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <button
              className="btn btn-secundario"
              onClick={() => { setEditando(true); setTextoEditado(documento); }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <IconEdit />
                Editar texto
              </span>
            </button>
            <button className="btn btn-secundario" onClick={handleNovoDocumento}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <IconPlus />
                Novo documento
              </span>
            </button>
          </div>

          <button
            className="btn btn-secundario btn-bloco"
            style={{ marginBottom: 24 }}
            onClick={() => router.push('/evolucao-avulsa')}
          >
            Outros tipos de documento
          </button>
        </>
      )}
    </Layout>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────

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

function IconEdit() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
