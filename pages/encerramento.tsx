import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useTurno, montarDadosPaciente, montarDadosRelatorioFinal, montarListaParaReclassificacao } from '../components/useTurno';
import { getSupabaseBrowser } from '../lib/supabase-browser';

type Fase = 'inicial' | 'processando' | 'pronto' | 'encerrado';

interface DocPaciente {
  leito: string;
  texto: string;
}

export default function Encerramento() {
  const { turno, carregado, editarEvento, adicionarPaciente, encerrarPlantao } = useTurno();
  const router = useRouter();
  const [fase, setFase] = useState<Fase>('inicial');
  const [log, setLog] = useState<string[]>([]);
  const [documentoCompleto, setDocumentoCompleto] = useState('');
  const [erro, setErro] = useState('');
  const [confirmandoEncerrar, setConfirmandoEncerrar] = useState(false);
  const [copiado, setCopiado] = useState(false);

  function addLog(msg: string) {
    setLog((l) => [...l, msg]);
  }

  async function processarPlantao() {
    setFase('processando');
    setLog([]);
    setErro('');

    try {
      const { data: sessao } = await getSupabaseBrowser().auth.getSession();
      const headersAuth = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessao.session?.access_token ?? ''}`,
      };

      addLog('Reclassificando leitos por contexto...');
      const listaNumerada = montarListaParaReclassificacao(turno.eventos, turno.pacientes);
      const respRecl = await fetch('/api/plantao/reclassificar', {
        method: 'POST',
        headers: headersAuth,
        body: JSON.stringify({ listaNumerada }),
      });
      const jsonRecl = await respRecl.json();
      if (!respRecl.ok) throw new Error(jsonRecl.erro);

      const mapeamento: { indice: number; leito: string }[] = jsonRecl.mapeamento;
      const eventosOrdenados = [...turno.eventos].sort((a, b) => a.ts - b.ts);

      for (const m of mapeamento) {
        const ev = eventosOrdenados[m.indice];
        if (!ev) continue;
        const paciente = turno.pacientes.find((p) => p.leito.toLowerCase() === m.leito.toLowerCase());
        if (!paciente) adicionarPaciente(m.leito, '', 'intermediarios');
        editarEvento(ev.id, ev.texto, paciente?.id ?? null);
      }
      addLog(`Reclassificação: ${mapeamento.length} evento(s) corrigido(s).`);

      addLog('Gerando evoluções por paciente...');
      const docs: DocPaciente[] = [];
      const pacientesComEventos = turno.pacientes.filter(
        (p) => turno.eventos.some((e) => e.patientId === p.id)
      );

      for (const p of pacientesComEventos) {
        addLog(`  → ${p.leito}...`);
        const dados = montarDadosPaciente(p, turno.eventos);
        const resp = await fetch('/api/plantao/gerar-documento', {
          method: 'POST',
          headers: headersAuth,
          body: JSON.stringify({ formato: 'evolucao', dados }),
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(json.erro);
        docs.push({ leito: p.leito, texto: json.texto });
      }
      addLog(`${docs.length} evolução(ões) gerada(s).`);

      addLog('Gerando relatório final...');
      const dadosRel = montarDadosRelatorioFinal(turno.pacientes, turno.eventos);
      const respRel = await fetch('/api/plantao/relatorio-final', {
        method: 'POST',
        headers: headersAuth,
        body: JSON.stringify({ dados: dadosRel }),
      });
      const jsonRel = await respRel.json();
      if (!respRel.ok) throw new Error(jsonRel.erro);
      addLog('Relatório final gerado.');

      const partes = [
        '═══════════════════════════════════════',
        'EVOLUÇÕES DE ENFERMAGEM',
        '═══════════════════════════════════════',
        '',
        ...docs.map((d) => `── ${d.leito} ──\n${d.texto}\n`),
        '═══════════════════════════════════════',
        'RELATÓRIO FINAL — PASSAGEM DE PLANTÃO',
        '═══════════════════════════════════════',
        '',
        jsonRel.texto,
      ];
      setDocumentoCompleto(partes.join('\n'));
      setFase('pronto');
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao processar o plantão.');
      setFase('inicial');
    }
  }

  function copiar() {
    navigator.clipboard.writeText(documentoCompleto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  }

  function handleEncerrar() {
    encerrarPlantao();
    setFase('encerrado');
    setConfirmandoEncerrar(false);
  }

  if (!carregado) return <Layout><div className="estado-vazio">Carregando...</div></Layout>;

  if (fase === 'encerrado') {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'var(--color-ok-tint)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: 'var(--color-ok)',
          }}>
            <IconCheck />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: 8 }}>
            Plantão encerrado
          </h2>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Memória do turno apagada. O próximo plantão começa limpo.
          </p>
          <button
            className="btn btn-primario"
            style={{ marginTop: 24 }}
            onClick={() => router.push('/plantao')}
          >
            Novo plantão
          </button>
        </div>
      </Layout>
    );
  }

  const horaInicio = new Date(turno.iniciadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <Layout>
      {/* Header */}
      <div className="tela-header">
        <h1 className="tela-titulo">Encerramento</h1>
      </div>

      {/* Summary */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        borderRadius: 14,
        padding: '16px',
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--color-clinical-tint)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-clinical)',
          flexShrink: 0,
        }}>
          <IconRelatorio />
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 4px', fontSize: '0.95rem' }}>
            Resumo do plantão
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', margin: '0 0 3px' }}>
            {horaInicio} → {horaAtual}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div className="stat-card">
          <span className="stat-card-label">Pacientes</span>
          <span className="stat-card-value">{turno.pacientes.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Registros</span>
          <span className="stat-card-value">{turno.eventos.length}</span>
        </div>
      </div>

      {/* Data deletion notice */}
      <div style={{
        background: 'var(--color-warn-tint)',
        border: '1px solid rgba(181,121,12,.2)',
        borderRadius: 12,
        padding: '10px 13px',
        fontSize: '0.78rem',
        color: 'var(--color-warn)',
        marginBottom: 14,
        lineHeight: 1.5,
      }}>
        Após gerar a evolução e encerrar o plantão, todos os dados deste turno serão apagados permanentemente do dispositivo.
      </div>

      {turno.pacientes.length === 0 && turno.eventos.length === 0 ? (
        <div className="estado-vazio">Nenhum dado registrado neste turno.</div>
      ) : (
        <>
          {fase === 'inicial' && (
            <button className="btn btn-primario btn-bloco" onClick={processarPlantao} style={{ marginBottom: 14 }}>
              Gerar evolução
            </button>
          )}

          {fase === 'processando' && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div className="spinner spinner-clinical" />
                <strong style={{ fontSize: '0.9rem', color: 'var(--color-ink)' }}>Processando...</strong>
              </div>
              {log.map((l, i) => (
                <p key={i} style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)', lineHeight: 1.7, fontFamily: 'var(--font-mono)' }}>
                  {l}
                </p>
              ))}
            </div>
          )}

          {erro && (
            <div style={{
              background: 'var(--color-danger-tint)',
              border: '1px solid var(--color-danger)',
              borderRadius: 12,
              padding: '10px 13px',
              marginBottom: 14,
            }}>
              <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: 8 }}>{erro}</p>
              <button className="btn btn-secundario" style={{ padding: '6px 14px', fontSize: '0.82rem' }} onClick={() => { setErro(''); setFase('inicial'); }}>
                Tentar novamente
              </button>
            </div>
          )}

          {fase === 'pronto' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p className="card-titulo" style={{ margin: 0 }}>Documentos gerados</p>
                <button className="btn btn-secundario" style={{ padding: '6px 14px', fontSize: '0.82rem' }} onClick={copiar}>
                  {copiado ? '✓ Copiado!' : 'Copiar tudo'}
                </button>
              </div>

              <textarea
                className="documento-area"
                value={documentoCompleto}
                onChange={(e) => setDocumentoCompleto(e.target.value)}
                rows={18}
                style={{ marginBottom: 12 }}
              />

              <div className="texto-responsabilidade">
                <strong>Atenção:</strong> Documentos estruturados a partir dos registros do enfermeiro por IA.
                Revise cada item, complete o que for necessário e assine (COREN) antes de inserir no prontuário.
                A responsabilidade clínica é integralmente sua.
              </div>

              {!confirmandoEncerrar ? (
                <button className="btn btn-perigo btn-bloco" onClick={() => setConfirmandoEncerrar(true)}>
                  Encerrar plantão e apagar memória
                </button>
              ) : (
                <div className="card" style={{ borderColor: 'var(--color-danger)' }}>
                  <p style={{ fontSize: '0.9rem', marginBottom: 10, fontWeight: 700, color: 'var(--color-danger)' }}>
                    Confirmar encerramento?
                  </p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-ink-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                    Todos os dados do turno serão apagados permanentemente. Ação irreversível.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-perigo" style={{ flex: 1 }} onClick={handleEncerrar}>
                      Sim, encerrar
                    </button>
                    <button className="btn btn-secundario" style={{ flex: 1 }} onClick={() => setConfirmandoEncerrar(false)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </Layout>
  );
}

function IconCheck() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconRelatorio() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
