import { useState } from 'react';
import Layout from '../components/Layout';
import { useTurno } from '../components/useTurno';
import {
  NEWS2_CAMPOS, BRADEN_CAMPOS, MORSE_CAMPOS,
  calcularNews2, calcularBraden, calcularMorse, calcularQsofa,
  CampoEscala, ResultadoEscala,
} from '../lib/scales';

type EscalaId = 'news2' | 'braden' | 'morse' | 'qsofa';

const ESCALAS: { id: EscalaId; label: string; descricao: string }[] = [
  { id: 'news2', label: 'NEWS2', descricao: 'National Early Warning Score 2 — deterioração clínica' },
  { id: 'braden', label: 'Braden', descricao: 'Risco de lesão por pressão' },
  { id: 'morse', label: 'Morse', descricao: 'Risco de queda' },
  { id: 'qsofa', label: 'qSOFA', descricao: 'Quick SOFA — critérios de sepse' },
];

function riscoStyle(risco: string): { badge: string; bar: string } {
  if (risco.includes('Alto') || risco.includes('Urgência')) return { badge: 'badge-risco-alto', bar: 'alerta-alto' };
  if (risco.includes('Médio') || risco.includes('Moderado') || risco.includes('Médio')) return { badge: 'badge-risco-medio', bar: 'alerta-medio' };
  return { badge: 'badge-risco-baixo', bar: 'alerta-baixo' };
}

export default function EscalasPage() {
  const { turno, carregado, capturar } = useTurno();
  const [escalaAtiva, setEscalaAtiva] = useState<EscalaId | null>(null);
  const [valores, setValores] = useState<Record<string, number>>({});
  const [resultado, setResultado] = useState<ResultadoEscala | null>(null);
  const [qsofaPontos, setQsofaPontos] = useState(0);
  const [pacienteSelecionado, setPacienteSelecionado] = useState('');
  const [salvandoEvento, setSalvandoEvento] = useState(false);

  function selecionarEscala(id: EscalaId) {
    setEscalaAtiva(id);
    setValores({});
    setResultado(null);
    setQsofaPontos(0);
  }

  function setValor(chave: string, valor: number) {
    setValores((v) => ({ ...v, [chave]: valor }));
  }

  function calcular() {
    if (escalaAtiva === 'news2') {
      setResultado(calcularNews2(NEWS2_CAMPOS.map((c) => valores[c.chave] ?? 0)));
    } else if (escalaAtiva === 'braden') {
      setResultado(calcularBraden(BRADEN_CAMPOS.map((c) => valores[c.chave] ?? 1)));
    } else if (escalaAtiva === 'morse') {
      setResultado(calcularMorse(MORSE_CAMPOS.map((c) => valores[c.chave] ?? 0)));
    } else if (escalaAtiva === 'qsofa') {
      setResultado(calcularQsofa(qsofaPontos));
    }
  }

  function salvarEscala() {
    if (!resultado || !escalaAtiva) return;
    const nomeEscala = ESCALAS.find((e) => e.id === escalaAtiva)?.label ?? escalaAtiva;
    const prefixo = escalaAtiva === 'news2' ? 'Sinal Vital' : 'Avaliação';
    const texto = `[${prefixo}] Escala ${nomeEscala}: ${resultado.total} pts — ${resultado.risco}`;
    const eventoCompleto = pacienteSelecionado
      ? `${turno.pacientes.find((p) => p.id === pacienteSelecionado)?.leito ?? ''} — ${texto}`
      : texto;
    capturar(eventoCompleto);
    setSalvandoEvento(true);
    setTimeout(() => setSalvandoEvento(false), 2000);
  }

  const todosCamposPreenchidos = () => {
    if (escalaAtiva === 'news2') return NEWS2_CAMPOS.every((c) => valores[c.chave] !== undefined);
    if (escalaAtiva === 'braden') return BRADEN_CAMPOS.every((c) => valores[c.chave] !== undefined);
    if (escalaAtiva === 'morse') return MORSE_CAMPOS.every((c) => valores[c.chave] !== undefined);
    return true;
  };

  if (!carregado) return <Layout><div className="estado-vazio">Carregando...</div></Layout>;

  return (
    <Layout>
      <div className="tela-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {escalaAtiva && (
            <button
              className="btn-icone"
              onClick={() => { setEscalaAtiva(null); setResultado(null); }}
              aria-label="Voltar"
              style={{ marginRight: 2 }}
            >
              <IconVoltar />
            </button>
          )}
          <h1 className="tela-titulo">
            {escalaAtiva ? ESCALAS.find((e) => e.id === escalaAtiva)?.label : 'Escalas'}
          </h1>
        </div>
      </div>

      {!escalaAtiva && (
        <>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-ink-faint)', marginBottom: 16, lineHeight: 1.5 }}>
            Calculadoras manuais — apenas sobre valores que você informar. A IA nunca estima.
          </p>
          <div>
            {ESCALAS.map((e) => (
              <div
                key={e.id}
                className="card"
                style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
                onClick={() => selecionarEscala(e.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: 'var(--color-ink)',
                    }}>
                      {e.label}
                    </strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', marginTop: 2 }}>
                      {e.descricao}
                    </p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            ))}
          </div>

          {/* Risk scale reference */}
          <div className="card" style={{ marginTop: 8 }}>
            <p className="card-titulo">Referência de risco (NEWS2)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { range: '0–4', label: 'Baixo', badge: 'badge-risco-baixo' },
                { range: '5–6', label: 'Médio', badge: 'badge-risco-medio' },
                { range: '≥ 7', label: 'Alto', badge: 'badge-risco-alto' },
              ].map((item) => (
                <div key={item.range} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 32, fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-ink)', textAlign: 'right' }}>
                    {item.range}
                  </span>
                  <span className={`badge ${item.badge}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Scale form */}
      {escalaAtiva && (
        <>
          {escalaAtiva === 'qsofa' ? (
            <QsofaForm pontos={qsofaPontos} onChange={setQsofaPontos} />
          ) : (
            <EscalaForm
              campos={
                escalaAtiva === 'news2' ? NEWS2_CAMPOS
                : escalaAtiva === 'braden' ? BRADEN_CAMPOS
                : MORSE_CAMPOS
              }
              valores={valores}
              onChange={setValor}
            />
          )}

          {/* Score display while filling */}
          {Object.keys(valores).length > 0 && !resultado && (
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-line)',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-ink-muted)' }}>Score parcial:</span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.4rem',
                fontWeight: 800,
                color: 'var(--color-clinical)',
              }}>
                {Object.values(valores).reduce((a, b) => a + b, 0)}
              </span>
            </div>
          )}

          <button
            className="btn btn-primario btn-bloco"
            style={{ marginBottom: 12 }}
            onClick={calcular}
            disabled={!todosCamposPreenchidos()}
          >
            Calcular escala
          </button>

          {resultado && (
            <div className={`alerta-card ${riscoStyle(resultado.risco).bar}`} style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '2.6rem',
                    fontWeight: 800,
                    lineHeight: 1,
                    color: 'var(--color-ink)',
                  }}>
                    {resultado.total}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-ink-muted)', marginLeft: 6 }}>pts</span>
                </div>
                <span className={`badge ${riscoStyle(resultado.risco).badge}`} style={{ fontSize: '0.75rem' }}>
                  {resultado.risco}
                </span>
              </div>

              <div className="sep" />

              {turno.pacientes.length > 0 && (
                <div className="campo" style={{ marginBottom: 10 }}>
                  <label>Associar a paciente (opcional)</label>
                  <select value={pacienteSelecionado} onChange={(e) => setPacienteSelecionado(e.target.value)}>
                    <option value="">— sem associar —</option>
                    {turno.pacientes.map((p) => (
                      <option key={p.id} value={p.id}>{p.leito}</option>
                    ))}
                  </select>
                </div>
              )}

              <button className="btn btn-primario btn-bloco" onClick={salvarEscala} style={{ marginTop: 4 }}>
                {salvandoEvento ? '✓ Salvo!' : 'Salvar escala'}
              </button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}

function EscalaForm({ campos, valores, onChange }: {
  campos: CampoEscala[];
  valores: Record<string, number>;
  onChange: (chave: string, valor: number) => void;
}) {
  return (
    <div>
      {campos.map((campo) => (
        <div key={campo.chave} className="card" style={{ marginBottom: 8 }}>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--color-ink)',
            marginBottom: 10,
          }}>
            {campo.label}
          </p>
          {campo.opcoes.map((op) => (
            <label
              key={op.valor}
              className="escala-opcao"
              style={{ background: valores[campo.chave] === op.valor ? 'var(--color-clinical-tint)' : undefined }}
            >
              <input
                type="radio"
                name={campo.chave}
                value={op.valor}
                checked={valores[campo.chave] === op.valor}
                onChange={() => onChange(campo.chave, op.valor)}
              />
              <span style={{ fontSize: '0.875rem', flex: 1, color: 'var(--color-ink)' }}>{op.label}</span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: op.valor > 0 ? 'var(--color-warn)' : 'var(--color-ok)',
              }}>
                {op.valor > 0 ? `+${op.valor}` : op.valor}
              </span>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}

function QsofaForm({ pontos, onChange }: { pontos: number; onChange: (n: number) => void }) {
  const criterios = [
    { label: 'PA sistólica ≤ 100 mmHg', chave: 'pas' },
    { label: 'FR ≥ 22 irpm', chave: 'fr' },
    { label: 'Alteração do nível de consciência', chave: 'consc' },
  ];
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});

  function toggle(chave: string) {
    const novo = { ...selecionados, [chave]: !selecionados[chave] };
    setSelecionados(novo);
    onChange(Object.values(novo).filter(Boolean).length);
  }

  return (
    <div className="card">
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: '0.9rem',
        fontWeight: 600,
        color: 'var(--color-ink)',
        marginBottom: 12,
      }}>
        Critérios presentes (marque os que se aplicam)
      </p>
      {criterios.map((c) => (
        <label
          key={c.chave}
          className="escala-opcao"
          style={{ background: selecionados[c.chave] ? 'var(--color-clinical-tint)' : undefined }}
        >
          <input
            type="checkbox"
            checked={!!selecionados[c.chave]}
            onChange={() => toggle(c.chave)}
            style={{ accentColor: 'var(--color-clinical)', width: 16, height: 16 }}
          />
          <span style={{ fontSize: '0.875rem', color: 'var(--color-ink)' }}>{c.label}</span>
        </label>
      ))}
      <p style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)', marginTop: 10, lineHeight: 1.5 }}>
        2+ pontos: considerar avaliação de sepse — critério publicado, nunca diagnóstico pela IA.
      </p>
    </div>
  );
}

function IconVoltar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
