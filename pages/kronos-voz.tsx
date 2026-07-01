import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { getSupabaseBrowser } from '../lib/supabase-browser';
import type { ResultadoReconstrucao, TrechoDuvidoso, MedicamentoExtraido } from '../lib/kronos/reconstruir';

type Etapa = 'entrada' | 'processando' | 'resultado';

// ── Web Speech API types ───────────────────────────────────────────────────

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
}

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function KronosVozPage() {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>('entrada');
  const [transcricao, setTranscricao] = useState('');
  const [leito, setLeito] = useState('');
  const [iniciais, setIniciais] = useState('');
  const [resultado, setResultado] = useState<ResultadoReconstrucao | null>(null);
  const [textoEditado, setTextoEditado] = useState('');
  const [editando, setEditando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState('');

  // Mic state
  const [gravando, setGravando] = useState(false);
  const [temMic, setTemMic] = useState(false);
  const [transcricaoInterim, setTranscricaoInterim] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setTemMic(!!getSpeechRecognition());
  }, []);

  const pararGravacao = useCallback(() => {
    recognitionRef.current?.stop();
    setGravando(false);
    setTranscricaoInterim('');
  }, []);

  function iniciarGravacao() {
    const SR = getSpeechRecognition();
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (ev: SpeechRecognitionEvent) => {
      let final = transcricao;
      let interim = '';
      for (let i = 0; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) final += (final ? ' ' : '') + r[0].transcript;
        else interim += r[0].transcript;
      }
      setTranscricao(final);
      setTranscricaoInterim(interim);
    };

    rec.onend = () => {
      setGravando(false);
      setTranscricaoInterim('');
    };

    rec.onerror = () => {
      setGravando(false);
      setTranscricaoInterim('');
    };

    recognitionRef.current = rec;
    rec.start();
    setGravando(true);
  }

  function toggleMic() {
    if (gravando) pararGravacao();
    else iniciarGravacao();
  }

  async function handleReconstruir() {
    const txt = transcricao.trim();
    if (!txt) return;
    setErro('');
    setEtapa('processando');

    try {
      const { data } = await getSupabaseBrowser().auth.getSession();
      const token = data.session?.access_token ?? '';
      const body: Record<string, unknown> = { transcricao: txt };
      if (leito.trim() || iniciais.trim()) {
        body.contexto = {
          ...(leito.trim() && { leito: leito.trim() }),
          ...(iniciais.trim() && { iniciais: iniciais.trim() }),
        };
      }

      const resp = await fetch('/api/kronos/reconstruir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      const json = await resp.json() as ResultadoReconstrucao;
      setResultado(json);
      setTextoEditado(json.texto_revisado ?? '');
      setEtapa('resultado');
    } catch {
      setErro('Falha de rede. Tente novamente.');
      setEtapa('entrada');
    }
  }

  function handleNova() {
    setEtapa('entrada');
    setTranscricao('');
    setLeito('');
    setIniciais('');
    setResultado(null);
    setTextoEditado('');
    setEditando(false);
    setErro('');
  }

  async function handleCopiar() {
    const texto = editando ? textoEditado : (resultado?.texto_revisado ?? '');
    if (!texto) return;
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2200);
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
          <IconChevronLeft />
        </button>
        <h1 className="tela-titulo" style={{ flex: 1 }}>Transcrição de voz</h1>
        {etapa === 'resultado' && (
          <button
            onClick={handleNova}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--color-clinical)', fontWeight: 600, padding: 0 }}
          >
            Nova
          </button>
        )}
      </div>

      {etapa === 'entrada' && (
        <EntradaView
          transcricao={transcricao}
          transcricaoInterim={transcricaoInterim}
          leito={leito}
          iniciais={iniciais}
          gravando={gravando}
          temMic={temMic}
          erro={erro}
          onTranscricaoChange={setTranscricao}
          onLeitoChange={setLeito}
          onIniciaisChange={setIniciais}
          onMicToggle={toggleMic}
          onSubmit={handleReconstruir}
        />
      )}

      {etapa === 'processando' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 16 }}>
          <div className="spinner spinner-clinical" style={{ width: 36, height: 36, borderWidth: 3 }} />
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
            Reconstruindo narrativa clínica...
          </p>
          <p style={{ color: 'var(--color-ink-faint)', fontSize: '0.78rem', textAlign: 'center' }}>
            O KRONOS está analisando a transcrição
          </p>
        </div>
      )}

      {etapa === 'resultado' && resultado && (
        <ResultadoView
          resultado={resultado}
          textoEditado={textoEditado}
          editando={editando}
          copiado={copiado}
          onTextoChange={setTextoEditado}
          onEditToggle={() => setEditando((v) => !v)}
          onSalvarEdicao={() => setEditando(false)}
          onCancelarEdicao={() => { setEditando(false); setTextoEditado(resultado.texto_revisado ?? ''); }}
          onCopiar={handleCopiar}
          onNova={handleNova}
        />
      )}
    </Layout>
  );
}

// ── Entrada ────────────────────────────────────────────────────────────────

function EntradaView({
  transcricao, transcricaoInterim, leito, iniciais, gravando, temMic, erro,
  onTranscricaoChange, onLeitoChange, onIniciaisChange, onMicToggle, onSubmit,
}: {
  transcricao: string;
  transcricaoInterim: string;
  leito: string;
  iniciais: string;
  gravando: boolean;
  temMic: boolean;
  erro: string;
  onTranscricaoChange: (v: string) => void;
  onLeitoChange: (v: string) => void;
  onIniciaisChange: (v: string) => void;
  onMicToggle: () => void;
  onSubmit: () => void;
}) {
  return (
    <>
      {/* Disclaimer */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        borderRadius: 10,
        padding: '10px 13px',
        fontSize: '0.78rem',
        color: 'var(--color-ink-muted)',
        lineHeight: 1.55,
        marginBottom: 20,
      }}>
        Cole ou dite a transcrição bruta. O KRONOS irá reconstruir a narrativa clínica
        preservando fielmente os dados informados. O resultado é um <strong style={{ color: 'var(--color-ink)' }}>rascunho para revisão</strong> — nunca um registro final.
      </div>

      {/* Contexto opcional */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div className="campo" style={{ margin: 0 }}>
          <label>Leito (opcional)</label>
          <input
            value={leito}
            onChange={(e) => onLeitoChange(e.target.value)}
            placeholder="ex: 07"
          />
        </div>
        <div className="campo" style={{ margin: 0 }}>
          <label>Iniciais (opcional)</label>
          <input
            value={iniciais}
            onChange={(e) => onIniciaisChange(e.target.value)}
            placeholder="ex: J.S."
          />
        </div>
      </div>

      {/* Transcription area */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <textarea
          className="campo-texto"
          style={{
            width: '100%',
            minHeight: 180,
            resize: 'vertical',
            fontSize: '0.88rem',
            padding: '12px 12px 40px',
            boxSizing: 'border-box',
            lineHeight: 1.6,
            border: gravando ? '1.5px solid var(--color-danger)' : undefined,
          }}
          placeholder={
            temMic
              ? 'Cole aqui a transcrição bruta, ou use o microfone para ditar...'
              : 'Cole aqui a transcrição bruta do áudio...'
          }
          value={transcricao + (transcricaoInterim ? ' ' + transcricaoInterim : '')}
          onChange={(e) => !gravando && onTranscricaoChange(e.target.value)}
          readOnly={gravando}
        />

        {/* Mic button inside textarea */}
        {temMic && (
          <button
            onClick={onMicToggle}
            style={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: gravando ? 'var(--color-danger)' : 'var(--color-clinical)',
              color: '#fff',
              transition: 'background 0.2s',
              boxShadow: gravando ? '0 0 0 4px rgba(197,41,58,.2)' : 'none',
            }}
            aria-label={gravando ? 'Parar gravação' : 'Iniciar gravação'}
          >
            {gravando ? <IconStop /> : <IconMic />}
          </button>
        )}
      </div>

      {gravando && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'var(--color-danger-tint)',
          border: '1px solid var(--color-danger)',
          borderRadius: 10,
          marginBottom: 12,
          fontSize: '0.8rem',
          color: 'var(--color-danger)',
          fontWeight: 600,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-danger)', animation: 'pulse-green 1.2s infinite' }} />
          Gravando... fale claramente próximo ao microfone
        </div>
      )}

      {erro && (
        <div style={{ background: 'var(--color-danger-tint)', border: '1px solid var(--color-danger)', borderRadius: 10, padding: '10px 13px', fontSize: '0.83rem', color: 'var(--color-danger)', marginBottom: 12 }}>
          {erro}
        </div>
      )}

      <button
        className="btn btn-primario btn-bloco"
        disabled={!transcricao.trim() || gravando}
        onClick={onSubmit}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <IconKronos />
          Reconstruir narrativa
        </span>
      </button>
    </>
  );
}

// ── Resultado ─────────────────────────────────────────────────────────────

const CONFIANCA_CONFIG = {
  alta: { label: 'Confiança alta', bg: 'var(--color-ok-tint)', color: 'var(--color-ok)' },
  media: { label: 'Confiança média', bg: 'var(--color-warn-tint)', color: 'var(--color-warn)' },
  baixa: { label: 'Confiança baixa', bg: 'var(--color-danger-tint)', color: 'var(--color-danger)' },
  indeterminada: { label: 'Indeterminado', bg: 'var(--color-surface)', color: 'var(--color-ink-faint)' },
};

function ResultadoView({
  resultado, textoEditado, editando, copiado,
  onTextoChange, onEditToggle, onSalvarEdicao, onCancelarEdicao, onCopiar, onNova,
}: {
  resultado: ResultadoReconstrucao;
  textoEditado: string;
  editando: boolean;
  copiado: boolean;
  onTextoChange: (v: string) => void;
  onEditToggle: () => void;
  onSalvarEdicao: () => void;
  onCancelarEdicao: () => void;
  onCopiar: () => void;
  onNova: () => void;
}) {
  if (resultado.status === 'erro') {
    return (
      <div style={{ background: 'var(--color-danger-tint)', border: '1px solid var(--color-danger)', borderRadius: 14, padding: '20px 16px', marginTop: 8 }}>
        <p style={{ fontWeight: 700, color: 'var(--color-danger)', marginBottom: 8 }}>Não foi possível reconstruir</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)', marginBottom: 16 }}>{resultado.erro_descricao}</p>
        <button className="btn btn-secundario" onClick={onNova}>Tentar novamente</button>
      </div>
    );
  }

  const conf = CONFIANCA_CONFIG[resultado.confianca];
  const vitais = resultado.dados_extraidos?.sinais_vitais;
  const temVitais = vitais && Object.values(vitais).some(Boolean);

  return (
    <>
      {/* Confidence + warning */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{
          background: conf.bg,
          color: conf.color,
          fontSize: '0.72rem',
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: 20,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          {conf.label}
        </span>
        {resultado.trechos_duvidosos.length > 0 && (
          <span style={{ fontSize: '0.75rem', color: 'var(--color-warn)', fontWeight: 600 }}>
            ⚠ {resultado.trechos_duvidosos.length} trecho{resultado.trechos_duvidosos.length !== 1 ? 's' : ''} para revisar
          </span>
        )}
      </div>

      {/* Review disclaimer */}
      <div style={{
        background: 'var(--color-warn-tint)',
        border: '1px solid var(--color-warn)',
        borderRadius: 10,
        padding: '10px 13px',
        fontSize: '0.78rem',
        color: 'var(--color-ink-muted)',
        lineHeight: 1.5,
        marginBottom: 16,
      }}>
        <strong style={{ color: 'var(--color-ink)' }}>Rascunho qualificado — revise antes de salvar.</strong>{' '}
        Verifique todos os valores numéricos, medicamentos e procedimentos.
      </div>

      {/* Text */}
      {editando ? (
        <div style={{ marginBottom: 12 }}>
          <textarea
            value={textoEditado}
            onChange={(e) => onTextoChange(e.target.value)}
            style={{
              width: '100%',
              minHeight: 220,
              padding: '14px',
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-clinical)',
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
            <button className="btn btn-primario" style={{ flex: 1 }} onClick={onSalvarEdicao}>Salvar edição</button>
            <button className="btn btn-secundario" style={{ padding: '12px 16px' }} onClick={onCancelarEdicao}>Cancelar</button>
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
          {textoEditado || resultado.texto_revisado}
        </div>
      )}

      {/* Actions */}
      {!editando && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <button className="btn btn-primario" onClick={onCopiar}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              {copiado ? <><IconCheck /> Copiado!</> : <><IconCopy /> Copiar</>}
            </span>
          </button>
          <button className="btn btn-secundario" onClick={onEditToggle}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <IconEdit /> Editar
            </span>
          </button>
        </div>
      )}

      {/* Trechos duvidosos */}
      {resultado.trechos_duvidosos.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p className="card-titulo" style={{ color: 'var(--color-warn)' }}>
            Trechos para confirmação
          </p>
          {resultado.trechos_duvidosos.map((t, i) => (
            <TrechoDuvidosoCard key={i} trecho={t} isLast={i === resultado.trechos_duvidosos.length - 1} />
          ))}
        </div>
      )}

      {/* Dados extraídos */}
      {resultado.dados_extraidos && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p className="card-titulo">Dados extraídos</p>

          {temVitais && (
            <>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Sinais vitais
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
                {[
                  ['PA', vitais?.PA],
                  ['FC', vitais?.FC],
                  ['FR', vitais?.FR],
                  ['SpO₂', vitais?.SpO2],
                  ['Temp', vitais?.temperatura],
                  ['HGT', vitais?.glicemia],
                ].map(([label, val]) =>
                  val ? (
                    <div key={label as string} style={{
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-line)',
                      borderRadius: 8,
                      padding: '6px 8px',
                      textAlign: 'center',
                    }}>
                      <p style={{ fontSize: '0.65rem', color: 'var(--color-ink-faint)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>{label as string}</p>
                      <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}>{val as string}</p>
                    </div>
                  ) : null
                )}
              </div>
            </>
          )}

          {resultado.dados_extraidos.medicamentos.length > 0 && (
            <>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Medicamentos
              </p>
              {resultado.dados_extraidos.medicamentos.map((m: MedicamentoExtraido, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < resultado.dados_extraidos!.medicamentos.length - 1 ? '1px solid var(--color-line)' : 'none', fontSize: '0.83rem', color: 'var(--color-ink)' }}>
                  <span style={{ fontWeight: 600 }}>{m.nome}</span>
                  {m.dose && <span style={{ color: 'var(--color-ink-muted)' }}> · {m.dose}</span>}
                  {m.via && <span style={{ color: 'var(--color-ink-faint)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}> {m.via}</span>}
                  {m.observacao && <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-faint)', marginTop: 2 }}>{m.observacao}</p>}
                </div>
              ))}
            </>
          )}

          {resultado.dados_extraidos.procedimentos.length > 0 && (
            <div style={{ marginTop: resultado.dados_extraidos.medicamentos.length > 0 ? 12 : 0 }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Procedimentos
              </p>
              {resultado.dados_extraidos.procedimentos.map((p, i) => (
                <p key={i} style={{ fontSize: '0.83rem', color: 'var(--color-ink)', marginBottom: 2 }}>· {p}</p>
              ))}
            </div>
          )}

          {resultado.dados_extraidos.dispositivos.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Dispositivos
              </p>
              {resultado.dados_extraidos.dispositivos.map((d, i) => (
                <p key={i} style={{ fontSize: '0.83rem', color: 'var(--color-ink)', marginBottom: 2 }}>· {d}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alterações realizadas */}
      {resultado.alteracoes_realizadas.length > 0 && (
        <details style={{ marginBottom: 16 }}>
          <summary style={{ fontSize: '0.78rem', color: 'var(--color-ink-faint)', cursor: 'pointer', userSelect: 'none', padding: '4px 0' }}>
            Alterações realizadas ({resultado.alteracoes_realizadas.length})
          </summary>
          <div style={{ paddingTop: 8 }}>
            {resultado.alteracoes_realizadas.map((a, i) => (
              <p key={i} style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)', marginBottom: 2 }}>· {a}</p>
            ))}
          </div>
        </details>
      )}

      <button className="btn btn-secundario btn-bloco" onClick={onNova} style={{ marginBottom: 24 }}>
        Nova transcrição
      </button>
    </>
  );
}

function TrechoDuvidosoCard({ trecho, isLast }: { trecho: TrechoDuvidoso; isLast: boolean }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: isLast ? 'none' : '1px solid var(--color-line)' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{
          background: 'var(--color-warn-tint)',
          color: 'var(--color-warn)',
          fontSize: '0.72rem',
          padding: '2px 7px',
          borderRadius: 6,
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
        }}>
          "{trecho.original}"
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-faint)', alignSelf: 'center' }}>→</span>
        <span style={{
          background: 'var(--color-clinical-tint)',
          color: 'var(--color-clinical)',
          fontSize: '0.72rem',
          padding: '2px 7px',
          borderRadius: 6,
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
        }}>
          "{trecho.reconstruido}"
        </span>
      </div>
      <p style={{ fontSize: '0.76rem', color: 'var(--color-ink-muted)' }}>{trecho.motivo}</p>
      {trecho.requer_confirmacao && (
        <span style={{ fontSize: '0.67rem', fontWeight: 700, color: 'var(--color-danger)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Confirmação obrigatória
        </span>
      )}
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────

function IconChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconMic() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function IconStop() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

function IconKronos() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
