/**
 * Encaixe da prosa do motor nos quatro blocos do Processo de Enfermagem.
 *
 * Trava o que a Resolução COFEN nº 736/2024 exige e o que o
 * CHECKLIST_NAO_REGRESSAO.md protege: os quatro blocos sempre presentes e na
 * ordem, diagnóstico nunca inferido, medicação e conduta fora do bloco Dados,
 * e nenhuma pendência (CONFERIR) perdida na divisão entre blocos.
 */

const motor = require('../evolucao/grafo-adaptativo.js');
const pe = require('../evolucao/processo-enfermagem.js');

const { buildSequence, CONTEXTS } = motor;
const { gerarEvolucaoPE, INTERVENCAO_IDS, DIAGNOSTICO_IDS, RESULTADO_IDS } = pe;

type Answers = Record<string, unknown>;

const CTX = CONTEXTS[0];

function documento(answers: Answers): string {
  return gerarEvolucaoPE(CTX, answers, buildSequence(CTX, answers));
}

/** Devolve o corpo de um bloco, sem o título. */
function corpo(answers: Answers, titulo: string): string {
  const doc = documento(answers);
  const titulos = ['Dados', 'Diagnóstico de Enfermagem', 'Intervenção', 'Resultado'];
  const inicio = doc.indexOf(`\n${titulo}\n`) >= 0 ? doc.indexOf(`\n${titulo}\n`) + titulo.length + 2 : titulo.length + 1;
  const seguintes = titulos
    .slice(titulos.indexOf(titulo) + 1)
    .map((t) => doc.indexOf(`\n${t}\n`))
    .filter((i) => i > inicio);
  const fim = seguintes.length ? Math.min(...seguintes) : doc.indexOf('\n\nEnfermeiro(a) Responsável');
  return doc.slice(inicio, fim).trim();
}

const ADULTO_FEBRIL: Answers = {
  idade_unidade: 'anos', idade_anos: '45', sexo: 'feminino', situacao_clinica: 'geral',
  consciencia: 'alerta',
  fc: '78', pa: { a: '120', b: '80' }, fr: '16', spo2: '97', temperatura: '38.4',
  conduta_febre: 'antitermico',
  dor: 'sem_dor', pele: 'integra',
  mobilidade: 'sem_auxilio', forca_motora: 'preservada',
  eliminacoes: 'espontaneas', dieta: 'oral',
  ausculta_pulmonar: 'mv_presente', ausculta_cardiaca: 'bnf_2t', perfusao_perif: 'adequada',
  exame_abdominal: 'normal', pupilas: 'isocoricas',
  estado_geral: 'normal', cabeca: 'normal', face: 'normal', olhos: 'normal',
  ouvidos: 'normal', nariz: 'normal', boca: 'normal', pescoco: 'normal',
  mmss: 'normal', mmii: 'normal', pes: 'normal',
  psicossocial: 'normal', seguranca: 'normal',
  via_aerea: 'ar_ambiente', dispositivos: ['nenhum'], droga_vasoativa: 'nao',
  balanco_hidrico: { a: '2000', b: '1800' }, glicemia: '95',
  tem_diagnostico: 'nao', tem_resultado: 'nao',
};

const CRITICO: Answers = {
  ...ADULTO_FEBRIL,
  idade_anos: '62',
  consciencia: 'sedado',
  sedativo_qual: ['midazolam'], dose_midazolam: '12', sedacao_rass: '-4',
  fc: '128', pa: { a: '85', b: '50' }, spo2: '89',
  conduta_fc_alterada: 'comunicado_fc',
  conduta_pa_alterada: 'ajuste_droga_pa',
  conduta_hipoxemia: 'aumento_fluxo',
  mobilidade: 'dependente',
  dieta: 'enteral', dieta_tolerancia: 'bem_tolerada',
  via_aerea: 'vm', modo_ventilatorio: 'pcv', fio2: '60', peep: '10',
  dispositivos: ['avp'], avp_calibre: '20g', avp_local: 'Antebraço direito',
  droga_vasoativa: 'sim', droga_vasoativa_qual: 'noradrenalina', droga_vasoativa_dose: '15',
};

describe('estrutura dos quatro blocos', () => {
  it('sempre traz os quatro blocos, nesta ordem, com título em linha própria', () => {
    const doc = documento(ADULTO_FEBRIL);
    const posicoes = ['Dados', 'Diagnóstico de Enfermagem', 'Intervenção', 'Resultado'].map((t) =>
      doc.indexOf(`${t}\n`),
    );
    posicoes.forEach((p) => expect(p).toBeGreaterThan(-1));
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));
  });

  it('nenhum bloco é omitido nem inventado quando não há dado — vira Sem registro', () => {
    // Árvore recém-aberta: nada respondido.
    const doc = documento({});
    expect(doc).toContain('Diagnóstico de Enfermagem\nSem registro para esta seção');
    expect(doc).toContain('Intervenção\nSem registro para esta seção');
    expect(doc).toContain('Resultado\nSem registro para esta seção');
  });

  it('fecha com a assinatura e mantém o marcador literal de data/hora', () => {
    expect(documento(ADULTO_FEBRIL).trimEnd().endsWith('Enfermeiro(a) Responsável — [data/hora]')).toBe(true);
    expect(documento(ADULTO_FEBRIL)).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});

describe('trava do diagnóstico', () => {
  it('não infere diagnóstico — nem com febre, hipotensão e hipoxemia juntas', () => {
    // CRITICO responde "não" a "há diagnóstico a registrar".
    expect(corpo(CRITICO, 'Diagnóstico de Enfermagem')).toBe('Sem registro para esta seção');
  });

  it('não deixa rótulo clínico vazar do bloco Dados para o Diagnóstico', () => {
    const diagnostico = corpo(CRITICO, 'Diagnóstico de Enfermagem');
    ['hipertermia', 'prejudicada', 'hipotenso', 'febril'].forEach((rotulo) =>
      expect(diagnostico.toLowerCase()).not.toContain(rotulo),
    );
  });

  it('o campo é livre — não há lista de rótulos para escolher', () => {
    const pergunta = CTX.questions.find((q: { id: string }) => q.id === 'diagnostico_enfermagem');
    expect(pergunta.type).toBe('texto_livre');
    expect(pergunta.options).toBeUndefined();
  });

  it('escreve exatamente o que o enfermeiro nomeou, e nada além', () => {
    const texto = 'Risco de queda relacionado à sedação';
    const doc = {
      ...CRITICO,
      tem_diagnostico: 'sim',
      diagnostico_enfermagem: texto,
    };
    expect(corpo(doc, 'Diagnóstico de Enfermagem')).toBe(texto + '.');
  });
});

describe('bloco Resultado', () => {
  it('registra a resposta do paciente quando informada', () => {
    const texto = 'Afebril após antitérmico, sem novos picos';
    const doc = { ...ADULTO_FEBRIL, tem_resultado: 'sim', resultado_avaliacao: texto };
    expect(corpo(doc, 'Resultado')).toBe(texto + '.');
  });

  it('responder "não" deixa Sem registro, sem virar pendência', () => {
    const doc = { ...ADULTO_FEBRIL, tem_resultado: 'nao' };
    expect(corpo(doc, 'Resultado')).toBe('Sem registro para esta seção');
    expect(documento(doc)).not.toContain('resposta do paciente às intervenções');
  });

  it('não responder vira pendência explícita, como qualquer outra pergunta', () => {
    const { tem_resultado, tem_diagnostico, ...semFecho } = ADULTO_FEBRIL;
    const doc = documento(semFecho);
    expect(doc).toContain('(CONFERIR — Há diagnóstico de enfermagem a registrar? não respondido)');
    expect(doc).toContain('(CONFERIR — Há resposta do paciente às intervenções para registrar? não respondido)');
  });

  it('o texto do fecho não vaza para o bloco Dados', () => {
    const doc = {
      ...ADULTO_FEBRIL,
      tem_diagnostico: 'sim', diagnostico_enfermagem: 'Integridade da pele prejudicada',
      tem_resultado: 'sim', resultado_avaliacao: 'Lesão sem progressão',
    };
    const dados = corpo(doc, 'Dados');
    expect(dados).not.toContain('Integridade da pele prejudicada');
    expect(dados).not.toContain('Lesão sem progressão');
  });

  it('todo id de DIAGNOSTICO_IDS e RESULTADO_IDS existe no schema', () => {
    const todos = CTX.questions.map((q: { id: string }) => q.id);
    [...DIAGNOSTICO_IDS, ...RESULTADO_IDS].forEach((id: string) => expect(todos).toContain(id));
  });
});

describe('medicação e conduta ficam fora do bloco Dados', () => {
  it('põe a conduta frente à febre em Intervenção, e o valor da febre em Dados', () => {
    expect(corpo(ADULTO_FEBRIL, 'Dados').toLowerCase()).toContain('febril, temperatura axilar de 38,4°c');
    expect(corpo(ADULTO_FEBRIL, 'Dados').toLowerCase()).not.toContain('antitérmico');
    expect(corpo(ADULTO_FEBRIL, 'Intervenção').toLowerCase()).toContain('administrado antitérmico');
  });

  it('põe sedativo e droga vasoativa em Intervenção', () => {
    const intervencao = corpo(CRITICO, 'Intervenção').toLowerCase();
    expect(intervencao).toContain('midazolam em infusão contínua a 12 ml/h');
    expect(intervencao).toContain('noradrenalina');
    expect(corpo(CRITICO, 'Dados').toLowerCase()).not.toContain('midazolam');
    expect(corpo(CRITICO, 'Dados').toLowerCase()).not.toContain('noradrenalina');
  });

  it('mantém em Dados o estado observado — vitais, exame físico, suporte e dispositivos', () => {
    const dados = corpo(CRITICO, 'Dados').toLowerCase();
    expect(dados).toContain('hipotenso, com pressão arterial de 85x50 mmhg');
    expect(dados).toContain('em ventilação mecânica invasiva');
    expect(dados).toContain('acesso venoso periférico');
    expect(dados).toContain('rass -4');
  });

  it('o bloco Intervenção não começa com a abertura de parágrafo "Paciente"', () => {
    // A conduta mora na categoria "geral", que abre com "Paciente" na prosa
    // corrida — em bloco próprio isso viraria "Paciente equipe médica
    // comunicada...".
    const intervencao = corpo(CRITICO, 'Intervenção');
    expect(intervencao.startsWith('Paciente ')).toBe(false);
    expect(intervencao.startsWith('Equipe médica comunicada')).toBe(true);
  });

  it('todo id de INTERVENCAO_IDS existe no schema', () => {
    const todos = CTX.questions.map((q: { id: string }) => q.id);
    INTERVENCAO_IDS.forEach((id: string) => expect(todos).toContain(id));
  });
});

describe('pendências sobrevivem ao encaixe', () => {
  it('não perde (CONFERIR) de pergunta não respondida', () => {
    const { fc, ...semFc } = ADULTO_FEBRIL;
    expect(documento(semFc)).toContain('(CONFERIR — Qual a frequência cardíaca? não respondido)');
  });

  it('não perde (CONFERIR) de conduta sem detalhamento, que vive no bloco Intervenção', () => {
    const doc = documento({ ...ADULTO_FEBRIL, conduta_febre: 'sem_conduta_febre' });
    expect(doc).toContain('precisa de detalhamento');
  });

  it('não repete a mesma pendência em mais de um bloco', () => {
    const { fc, ...semFc } = ADULTO_FEBRIL;
    const doc = documento(semFc);
    const ocorrencias = doc.split('(CONFERIR — Qual a frequência cardíaca? não respondido)').length - 1;
    expect(ocorrencias).toBe(1);
  });

  it('mantém a validação cruzada, e uma vez só', () => {
    const doc = documento({ ...CRITICO, dieta: 'oral' });
    const ocorrencias = doc.split('via oral é impossível com tubo orotraqueal').length - 1;
    expect(ocorrencias).toBe(1);
  });

  it('coloca as pendências depois dos blocos e antes da assinatura', () => {
    const { fc, ...semFc } = ADULTO_FEBRIL;
    const doc = documento(semFc);
    expect(doc.indexOf('(CONFERIR')).toBeGreaterThan(doc.indexOf('Resultado\n'));
    expect(doc.indexOf('(CONFERIR')).toBeLessThan(doc.indexOf('Enfermeiro(a) Responsável'));
  });
});

describe('padrão brasileiro de número', () => {
  it('escreve decimal com vírgula', () => {
    expect(documento(ADULTO_FEBRIL)).toContain('38,4°C');
    expect(documento(ADULTO_FEBRIL)).not.toContain('38.4°C');
  });

  it('não estraga pressão arterial, RASS nem fração', () => {
    const doc = documento(CRITICO);
    expect(doc).toContain('85x50 mmHg');
    expect(doc).toContain('RASS -4');
  });
});

// Marca o arquivo como módulo: sem isto os dois testes compartilham escopo
// global e o tsc acusa redeclaração de CONTEXTS/CTX/Answers.
export {};
