import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import { getDocType } from '../../../lib/evolucao/document-types';
import { getFieldSchema, hasSchema, type FormField } from '../../../lib/evolucao/field-schemas';
import { getSupabaseBrowser } from '../../../lib/supabase-browser';

export default function EvolucaoFormPage() {
  const router = useRouter();
  const tipoId = router.query.tipo as string | undefined;

  const docType = tipoId ? getDocType(tipoId) : undefined;
  const schema = tipoId ? getFieldSchema(tipoId) : undefined;

  const [valores, setValores] = useState<Record<string, string>>({});
  const [chips, setChips] = useState<Record<string, string[]>>({});
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!tipoId) return;
    const draft = sessionStorage.getItem(`evolucao-draft-${tipoId}`);
    if (draft) {
      try {
        const { valores: v, chips: c } = JSON.parse(draft);
        if (v) setValores(v);
        if (c) setChips(c);
      } catch {
        // ignore
      }
    }
  }, [tipoId]);

  function setValue(id: string, val: string) {
    setValores((prev) => ({ ...prev, [id]: val }));
  }

  function toggleChip(fieldId: string, val: string) {
    setChips((prev) => {
      const cur = prev[fieldId] ?? [];
      const idx = cur.indexOf(val);
      const next = idx >= 0 ? cur.filter((v) => v !== val) : [...cur, val];
      return { ...prev, [fieldId]: next };
    });
  }

  function isValid(): boolean {
    if (!schema) return false;
    return schema.campos
      .filter((f) => f.required)
      .every((f) => {
        if (f.type === 'chips') return (chips[f.id]?.length ?? 0) > 0;
        return (valores[f.id] ?? '').trim() !== '';
      });
  }

  async function handleGerar() {
    if (!tipoId || !schema || !isValid()) return;
    setErro('');
    setGerando(true);

    // Persist draft
    sessionStorage.setItem(`evolucao-draft-${tipoId}`, JSON.stringify({ valores, chips }));

    const campos = schema.campos
      .map((f) => {
        let val = '';
        if (f.type === 'chips') {
          const sel = chips[f.id] ?? [];
          val = sel.map((v) => f.options?.find((o) => o.value === v)?.label ?? v).join(', ');
        } else if (f.type === 'select') {
          const raw = valores[f.id] ?? '';
          val = f.options?.find((o) => o.value === raw)?.label ?? raw;
        } else {
          val = valores[f.id] ?? '';
        }
        return { id: f.id, label: f.label, valor: val };
      })
      .filter((c) => c.valor.trim() !== '');

    try {
      const { data } = await getSupabaseBrowser().auth.getSession();
      const token = data.session?.access_token ?? '';
      const resp = await fetch('/api/evolucao/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tipoId, campos }),
      });
      const json = await resp.json() as { documento?: string; erro?: string };
      if (!resp.ok || json.erro) {
        setErro(json.erro ?? 'Erro ao gerar documento.');
        return;
      }
      sessionStorage.setItem(`evolucao-resultado-${tipoId}`, json.documento ?? '');
      router.push(`/evolucao-avulsa/${tipoId}/preview`);
    } catch {
      setErro('Falha de rede. Tente novamente.');
    } finally {
      setGerando(false);
    }
  }

  if (!tipoId || (!docType && tipoId)) {
    return (
      <Layout>
        <div className="estado-vazio">Tipo de documento não encontrado.</div>
      </Layout>
    );
  }

  if (!schema) {
    return (
      <Layout>
        <div className="tela-header">
          <button onClick={() => router.back()} style={backBtnStyle} aria-label="Voltar">
            <IconChevronLeft />
          </button>
          <h1 className="tela-titulo" style={{ flex: 1 }}>{docType?.nome}</h1>
        </div>
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-line)',
          borderRadius: 14,
          padding: '24px 16px',
          textAlign: 'center',
          marginTop: 16,
        }}>
          <p style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: 8 }}>
            Formulário em breve
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)', marginBottom: 20 }}>
            Este tipo de documento ainda não tem formulário estruturado. Você pode descrever as informações livremente:
          </p>
          <textarea
            className="campo-texto"
            style={{ width: '100%', minHeight: 160, resize: 'vertical', boxSizing: 'border-box', fontSize: '0.9rem' }}
            placeholder={`Descreva as informações para gerar o documento "${docType?.nome}"...`}
            value={valores['texto_livre'] ?? ''}
            onChange={(e) => setValue('texto_livre', e.target.value)}
          />
          {erro && <div style={erroStyle}>{erro}</div>}
          <button
            className="btn btn-primario btn-bloco"
            style={{ marginTop: 12 }}
            disabled={!valores['texto_livre']?.trim() || gerando}
            onClick={async () => {
              if (!tipoId || !docType) return;
              setErro('');
              setGerando(true);
              try {
                const { data } = await getSupabaseBrowser().auth.getSession();
                const token = data.session?.access_token ?? '';
                const resp = await fetch('/api/evolucao/generate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({
                    tipoId,
                    campos: [{ id: 'descricao', label: 'Descrição clínica', valor: valores['texto_livre'] ?? '' }],
                  }),
                });
                const json = await resp.json() as { documento?: string; erro?: string };
                if (!resp.ok || json.erro) { setErro(json.erro ?? 'Erro.'); return; }
                sessionStorage.setItem(`evolucao-resultado-${tipoId}`, json.documento ?? '');
                router.push(`/evolucao-avulsa/${tipoId}/preview`);
              } catch {
                setErro('Falha de rede.');
              } finally {
                setGerando(false);
              }
            }}
          >
            {gerando ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Gerando...
              </span>
            ) : 'Gerar documento'}
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="tela-header">
        <button onClick={() => router.back()} style={backBtnStyle} aria-label="Voltar">
          <IconChevronLeft />
        </button>
        <h1 className="tela-titulo" style={{ flex: 1 }}>{docType?.nome}</h1>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', marginBottom: 20, lineHeight: 1.5 }}>
        Preencha os campos abaixo. Os marcados com * são obrigatórios.
      </p>

      {schema.campos.map((campo) => (
        <FieldRenderer
          key={campo.id}
          field={campo}
          value={campo.type === 'chips' ? undefined : (valores[campo.id] ?? '')}
          selectedChips={campo.type === 'chips' ? (chips[campo.id] ?? []) : undefined}
          onChange={(val) => setValue(campo.id, val)}
          onChipToggle={(val) => toggleChip(campo.id, val)}
        />
      ))}

      {erro && <div style={erroStyle}>{erro}</div>}

      <button
        className="btn btn-primario btn-bloco"
        style={{ marginTop: 8, marginBottom: 24 }}
        disabled={!isValid() || gerando}
        onClick={handleGerar}
      >
        {gerando ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            Gerando documento...
          </span>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <IconIA />
            Gerar com IA
          </span>
        )}
      </button>
    </Layout>
  );
}

// ── Field Renderer ─────────────────────────────────────────────────────────

function FieldRenderer({
  field,
  value,
  selectedChips,
  onChange,
  onChipToggle,
}: {
  field: FormField;
  value?: string;
  selectedChips?: string[];
  onChange: (val: string) => void;
  onChipToggle: (val: string) => void;
}) {
  return (
    <div className="campo" style={{ marginBottom: 16 }}>
      <label style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 6, fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {field.label}
        {field.required && <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>*</span>}
        {field.unit && <span style={{ color: 'var(--color-ink-faint)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>({field.unit})</span>}
      </label>

      {field.hint && (
        <p style={{ fontSize: '0.73rem', color: 'var(--color-ink-faint)', marginBottom: 6, marginTop: -2 }}>{field.hint}</p>
      )}

      {field.type === 'text' && (
        <input
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      )}

      {field.type === 'textarea' && (
        <textarea
          className="campo-texto"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          style={{ minHeight: 80, resize: 'vertical' }}
        />
      )}

      {field.type === 'number' && (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          min={field.min}
          max={field.max}
          placeholder={field.placeholder ?? (field.min !== undefined && field.max !== undefined ? `${field.min}–${field.max}` : '')}
        />
      )}

      {field.type === 'date' && (
        <input
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.type === 'time' && (
        <input
          type="time"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.type === 'select' && field.options && (
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Selecione...</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      {field.type === 'chips' && field.options && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {field.options.map((opt) => {
            const sel = selectedChips?.includes(opt.value) ?? false;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChipToggle(opt.value)}
                style={{
                  padding: '7px 13px',
                  borderRadius: 999,
                  border: `1.5px solid ${sel ? 'var(--color-clinical)' : 'var(--color-line)'}`,
                  background: sel ? 'var(--color-clinical-tint)' : 'var(--color-surface)',
                  color: sel ? 'var(--color-clinical)' : 'var(--color-ink-muted)',
                  fontSize: '0.82rem',
                  fontWeight: sel ? 700 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
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

const erroStyle: React.CSSProperties = {
  background: 'var(--color-danger-tint)',
  border: '1px solid var(--color-danger)',
  borderRadius: 10,
  padding: '10px 13px',
  fontSize: '0.83rem',
  color: 'var(--color-danger)',
  marginBottom: 12,
};

// ── Icons ──────────────────────────────────────────────────────────────────

function IconChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconIA() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a5 5 0 0 1 5 5v1a5 5 0 0 1-5 5 5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z" />
      <path d="M5.5 21a8.5 8.5 0 0 1 13 0" />
    </svg>
  );
}
