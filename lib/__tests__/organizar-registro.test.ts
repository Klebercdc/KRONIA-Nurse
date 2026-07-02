/**
 * Testes da aplicação do texto organizado (rota organizar-registro) ao turno.
 * Cobrem a garantia central do fluxo: a captura salva o cru imediatamente e a
 * resposta async NUNCA sobrescreve edição humana nem quebra quando o evento
 * mudou/sumiu enquanto a Groq respondia. A falha de rede em si é silenciosa
 * por construção (try/catch total em useTurno.organizarRegistro): nada é
 * aplicado, o evento cru persiste — o caso "evento intacto sem resposta"
 * equivale ao estado pós-falha.
 */
import { aplicarTextoOrganizado } from '../../components/useTurno';
import { Turno } from '../types';

function turnoCom(texto: string, id = 'ev1'): Turno {
  return {
    iniciadoEm: 1,
    pacientes: [],
    eventos: [{ id, patientId: null, tipo: 'Nota', texto, hora: '17:51', ts: 1 }],
  };
}

const CRU = 'paciente JL apresentou hiper de 38.7 teve uma hipoglicemia de 54';
const ORGANIZADO = 'Paciente JL apresentou hipertermia de 38,7°C e hipoglicemia de 54 mg/dL.';

describe('aplicarTextoOrganizado', () => {
  it('aplica a versão organizada e preserva o cru em textoOriginal', () => {
    const t = aplicarTextoOrganizado(turnoCom(CRU), 'ev1', CRU, ORGANIZADO);
    expect(t.eventos[0].texto).toBe(ORGANIZADO);
    expect(t.eventos[0].textoOriginal).toBe(CRU);
  });

  it('descarta a resposta se o enfermeiro editou o texto antes de ela chegar', () => {
    const editado = turnoCom('texto corrigido manualmente pelo enfermeiro');
    const t = aplicarTextoOrganizado(editado, 'ev1', CRU, ORGANIZADO);
    expect(t.eventos[0].texto).toBe('texto corrigido manualmente pelo enfermeiro');
    expect(t.eventos[0].textoOriginal).toBeUndefined();
  });

  it('não quebra nem altera nada se o evento foi excluído durante a organização', () => {
    const semEvento: Turno = { iniciadoEm: 1, pacientes: [], eventos: [] };
    const t = aplicarTextoOrganizado(semEvento, 'ev1', CRU, ORGANIZADO);
    expect(t.eventos).toHaveLength(0);
  });

  it('só altera o evento alvo, nunca os demais', () => {
    const t0 = turnoCom(CRU);
    t0.eventos.push({ id: 'ev2', patientId: null, tipo: 'Nota', texto: CRU, hora: '17:52', ts: 2 });
    const t = aplicarTextoOrganizado(t0, 'ev1', CRU, ORGANIZADO);
    expect(t.eventos[0].texto).toBe(ORGANIZADO);
    expect(t.eventos[1].texto).toBe(CRU);
    expect(t.eventos[1].textoOriginal).toBeUndefined();
  });

  it('ignora resposta vazia ou idêntica ao cru (sem textoOriginal fantasma)', () => {
    const igual = aplicarTextoOrganizado(turnoCom(CRU), 'ev1', CRU, CRU);
    expect(igual.eventos[0].textoOriginal).toBeUndefined();
    const vazia = aplicarTextoOrganizado(turnoCom(CRU), 'ev1', CRU, '   ');
    expect(vazia.eventos[0].texto).toBe(CRU);
  });
});
