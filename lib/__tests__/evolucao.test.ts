/**
 * Evolução de Enfermagem — forma do documento.
 *
 * A evolução é a FOTO DO PACIENTE no momento da avaliação, não o registro do
 * Processo de Enfermagem inteiro. Estes testes travam a forma que decorre
 * disso: abertura, linha de sinais vitais, exame físico por sistema, cuidados
 * realizados, resposta do paciente e fecho — e a ausência, verificada, de
 * diagnóstico e planejamento, que são documentos separados.
 */

const motor = require('../evolucao/grafo-adaptativo.js');
const ev = require('../evolucao/evolucao.js');

const { buildSequence, gerarTexto, isAnswered, CONTEXTS } = motor;
const { gerarEvolucao, sistemaDe, SISTEMAS_EXAME, VITAIS } = ev;

type Answers = Record<string, unknown>;

const CTX = CONTEXTS[0];

function documento(answers: Answers): string {
  return gerarEvolucao(CTX, answers, buildSequence(CTX, answers));
}

/** Devolve a linha do bullet de um sistema, sem o título. */
function sistema(answers: Answers, titulo: string): string {
  const linha = documento(answers)
    .split('\n')
    .find((l) => l.startsWith(`- ${titulo}:`));
  return linha ? linha.slice(`- ${titulo}:`.length).trim().toLowerCase() : '';
}

const ADULTO_FEBRIL: Answers = {
  idade_unidade: 'anos', idade_anos: '45', sexo: 'feminino', situacao_clinica: 'geral',
  consciencia: 'alerta', estado_geral: 'normal',
  fc: '78', pa: { a: '120', b: '80' }, fr: '16', spo2: '97', temperatura: '38.4',
  conduta_febre: 'antitermico',
  dor: 'sem_dor', pele: 'integra', pele_coloracao: 'corada', hidratacao: 'hidratado',
  mobilidade: 'sem_auxilio', forca_motora: 'preservada',
  eliminacoes: 'espontaneas', dieta: 'oral',
  ausculta_pulmonar: 'mv_presente', ausculta_cardiaca: 'bnf_2t', perfusao_perif: 'adequada',
  exame_abdominal: 'normal', pupilas: 'isocoricas',
  cabeca: 'normal', face: 'normal', olhos: 'normal',
  ouvidos: 'normal', nariz: 'normal', boca: 'normal', pescoco: 'normal',
  mmss: 'normal', mmii: 'normal', pes: 'normal',
  psicossocial: 'normal', seguranca: 'normal',
  via_aerea: 'ar_ambiente', dispositivos: ['nenhum'], droga_vasoativa: 'nao',
  balanco_hidrico: { a: '2000', b: '1800' }, glicemia: '95',
  tem_resultado: 'nao',
};

const CRITICO: Answers = {
  ...ADULTO_FEBRIL,
  idade_anos: '62',
  consciencia: 'sedado',
  sedativo_qual: ['midazolam'], dose_midazolam: '12', sedacao_rass: '-4',
  fc: '128', pa: { a: '85', b: '50' }, spo2: '89',
  pele_coloracao: 'palida', hidratacao: 'desidratado',
  conduta_fc_alterada: 'comunicado_fc',
  conduta_pa_alterada: 'ajuste_droga_pa',
  conduta_hipoxemia: 'aumento_fluxo',
  mobilidade: 'dependente',
  dieta: 'enteral', dieta_tolerancia: 'bem_tolerada',
  via_aerea: 'vm', modo_ventilatorio: 'pcv', fio2: '60', peep: '10',
  dispositivos: ['avp'], avp_calibre: '20g', avp_local: 'Antebraço direito',
  avp_sitio_condicao: 'sem_alteracao',
  droga_vasoativa: 'sim', droga_vasoativa_qual: 'noradrenalina', droga_vasoativa_dose: '15',
};

describe('forma da evolução', () => {
  it('abre com quem é o paciente, como se apresenta e o suporte em curso', () => {
    const primeiraLinha = documento(ADULTO_FEBRIL).split('\n\n')[0];
    expect(primeiraLinha).toContain('Paciente de 45 anos');
    expect(primeiraLinha).toContain('Deambulando sem auxílio');
    expect(primeiraLinha).toContain('Apresenta-se corado, hidratado, febril.');
    expect(primeiraLinha).toContain('Em ar ambiente.');
  });

  it('traz os sinais vitais em linha própria, com sigla, valor e unidade', () => {
    expect(documento(ADULTO_FEBRIL)).toContain(
      'Sinais vitais: PA 120x80 mmHg, FC 78 bpm, FR 16 irpm, SpO₂ 97%, T 38,4°C.',
    );
  });

  it('não repete o valor do sinal vital na abertura — lá só vai o descritor', () => {
    const primeiraLinha = documento(CRITICO).split('\n\n')[0];
    expect(primeiraLinha).toContain('taquicárdico, hipotenso');
    expect(primeiraLinha).not.toContain('128 bpm');
    expect(primeiraLinha).not.toContain('85x50');
  });

  it('sinal vital dentro da faixa não vira descritor na abertura', () => {
    // COREN-SP: nada de "afebril"/"eupneico". O número está na linha de
    // vitais; a abertura só nomeia o que está alterado.
    const semAlteracao = { ...ADULTO_FEBRIL, temperatura: '36.5' };
    const primeiraLinha = documento(semAlteracao).split('\n\n')[0];
    expect(primeiraLinha).toContain('Apresenta-se corado, hidratado.');
    expect(primeiraLinha).not.toContain('febril');
    expect(documento(semAlteracao)).toContain('T 36,5°C');
  });

  it('separa o exame físico por sistema, em bullets, na ordem definida', () => {
    const doc = documento(ADULTO_FEBRIL);
    expect(doc).toContain('Ao exame físico:');
    const titulos = doc
      .split('\n')
      .filter((l) => l.startsWith('- '))
      .map((l) => l.slice(2, l.indexOf(':')));
    expect(titulos).toEqual([...titulos].sort(
      (a, b) =>
        SISTEMAS_EXAME.findIndex(([, t]: [string, string]) => t === a) -
        SISTEMAS_EXAME.findIndex(([, t]: [string, string]) => t === b),
    ));
  });

  it('cada achado cai no sistema certo', () => {
    expect(sistema(ADULTO_FEBRIL, 'Respiratório')).toContain('murmúrio vesicular');
    expect(sistema(ADULTO_FEBRIL, 'Cardiovascular')).toContain('bulhas cardíacas');
    expect(sistema(ADULTO_FEBRIL, 'Gastrointestinal')).toContain('abdome flácido');
    expect(sistema(ADULTO_FEBRIL, 'Neurológico')).toContain('pupilas isocóricas');
    expect(sistema(ADULTO_FEBRIL, 'Pele e tegumento')).toContain('pele íntegra');
    expect(sistema(CRITICO, 'Dispositivos')).toContain('acesso venoso periférico');
    expect(sistema(CRITICO, 'Geniturinário')).toContain('eliminações');
  });

  it('sistema sem nenhum achado não vira bullet vazio', () => {
    // Recém-nascido não tem ausculta cardíaca nem exame céfalo-podal adulto.
    const rn: Answers = {
      idade_unidade: 'dias', idade_dias: '3', sexo: 'masculino',
      idade_gestacional: '39', peso: '3200', estado_alerta: 'ativo_reativo',
      fc: '140', fr: '45', spo2: '97', temperatura: '36.8',
      silverman: 'ausente', pele_neo: 'rosada', hidratacao: 'hidratado',
      coto_umbilical: 'seco_integro', reflexos: 'presentes',
      eliminacoes_neo: 'presentes', dieta_neo: 'seio_livre_demanda',
      via_aerea_neo: 'ar_ambiente', dispositivos_neo: ['nenhum'], tem_resultado: 'nao',
    };
    const doc = documento(rn);
    expect(doc).not.toContain('Cardiovascular');
    expect(doc).not.toContain('Cabeça e pescoço');
    expect(doc).toContain('- Respiratório: sem sinais de desconforto respiratório.');
    expect(doc).toContain('Recém-nascido de 3 dias de vida');
  });

  it('separa o que foi feito da descrição do paciente', () => {
    const doc = documento(ADULTO_FEBRIL);
    expect(doc).toContain('Realizados cuidados de enfermagem: administrado antitérmico');
    // a conduta não vaza para nenhum bullet do exame
    SISTEMAS_EXAME.forEach(([, titulo]: [string, string]) =>
      expect(sistema(ADULTO_FEBRIL, titulo)).not.toContain('antitérmico'),
    );
  });

  it('põe medicação em curso nos cuidados, nunca no exame', () => {
    const doc = documento(CRITICO);
    expect(doc.toLowerCase()).toContain('midazolam em infusão contínua a 12 ml/h');
    expect(doc).toContain('noradrenalina');
    const exame = SISTEMAS_EXAME.map(([, t]: [string, string]) => sistema(CRITICO, t)).join(' ');
    expect(exame).not.toContain('midazolam');
    expect(exame).not.toContain('noradrenalina');
    // RASS é avaliação, e fica no exame neurológico
    expect(sistema(CRITICO, 'Neurológico')).toContain('rass -4');
  });

  it('registra a resposta do paciente quando informada', () => {
    const doc = documento({ ...ADULTO_FEBRIL, tem_resultado: 'sim', resultado_avaliacao: 'Cedeu a febre' });
    expect(doc).toContain('Paciente apresentou: cedeu a febre.');
  });

  it('fecha com o acompanhamento e a assinatura, sem inventar data', () => {
    const doc = documento(ADULTO_FEBRIL);
    expect(doc).toContain('Mantido em acompanhamento pela equipe de enfermagem');
    expect(doc.trimEnd().endsWith('Enfermeiro(a) Responsável — [data/hora]')).toBe(true);
    expect(doc).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});

describe('nada se perde no encaixe', () => {
  // Este bloco existe por causa de um bug real: `silverman` estava mapeado
  // para a fatia dos sinais vitais, que imprime NÚMEROS e não prosa — a frase
  // "sem sinais de desconforto respiratório" simplesmente sumia do documento.
  // Uma pergunta respondida cuja frase não aparece em lugar nenhum é a pior
  // falha possível aqui, porque é silenciosa.

  it('toda pergunta tem uma seção de destino', () => {
    const semDestino = CTX.questions
      .map((q: { id: string }) => q.id)
      .filter((id: string) => !sistemaDe(id));
    expect(semDestino).toEqual([]);
  });

  it('nenhuma frase de pergunta respondida some do documento', () => {
    [ADULTO_FEBRIL, CRITICO].forEach((answers) => {
      const seq = buildSequence(CTX, answers);
      const doc = documento(answers).toLowerCase();
      const idsVitais = VITAIS.map(([id]: [string, string]) => id);

      // A prosa completa do motor é a referência: tudo que ela diz precisa
      // estar em algum lugar do documento montado.
      const frases = gerarTexto(CTX, answers, seq)
        .split('\n')
        .filter((l: string) => l && !l.startsWith('(CONFERIR'))
        .flatMap((par: string) => par.split(/(?<=[a-zà-ú0-9%])\. /))
        .map((f: string) => f.trim().replace(/\.$/, ''))
        .filter(Boolean);

      const perdidas = frases.filter((f: string) => !doc.includes(f.toLowerCase()));
      // O que pode legitimamente não bater é a abertura de parágrafo do motor
      // e as frases dos sinais vitais, que viram a linha "Sinais vitais:".
      const relevantes = perdidas.filter(
        (f: string) =>
          !/^(Paciente|Recém-nascido|Lactente|Ao exame físico|Em suporte respiratório|Em sedação|Em uso de dispositivos)/.test(f) &&
          !idsVitais.some((id: string) => {
            const q = seq.find((x: { id: string }) => x.id === id);
            return q && isAnswered(q, answers) && f.includes(String(q.unit || ''));
          }),
      );
      expect(relevantes).toEqual([]);
    });
  });

  it('não perde nem repete pendência (CONFERIR)', () => {
    const { fc, ...semFc } = ADULTO_FEBRIL;
    const doc = documento(semFc);
    const marca = '(CONFERIR — Qual a frequência cardíaca? não respondido)';
    expect(doc).toContain(marca);
    expect(doc.split(marca).length - 1).toBe(1);
    expect(doc.indexOf('(CONFERIR')).toBeLessThan(doc.indexOf('Enfermeiro(a) Responsável'));
  });

  it('mantém a validação cruzada, e uma vez só', () => {
    const doc = documento({ ...CRITICO, dieta: 'oral' });
    expect(doc.split('via oral é impossível com tubo orotraqueal').length - 1).toBe(1);
  });
});

describe('diagnóstico e planejamento não vivem neste documento', () => {
  // A evolução é UMA das etapas do Processo de Enfermagem (Res. 736/2024,
  // Art. 4º, § 5º), não o invólucro das outras. Diagnóstico e planejamento
  // são registros próprios, de documento separado — a Res. 358/2009 já os
  // listava assim. A ausência é VERIFICADA para não ser "corrigida" depois.

  it('não há seção de diagnóstico nem de planejamento', () => {
    [documento(ADULTO_FEBRIL), documento(CRITICO), documento({})].forEach((doc) => {
      expect(doc.toLowerCase()).not.toContain('diagnóstico');
      expect(doc.toLowerCase()).not.toContain('planejamento');
      expect(doc.toLowerCase()).not.toContain('prescrição de enfermagem');
    });
  });

  it('não há pergunta de diagnóstico nem de planejamento no schema', () => {
    const ids = CTX.questions.map((q: { id: string }) => q.id);
    expect(ids.filter((id: string) => /diagnostico|planejamento|prescricao/.test(id))).toEqual([]);
    const titulos = CTX.questions.map((q: { titulo: string }) => q.titulo.toLowerCase());
    expect(
      titulos.filter((t: string) => /diagnóstico|planejamento|prescrição de enfermagem/.test(t)),
    ).toEqual([]);
  });

  it('não infere rótulo clínico a partir dos achados', () => {
    const doc = documento(CRITICO).toLowerCase();
    ['hipertermia', 'prejudicada', 'prejudicado', 'ineficaz', 'nanda'].forEach((rotulo) =>
      expect(doc).not.toContain(rotulo),
    );
  });
});

describe('padrão brasileiro de número', () => {
  it('escreve decimal com vírgula', () => {
    expect(documento(ADULTO_FEBRIL)).toContain('38,4°C');
    expect(documento(ADULTO_FEBRIL)).not.toContain('38.4');
  });

  it('não estraga pressão arterial nem RASS', () => {
    const doc = documento(CRITICO);
    expect(doc).toContain('85x50 mmHg');
    expect(doc).toContain('RASS -4');
  });
});

// Marca o arquivo como módulo: sem isto os dois testes compartilham escopo
// global e o tsc acusa redeclaração de CONTEXTS/CTX/Answers.
export {};
