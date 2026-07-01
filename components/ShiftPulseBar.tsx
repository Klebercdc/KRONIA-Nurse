import { useTurno } from './useTurno';

export default function ShiftPulseBar() {
  const { turno } = useTurno();

  const inicio = new Date(turno.iniciadoEm);
  const horaInicio = inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const nPacientes = turno.pacientes.length;
  const nRegistros = turno.eventos.length;

  return (
    <div className="shift-pulse-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="shift-pulse-dot" />
        <span>PLANTÃO ATIVO</span>
        <span style={{ opacity: 0.65, marginLeft: 4, fontFamily: 'var(--font-mono)', fontWeight: 400 }}>
          desde {horaInicio}
        </span>
      </div>
      <div style={{ opacity: 0.75, fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: '0.68rem' }}>
        {nPacientes}p · {nRegistros}r
      </div>
    </div>
  );
}
