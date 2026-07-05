/**
 * Testes da invariante de segurança clínica contra o caso REAL de produção
 * (04/07, Leito 7): registro com "1 g genta medicina 80 mg" (CONFERIR).
 * Na produção, a evolução estruturada reescreveu para "gentamicina 1 g
 * (80 mg)" apagando o marcador, e o relatório final manteve o texto cru
 * mas também sem o marcador. Estes testes garantem, em código, que isso
 * não pode voltar a sair "limpo" — independentemente do modelo LLM usado.
 */
import {
  aplicarGuardsClinicos,
  garantirConferir,
  marcarConflitosDeDose,
  extrairFragmentosConferir,
  MARCA_CONFERIR,
  TITULO_BLOCO_CONFERIR,
} from '../conferir-guard';

const FRAGMENTO_LEITO_7 = '1 g genta medicina 80 mg';

// Texto como sai do organizador de captura (comportamento correto observado
// em produção: fragmento literal entre aspas + marcador).
const REGISTRO_ORGANIZADO = `Administrado "${FRAGMENTO_LEITO_7}" ${MARCA_CONFERIR} conforme prescrição. Paciente estável.`;

// Entrada do estágio de evolução/relatório (montarDadosPaciente).
const DADOS_PACIENTE = [
  'Leito: Leito 7',
  'Diagnóstico principal informado: (não informado)',
  'Complexidade: intermediarios',
  '',
  'Eventos registrados neste turno, em ordem cronológica:',
  `[14:30] (Nota) ${REGISTRO_ORGANIZADO}`,
].join('\n');

describe('extrairFragmentosConferir', () => {
  it('extrai o fragmento entre aspas do caso Leito 7', () => {
    expect(extrairFragmentosConferir(DADOS_PACIENTE)).toEqual([FRAGMENTO_LEITO_7]);
  });

  it('extrai contexto de marcador sem aspas', () => {
    const frags = extrairFragmentosConferir(`Recebeu dipirona meia ampola ${MARCA_CONFERIR} às 14h.`);
    expect(frags).toEqual(['Recebeu dipirona meia ampola']);
  });

  it('não duplica fragmentos repetidos', () => {
    const texto = `${REGISTRO_ORGANIZADO}\n${REGISTRO_ORGANIZADO}`;
    expect(extrairFragmentosConferir(texto)).toHaveLength(1);
  });
});

describe('Estágio 1 — organizador de captura', () => {
  it('caso Leito 7: se o LLM organizar SEM marcar, o guard de dose força (CONFERIR)', () => {
    const cru = 'administrado 1 g genta medicina 80 mg conforme prescrição';
    const saidaLLMSemMarca = 'Administrado 1 g genta medicina 80 mg conforme prescrição.';
    const r = aplicarGuardsClinicos(cru, saidaLLMSemMarca);
    expect(r.conflitosDose).toBe(1);
    expect(r.texto).toContain(`80 mg ${MARCA_CONFERIR}`);
    // texto literal da medicação intacto
    expect(r.texto).toContain('genta medicina');
    expect(r.texto).not.toContain('gentamicina');
  });

  it('caso Leito 7: se o LLM marcou corretamente, o guard não mexe', () => {
    const cru = 'administrado 1 g genta medicina 80 mg conforme prescrição';
    const r = aplicarGuardsClinicos(cru, REGISTRO_ORGANIZADO);
    expect(r.texto).toBe(REGISTRO_ORGANIZADO);
    expect(r.reinjetados).toBe(0);
    expect(r.anexados).toBe(0);
    expect(r.conflitosDose).toBe(0);
  });
});

describe('Estágio 2 — evolução estruturada (falha real de produção)', () => {
  // Reprodução exata da falha: nome reescrito para "gentamicina" e marcador apagado.
  const SAIDA_EVOLUCAO_PRODUCAO = [
    'Histórico/Coleta de Dados',
    'Paciente estável [14:30].',
    '',
    'Diagnóstico de Enfermagem',
    'Sem registro para esta seção neste turno',
    '',
    'Planejamento/Implementação',
    'Administrada gentamicina 1 g (80 mg) conforme prescrição [14:30].',
    '',
    'Avaliação',
    'Sem registro para esta seção neste turno',
    '',
    'Documento estruturado a partir dos registros do enfermeiro — revisar e assinar (COREN) antes de inserir no prontuário oficial.',
  ].join('\n');

  it('o fragmento literal e o (CONFERIR) sobrevivem mesmo com o LLM reescrevendo tudo', () => {
    const r = aplicarGuardsClinicos(DADOS_PACIENTE, SAIDA_EVOLUCAO_PRODUCAO);
    // O trecho original reescrito é preservado no bloco ITENS A CONFERIR
    expect(r.anexados).toBe(1);
    expect(r.texto).toContain(TITULO_BLOCO_CONFERIR);
    expect(r.texto).toContain(`"${FRAGMENTO_LEITO_7}" ${MARCA_CONFERIR}`);
    // E a dose conflitante reescrita ("1 g (80 mg)") também é marcada
    expect(r.conflitosDose).toBe(1);
    expect(r.texto).toMatch(/1 g \(80 mg\) \(CONFERIR\)/);
  });

  it('se o LLM manteve o trecho literal mas apagou o marcador, o marcador é reinjetado no lugar', () => {
    const saida = `Planejamento/Implementação\nAdministrado "${FRAGMENTO_LEITO_7}" conforme prescrição [14:30].`;
    const r = aplicarGuardsClinicos(DADOS_PACIENTE, saida);
    expect(r.reinjetados).toBe(1);
    expect(r.anexados).toBe(0);
    expect(r.texto).toContain(`"${FRAGMENTO_LEITO_7}" ${MARCA_CONFERIR}`);
  });
});

describe('Estágio 3 — relatório final (falha real de produção)', () => {
  it('texto cru mantido sem marcador ganha o marcador de volta no lugar', () => {
    // Falha real: relatório manteve "genta medicina" cru mas sem (CONFERIR)
    const saidaRelatorio = [
      'LEITO 7',
      'Situação: paciente estável [14:30]',
      'Pendências/Intercorrências: administrado 1 g genta medicina 80 mg conforme prescrição [14:30]',
      'Recomendação para o próximo turno: Sem registro para esta seção neste turno',
    ].join('\n');
    const entrada = `=== Leito 7 ===\nComplexidade: intermediarios\nEventos:\n[14:30] ${REGISTRO_ORGANIZADO}`;
    const r = aplicarGuardsClinicos(entrada, saidaRelatorio);
    expect(r.reinjetados).toBe(1);
    expect(r.anexados).toBe(0);
    expect(r.texto).toContain(`1 g genta medicina 80 mg ${MARCA_CONFERIR}`);
    expect(r.texto).not.toContain('gentamicina');
  });
});

describe('marcarConflitosDeDose — sem falsos positivos comuns', () => {
  it('enumeração de medicações diferentes não é conflito', () => {
    const r = marcarConflitosDeDose('Administradas dipirona 1 g e paracetamol 500 mg.');
    expect(r.conflitos).toBe(0);
    expect(r.texto).not.toContain('CONFERIR');
  });

  it('concentração (mg/dL) não conta como dose', () => {
    const r = marcarConflitosDeDose('Glicemia capilar 120 mg/dL. Administrada dipirona 500 mg.');
    expect(r.conflitos).toBe(0);
  });

  it('mesma dose repetida em unidades equivalentes não é conflito', () => {
    const r = marcarConflitosDeDose('Ceftriaxona 1 g (1000 mg) administrada.');
    expect(r.conflitos).toBe(0);
  });

  it('doses em frases separadas não são conflito', () => {
    const r = marcarConflitosDeDose('Dipirona 1 g às 14h. Nova dose de 500 mg às 20h.');
    expect(r.conflitos).toBe(0);
  });

  it('peso do paciente (kg) não é dose', () => {
    const r = marcarConflitosDeDose('Paciente com 70 kg, recebeu dipirona 500 mg.');
    expect(r.conflitos).toBe(0);
  });
});

describe('idempotência dos guards', () => {
  it('aplicar duas vezes não duplica marcadores', () => {
    const cru = 'administrado 1 g genta medicina 80 mg conforme prescrição';
    const primeira = aplicarGuardsClinicos(cru, 'Administrado 1 g genta medicina 80 mg conforme prescrição.');
    const segunda = aplicarGuardsClinicos(cru, primeira.texto);
    expect(segunda.texto).toBe(primeira.texto);
    expect(segunda.conflitosDose).toBe(0);
  });
});

describe('garantirConferir — casos de borda', () => {
  it('tolera variação de espaço e caixa ao localizar o trecho', () => {
    const entrada = `"${FRAGMENTO_LEITO_7}" ${MARCA_CONFERIR}`;
    const saida = 'Administrado 1 G  genta   medicina 80 MG conforme prescrição.';
    const r = garantirConferir(entrada, saida);
    expect(r.reinjetados).toBe(1);
    expect(r.anexados).toBe(0);
  });

  it('entrada sem nenhum marcador não altera a saída', () => {
    const r = garantirConferir('paciente estável, sem queixas', 'Paciente estável, sem queixas.');
    expect(r.texto).toBe('Paciente estável, sem queixas.');
    expect(r.reinjetados + r.anexados).toBe(0);
  });
});
