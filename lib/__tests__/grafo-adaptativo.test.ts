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
  comoChamar,
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
  pele: 'integra', pele_coloracao: 'corada', hidratacao: 'hidratado',
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
  tem_resultado: 'nao',
};

describe('cenário 1 — adulto estável', () => {
  it('não deixa nenhuma pendência quando tudo foi respondido', () => {
    expect(pendencias(ADULTO_ESTAVEL)).toEqual([]);
  });

  it('abre o parágrafo com Paciente e registra os vitais pelo valor aferido', () => {
    expect(texto(ADULTO_ESTAVEL).startsWith('Paciente ')).toBe(true);
    expect(contem(ADULTO_ESTAVEL, 'com frequência cardíaca de 78 bpm')).toBe(true);
    expect(contem(ADULTO_ESTAVEL, 'com frequência respiratória de 16 irpm')).toBe(true);
    expect(contem(ADULTO_ESTAVEL, 'com temperatura axilar de 36.5°C')).toBe(true);
    expect(contem(ADULTO_ESTAVEL, 'com pressão arterial de 120x80 mmHg')).toBe(true);
    expect(contem(ADULTO_ESTAVEL, 'com SpO₂ de 97%')).toBe(true);
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
    // Vitais, exame céfalo-podal, funcional, via aérea e metabólico saem em
    // parágrafos próprios, separados por linha em branco.
    expect(t.split('\n\n').length).toBeGreaterThanOrEqual(5);
  });

  it('não anuncia suporte respiratório em paciente em ar ambiente', () => {
    // "Em suporte respiratório, em ar ambiente" se contradiz na mesma frase.
    const t = texto(ADULTO_ESTAVEL);
    expect(t).toContain('Em ar ambiente.');
    expect(t).not.toContain('Em suporte respiratório');
    expect(t).not.toContain('e sedação');
  });

  it('anuncia suporte quando há suporte de verdade', () => {
    const comCateter = { ...ADULTO_ESTAVEL, via_aerea: 'cateter_o2', fluxo_o2: '3' };
    expect(texto(comCateter)).toContain('Em suporte respiratório, em uso de cateter nasal de oxigênio');
  });

  it('sedação sem suporte ventilatório abre o parágrafo por si mesma', () => {
    const t = texto({
      ...ADULTO_ESTAVEL,
      consciencia: 'sedado', sedativo_qual: ['midazolam'], dose_midazolam: '12', sedacao_rass: '-2',
      via_aerea: 'ar_ambiente',
    });
    expect(t).toContain('Em sedação, midazolam em infusão contínua a 12 mL/h');
    expect(t).not.toContain('Em suporte respiratório');
  });

  it('via aérea não respondida não vira suporte anunciado', () => {
    const { via_aerea, ...semVia } = ADULTO_ESTAVEL;
    expect(texto(semVia)).not.toContain('Em suporte respiratório');
    expect(contem(semVia, '(CONFERIR — Qual o suporte de via aérea? não respondido)')).toBe(true);
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
  eliminacoes: 'sonda_vesical', diurese_volume: '350', diurese_aspecto: 'amarelo_claro',
  via_aerea: 'vm', modo_ventilatorio: 'pcv', fio2: '60', peep: '10',
  dispositivos: ['avp', 'cvc', 'sng', 'dreno'],
  avp_calibre: '20g', avp_local: 'Antebraço direito', avp_sitio_condicao: 'sem_alteracao',
  cvc_sitio: 'jugular_d', cvc_sitio_condicao: 'hiperemia',
  dreno_debito: '120', dreno_aspecto: 'serosanguinolento', dreno_sitio_condicao: 'sem_alteracao',
  droga_vasoativa: 'sim', droga_vasoativa_qual: 'noradrenalina', droga_vasoativa_dose: '15',
  pele: 'lesao', pele_estadiamento: '2',
  pele_lesao_local: 'Região sacral', pele_lesao_tamanho: { a: '4', b: '2.5' },
  perfusao_perif: 'tec_lento',
  // Paciente taquicárdico, hipotenso, hipoxêmico e febril não pode herdar o
  // "estado geral preservado, sem sinais de sofrimento" do cenário estável —
  // contradiria a própria validação cruzada que existe para acusar isso.
  estado_geral: 'alterado',
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
    // Achado, estágio, região e medida vêm encadeados, sem repetir o nome do
    // achado a cada elo.
    expect(contem(CRITICO_VM, 'presença de lesão por pressão, estágio II, em região sacral, medindo 4 x 2.5 cm')).toBe(true);
  });

  it('anuncia sedação na abertura quando há sedação de verdade', () => {
    expect(texto(CRITICO_VM)).toContain('Em suporte respiratório e sedação,');
  });

  it('não repete o nome da droga sedativa entre a seleção e a dose', () => {
    // A droga é nomeada uma vez só, na frase da dose — é ela que amarra cada
    // dose à sua droga quando há mais de uma em curso.
    const t = texto(CRITICO_VM);
    expect(t).toContain('midazolam em infusão contínua a 12 mL/h, fentanil em infusão contínua a 8 mL/h');
    expect(t).not.toContain('midazolam, midazolam');
    expect(t).not.toContain('fentanil, fentanil');
  });

  it('dose não respondida ainda nomeia a droga, na pendência', () => {
    const { dose_midazolam, ...semDose } = CRITICO_VM;
    expect(contem(semDose, '(CONFERIR — Qual a dose de midazolam? não respondido)')).toBe(true);
  });

  it('anuncia dispositivos quando há acesso ou droga', () => {
    expect(texto(CRITICO_VM)).toContain('Em uso de dispositivos e terapias,');
  });

  it('mantém o pedido de detalhamento mesmo com o campo livre preenchido', () => {
    // "Alterado" carrega needsReview: o texto livre descreve o achado, mas a
    // marca (CONFERIR) permanece — quem confere é o profissional, não o motor.
    expect(pendencias(CRITICO_VM)).toEqual([
      '(CONFERIR — Como está o estado geral? — resposta "Alterado" precisa de detalhamento)',
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
  silverman: 'ausente', hidratacao: 'hidratado',
  pele_neo: 'rosada', coto_umbilical: 'seco_integro', reflexos: 'presentes',
  eliminacoes_neo: 'presentes', dieta_neo: 'seio_livre_demanda',
  via_aerea_neo: 'ar_ambiente', dispositivos_neo: ['nenhum'],
  tem_resultado: 'nao',
};

describe('cenário 3 — RN estável', () => {
  it('usa a faixa vital da idade, não a do adulto', () => {
    // 140 bpm e 45 irpm seriam taquicardia/taquipneia em adulto — na faixa
    // neonatal não abrem conduta e o registro fica só com o valor.
    expect(contem(RN_ESTAVEL, 'com frequência cardíaca de 140 bpm')).toBe(true);
    expect(contem(RN_ESTAVEL, 'com frequência respiratória de 45 irpm')).toBe(true);
    expect(ids(RN_ESTAVEL)).not.toContain('conduta_fc_alterada');
    expect(contem({ ...RN_ESTAVEL, fc: '190' }, 'taquicárdico para a idade, com frequência cardíaca de 190 bpm')).toBe(true);
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
    expect(texto(RN_ESTAVEL)).toContain('Em ar ambiente.');
    expect(texto(RN_ESTAVEL)).not.toContain('Em suporte respiratório');
    expect(ids(RN_ESTAVEL)).not.toContain('sedativo_qual');
  });

  it('chama de recém-nascido, não de paciente', () => {
    // Período neonatal é até 28 dias completos (OMS / Ministério da Saúde).
    expect(texto(RN_ESTAVEL).startsWith('Recém-nascido de 3 dias de vida')).toBe(true);
    expect(texto(RN_ESTAVEL)).not.toContain('Paciente');
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
    expect(contem(TRABALHO_PARTO, 'com BCF de 140 bpm')).toBe(true);
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
describe('como o paciente é chamado', () => {
  it('segue a faixa etária', () => {
    expect(comoChamar({ idade_unidade: 'dias', idade_dias: '15' })).toBe('Recém-nascido');
    expect(comoChamar({ idade_unidade: 'dias', idade_dias: '28' })).toBe('Recém-nascido');
    // 29 dias já saiu do período neonatal.
    expect(comoChamar({ idade_unidade: 'dias', idade_dias: '29' })).toBe('Lactente');
    expect(comoChamar({ idade_unidade: 'meses', idade_meses: '6' })).toBe('Lactente');
    expect(comoChamar({ idade_unidade: 'anos', idade_anos: '45' })).toBe('Paciente');
  });

  it('sem idade respondida, não arrisca um termo etário', () => {
    expect(comoChamar({})).toBe('Paciente');
    expect(comoChamar(undefined)).toBe('Paciente');
  });
});

// ── Regras de escrita do COREN-SP ───────────────────────────────────────────
//
// COREN-SP, "Anotação de Enfermagem" (2022). Duas regras textuais explícitas
// que o motor precisa respeitar em todo cenário, não só nos testados aqui —
// por isso as asserções varrem o schema inteiro, e não uma evolução de
// exemplo.
describe('regras de escrita do COREN-SP', () => {
  /** Todo texto que o motor pode mandar para o prontuário. */
  function todasAsFrases(): string[] {
    const frases = new Set<string>();
    CTX.questions.forEach((q: any) => {
      if (!q.options) return;
      // `options` pode ser função (getOptions filtra por resposta anterior).
      // Resolvemos nos dois sexos porque as opções obstétricas só existem em
      // um deles — senão elas escapariam inteiras da varredura.
      const opcoes =
        typeof q.options === 'function'
          ? [{ sexo: 'feminino' }, { sexo: 'masculino' }].flatMap((ctx) => getOptions(q, ctx))
          : q.options;
      opcoes.forEach((o: { frase?: string | null }) => {
        if (o.frase) frases.add(o.frase);
      });
    });
    // As frases de numérico são geradas por classify(), não estão no schema:
    // os cenários acima cobrem a saída delas.
    return [...frases];
  }

  it('não registra sinal vital como rótulo de normalidade', () => {
    // "os sinais vitais mensurados devem ser registrados pontualmente, ou
    // seja, os valores exatos aferidos. Não registrar como 'normotenso',
    // 'normocárdico', etc."
    const cenarios = [ADULTO_ESTAVEL, CRITICO_VM, RN_ESTAVEL, RN_CRITICO, TRABALHO_PARTO, PUERPERA];
    const proibidos = [
      'normocárdico', 'normotenso', 'eupneico', 'afebril', 'normotérmico',
      'normoglicêmico', 'PA normal', 'PA ótima', 'dentro da normalidade',
    ];
    cenarios.forEach((cenario) =>
      proibidos.forEach((rotulo) => expect(contem(cenario, rotulo)).toBe(false)),
    );
  });

  it('o valor aferido sempre acompanha o sinal vital, alterado ou não', () => {
    [ADULTO_ESTAVEL, CRITICO_VM].forEach((cenario) => {
      expect(contem(cenario, `frequência cardíaca de ${cenario.fc} bpm`)).toBe(true);
      expect(contem(cenario, `frequência respiratória de ${cenario.fr} irpm`)).toBe(true);
      expect(contem(cenario, `SpO₂ de ${cenario.spo2}%`)).toBe(true);
      expect(contem(cenario, `temperatura axilar de ${cenario.temperatura}°C`)).toBe(true);
    });
  });

  it('a classificação de normalidade sobrevive na tela, não no prontuário', () => {
    // `label` é o texto de apoio do campo numérico; `frase` é o que vai para
    // o documento. A distinção é o que deixa o app orientar sem registrar
    // juízo de normalidade.
    const fc = CTX.questions.find((q: { id: string }) => q.id === 'fc');
    const normal = fc.classify(78, ADULTO_ESTAVEL);
    expect(normal.label).toContain('dentro da faixa de referência');
    expect(normal.frase).toBe('com frequência cardíaca de 78 bpm');

    const alterado = fc.classify(140, ADULTO_ESTAVEL);
    expect(alterado.label).toBe('taquicárdico');
    expect(alterado.frase).toContain('taquicárdico');
  });

  it('nenhuma frase do schema tem termo de conotação de valor', () => {
    // "Não conter termos que deem conotação de valor (bem, mal, muito,
    // pouco, etc.)". Os descritores oficiais da RASS são a exceção
    // deliberada: são o nome do degrau de um instrumento validado, com o
    // escore sempre junto.
    const proibidos = /\b(boa|bom|bem|mal|muito|pouco|adequad\w*|discret\w*|satisfatóri\w*|importante|razoáve\w*|ótim\w*|ruim)\b/i;
    const infratoras = todasAsFrases()
      .filter((f) => !f.startsWith('RASS '))
      .filter((f) => proibidos.test(f));
    expect(infratoras).toEqual([]);
  });

  it('registra a condição do sítio de inserção de cada dispositivo', () => {
    // "dispositivos em uso (ex.: cateteres e como se encontram suas
    // inserções e fixações; curativos e seu aspecto visível externamente)".
    const seq = ids(CRITICO_VM);
    expect(seq).toEqual(
      expect.arrayContaining(['avp_sitio_condicao', 'cvc_sitio_condicao', 'dreno_sitio_condicao']),
    );
    // e só quando o dispositivo existe
    expect(ids({ ...CRITICO_VM, dispositivos: ['avp'] })).not.toContain('cvc_sitio_condicao');
  });

  it('sítio não avaliado vira pendência, não silêncio', () => {
    const { avp_sitio_condicao, ...semSitio } = CRITICO_VM;
    expect(contem(semSitio, '(CONFERIR — Como está o local da punção do acesso venoso periférico? não respondido)')).toBe(true);
    expect(contem(CRITICO_VM, 'sítio de punção sem hiperemia, edema, dor à palpação ou secreção')).toBe(true);
    expect(contem(CRITICO_VM, 'com hiperemia no sítio de inserção do cateter central')).toBe(true);
  });

  it('mensura a lesão e diz onde ela está', () => {
    // "priorizar a descrição de características, como tamanho mensurado
    // (cm, mm, etc.)". Estágio sozinho não é característica mensurada.
    const seq = ids(CRITICO_VM);
    expect(seq).toEqual(expect.arrayContaining(['pele_lesao_local', 'pele_lesao_tamanho']));
    expect(contem(CRITICO_VM, 'em região sacral, medindo 4 x 2.5 cm')).toBe(true);
    // e só existem quando há lesão
    expect(ids(ADULTO_ESTAVEL)).not.toContain('pele_lesao_tamanho');
  });

  it('mede a deiscência, mas não mede ferida fechada e seca', () => {
    const cirurgico = {
      ...ADULTO_ESTAVEL, situacao_clinica: 'cirurgico',
      tipo_cirurgia: 'Colecistectomia', anestesia: 'geral',
      ferida_operatoria_local: 'subcostal direita',
    };
    expect(ids({ ...cirurgico, ferida_operatoria: 'limpa_seca' })).not.toContain('ferida_operatoria_tamanho');
    const comDeiscencia = {
      ...cirurgico, ferida_operatoria: 'deiscencia',
      ferida_operatoria_tamanho: { a: '3', b: '1.5' },
    };
    expect(contem(comDeiscencia, 'deiscência de ferida operatória, em região subcostal direita, medindo 3 x 1.5 cm')).toBe(true);
    expect(texto(comDeiscencia)).not.toContain('deiscência medindo');
  });

  it('pergunta coloração da pele também no adulto, não só no recém-nascido', () => {
    // O documento lista "coloração da pele" nas condições gerais, sem
    // restringir por idade.
    expect(ids(ADULTO_ESTAVEL)).toContain('pele_coloracao');
    expect(contem(ADULTO_ESTAVEL, 'corado')).toBe(true);
    expect(contem({ ...ADULTO_ESTAVEL, pele_coloracao: 'ictericia' }, 'ictérico')).toBe(true);
  });

  it('registra o aspecto da diurese, não só o volume', () => {
    expect(contem(CRITICO_VM, 'diurese de 350 mL nas últimas 24h, de aspecto amarelo-claro e límpido')).toBe(true);
    // aberta pela sonda vesical, como o volume
    expect(ids(ADULTO_ESTAVEL)).not.toContain('diurese_aspecto');
  });

  it('inclui o escore da escala de dor', () => {
    // "dados de aplicação de Escala de dor (...) incluindo valor do escore".
    expect(contem({ ...ADULTO_ESTAVEL, dor: 'moderada' }, 'refere dor, escore EVA entre 4 e 6')).toBe(true);
  });
});

describe('invariantes do motor', () => {
  it('pergunta não respondida NUNCA some — vira pendência explícita', () => {
    const { fc, ...semFc } = ADULTO_ESTAVEL;
    expect(contem(semFc, '(CONFERIR — Qual a frequência cardíaca? não respondido)')).toBe(true);
    // e não vira valor nenhum por omissão
    expect(contem(semFc, 'frequência cardíaca de')).toBe(false);
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
    // Camada universal: idade, sexo, FC, FR, SpO2, temperatura, mais a
    // pergunta de fecho do Processo de Enfermagem.
    expect(ids({}).length).toBe(7);
    expect(ids({ idade_unidade: 'anos' }).length).toBeGreaterThan(6);
    expect(ids(CRITICO_VM).length).toBeGreaterThan(ids(ADULTO_ESTAVEL).length);
  });
});

// ── Checkup de consistência clínica — regras novas de validacoesCruzadas ────
//
// Uma contradição real (SpO₂ 85% + "ar ambiente" + "aumento de fluxo/FiO₂")
// escapou porque a árvore nunca validava o conjunto final entre seções
// distantes. Cada teste abaixo cobre uma categoria de dependência cruzada
// mapeada na varredura, não só o caso de O₂ que motivou a varredura.
describe('validacoesCruzadas — checkup de consistência clínica', () => {
  it('acusa estado geral preservado com sinal vital fora da faixa (regra genérica, cobre FC/FR/PA/SpO₂/temperatura/glicemia)', () => {
    expect(contem({ ...ADULTO_ESTAVEL, fc: '160' }, 'há sinal vital fora da faixa de referência')).toBe(true);
    expect(contem({ ...ADULTO_ESTAVEL, spo2: '85' }, 'há sinal vital fora da faixa de referência')).toBe(true);
    expect(contem({ ...ADULTO_ESTAVEL, temperatura: '39' }, 'há sinal vital fora da faixa de referência')).toBe(true);
    // estado geral alterado com o mesmo vital não deve acusar nada — o
    // profissional já sinalizou o achado.
    expect(contem({ ...ADULTO_ESTAVEL, estado_geral: 'alterado', fc: '160' }, 'há sinal vital fora da faixa de referência')).toBe(false);
  });

  it('acusa "aumento de fluxo/FiO₂" com paciente em ar ambiente — o caso relatado', () => {
    const contradicao = {
      ...ADULTO_ESTAVEL,
      spo2: '85',
      conduta_hipoxemia: 'aumento_fluxo',
      via_aerea: 'ar_ambiente',
    };
    expect(contem(contradicao, 'não é possível aumentar fluxo de suporte de oxigênio inexistente')).toBe(true);
    // Com cateter de O₂ de verdade, a mesma conduta não é contraditória.
    const semContradicao = { ...contradicao, via_aerea: 'cateter_o2', fluxo_o2: '3' };
    expect(contem(semContradicao, 'não é possível aumentar fluxo')).toBe(false);
  });

  it('acusa "Nenhum" dispositivo marcado junto com outro(s) dispositivo(s)', () => {
    expect(contem({ ...ADULTO_ESTAVEL, dispositivos: ['nenhum', 'avp'] }, "'Nenhum' selecionado junto com outro(s) dispositivo(s)")).toBe(true);
    expect(contem({ ...ADULTO_ESTAVEL, dispositivos: ['avp'] }, "'Nenhum' selecionado")).toBe(false);
  });

  it('acusa "Nenhum" acesso neonatal marcado junto com outro(s) acesso(s)', () => {
    const RN_BASE = { idade_unidade: 'dias', idade_dias: '5', idade_gestacional: '39', peso: '3200', sexo: 'feminino' };
    expect(contem({ ...RN_BASE, dispositivos_neo: ['nenhum', 'picc'] }, "'Nenhum' selecionado junto com outro(s) acesso(s)")).toBe(true);
  });

  it('acusa "Nenhuma característica" de dor torácica marcada junto com outra característica', () => {
    const contradicao = { ...ADULTO_ESTAVEL, dor: 'moderada', dor_localizacao: 'toracica', dor_toracica_caracteristicas: ['nenhuma', 'sudorese'] };
    expect(contem(contradicao, "'Nenhuma característica associada' selecionada junto com outra")).toBe(true);
  });

  it('acusa balanço hídrico fortemente positivo ou hidratação "edemaciado" sem edema em nenhum membro', () => {
    expect(contem({ ...ADULTO_ESTAVEL, balanco_hidrico: { a: '4000', b: '1000' } }, 'sem edema — checar consistência entre os três campos')).toBe(true);
    expect(contem({ ...ADULTO_ESTAVEL, hidratacao: 'edemaciado' }, 'sem edema — checar consistência entre os três campos')).toBe(true);
    // Membro com edema registrado condiz com o achado — não acusa.
    expect(contem({ ...ADULTO_ESTAVEL, hidratacao: 'edemaciado', mmss: 'alterado', mmss_detalhe: 'edema' }, 'sem edema — checar consistência')).toBe(false);
  });

  it('acusa escore RASS incompatível com o nível de consciência', () => {
    expect(contem({ ...CRITICO_VM, sedacao_rass: '0' }, 'escore RASS registrado incompatível')).toBe(true);
    expect(contem({ ...ADULTO_ESTAVEL, consciencia: 'sonolento', sedacao_rass: '-5' }, 'escore RASS registrado incompatível')).toBe(true);
  });

  it('acusa parâmetro ventilatório respondido sem via aérea em VM (defensivo)', () => {
    expect(contem({ ...ADULTO_ESTAVEL, fio2: '40' }, 'via aérea não está registrada como ventilação mecânica invasiva')).toBe(true);
    const RN_VM = { idade_unidade: 'dias', idade_dias: '2', idade_gestacional: '32', peso: '1800', sexo: 'masculino', fio2_neo: '30', via_aerea_neo: 'cpap' };
    expect(contem(RN_VM, 'via aérea não está registrada como ventilação mecânica invasiva')).toBe(true);
  });

  it('acusa detalhe de dispositivo respondido sem o dispositivo marcado (AVP/CVC/dreno)', () => {
    expect(contem({ ...ADULTO_ESTAVEL, avp_calibre: '20g' }, 'sem AVP marcado em dispositivos')).toBe(true);
    expect(contem({ ...ADULTO_ESTAVEL, cvc_sitio: 'jugular_d' }, 'sem CVC marcado em dispositivos')).toBe(true);
    expect(contem({ ...ADULTO_ESTAVEL, dreno_debito: '50' }, 'sem dreno marcado em dispositivos')).toBe(true);
  });

  it('acusa sedativo registrado sem nível de consciência compatível (defensivo)', () => {
    expect(contem({ ...ADULTO_ESTAVEL, sedativo_qual: ['midazolam'] }, 'sem nível de consciência compatível')).toBe(true);
  });
});

// Marca o arquivo como módulo: sem isto os dois testes compartilham escopo
// global e o tsc acusa redeclaração de CONTEXTS/CTX/Answers.
export {};
