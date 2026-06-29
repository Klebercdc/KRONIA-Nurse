import { useState } from 'react';
import Layout from '../components/Layout';
import { useTurno } from '../components/useTurno';
import {
  NEWS2_CAMPOS, BRADEN_CAMPOS, MORSE_CAMPOS, GCS_CAMPOS, PUSH_CAMPOS, RASS_CAMPOS, RAMSAY_CAMPOS,
  calcularNews2, calcularBraden, calcularMorse, calcularGlasgow, calcularPush, calcularQsofa,
  calcularRASS, calcularRamsay,
  CampoEscala, ResultadoEscala,
} from '../lib/scales';

type EscalaId = 'news2' | 'braden' | 'morse' | 'glasgow' | 'qsofa' | 'push' | 'rass' | 'ramsay';

const ESCALAS: { id: EscalaId; label: string; descricao: string }[] = [
  { id: 'news2', label: 'NEWS2', descricao: 'National Early Warning Score 2 — detecção de deterioração clínica' },
  { id: 'braden', label: 'Braden', descricao: 'Risco de lesão por pressão' },
  { id: 'morse', label: 'Morse', descricao: 'Risco de queda' },
  { id: 'glasgow', label: 'Glasgow (GCS)', descricao: 'Escala de Coma de Glasgow — nível de consciência (3–15)' },
  { id: 'qsofa', label: 'qSOFA', descricao: 'Quick SOFA — critérios de sepse (consciência via Glasgow)' },
  { id: 'push', label: 'PUSH Tool', descricao: 'Pressure Ulcer Scale for Healing — tendência de cicatrização' },
  { id: 'rass', label: 'RASS', descricao: 'Richmond Agitation-Sedation Scale — nível de sedação/agitação (−5 a +4)' },
  { id: 'ramsay', label: 'Ramsay', descricao: 'Escala de Ramsay — nível de sedação (1–6)' },
];

function camposDaEscala(id: EscalaId): CampoEscala[] {
  switch (id) {
    case 'news2': return NEWS2_CAMPOS;
    case 'braden': return BRADEN_CAMPOS;
    case 'morse': return MORSE_CAMPOS;
    case 'glasgow': return GCS_CAMPOS;
    case 'push': return PUSH_CAMPOS;
    case 'rass': return RASS_CAMPOS;
    case 'ramsay': return RAMSAY_CAMPOS;
    default: return [];
  }
}

export default function Kronos() {
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
    if (!escalaAtiva) return;
    if (escalaAtiva === 'qsofa') {
      setResultado(calcularQsofa(qsofaPontos));
      return;
    }
    // Braden e Glasgow têm valor mínimo 1; Ramsay começa em 1; RASS pode ser 0; demais 0.
    const defaultVal = (escalaAtiva === 'braden' || escalaAtiva === 'glasgow' || escalaAtiva === 'ramsay') ? 1 : 0;
    const vals = camposDaEscala(escalaAtiva).map((c) => valores[c.chave] ?? defaultVal);
    switch (escalaAtiva) {
      case 'news2': setResultado(calcularNews2(vals)); break;
      case 'braden': setResultado(calcularBraden(vals)); break;
      case 'morse': setResultado(calcularMorse(vals)); break;
      case 'glasgow': setResultado(calcularGlasgow(vals)); break;
      case 'push': setResultado(calcularPush(vals)); break;
      case 'rass': setResultado(calcularRASS(vals)); break;
      case 'ramsay': setResultado(calcularRamsay(vals)); break;
    }
  }

  function salvarComoEvento() {
    if (!resultado || !escalaAtiva) return;
    const nomeEscala = ESCALAS.find((e) => e.id === escalaAtiva)?.label ?? escalaAtiva;
    const tipo = escalaAtiva === 'news2' ? 'Sinal Vital' : escalaAtiva === 'push' ? 'Ferida' : 'Avaliação';
    const texto = `[${tipo}] Escala ${nomeEscala}: ${resultado.total} pts — ${resultado.risco}`;
    const leito = turno.pacientes.find((p) => p.id === pacienteSelecionado)?.leito;
    capturar(leito ? `${leito} — ${texto}` : texto);
    setSalvandoEvento(true);
    setTimeout(() => setSalvandoEvento(false), 2000);
  }

  const todosCamposPreenchidos = () => {
    if (escalaAtiva === 'qsofa') return true;
    if (!escalaAtiva) return false;
    return camposDaEscala(escalaAtiva).every((c) => valores[c.chave] !== undefined);
  };

  if (!carregado) return <Layout><div className="estado-vazio">Carregando...</div></Layout>;

  return (
    <Layout>
      <div className="tela-header">
        <h1 className="tela-titulo">KRONOS</h1>
      </div>
      <p style={{ fontSize: '0.82rem', color: 'var(--cinza-400)', marginBottom: 16 }}>
        Calculadoras manuais — apenas sobre valores que você informar. A IA nunca estima.
      </p>

      {!escalaAtiva ? (
        <div>
          {ESCALAS.map((e) => (
            <div key={e.id} className="card" style={{ cursor: 'pointer' }} onClick={() => selecionarEscala(e.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '1rem' }}>{e.label}</strong>
                  <p style={{ fontSize: '0.8rem', color: 'var(--cinza-400)', marginTop: 2 }}>{e.descricao}</p>
                </div>
                <span style={{ color: 'var(--azul)', fontSize: '1.2rem' }}>›</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <button
              className="btn btn-secundario"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              onClick={() => { setEscalaAtiva(null); setResultado(null); }}
            >
              ← Voltar
            </button>
            <strong>{ESCALAS.find((e) => e.id === escalaAtiva)?.label}</strong>
          </div>

          {escalaAtiva === 'qsofa' ? (
            <QsofaForm onChange={setQsofaPontos} />
          ) : (
            <EscalaForm campos={camposDaEscala(escalaAtiva)} valores={valores} onChange={setValor} />
          )}

          <button
            className="btn btn-primario btn-bloco"
            style={{ marginTop: 12 }}
            onClick={calcular}
            disabled={!todosCamposPreenchidos()}
          >
            Calcular
          </button>

          {resultado && (
            <div className="escala-resultado">
              <div className="escala-total">{resultado.total}</div>
              <div className="escala-risco">{resultado.risco}</div>

              {escalaAtiva === 'push' && (
                <p style={{ fontSize: '0.78rem', color: 'var(--cinza-400)', marginTop: 8, fontStyle: 'italic' }}>
                  PUSH Tool avalia tendência — salve como evento e compare com avaliações anteriores do mesmo leito para verificar progressão de cicatrização.
                </p>
              )}
              {(escalaAtiva === 'rass' || escalaAtiva === 'ramsay') && (
                <p style={{ fontSize: '0.78rem', color: 'var(--cinza-400)', marginTop: 8, fontStyle: 'italic' }}>
                  Escala de nível único — não soma pontos. Salve como evento para registrar no prontuário.
                </p>
              )}

              <div className="sep" />

              {turno.pacientes.length > 0 && (
                <div className="campo" style={{ marginBottom: 8, textAlign: 'left' }}>
                  <label>Salvar no registro de (opcional)</label>
                  <select value={pacienteSelecionado} onChange={(e) => setPacienteSelecionado(e.target.value)}>
                    <option value="">— sem associar a paciente —</option>
                    {turno.pacientes.map((p) => (
                      <option key={p.id} value={p.id}>{p.leito}</option>
                    ))}
                  </select>
                </div>
              )}

              <button className="btn btn-secundario btn-bloco" onClick={salvarComoEvento} style={{ marginTop: 4 }}>
                {salvandoEvento ? '✓ Salvo!' : 'Salvar como evento'}
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
          <p className="card-titulo" style={{ marginBottom: 8 }}>{campo.label}</p>
          {campo.opcoes.map((op) => (
            <label key={op.valor} className="escala-opcao">
              <input
                type="radio"
                name={campo.chave}
                value={op.valor}
                checked={valores[campo.chave] === op.valor}
                onChange={() => onChange(campo.chave, op.valor)}
              />
              <span style={{ fontSize: '0.875rem', flex: 1 }}>{op.label}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--azul)' }}>
                {op.valor > 0 ? `+${op.valor}` : op.valor}
              </span>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}

function QsofaForm({ onChange }: { onChange: (n: number) => void }) {
  const [pas, setPas] = useState(false);
  const [fr, setFr] = useState(false);
  const [gcsInput, setGcsInput] = useState('');

  const gcsNum = gcsInput !== '' ? parseInt(gcsInput, 10) : null;
  const gcsValido = gcsNum !== null && !isNaN(gcsNum) && gcsNum >= 3 && gcsNum <= 15;
  const conscienciaAtiva = gcsValido && gcsNum! < 15;

  function reportar(novoPas: boolean, novoFr: boolean, novoConsc: boolean) {
    onChange([novoPas, novoFr, novoConsc].filter(Boolean).length);
  }

  function togglePas() {
    const v = !pas;
    setPas(v);
    reportar(v, fr, conscienciaAtiva);
  }

  function toggleFr() {
    const v = !fr;
    setFr(v);
    reportar(pas, v, conscienciaAtiva);
  }

  function onGcsChange(val: string) {
    setGcsInput(val);
    const num = val !== '' ? parseInt(val, 10) : null;
    const valido = num !== null && !isNaN(num) && num >= 3 && num <= 15;
    const consc = valido && num! < 15;
    reportar(pas, fr, consc);
  }

  return (
    <div className="card">
      <p className="card-titulo" style={{ marginBottom: 10 }}>Critérios presentes</p>

      <label className="escala-opcao">
        <input
          type="checkbox"
          checked={pas}
          onChange={togglePas}
          style={{ accentColor: 'var(--azul)', width: 16, height: 16 }}
        />
        <span style={{ fontSize: '0.875rem', flex: 1 }}>PA sistólica ≤ 100 mmHg</span>
        {pas && <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--azul)' }}>+1 pt</span>}
      </label>

      <label className="escala-opcao">
        <input
          type="checkbox"
          checked={fr}
          onChange={toggleFr}
          style={{ accentColor: 'var(--azul)', width: 16, height: 16 }}
        />
        <span style={{ fontSize: '0.875rem', flex: 1 }}>FR ≥ 22 irpm</span>
        {fr && <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--azul)' }}>+1 pt</span>}
      </label>

      <div style={{ paddingTop: 10, borderTop: '1px solid var(--cinza-200)', marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: '0.875rem', flex: 1 }}>Glasgow total (3–15)</span>
          <input
            type="number"
            min={3}
            max={15}
            value={gcsInput}
            onChange={(e) => onGcsChange(e.target.value)}
            placeholder="—"
            style={{
              width: 64,
              padding: '6px 8px',
              border: '1px solid var(--cinza-200)',
              borderRadius: 6,
              fontSize: '0.9rem',
              textAlign: 'center',
              background: 'white',
            }}
          />
          {gcsValido && (
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: conscienciaAtiva ? 'var(--azul)' : 'var(--cinza-400)' }}>
              {conscienciaAtiva ? '+1 pt' : '0 pt'}
            </span>
          )}
        </div>
        {gcsValido && (
          <p style={{ fontSize: '0.75rem', color: conscienciaAtiva ? '#B91C1C' : 'var(--cinza-400)', marginBottom: 4 }}>
            {conscienciaAtiva
              ? `GCS ${gcsNum} < 15 — alteração de consciência (critério ativo)`
              : 'GCS = 15 — sem alteração de consciência (critério inativo)'}
          </p>
        )}
        <p style={{ fontSize: '0.72rem', color: 'var(--cinza-400)', lineHeight: 1.4 }}>
          Use a calculadora Glasgow acima para obter o total. Deixe em branco se não avaliado (critério não pontua).
        </p>
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--cinza-400)', marginTop: 10 }}>
        2+ pontos: considerar avaliação de sepse (critério publicado — nunca diagnóstico pela IA).
      </p>
    </div>
  );
}
