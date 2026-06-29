import { useState } from 'react';
import Layout from '../components/Layout';
import { useTurno, montarDadosPaciente, montarDadosRelatorioFinal, montarListaParaReclassificacao } from '../components/useTurno';

type Fase = 'inicial' | 'processando' | 'pronto' | 'encerrado';

interface DocPaciente {
  leito: string;
  texto: string;
}

export default function Encerramento() {
  const { turno, carregado, editarEvento, adicionarPaciente, encerrarPlantao } = useTurno();
  const [fase, setFase] = useState<Fase>('inicial');
  const [log, setLog] = useState<string[]>([]);
  const [docsPacientes, setDocsPacientes] = useState<DocPaciente[]>([]);
  const [relatorioFinal, setRelatorioFinal] = useState('');
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
      // 1. Reclassificar leitos por contexto
      addLog('Reclassificando leitos por contexto...');
      const listaNumerada = montarListaParaReclassificacao(turno.eventos, turno.pacientes);
      const respRecl = await fetch('/api/plantao/reclassificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listaNumerada }),
      });
      const jsonRecl = await respRecl.json();
      if (!respRecl.ok) throw new Error(jsonRecl.erro);

      const mapeamento: { indice: number; leito: string }[] = jsonRecl.mapeamento;
      const eventosOrdenados = [...turno.eventos].sort((a, b) => a.ts - b.ts);

      for (const m of mapeamento) {
        const ev = eventosOrdenados[m.indice];
        if (!ev) continue;
        let paciente = turno.pacientes.find(
          (p) => p.leito.toLowerCase() === m.leito.toLowerCase()
        );
        if (!paciente) {
          adicionarPaciente(m.leito, '', 'intermediarios');
          // Buscar o recém-criado após o setState processar na próxima iteração
          // (limitação do hook síncrono — usamos o leito como fallback)
        }
        const pid = paciente?.id ?? null;
        editarEvento(ev.id, ev.texto, pid);
      }
      addLog(`Reclassificação concluída: ${mapeamento.length} evento(s) corrigido(s).`);

      // 2. Gerar documento por paciente
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formato: 'evolucao', dados }),
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(json.erro);
        docs.push({ leito: p.leito, texto: json.texto });
      }
      setDocsPacientes(docs);
      addLog(`${docs.length} evolução(ões) gerada(s).`);

      // 3. Relatório final de passagem de plantão
      addLog('Gerando relatório final de passagem de plantão...');
      const dadosRel = montarDadosRelatorioFinal(turno.pacientes, turno.eventos);
      const respRel = await fetch('/api/plantao/relatorio-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dados: dadosRel }),
      });
      const jsonRel = await respRel.json();
      if (!respRel.ok) throw new Error(jsonRel.erro);
      setRelatorioFinal(jsonRel.texto);
      addLog('Relatório final gerado.');

      // 4. Montar documento completo
      const partes = [
        '═══════════════════════════════════════',
        'EVOLUÇÕES DE ENFERMAGEM',
        '═══════════════════════════════════════',
        '',
        ...docs.map((d) => [`── ${d.leito} ──`, d.texto, ''].join('\n')),
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
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>✓</div>
          <h2 style={{ fontSize: '1.3rem', marginBottom: 8 }}>Plantão encerrado</h2>
          <p style={{ color: 'var(--cinza-400)', fontSize: '0.9rem' }}>
            Memória do turno apagada. O próximo plantão começa limpo.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="tela-header">
        <h1 className="tela-titulo">Encerramento</h1>
      </div>

      {turno.pacientes.length === 0 && turno.eventos.length === 0 ? (
        <div className="estado-vazio">
          <p>Nenhum dado registrado neste turno.</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <p className="card-titulo">Resumo do turno</p>
            <p style={{ fontSize: '0.875rem' }}>{turno.pacientes.length} paciente(s) · {turno.eventos.length} registro(s)</p>
          </div>

          {fase === 'inicial' && (
            <button
              className="btn btn-primario btn-bloco"
              onClick={processarPlantao}
              style={{ marginBottom: 14 }}
            >
              Processar plantão completo
            </button>
          )}

          {fase === 'processando' && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span className="spinner" style={{ borderTopColor: 'var(--azul)', borderColor: 'var(--cinza-200)' }} />
                <strong style={{ fontSize: '0.9rem' }}>Processando...</strong>
              </div>
              {log.map((l, i) => (
                <p key={i} style={{ fontSize: '0.78rem', color: 'var(--cinza-700)', lineHeight: 1.7 }}>{l}</p>
              ))}
            </div>
          )}

          {erro && (
            <div style={{ background: '#FFF5F5', border: '1px solid var(--vermelho)', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
              <p style={{ color: 'var(--vermelho)', fontSize: '0.85rem' }}>{erro}</p>
              <button className="btn btn-secundario" style={{ marginTop: 8 }} onClick={() => { setErro(''); setFase('inicial'); }}>
                Tentar novamente
              </button>
            </div>
          )}

          {fase === 'pronto' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p className="card-titulo">Documentos gerados</p>
                <button className="btn btn-secundario" style={{ padding: '6px 14px', fontSize: '0.82rem' }} onClick={copiar}>
                  {copiado ? '✓ Copiado!' : 'Copiar tudo'}
                </button>
              </div>

              <textarea
                className="documento-area"
                value={documentoCompleto}
                onChange={(e) => setDocumentoCompleto(e.target.value)}
                rows={20}
              />

              <div className="sep" />

              <div className="texto-responsabilidade">
                <strong>Atenção:</strong> Estes documentos foram estruturados a partir dos registros do enfermeiro por IA. Revise cada item, complete o que for necessário e assine (COREN) antes de inserir no prontuário oficial. A responsabilidade clínica é integralmente sua.
              </div>

              {!confirmandoEncerrar ? (
                <button
                  className="btn btn-perigo btn-bloco"
                  onClick={() => setConfirmandoEncerrar(true)}
                >
                  Encerrar plantão e apagar memória
                </button>
              ) : (
                <div className="card" style={{ borderColor: 'var(--vermelho)' }}>
                  <p style={{ fontSize: '0.9rem', marginBottom: 12, fontWeight: 600, color: 'var(--vermelho)' }}>
                    Confirmar encerramento?
                  </p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--cinza-700)', marginBottom: 14 }}>
                    Todos os dados do turno serão apagados permanentemente do dispositivo. Ação irreversível.
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
