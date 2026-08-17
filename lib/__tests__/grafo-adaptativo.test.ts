/**
 * Motor do grafo clínico adaptativo — casos reais.
 *
 * Cobre os seis cenários usados na sessão de arquitetura: adulto estável,
 * crítico com sedação e ventilação mecânica, RN estável, RN crítico,
 * gestante em trabalho de parto e puérpera com lóquios de odor fétido.
 *
 * Além dos cenários, trava os invariantes que não podem ser enfraquecidos:
 * pendência nunca silenciosa, needsReview vira (CONFERIR), validação cruzada
 * acusa combinação impossível, e a ordem da sequência mantém sinais vitais
 * antes do exame céfalo-podal.
 */

const motor = require('../evolucao/grafo-adaptativo.js');

const {
  buildSequence,
  gerarTexto,
  getOptions,
  faixaVitalPorIdade,
  CONTEXTS,
  CATEGORIA_POR_ID,
  SUBGRUPO_POR_ID,
} = motor;

type Answers = Record<string, unknown>;

const CTX = CONTEXTS[0];

function ids(answers: Answers): string[] {
  return buildSequence(CTX, answers).map((q: { id: string }) => q.id);
}

function texto(answers: Answers): string {
  return gerarTexto(CTX, answers, buildSequence(CTX, answers));
}

/**
 * O motor capitaliza a primeira letra de cada frase montada, então o trecho
 * cru do schema pode aparecer com inicial maiúscula ou minúscula conforme a
 * posição. As asserções de conteúdo comparam sem diferenciar maiúsculas.
 */
function contem(answers: Answers, trecho: string): boolean {
  return texto(answers).toLowerCase().includes(trecho.toLowerCase());
}

/** Lista as pendências, para a mensagem de falha dizer o que faltou. */
function pendencias(answers: Answers): string[] {
  return texto(answers)
    .split('\n')
    .filter((l) => l.startsWith('(CONFERIR'));
}

// ── Cenário 1 — adulto estável ──────────────────────────────────────────────
const ADULTO_ESTAVEL: Answers = {
  idade_unidade: 'anos', idade_anos: '45', sexo: 'feminino', situacao_clinica: 'geral',
  consciencia: 'alerta',
  fc: '78', pa: { a: '120', b: '80' }, fr: '16', spo2: '97', temperatura: '36.5',
  dor: 'sem_dor',
  pele: 'integra',
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

describe('cenário 1 — adulto estável', () => {
  it('não deixa nenhuma pendência quando tudo foi respondido', () => {
    expect(pendencias(ADULTO_ESTAVEL)).toEqual([]);
  });

  it('abre o parágrafo com Paciente e classifica os vitais na faixa adulta', () => {
    expect(texto(ADULTO_ESTAVEL).startsWith('Paciente ')).toBe(true);
    expect(contem(ADULTO_ESTAVEL, 'normocárdico, com frequência cardíaca de 78 bpm')).toBe(true);
    expect(contem(ADULTO_ESTAVEL, 'eupneico, com frequência respiratória de 16 irpm')).toBe(true);
    expect(contem(ADULTO_ESTAVEL, 'afebril, temperatura axilar de 36.5°C')).toBe(true);
    expect(contem(ADULTO_ESTAVEL, 'com PA normal, com pressão arterial de 120x80 mmHg')).toBe(true);
  });

  it('não abre nenhuma pergunta de conduta de alerta', () => {
    const seq = ids(ADULTO_ESTAVEL);
    expect(seq).not.toContain('conduta_fc_alterada');
    expect(seq).not.toContain('conduta_pa_alterada');
    expect(seq).not.toContain('conduta_hipoxemia');
    expect(seq).not.toContain('conduta_febre');
  });

  it('separa os achados em parágrafos por sistema', () => {
    const t = texto(ADULTO_ESTAVEL);
    expect(t).toContain('Ao exame físico,');
    expect(t).toContain('Em suporte respiratório,');
  });

  it('não anuncia sedação em paciente sem sedação', () => {
    const t = texto(ADULTO_ESTAVEL);
    expect(t).toContain('Em suporte respiratório,');
    expect(t).not.toContain('e sedação');
  });

  it('não anuncia dispositivos quando o parágrafo só tem balanço e glicemia', () => {
    // dispositivos: ["nenhum"] e droga vasoativa "não" não geram frase; sobra
    // o metabólico, que não é dispositivo nem terapia.
    expect(texto(ADULTO_ESTAVEL)).not.toContain('Em uso de dispositivos e terapias,');
    expect(contem(ADULTO_ESTAVEL, 'balanço hídrico neutro')).toBe(true);
  });
});

// ── Cenário 2 — crítico com sedação e ventilação mecânica ───────────────────
const CRITICO_VM: Answers = {
  ...ADULTO_ESTAVEL,
  idade_anos: '62',
  consciencia: 'sedado',
  sedativo_qual: ['midazolam', 'fentanil'],
  dose_midazolam: '12', dose_fentanil: '8', sedacao_rass: '-4',
  fc: '128', pa: { a: '85', b: '50' }, fr: '24', spo2: '89', temperatura: '38.4',
  conduta_fc_alterada: 'comunicado_fc',
  conduta_pa_alterada: 'ajuste_droga_pa',
  conduta_hipoxemia: 'aumento_fluxo',
  conduta_febre: 'hemocultura',
  mobilidade: 'dependente',
  dieta: 'enteral', dieta_tolerancia: 'bem_tolerada',
  eliminacoes: 'sonda_vesical', diurese_volume: '350',
  via_aerea: 'vm', modo_ventilatorio: 'pcv', fio2: '60', peep: '10',
  dispositivos: ['avp', 'cvc', 'sng', 'dreno'],
  avp_calibre: '20g', avp_local: 'Antebraço direito',
  cvc_sitio: 'jugular_d',
  dreno_debito: '120', dreno_aspecto: 'serosanguinolento',
  droga_vasoativa: 'sim', droga_vasoativa_qual: 'noradrenalina', droga_vasoativa_dose: '15',
  pele: 'lesao', pele_estadiamento: '2',
  perfusao_perif: 'tec_lento',
  mmss: 'alterado', mmss_detalhe: 'Edema em membro superior direito',
  mmii: 'alterado', mmii_detalhe: 'Edema bilateral +2/4',
};

describe('cenário 2 — crítico com sedação e ventilação mecânica', () => {
  it('encadeia condicional de condicional: sedado → droga → dose daquela droga', () => {
    const seq = ids(CRITICO_VM);
    expect(seq).toContain('sedativo_qual');
    expect(seq).toContain('dose_midazolam');
    expect(seq).toContain('dose_fentanil');
    // Droga não marcada não pede dose.
    expect(seq).not.toContain('dose_propofol');
    expect(seq).not.toContain('dose_dexmedetomidina');
  });

  it('abre os parâmetros ventilatórios só com ventilação mecânica', () => {
    expect(ids(CRITICO_VM)).toEqual(expect.arrayContaining(['modo_ventilatorio', 'fio2', 'peep']));
    expect(ids({ ...CRITICO_VM, via_aerea: 'ar_ambiente' })).not.toContain('peep');
  });

  it('abre uma conduta para cada sinal vital alterado', () => {
    expect(ids(CRITICO_VM)).toEqual(
      expect.arrayContaining([
        'conduta_fc_alterada',
        'conduta_pa_alterada',
        'conduta_hipoxemia',
        'conduta_febre',
      ]),
    );
  });

  it('classifica hipotensão, hipoxemia, febre e oligúria', () => {
    expect(contem(CRITICO_VM, 'taquicárdico, com frequência cardíaca de 128 bpm')).toBe(true);
    expect(contem(CRITICO_VM, 'hipotenso, com pressão arterial de 85x50 mmHg')).toBe(true);
    expect(contem(CRITICO_VM, 'apresentando hipoxemia, com SpO₂ de 89%')).toBe(true);
    expect(contem(CRITICO_VM, 'febril, temperatura axilar de 38.4°C')).toBe(true);
    expect(contem(CRITICO_VM, 'oligúrico, diurese de 350 mL nas últimas 24h')).toBe(true);
    expect(contem(CRITICO_VM, 'RASS -4, sedação profunda')).toBe(true);
    expect(contem(CRITICO_VM, 'lesão por pressão estágio II')).toBe(true);
  });

  it('anuncia sedação na abertura quando há sedação de verdade', () => {
    expect(texto(CRITICO_VM)).toContain('Em suporte respiratório e sedação,');
  });

  it('anuncia dispositivos quando há acesso ou droga', () => {
    expect(texto(CRITICO_VM)).toContain('Em uso de dispositivos e terapias,');
  });

  it('mantém o pedido de detalhamento mesmo com o campo livre preenchido', () => {
    // "Alterado" carrega needsReview: o texto livre descreve o achado, mas a
    // marca (CONFERIR) permanece — quem confere é o profissional, não o motor.
    expect(pendencias(CRITICO_VM)).toEqual([
      '(CONFERIR — Membros superiores sem alterações? — resposta "Alterado" precisa de detalhamento)',
      '(CONFERIR — Membros inferiores sem alterações? — resposta "Alterado" precisa de detalhamento)',
    ]);
    // e a descrição entra no texto, não se perde
    expect(contem(CRITICO_VM, 'alteração em membros superiores: edema em membro superior direito')).toBe(true);
  });
});

// ── Cenário 3 — RN estável ──────────────────────────────────────────────────
const RN_ESTAVEL: Answers = {
  idade_unidade: 'dias', idade_dias: '3', sexo: 'masculino',
  idade_gestacional: '39', peso: '3200',
  estado_alerta: 'ativo_reativo',
  fc: '140', fr: '45', spo2: '97', temperatura: '36.8',
  silverman: 'ausente',
  pele_neo: 'rosada', coto_umbilical: 'seco_integro', reflexos: 'presentes',
  eliminacoes_neo: 'presentes', dieta_neo: 'seio_livre_demanda',
  via_aerea_neo: 'ar_ambiente', dispositivos_neo: ['nenhum'],
  tem_diagnostico: 'nao', tem_resultado: 'nao',
};

describe('cenário 3 — RN estável', () => {
  it('usa a faixa vital da idade, não a do adulto', () => {
    // 140 bpm e 45 irpm seriam taquicardia/taquipneia em adulto.
    expect(contem(RN_ESTAVEL, 'normocárdico para a idade, com frequência cardíaca de 140 bpm')).toBe(true);
    expect(contem(RN_ESTAVEL, 'eupneico para a idade, com frequência respiratória de 45 irpm')).toBe(true);
    expect(faixaVitalPorIdade(RN_ESTAVEL)).toMatchObject({ minFc: 120, maxFc: 160 });
  });

  it('não pergunta pressão arterial — não há referência neonatal confiável', () => {
    expect(ids(RN_ESTAVEL)).not.toContain('pa');
  });

  it('troca o vocabulário adulto pelo neonatal', () => {
    const seq = ids(RN_ESTAVEL);
    expect(seq).toEqual(expect.arrayContaining(['estado_alerta', 'pele_neo', 'via_aerea_neo', 'dieta_neo']));
    expect(seq).not.toContain('consciencia');
    expect(seq).not.toContain('pele');
    expect(seq).not.toContain('via_aerea');
    expect(seq).not.toContain('dieta');
  });

  it('nunca menciona sedação — o caminho neonatal não tem essa pergunta', () => {
    expect(texto(RN_ESTAVEL)).not.toContain('sedação');
    expect(texto(RN_ESTAVEL)).toContain('Em suporte respiratório,');
    expect(ids(RN_ESTAVEL)).not.toContain('sedativo_qual');
  });

  it('classifica a termo e não deixa pendência', () => {
    expect(contem(RN_ESTAVEL, 'a termo, com 39 semanas de idade gestacional corrigida')).toBe(true);
    expect(pendencias(RN_ESTAVEL)).toEqual([]);
  });
});

// ── Cenário 4 — RN crítico ──────────────────────────────────────────────────
const RN_CRITICO: Answers = {
  ...RN_ESTAVEL,
  idade_dias: '1', idade_gestacional: '30', peso: '1200',
  estado_alerta: 'hipoativo',
  fc: '170', fr: '68', spo2: '88', temperatura: '36.1',
  conduta_fc_alterada: 'comunicado_fc',
  conduta_hipoxemia: 'inicio_o2',
  conduta_termica_neo: 'incubadora_ajustada',
  silverman: 'grave', conduta_desconforto_grave: 'iniciado_cpap',
  pele_neo: 'ictericia', fototerapia: 'sim',
  via_aerea_neo: 'vm', modo_ventilatorio_neo: 'pcv', fio2_neo: '45', peep_neo: '6',
  dispositivos_neo: ['cateter_umbilical', 'picc'],
};

describe('cenário 4 — RN crítico', () => {
  it('classifica pré-termo e abre as condutas neonatais', () => {
    expect(contem(RN_CRITICO, 'pré-termo, com 30 semanas de idade gestacional corrigida')).toBe(true);
    expect(contem(RN_CRITICO, 'com gemido expiratório audível')).toBe(true);
    expect(ids(RN_CRITICO)).toEqual(
      expect.arrayContaining(['conduta_desconforto_grave', 'conduta_termica_neo', 'fototerapia']),
    );
  });

  it('usa a conduta térmica neonatal, não a de febre do adulto', () => {
    const seq = ids(RN_CRITICO);
    expect(seq).toContain('conduta_termica_neo');
    expect(seq).not.toContain('conduta_febre');
  });

  it('não deixa pendência', () => {
    expect(pendencias(RN_CRITICO)).toEqual([]);
  });
});

// ── Cenário 5 — gestante em trabalho de parto ───────────────────────────────
const TRABALHO_PARTO: Answers = {
  ...ADULTO_ESTAVEL,
  idade_anos: '28', sexo: 'feminino', situacao_clinica: 'trabalho_parto',
  gestacao_semanas: '39', movimentos_fetais: 'presentes', bcf: '140',
  dilatacao: '6', dinamica_uterina: '3 contrações em 10 minutos', bolsa: 'rota_clara',
};

describe('cenário 5 — gestante em trabalho de parto', () => {
  it('abre o núcleo de trabalho de parto e não o de gestante', () => {
    const seq = ids(TRABALHO_PARTO);
    expect(seq).toEqual(expect.arrayContaining(['dilatacao', 'dinamica_uterina', 'bolsa']));
    expect(seq).not.toContain('contracoes');
  });

  it('classifica o BCF dentro da normalidade', () => {
    expect(contem(TRABALHO_PARTO, 'BCF de 140 bpm, dentro da normalidade')).toBe(true);
    expect(contem({ ...TRABALHO_PARTO, bcf: '100' }, 'com bradicardia fetal, BCF de 100 bpm')).toBe(true);
  });

  it('esconde as opções obstétricas do paciente do sexo masculino', () => {
    const pergunta = CTX.questions.find((q: { id: string }) => q.id === 'situacao_clinica');
    const masculino = getOptions(pergunta, { sexo: 'masculino' }).map((o: { value: string }) => o.value);
    const feminino = getOptions(pergunta, { sexo: 'feminino' }).map((o: { value: string }) => o.value);
    expect(masculino).toEqual(['geral', 'cirurgico']);
    expect(feminino).toEqual(expect.arrayContaining(['gestante', 'trabalho_parto', 'puerpera']));
  });

  it('não deixa pendência', () => {
    expect(pendencias(TRABALHO_PARTO)).toEqual([]);
  });
});

// ── Cenário 6 — puérpera com lóquios de odor fétido ─────────────────────────
const PUERPERA: Answers = {
  ...ADULTO_ESTAVEL,
  idade_anos: '31', sexo: 'feminino', situacao_clinica: 'puerpera',
  tipo_parto: 'cesarea', sitio_cirurgico_obstetrico: 'sem_sinais',
  involucao_uterina: 'adequada',
  loquios: 'odor_fetido', conduta_loquios_odor: 'sim',
  mamas: 'normais', mamilos: 'integros', amamentacao: 'pega_adequada',
  perineo: 'integro',
};

describe('cenário 6 — puérpera com lóquios de odor fétido', () => {
  it('registra o sinal de alerta no texto', () => {
    expect(contem(PUERPERA, 'lóquios com odor fétido — sinal de alerta para infecção puerperal')).toBe(true);
  });

  it('abre o sítio cirúrgico só na cesárea', () => {
    expect(ids(PUERPERA)).toContain('sitio_cirurgico_obstetrico');
    expect(ids({ ...PUERPERA, tipo_parto: 'normal' })).not.toContain('sitio_cirurgico_obstetrico');
  });

  it('marca CONFERIR quando o médico ainda não foi comunicado', () => {
    expect(contem({ ...PUERPERA, conduta_loquios_odor: 'nao' }, '(CONFERIR — Médico foi comunicado sobre o odor fétido?')).toBe(true);
    expect(contem({ ...PUERPERA, conduta_loquios_odor: 'nao' }, 'precisa de detalhamento')).toBe(true);
  });

  it('não deixa pendência quando comunicado', () => {
    expect(pendencias(PUERPERA)).toEqual([]);
  });
});

// ── Invariantes ─────────────────────────────────────────────────────────────
describe('invariantes do motor', () => {
  it('pergunta não respondida NUNCA some — vira pendência explícita', () => {
    const { fc, ...semFc } = ADULTO_ESTAVEL;
    expect(contem(semFc, '(CONFERIR — Qual a frequência cardíaca? não respondido)')).toBe(true);
    // e não vira "normal" por omissão
    expect(contem(semFc, 'normocárdico')).toBe(false);
  });

  it('valor numérico fora da faixa conta como não respondido', () => {
    expect(contem({ ...ADULTO_ESTAVEL, fc: '999' }, '(CONFERIR — Qual a frequência cardíaca? não respondido)')).toBe(true);
  });

  it('acusa dieta por via oral com ventilação mecânica invasiva', () => {
    expect(contem({ ...CRITICO_VM, dieta: 'oral' }, 'via oral é impossível com tubo orotraqueal, revisar')).toBe(true);
  });

  it('acusa deambulação com paciente sedado', () => {
    expect(contem({ ...CRITICO_VM, mobilidade: 'sem_auxilio' }, 'mas paciente está sedado/comatoso — fisicamente incompatível')).toBe(true);
  });

  it('acusa situação obstétrica registrada em paciente do sexo masculino', () => {
    expect(contem({ ...PUERPERA, sexo: 'masculino' }, 'situação clínica obstétrica registrada com sexo masculino')).toBe(true);
  });

  it('mantém os sinais vitais antes do exame céfalo-podal na sequência', () => {
    const seq = ids(ADULTO_ESTAVEL);
    ['fc', 'fr', 'spo2', 'temperatura'].forEach((vital) => {
      expect(seq.indexOf(vital)).toBeGreaterThan(-1);
      expect(seq.indexOf(vital)).toBeLessThan(seq.indexOf('cabeca'));
    });
  });

  it('toda pergunta do schema tem categoria e subgrupo de parágrafo', () => {
    const semCategoria = CTX.questions
      .map((q: { id: string }) => q.id)
      .filter((id: string) => !CATEGORIA_POR_ID[id] || !SUBGRUPO_POR_ID[id]);
    expect(semCategoria).toEqual([]);
  });

  it('não tem id de pergunta duplicado nem showIf apontando para id inexistente', () => {
    const todos: string[] = CTX.questions.map((q: { id: string }) => q.id);
    expect(new Set(todos).size).toBe(todos.length);

    const referidos: string[] = CTX.questions
      .filter((q: { showIf?: { questionId?: string } }) => q.showIf?.questionId)
      .map((q: { showIf: { questionId: string } }) => q.showIf.questionId);
    referidos.forEach((ref) => expect(todos).toContain(ref));
  });

  it('a sequência é recalculada a cada resposta — a árvore cresce', () => {
    // Camada universal: idade, sexo, FC, FR, SpO2, temperatura, mais as duas
    // perguntas de fecho do Processo de Enfermagem.
    expect(ids({}).length).toBe(8);
    expect(ids({ idade_unidade: 'anos' }).length).toBeGreaterThan(6);
    expect(ids(CRITICO_VM).length).toBeGreaterThan(ids(ADULTO_ESTAVEL).length);
  });
});

// Marca o arquivo como módulo: sem isto os dois testes compartilham escopo
// global e o tsc acusa redeclaração de CONTEXTS/CTX/Answers.
export {};
