import { useState } from 'react';
import Layout from '../components/Layout';
import { useTurno } from '../components/useTurno';
import {
  NEWS2_CAMPOS, BRADEN_CAMPOS, MORSE_CAMPOS,
  calcularNews2, calcularBraden, calcularMorse, calcularQsofa,
  CampoEscala, ResultadoEscala,
} from '../lib/scales';
import { horaAgora } from '../lib/types';

type EscalaId = 'news2' | 'braden' | 'morse' | 'qsofa';

const ESCALAS: { id: EscalaId; label: string; descricao: string }[] = [
  { id: 'news2', label: 'NEWS2', descricao: 'National Early Warning Score 2 — detecção de deterioração clínica' },
  { id: 'braden', label: 'Braden', descricao: 'Risco de lesão por pressão' },
  { id: 'morse', label: 'Morse', descricao: 'Risco de queda' },
  { id: 'qsofa', label: 'qSOFA', descricao: 'Quick SOFA — critérios de sepse' },
];

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
    if (escalaAtiva === 'news2') {
      const campos = NEWS2_CAMPOS;
      const vals = campos.map((c) => valores[c.chave] ?? 0);
      setResultado(calcularNews2(vals));
    } else if (escalaAtiva === 'braden') {
      const vals = BRADEN_CAMPOS.map((c) => valores[c.chave] ?? 1);
      setResultado(calcularBraden(vals));
    } else if (escalaAtiva === 'morse') {
      const vals = MORSE_CAMPOS.map((c) => valores[c.chave] ?? 0);
      setResultado(calcularMorse(vals));
    } else if (escalaAtiva === 'qsofa') {
      setResultado(calcularQsofa(qsofaPontos));
    }
  }

  function salvarComoEvento() {
    if (!resultado || !escalaAtiva) return;
    const nomeEscala = ESCALAS.find((e) => e.id === escalaAtiva)?.label ?? escalaAtiva;
    const texto = `[${escalaAtiva === 'news2' ? 'Sinal Vital' : 'Avaliação'}] Escala ${nomeEscala}: ${resultado.total} pts — ${resultado.risco}`;
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
    if (escalaAtiva === 'qsofa') return true;
    return false;
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

      {/* Seleção de escala */}
      {!escalaAtiva && (
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
      )}

      {/* Formulário da escala */}
      {escalaAtiva && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <button className="btn btn-secundario" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => { setEscalaAtiva(null); setResultado(null); }}>
              ← Voltar
            </button>
            <strong>{ESCALAS.find((e) => e.id === escalaAtiva)?.label}</strong>
          </div>

          {escalaAtiva === 'qsofa' ? (
            <QsofaForm pontos={qsofaPontos} onChange={setQsofaPontos} />
          ) : (
            <EscalaForm
              campos={escalaAtiva === 'news2' ? NEWS2_CAMPOS : escalaAtiva === 'braden' ? BRADEN_CAMPOS : MORSE_CAMPOS}
              valores={valores}
              onChange={setValor}
            />
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

              <button
                className="btn btn-secundario btn-bloco"
                onClick={salvarComoEvento}
                style={{ marginTop: 4 }}
              >
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
      <p className="card-titulo" style={{ marginBottom: 10 }}>Critérios presentes (marque os que se aplicam)</p>
      {criterios.map((c) => (
        <label key={c.chave} className="escala-opcao">
          <input
            type="checkbox"
            checked={!!selecionados[c.chave]}
            onChange={() => toggle(c.chave)}
            style={{ accentColor: 'var(--azul)', width: 16, height: 16 }}
          />
          <span style={{ fontSize: '0.875rem' }}>{c.label}</span>
        </label>
      ))}
      <p style={{ fontSize: '0.78rem', color: 'var(--cinza-400)', marginTop: 8 }}>
        2+ pontos: considerar avaliação de sepse (critério publicado — nunca diagnóstico pela IA).
      </p>
    </div>
  );
}
