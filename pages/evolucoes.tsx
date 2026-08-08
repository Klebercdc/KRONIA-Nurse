import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import { ChevronLeft, Copy, Check, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import { useTurno } from '../components/useTurno';
import { montarExportacao, agruparEvolucoesPorPaciente } from '../lib/evolucao/exportar';

export default function Evolucoes() {
  const router = useRouter();
  const { turno, carregado, excluirEvolucao } = useTurno();
  const [copiado, setCopiado] = useState<string | null>(null);

  const evolucoes = useMemo(() => turno.evolucoes ?? [], [turno.evolucoes]);
  const grupos = useMemo(
    () => agruparEvolucoesPorPaciente(evolucoes, turno.pacientes),
    [evolucoes, turno.pacientes],
  );

  async function copiar(texto: string, marcador: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(marcador);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      setCopiado(null);
    }
  }

  if (!carregado) return <Layout><div className="estado-vazio">Carregando...</div></Layout>;

  return (
    <Layout>
      <div className="tela-header">
        <button
          className="btn-icone"
          onClick={() => router.push('/evoluir')}
          aria-label="Voltar"
          style={{ marginRight: 4 }}
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 className="tela-titulo">Evoluções do plantão</h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)', marginTop: 1 }}>
            {evolucoes.length} guardada(s) · {grupos.length} paciente(s)
          </p>
        </div>
      </div>

      {evolucoes.length === 0 && (
        <div className="estado-vazio">
          Nenhuma evolução guardada neste plantão ainda.
        </div>
      )}

      {evolucoes.length > 0 && (
        <>
          <button
            className="btn btn-primario btn-bloco"
            style={{ marginBottom: 16 }}
            onClick={() => copiar(montarExportacao(evolucoes, turno.pacientes), '__todas__')}
          >
            {copiado === '__todas__' ? <Check size={17} strokeWidth={2} /> : <Copy size={17} strokeWidth={2} />}
            {copiado === '__todas__' ? 'Copiado' : 'Copiar todas juntas'}
          </button>

          {grupos.map((grupo) => (
            <div key={grupo.patientId} className="setor-grupo">
              <p className="section-label">{grupo.rotulo}</p>

              {grupo.evolucoes.map((ev) => (
                <div key={ev.id} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span className="sessao-hora-pill">{ev.hora}</span>
                    <span className="sessao-tipo-pill">{ev.tipoNome}</span>
                    {ev.editado && <span className="badge badge-revisado">editado</span>}
                    <span style={{ flex: 1 }} />
                    <button
                      className="btn-icone"
                      onClick={() => copiar(ev.texto, ev.id)}
                      aria-label="Copiar esta evolução"
                    >
                      {copiado === ev.id ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={2} />}
                    </button>
                    <button
                      className="btn-icone perigo"
                      onClick={() => excluirEvolucao(ev.id)}
                      aria-label="Excluir esta evolução"
                    >
                      <Trash2 size={16} strokeWidth={2} />
                    </button>
                  </div>
                  <p className="evolucao-texto">{ev.texto}</p>
                </div>
              ))}
            </div>
          ))}

          <p className="texto-responsabilidade" style={{ marginTop: 16 }}>
            Estas evoluções ficam apenas neste aparelho, enquanto o plantão estiver aberto.
            Encerrar o plantão apaga todas, sem desfazer. Copie o que precisar para o
            prontuário da instituição antes de encerrar.
          </p>
        </>
      )}
    </Layout>
  );
}
