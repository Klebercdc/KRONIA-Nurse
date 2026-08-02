/**
 * Schemas do motor adaptativo — o conteúdo clínico do fluxo condicional.
 *
 * Cada bloco é uma função que devolve `Pergunta[]`, opcionalmente "portada" por
 * uma condição (`gate`). É isso que permite o mesmo bloco existir como schema
 * autônomo (chip "Curativo" na Home) e como ramo de um schema maior
 * (bloco de curativo dentro da Evolução Geral) sem duplicar definição.
 *
 * Toda opção clínica aqui tem fonte declarada em `fontes` do schema. Tabelas de
 * escala publicada (Aldrete-Kroulik, RASS) são importadas de `lib/scales.ts` em
 * vez de reescritas — uma tabela, um lugar.
 */

import {
  ALDRETE_CAMPOS,
  RASS_CAMPOS,
  calcularAldrete,
  type Opcao,
} from '../scales';
import {
  fmtNumero,
  type Condicao,
  type Pergunta,
  type Respostas,
  type Schema,
  type Valor,
} from './adaptive-engine';

// ── Setores ──────────────────────────────────────────────────────────────────

export const SETOR_CLINICA_MEDICA = 'Clínica Médica';
export const SETOR_CENTRO_CIRURGICO = 'Centro Cirúrgico / Pós-operatório';
export const SETOR_UTI = 'UTI';
export const SETOR_NEFROLOGIA = 'Nefrologia / Hemodiálise';

export const SETORES = [
  SETOR_CLINICA_MEDICA,
  SETOR_CENTRO_CIRURGICO,
  SETOR_UTI,
  SETOR_NEFROLOGIA,
];

// ── Títulos de bloco (usados na montagem do documento) ───────────────────────

export const TITULOS_DE_BLOCO: Record<string, string> = {
  contexto: 'Contexto do plantão',
  nucleo: 'Avaliação geral',
  dor: 'Avaliação da dor',
  curativo: 'Avaliação da lesão e curativo',
  cateterhd: 'Cateter de hemodiálise',
  clinica_medica: 'Escalas e cuidados — Clínica Médica',
  pos_operatorio: 'Recuperação pós-anestésica',
  uti: 'Suporte intensivo',
  medicacao: 'Administração de medicamento',
  intercorrencia: 'Intercorrência',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Aplica um portão condicional a um bloco inteiro, preservando o `showIf` próprio de cada pergunta. */
function portao(perguntas: Pergunta[], gate?: Condicao): Pergunta[] {
  if (!gate) return perguntas;
  return perguntas.map((p) => ({ ...p, showIf: { ...gate, ...(p.showIf ?? {}) } }));
}

const labels = (campo: { opcoes: Opcao[] }): string[] => campo.opcoes.map((o) => o.label);

const pontos = (campo: { opcoes: Opcao[] }, label: Valor): number | undefined =>
  campo.opcoes.find((o) => o.label === label)?.valor;

const sn = (v: Valor): boolean => v === true;

// ── Bloco: contexto do plantão ───────────────────────────────────────────────

export function blocoContexto(): Pergunta[] {
  return [
    {
      id: 'setor',
      texto: 'Em qual setor você está?',
      tipo: 'opcao',
      opcoes: SETORES,
      bloco: 'contexto',
      ajuda: 'Define quais blocos específicos entram no fluxo.',
      frase: (v) => `Paciente sob cuidados em ${v}.`,
    },
  ];
}

// ── Bloco: núcleo universal ──────────────────────────────────────────────────

export function blocoNucleo(gate?: Condicao): Pergunta[] {
  return portao(
    [
      {
        id: 'consciencia',
        texto: 'Qual o nível de consciência?',
        tipo: 'opcao',
        opcoes: [
          'Consciente e orientado',
          'Consciente e desorientado',
          'Sonolento, desperta ao chamado',
          'Torporoso, desperta a estímulo doloroso',
          'Não responsivo',
        ],
        bloco: 'nucleo',
        frase: (v) => `Encontra-se ${String(v).toLowerCase()}.`,
      },
      {
        id: 'temperatura',
        texto: 'Qual a temperatura axilar aferida?',
        tipo: 'numero',
        min: 30,
        max: 43,
        unidade: '°C',
        decimais: 1,
        bloco: 'nucleo',
        ajuda: 'Registre o valor aferido. O documento não converte valor em rótulo clínico.',
        frase: (v) => `Temperatura axilar aferida em ${fmtNumero(Number(v), 1)} °C.`,
      },
      {
        id: 'dispositivos',
        texto: 'Quais dispositivos invasivos estão instalados?',
        tipo: 'texto',
        bloco: 'nucleo',
        ajuda: 'Ex.: AVP em MSD nº 20, SVD, SNE. Escreva "nenhum" se não houver.',
        frase: (v) => `Dispositivos em uso: ${v}.`,
      },
      {
        id: 'tem_dor',
        texto: 'O paciente refere dor?',
        tipo: 'bool',
        bloco: 'nucleo',
        frase: (v) => (sn(v) ? '' : 'Nega dor no momento da avaliação.'),
      },
      {
        id: 'tem_curativo',
        texto: 'Há lesão de pele ou curativo a avaliar?',
        tipo: 'bool',
        bloco: 'nucleo',
        frase: (v) => (sn(v) ? '' : 'Pele íntegra, sem lesões ou curativos no momento da avaliação.'),
      },
    ],
    gate,
  );
}

// ── Bloco: dor ───────────────────────────────────────────────────────────────
// Fonte: Coren-SP, Anotações de Enfermagem (guia de registro).

export function blocoDor(gate?: Condicao): Pergunta[] {
  return portao(
    [
      {
        id: 'dor_local',
        texto: 'Onde é a dor?',
        tipo: 'texto',
        bloco: 'dor',
        frase: (v) => `Refere dor em ${v}.`,
      },
      {
        id: 'dor_escore',
        texto: 'Qual o escore de dor referido (0 a 10)?',
        tipo: 'numero',
        min: 0,
        max: 10,
        bloco: 'dor',
        ajuda: 'Escala numérica verbal — valor referido pelo paciente, nunca estimado.',
        frase: (v) => `Escore de dor referido pelo paciente: ${fmtNumero(Number(v))}/10.`,
      },
      {
        id: 'dor_achados',
        texto: 'Há achados associados à dor?',
        tipo: 'texto',
        bloco: 'dor',
        ajuda: 'Ex.: fácies de dor, posição antálgica, sudorese, taquicardia.',
        frase: (v) => `Achados associados: ${v}.`,
      },
      {
        id: 'dor_conduta',
        texto: 'Qual conduta foi adotada para a dor?',
        tipo: 'texto',
        bloco: 'dor',
        ajuda: 'Registre apenas o que já foi realizado.',
        frase: (v) => `Conduta adotada: ${v}.`,
      },
    ],
    gate,
  );
}

// ── Bloco: curativo / lesão ──────────────────────────────────────────────────
// Fontes: Porto & Porto, Anamnese e Exame Físico (cap. 20); Potter & Perry,
// Fundamentos de Enfermagem (cap. 48); Coren-SP, Anotações de Enfermagem.
// Estadiamento conforme NPUAP/EPUAP/PPPIA (2016).

const ESTAGIOS_LPP = [
  'Estágio 1 — eritema não branqueável em pele íntegra',
  'Estágio 2 — perda parcial da espessura da pele com derme exposta',
  'Estágio 3 — perda total da espessura da pele, sem exposição de estruturas profundas',
  'Estágio 4 — perda total da espessura da pele e dos tecidos, com estrutura profunda exposta',
  'Não classificável — perda total obscurecida por esfacelo ou escara',
  'Lesão tissular profunda — descoloração vermelho-escura, marrom ou púrpura persistente',
];

export function blocoCurativo(gate?: Condicao): Pergunta[] {
  return portao(
    [
      {
        id: 'curativo_tipo',
        texto: 'Qual o tipo de lesão?',
        tipo: 'opcao',
        opcoes: [
          'Lesão por pressão',
          'Ferida operatória',
          'Úlcera venosa',
          'Úlcera de pé diabético',
          'Lesão por fricção (skin tear)',
          'Outra',
        ],
        bloco: 'curativo',
        frase: (v) => `Lesão avaliada: ${String(v).toLowerCase()}.`,
      },
      {
        id: 'lpp_estagio',
        texto: 'Qual o estágio da lesão por pressão?',
        tipo: 'opcao',
        opcoes: ESTAGIOS_LPP,
        showIf: { curativo_tipo: 'Lesão por pressão' },
        bloco: 'curativo',
        ajuda: 'Classificação NPUAP/EPUAP/PPPIA (2016).',
        frase: (v) => `Estadiamento: ${v}.`,
      },
      {
        id: 'curativo_local',
        texto: 'Qual a localização da lesão?',
        tipo: 'texto',
        bloco: 'curativo',
        ajuda: 'Ex.: região sacral, calcâneo direito, abdome (incisão mediana).',
        frase: (v) => `Localização: ${v}.`,
      },
      {
        id: 'curativo_leito',
        texto: 'Qual o aspecto do leito da ferida?',
        tipo: 'opcao',
        opcoes: [
          'Tecido de granulação',
          'Tecido de epitelização',
          'Esfacelo',
          'Necrose seca (escara)',
          'Misto',
        ],
        bloco: 'curativo',
        frase: (v) => `Leito da ferida com ${String(v).toLowerCase()}.`,
      },
      {
        id: 'curativo_exsudato_qtd',
        texto: 'Qual a quantidade de exsudato?',
        tipo: 'opcao',
        opcoes: ['Ausente', 'Pequena', 'Moderada', 'Grande'],
        bloco: 'curativo',
        frase: (v) =>
          v === 'Ausente'
            ? 'Sem exsudato no momento da troca.'
            : `Exsudato em quantidade ${String(v).toLowerCase()}.`,
      },
      {
        id: 'curativo_exsudato_tipo',
        texto: 'Qual o tipo de exsudato?',
        tipo: 'opcao',
        opcoes: ['Seroso', 'Serossanguinolento', 'Sanguinolento', 'Purulento'],
        showIf: { curativo_exsudato_qtd: ['Pequena', 'Moderada', 'Grande'] },
        bloco: 'curativo',
        frase: (v) => `Aspecto do exsudato: ${String(v).toLowerCase()}.`,
      },
      {
        id: 'curativo_bordas',
        texto: 'Como estão as bordas da lesão?',
        tipo: 'opcao',
        opcoes: ['Aderidas e íntegras', 'Maceradas', 'Descoladas', 'Epibolia (bordas enroladas)'],
        bloco: 'curativo',
        frase: (v) => `Bordas ${String(v).toLowerCase()}.`,
      },
      {
        id: 'curativo_conduta',
        texto: 'Qual cobertura foi aplicada?',
        tipo: 'texto',
        bloco: 'curativo',
        ajuda: 'Ex.: limpeza com SF 0,9%, hidrofibra com prata, cobertura secundária.',
        frase: (v) => `Realizado curativo: ${v}.`,
      },
    ],
    gate,
  );
}

// ── Bloco: cateter de hemodiálise ────────────────────────────────────────────
// Fonte: Manual de Cuidados de Enfermagem em Procedimentos de Intensivismo
// (UFCSPA, 2020), cap. 14.

export function blocoCateterHD(gate?: Condicao): Pergunta[] {
  return portao(
    [
      {
        id: 'hd_vias_permeaveis',
        texto: 'As duas vias do cateter estão pérvias?',
        tipo: 'bool',
        bloco: 'cateterhd',
        frase: (v) =>
          sn(v)
            ? 'Cateter de hemodiálise com ambas as vias pérvias.'
            : 'Cateter de hemodiálise com via obstruída — intercorrência comunicada à equipe.',
      },
      {
        id: 'hd_desinfeccao_hub',
        texto: 'Foi realizada desinfecção dos hubs antes da manipulação?',
        tipo: 'bool',
        bloco: 'cateterhd',
        ajuda: 'Fricção do hub com clorexidina alcoólica antes de conectar ou desconectar.',
        frase: (v) =>
          sn(v)
            ? 'Desinfecção dos hubs realizada antes da manipulação.'
            : 'Desinfecção dos hubs não realizada nesta manipulação.',
      },
      {
        id: 'hd_curativo_cateter',
        texto: 'Como está o curativo do cateter?',
        tipo: 'opcao',
        opcoes: ['Limpo e seco', 'Com sujidade', 'Úmido', 'Descolado', 'Trocado nesta avaliação'],
        bloco: 'cateterhd',
        frase: (v) => `Curativo do cateter: ${String(v).toLowerCase()}.`,
      },
      {
        id: 'hd_sitio_insercao',
        texto: 'Como está o sítio de inserção?',
        tipo: 'opcao',
        opcoes: [
          'Sem sinais flogísticos',
          'Hiperemia',
          'Secreção purulenta',
          'Dor local à palpação',
          'Sangramento',
        ],
        bloco: 'cateterhd',
        frase: (v) =>
          v === 'Sem sinais flogísticos'
            ? 'Sítio de inserção sem sinais flogísticos.'
            : `Sítio de inserção com ${String(v).toLowerCase()}.`,
      },
      {
        id: 'hd_intercorrencia_sessao',
        texto: 'Houve intercorrência durante a sessão?',
        tipo: 'bool',
        bloco: 'cateterhd',
        frase: (v) => (sn(v) ? '' : 'Sessão de hemodiálise transcorreu sem intercorrências.'),
      },
      {
        id: 'hd_intercorrencia_qual',
        texto: 'Qual foi a intercorrência e a conduta?',
        tipo: 'texto',
        showIf: { hd_intercorrencia_sessao: true },
        bloco: 'cateterhd',
        ajuda: 'Ex.: hipotensão no 2º tempo, reduzida UF e infundido SF 0,9% 100 mL.',
        frase: (v) => `Intercorrência na sessão: ${v}.`,
      },
    ],
    gate,
  );
}

// ── Bloco: Clínica Médica ────────────────────────────────────────────────────
// Escalas publicadas já implementadas em `lib/scales.ts`: NEWS2 (Royal College
// of Physicians, 2017), Braden (Bergstrom et al., 1987), Morse (Morse et al.,
// 1989). O bloco registra o escore JÁ APLICADO pelo enfermeiro — nunca estima
// nem recalcula a partir de descrição livre (blueprint, seção 9, regra 4).

export function blocoClinicaMedica(gate?: Condicao): Pergunta[] {
  return portao(
    [
      {
        id: 'cm_news2_aplicado',
        texto: 'O NEWS2 foi aferido neste plantão?',
        tipo: 'bool',
        bloco: 'clinica_medica',
        frase: (v) => (sn(v) ? '' : 'NEWS2 não aferido neste plantão.'),
      },
      {
        id: 'cm_news2_total',
        texto: 'Qual o escore NEWS2 total?',
        tipo: 'numero',
        min: 0,
        max: 20,
        showIf: { cm_news2_aplicado: true },
        bloco: 'clinica_medica',
        ajuda: 'Use a calculadora de escalas para obter o total — este campo apenas registra o valor.',
        frase: (v) => `NEWS2 aferido: ${fmtNumero(Number(v))} pontos.`,
      },
      {
        id: 'cm_braden_aplicado',
        texto: 'A Escala de Braden foi aplicada neste plantão?',
        tipo: 'bool',
        bloco: 'clinica_medica',
        frase: (v) => (sn(v) ? '' : 'Escala de Braden não aplicada neste plantão.'),
      },
      {
        id: 'cm_braden_total',
        texto: 'Qual o escore de Braden total?',
        tipo: 'numero',
        min: 6,
        max: 23,
        showIf: { cm_braden_aplicado: true },
        bloco: 'clinica_medica',
        ajuda: 'Escala invertida: quanto menor o total, maior o risco de lesão por pressão.',
        frase: (v) => `Escala de Braden: ${fmtNumero(Number(v))} pontos.`,
      },
      {
        id: 'cm_morse_aplicado',
        texto: 'A Escala de Morse foi aplicada neste plantão?',
        tipo: 'bool',
        bloco: 'clinica_medica',
        frase: (v) => (sn(v) ? '' : 'Escala de Morse não aplicada neste plantão.'),
      },
      {
        id: 'cm_morse_total',
        texto: 'Qual o escore de Morse total?',
        tipo: 'numero',
        min: 0,
        max: 125,
        showIf: { cm_morse_aplicado: true },
        bloco: 'clinica_medica',
        frase: (v) => `Escala de Morse (risco de queda): ${fmtNumero(Number(v))} pontos.`,
      },
      {
        id: 'cm_dieta',
        texto: 'Como está a aceitação da dieta?',
        tipo: 'opcao',
        opcoes: [
          'Via oral, aceitação total',
          'Via oral, aceitação parcial',
          'Via oral, recusa alimentar',
          'Jejum',
          'Nutrição enteral por sonda',
          'Nutrição parenteral',
        ],
        bloco: 'clinica_medica',
        frase: (v) => `Dieta: ${String(v).toLowerCase()}.`,
      },
      {
        id: 'cm_eliminacoes',
        texto: 'Como estão as eliminações?',
        tipo: 'texto',
        bloco: 'clinica_medica',
        ajuda: 'Ex.: diurese espontânea, clara; evacuação ausente há 2 dias.',
        frase: (v) => `Eliminações: ${v}.`,
      },
      {
        id: 'cm_mobilidade',
        texto: 'Qual o grau de mobilidade?',
        tipo: 'opcao',
        opcoes: [
          'Deambula sem auxílio',
          'Deambula com auxílio',
          'Permanece em poltrona',
          'Restrito ao leito, muda de decúbito sozinho',
          'Restrito ao leito, dependente para mudança de decúbito',
        ],
        bloco: 'clinica_medica',
        frase: (v) => `Mobilidade: ${String(v).toLowerCase()}.`,
      },
    ],
    gate,
  );
}

// ── Bloco: Centro Cirúrgico / Pós-operatório ─────────────────────────────────
// Índice de Aldrete e Kroulik modificado (SOBECC, 2022; Aldrete & Kroulik,
// 1970, rev. 1995). Parecer COREN-SP nº 017/2021: a equipe de enfermagem
// aplica a escala; a alta da SRPA é ato médico em avaliação conjunta com o
// enfermeiro. O texto gerado registra o índice e NUNCA declara alta.

const ALDRETE_IDS = [
  'po_aldrete_atividade',
  'po_aldrete_respiracao',
  'po_aldrete_circulacao',
  'po_aldrete_consciencia',
  'po_aldrete_saturacao',
];

/** Soma o índice apenas quando os 5 domínios têm valor válido. Domínio pulado → `null`. */
function resultadoAldrete(respostas: Respostas) {
  const valores: number[] = [];
  for (let i = 0; i < ALDRETE_IDS.length; i += 1) {
    const resposta = respostas[ALDRETE_IDS[i]];
    if (resposta === undefined) return null;
    const valor = pontos(ALDRETE_CAMPOS[i], resposta);
    if (valor === undefined) return null;
    valores.push(valor);
  }
  return calcularAldrete(valores);
}

export function blocoPosOperatorio(gate?: Condicao): Pergunta[] {
  const dominios: Pergunta[] = ALDRETE_CAMPOS.map((campo, i) => ({
    id: ALDRETE_IDS[i],
    texto: `Aldrete-Kroulik — ${campo.label.toLowerCase()}:`,
    tipo: 'opcao' as const,
    opcoes: labels(campo),
    bloco: 'pos_operatorio',
    frase: (v: Valor): string => `${campo.label}: ${String(v).toLowerCase()}.`,
  }));

  // O total entra na frase do último domínio: só é somado quando os 5 estão
  // registrados. Domínio pulado = sem total, nunca total parcial.
  const ultimo = dominios[dominios.length - 1];
  dominios[dominios.length - 1] = {
    ...ultimo,
    frase: (v, respostas) => {
      const base = ultimo.frase(v, respostas);
      const resultado = resultadoAldrete({ ...respostas, [ultimo.id]: v });
      if (resultado === null) {
        return `${base} Índice de Aldrete-Kroulik não totalizado — há domínio sem registro.`;
      }
      const { total, risco } = resultado;
      return (
        `${base} Índice de Aldrete-Kroulik: ${fmtNumero(total)}/10 — ${risco.toLowerCase()} ` +
        `(escala aplicada pela enfermagem; a alta da SRPA é decisão médica em avaliação ` +
        `conjunta com o enfermeiro — Parecer COREN-SP nº 017/2021).`
      );
    },
  };

  return portao(
    [
      ...dominios,
      {
        id: 'po_ferida_operatoria',
        texto: 'Como está a ferida operatória?',
        tipo: 'opcao',
        opcoes: [
          'Curativo limpo e seco',
          'Curativo com sangramento',
          'Curativo saturado — trocado',
          'Sinais flogísticos em bordas',
          'Deiscência',
        ],
        bloco: 'pos_operatorio',
        frase: (v) => `Ferida operatória: ${String(v).toLowerCase()}.`,
      },
      {
        id: 'po_drenos',
        texto: 'Há drenos instalados?',
        tipo: 'bool',
        bloco: 'pos_operatorio',
        frase: (v) => (sn(v) ? '' : 'Sem drenos instalados.'),
      },
      {
        id: 'po_drenos_desc',
        texto: 'Qual dreno, e qual o débito e aspecto?',
        tipo: 'texto',
        showIf: { po_drenos: true },
        bloco: 'pos_operatorio',
        ajuda: 'Ex.: dreno de Portovac em flanco direito, 80 mL serossanguinolento.',
        frase: (v) => `Drenos: ${v}.`,
      },
      {
        id: 'po_nausea_vomito',
        texto: 'Apresentou náusea ou vômito no pós-operatório?',
        tipo: 'bool',
        bloco: 'pos_operatorio',
        frase: (v) =>
          sn(v)
            ? 'Apresentou náusea e/ou vômito no pós-operatório — comunicado à equipe médica.'
            : 'Sem náusea ou vômito no período pós-operatório.',
      },
    ],
    gate,
  );
}

// ── Bloco: UTI ───────────────────────────────────────────────────────────────
// RASS: Sessler et al. (Chest, 2002); Ely et al. (JAMA, 2003) — tabela em
// `lib/scales.ts`. Glasgow: Teasdale & Jennett (1974). O Glasgow só é
// perguntado quando NÃO há sedação em curso — sob sedação, o parâmetro de
// avaliação é o RASS, não o Glasgow.

const VIAS_AEREAS_VENTILADAS = ['IOT com ventilação mecânica', 'Traqueostomia'];

export function blocoUTI(gate?: Condicao): Pergunta[] {
  return portao(
    [
      {
        id: 'uti_via_aerea',
        texto: 'Qual o suporte de via aérea?',
        tipo: 'opcao',
        opcoes: [
          'Via aérea natural, ar ambiente',
          'Cateter nasal de O₂',
          'Máscara de O₂',
          'VNI (CPAP/BiPAP)',
          ...VIAS_AEREAS_VENTILADAS,
        ],
        bloco: 'uti',
        frase: (v) => `Suporte de via aérea: ${v}.`,
      },
      {
        id: 'uti_vm_parametros',
        texto: 'Quais os parâmetros ventilatórios programados?',
        tipo: 'texto',
        showIf: { uti_via_aerea: VIAS_AEREAS_VENTILADAS },
        bloco: 'uti',
        ajuda: 'Ex.: PCV, FiO₂ 40%, PEEP 8, FR 16.',
        frase: (v) => `Parâmetros ventilatórios: ${v}.`,
      },
      {
        id: 'uti_sedacao',
        texto: 'Há sedação contínua em curso?',
        tipo: 'bool',
        bloco: 'uti',
        frase: (v) => (sn(v) ? 'Em sedação contínua.' : 'Sem sedação contínua em curso.'),
      },
      {
        id: 'uti_rass',
        texto: 'Qual o RASS aferido?',
        tipo: 'opcao',
        opcoes: labels(RASS_CAMPOS[0]),
        showIf: { uti_sedacao: true },
        bloco: 'uti',
        ajuda: 'Sob sedação, o nível de consciência é avaliado por RASS, não por Glasgow.',
        frase: (v) => `RASS: ${v}.`,
      },
      {
        id: 'uti_glasgow',
        texto: 'Qual a pontuação de Glasgow?',
        tipo: 'numero',
        min: 3,
        max: 15,
        showIf: { uti_sedacao: false },
        bloco: 'uti',
        ajuda: 'Use a calculadora de escalas para somar os três domínios.',
        frase: (v) => `Escala de Coma de Glasgow: ${fmtNumero(Number(v))} pontos.`,
      },
      {
        id: 'uti_dva',
        texto: 'Há droga vasoativa em infusão?',
        tipo: 'bool',
        bloco: 'uti',
        frase: (v) => (sn(v) ? '' : 'Sem drogas vasoativas em infusão.'),
      },
      {
        id: 'uti_dva_quais',
        texto: 'Quais drogas vasoativas e em que dose?',
        tipo: 'texto',
        showIf: { uti_dva: true },
        bloco: 'uti',
        ajuda: 'Ex.: noradrenalina 0,2 mcg/kg/min.',
        frase: (v) => `Drogas vasoativas em curso: ${v}.`,
      },
      {
        id: 'uti_balanco_hidrico',
        texto: 'Qual o balanço hídrico do período?',
        tipo: 'texto',
        bloco: 'uti',
        ajuda: 'Ex.: entrada 1.800 mL, saída 1.250 mL, BH +550 mL.',
        frase: (v) => `Balanço hídrico do período: ${v}.`,
      },
    ],
    gate,
  );
}

// ── Bloco: medicação ─────────────────────────────────────────────────────────
// Fonte: "Os 13 Certos na Administração de Medicamentos" (COFEN) — spec
// canônica da knowledge base deste projeto, com a checagem tripla (seleção,
// preparo, beira do leito). Regra de trituração para sonda enteral conforme o
// mesmo material (OpenRN, Administration of Enteral Medications).

export function blocoMedicacao(gate?: Condicao): Pergunta[] {
  return portao(
    [
      {
        id: 'med_nome',
        texto: 'Qual medicamento foi preparado?',
        tipo: 'texto',
        bloco: 'medicacao',
        frase: (v) => `Medicamento: ${v}.`,
      },
      {
        id: 'med_dose',
        texto: 'Qual a dose prescrita?',
        tipo: 'texto',
        bloco: 'medicacao',
        ajuda: 'Ex.: 1 g, 500 mg, 10 UI.',
        frase: (v) => `Dose: ${v}.`,
      },
      {
        id: 'med_via',
        texto: 'Qual a via de administração?',
        tipo: 'opcao',
        opcoes: [
          'Via oral',
          'Endovenosa',
          'Intramuscular',
          'Subcutânea',
          'Sublingual',
          'Inalatória',
          'Tópica',
          'Sonda enteral',
          'Retal',
        ],
        bloco: 'medicacao',
        frase: (v) => `Via: ${String(v).toLowerCase()}.`,
      },
      {
        id: 'med_trituracao',
        texto: 'Qual a apresentação usada na sonda?',
        tipo: 'opcao',
        opcoes: [
          'Apresentação líquida — sem trituração',
          'Comprimido triturável — triturado e diluído',
          'Não triturável (revestimento entérico ou liberação prolongada) — prescritor comunicado',
        ],
        showIf: { med_via: 'Sonda enteral' },
        bloco: 'medicacao',
        ajuda: 'Nunca triturar revestimento entérico ou liberação prolongada. Lavar a sonda com no mínimo 15 mL de água.',
        frase: (v) => `Preparo para sonda: ${String(v).toLowerCase()}.`,
      },
      {
        id: 'med_horario',
        texto: 'Em que horário foi administrado?',
        tipo: 'texto',
        bloco: 'medicacao',
        ajuda: 'Formato HH:MM.',
        frase: (v) => `Horário de administração: ${v}.`,
      },
      {
        id: 'med_checagem_tripla',
        texto: 'A checagem tripla foi realizada (seleção, preparo e beira do leito)?',
        tipo: 'bool',
        bloco: 'medicacao',
        ajuda: 'Os 13 certos — COFEN.',
        frase: (v) =>
          sn(v)
            ? 'Checagem tripla realizada (seleção, preparo e beira do leito), conforme os 13 certos.'
            : 'Checagem tripla não confirmada nesta administração.',
      },
      {
        id: 'med_administrado',
        texto: 'O medicamento foi efetivamente administrado?',
        tipo: 'bool',
        bloco: 'medicacao',
        frase: (v) => (sn(v) ? 'Medicamento administrado.' : ''),
      },
      {
        id: 'med_nao_motivo',
        texto: 'Por que não foi administrado?',
        tipo: 'opcao',
        opcoes: [
          'Recusa do paciente',
          'Paciente em jejum',
          'Paciente ausente da unidade',
          'Medicamento indisponível na farmácia',
          'Suspenso pelo prescritor',
          'Sinal vital fora do parâmetro de administração',
        ],
        showIf: { med_administrado: false },
        bloco: 'medicacao',
        frase: (v) => `Medicamento não administrado — motivo: ${String(v).toLowerCase()}.`,
      },
      {
        id: 'med_reacao',
        texto: 'Houve reação adversa após a administração?',
        tipo: 'bool',
        showIf: { med_administrado: true },
        bloco: 'medicacao',
        frase: (v) => (sn(v) ? '' : 'Sem reação adversa observada após a administração.'),
      },
      {
        id: 'med_reacao_desc',
        texto: 'Qual a manifestação e a conduta adotada?',
        tipo: 'texto',
        showIf: { med_reacao: true },
        bloco: 'medicacao',
        frase: (v) => `Reação adversa observada: ${v}.`,
      },
    ],
    gate,
  );
}

// ── Bloco: intercorrência ────────────────────────────────────────────────────
// Bloco de roteamento: os tipos e o que registrar em cada um vêm dos tipos de
// documento já definidos em `document-types.ts` (queda, LPP, extubação, RAM,
// PCR). Não introduz conteúdo clínico novo — organiza o registro por tipo.

const TIPOS_INTERCORRENCIA = [
  'Queda',
  'Lesão por pressão identificada',
  'Extubação não programada',
  'Reação adversa a medicamento',
  'Parada cardiorrespiratória',
  'Outra',
];

export function blocoIntercorrencia(gate?: Condicao): Pergunta[] {
  return portao(
    [
      {
        id: 'int_tipo',
        texto: 'Qual foi a intercorrência?',
        tipo: 'opcao',
        opcoes: TIPOS_INTERCORRENCIA,
        bloco: 'intercorrencia',
        frase: (v) => `Intercorrência registrada: ${String(v).toLowerCase()}.`,
      },
      {
        id: 'int_horario',
        texto: 'Em que horário ocorreu?',
        tipo: 'texto',
        bloco: 'intercorrencia',
        ajuda: 'Formato HH:MM.',
        frase: (v) => `Horário da ocorrência: ${v}.`,
      },

      // Queda
      {
        id: 'int_queda_circunstancia',
        texto: 'Em que circunstância ocorreu a queda?',
        tipo: 'opcao',
        opcoes: [
          'Da própria altura, durante deambulação',
          'Do leito',
          'Da poltrona / cadeira',
          'No banheiro',
          'Durante transferência',
        ],
        showIf: { int_tipo: 'Queda' },
        bloco: 'intercorrencia',
        frase: (v) => `Circunstância: ${String(v).toLowerCase()}.`,
      },
      {
        id: 'int_queda_presenciada',
        texto: 'A queda foi presenciada?',
        tipo: 'bool',
        showIf: { int_tipo: 'Queda' },
        bloco: 'intercorrencia',
        frase: (v) => (sn(v) ? 'Queda presenciada.' : 'Queda não presenciada — encontrado após o evento.'),
      },
      {
        id: 'int_queda_dano',
        texto: 'Qual o dano identificado na avaliação imediata?',
        tipo: 'opcao',
        opcoes: [
          'Sem dano aparente',
          'Escoriação',
          'Hematoma',
          'Ferimento com sangramento',
          'Suspeita de fratura',
          'Trauma cranioencefálico',
        ],
        showIf: { int_tipo: 'Queda' },
        bloco: 'intercorrencia',
        frase: (v) =>
          v === 'Sem dano aparente'
            ? 'Avaliação imediata sem dano aparente.'
            : `Dano identificado: ${String(v).toLowerCase()}.`,
      },

      // Lesão por pressão
      {
        id: 'int_lpp_local',
        texto: 'Qual a localização da lesão por pressão?',
        tipo: 'texto',
        showIf: { int_tipo: 'Lesão por pressão identificada' },
        bloco: 'intercorrencia',
        frase: (v) => `Localização da lesão: ${v}.`,
      },
      {
        id: 'int_lpp_estagio',
        texto: 'Qual o estágio da lesão?',
        tipo: 'opcao',
        opcoes: ESTAGIOS_LPP,
        showIf: { int_tipo: 'Lesão por pressão identificada' },
        bloco: 'intercorrencia',
        ajuda: 'Classificação NPUAP/EPUAP/PPPIA (2016).',
        frase: (v) => `Estadiamento: ${v}.`,
      },

      // Extubação não programada
      {
        id: 'int_ext_reintubado',
        texto: 'Houve necessidade de reintubação?',
        tipo: 'bool',
        showIf: { int_tipo: 'Extubação não programada' },
        bloco: 'intercorrencia',
        frase: (v) => (sn(v) ? 'Paciente reintubado após o evento.' : 'Sem necessidade de reintubação.'),
      },
      {
        id: 'int_ext_saturacao',
        texto: 'Qual a SpO₂ imediatamente após o evento?',
        tipo: 'numero',
        min: 0,
        max: 100,
        unidade: '%',
        showIf: { int_tipo: 'Extubação não programada' },
        bloco: 'intercorrencia',
        frase: (v) => `SpO₂ imediatamente após o evento: ${fmtNumero(Number(v))}%.`,
      },

      // Reação adversa a medicamento
      {
        id: 'int_ram_farmaco',
        texto: 'Qual o medicamento envolvido?',
        tipo: 'texto',
        showIf: { int_tipo: 'Reação adversa a medicamento' },
        bloco: 'intercorrencia',
        frase: (v) => `Medicamento envolvido: ${v}.`,
      },
      {
        id: 'int_ram_manifestacao',
        texto: 'Quais as manifestações observadas?',
        tipo: 'texto',
        showIf: { int_tipo: 'Reação adversa a medicamento' },
        bloco: 'intercorrencia',
        ajuda: 'Ex.: rash cutâneo em tronco, prurido, dispneia.',
        frase: (v) => `Manifestações observadas: ${v}.`,
      },

      // Parada cardiorrespiratória
      {
        id: 'int_pcr_ritmo',
        texto: 'Qual o ritmo inicial identificado?',
        tipo: 'opcao',
        opcoes: [
          'Assistolia',
          'Atividade elétrica sem pulso (AESP)',
          'Fibrilação ventricular',
          'Taquicardia ventricular sem pulso',
        ],
        showIf: { int_tipo: 'Parada cardiorrespiratória' },
        bloco: 'intercorrencia',
        frase: (v) => `Ritmo inicial: ${v}.`,
      },
      {
        id: 'int_pcr_desfibrilacao',
        texto: 'Houve desfibrilação?',
        tipo: 'bool',
        showIf: { int_tipo: 'Parada cardiorrespiratória' },
        bloco: 'intercorrencia',
        frase: (v) => (sn(v) ? 'Realizada desfibrilação durante o atendimento.' : 'Sem desfibrilação — ritmo não chocável.'),
      },
      {
        id: 'int_pcr_desfecho',
        texto: 'Qual o desfecho do atendimento?',
        tipo: 'opcao',
        opcoes: ['Retorno à circulação espontânea', 'Óbito'],
        showIf: { int_tipo: 'Parada cardiorrespiratória' },
        bloco: 'intercorrencia',
        frase: (v) => `Desfecho: ${String(v).toLowerCase()}.`,
      },

      // Outra
      {
        id: 'int_outra_descricao',
        texto: 'Descreva o que ocorreu.',
        tipo: 'texto',
        showIf: { int_tipo: 'Outra' },
        bloco: 'intercorrencia',
        frase: (v) => `Descrição do evento: ${v}.`,
      },

      // Fechamento comum
      {
        id: 'int_comunicado_medico',
        texto: 'A equipe médica foi comunicada?',
        tipo: 'bool',
        bloco: 'intercorrencia',
        frase: (v) =>
          sn(v) ? 'Equipe médica comunicada.' : 'Equipe médica não comunicada até o momento do registro.',
      },
      {
        id: 'int_conduta',
        texto: 'Qual conduta foi adotada?',
        tipo: 'texto',
        bloco: 'intercorrencia',
        ajuda: 'Registre apenas o que já foi realizado.',
        frase: (v) => `Conduta adotada: ${v}.`,
      },
    ],
    gate,
  );
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const FONTE_COREN_ANOTACAO = 'Coren-SP. Anotações de Enfermagem (guia de registro).';
const FONTE_UFCSPA =
  'SOUZA, E. N.; VIÉGAS, K.; CAREGNATO, R. C. A. (orgs.). Manual de Cuidados de ' +
  'Enfermagem em Procedimentos de Intensivismo. UFCSPA, 2020, cap. 14.';
const FONTE_NPUAP =
  'NPUAP/EPUAP/PPPIA. Prevention and Treatment of Pressure Ulcers: Clinical Practice Guideline, 2016.';
const FONTE_POTTER = 'POTTER, P. A.; PERRY, A. G. Fundamentos de Enfermagem, cap. 48.';
const FONTE_PORTO = 'PORTO, C. C.; PORTO, A. L. Semiologia Médica — Anamnese e Exame Físico, cap. 20.';
const FONTE_ALDRETE =
  'SOBECC. Diretrizes de Práticas em Enfermagem Cirúrgica, 2022 (Índice de Aldrete e ' +
  'Kroulik modificado); COREN-SP, Parecer nº 017/2021.';
const FONTE_NEWS2 = 'Royal College of Physicians. National Early Warning Score (NEWS) 2, 2017.';
const FONTE_BRADEN = 'BERGSTROM, N. et al. The Braden Scale for Predicting Pressure Sore Risk, 1987.';
const FONTE_MORSE = 'MORSE, J. M. et al. Development of a scale to identify the fall-prone patient, 1989.';
const FONTE_RASS =
  'SESSLER, C. N. et al. Chest, 2002; ELY, E. W. et al. JAMA, 2003 (Richmond Agitation-Sedation Scale).';
const FONTE_GLASGOW = 'TEASDALE, G.; JENNETT, B. Assessment of coma and impaired consciousness, 1974.';
const FONTE_13_CERTOS = 'COFEN. Os 13 Certos na Administração de Medicamentos.';

export const schemaCurativo: Schema = {
  id: 'curativo',
  nome: 'Curativo',
  titulo: 'Anotação de Enfermagem — Curativo',
  fontes: [FONTE_PORTO, FONTE_POTTER, FONTE_NPUAP, FONTE_COREN_ANOTACAO],
  perguntas: blocoCurativo(),
};

export const schemaDor: Schema = {
  id: 'dor',
  nome: 'Dor',
  titulo: 'Anotação de Enfermagem — Avaliação de Dor',
  fontes: [FONTE_COREN_ANOTACAO],
  perguntas: blocoDor(),
};

export const schemaCateterHD: Schema = {
  id: 'cateterhd',
  nome: 'Cateter HD',
  titulo: 'Anotação de Enfermagem — Cateter de Hemodiálise',
  fontes: [FONTE_UFCSPA],
  perguntas: blocoCateterHD(),
};

export const schemaMedicacao: Schema = {
  id: 'medicacao',
  nome: 'Medicação',
  titulo: 'Anotação de Enfermagem — Administração de Medicamento',
  fontes: [FONTE_13_CERTOS],
  perguntas: blocoMedicacao(),
};

export const schemaIntercorrencia: Schema = {
  id: 'intercorrencia',
  nome: 'Intercorrência',
  titulo: 'Anotação de Enfermagem — Intercorrência',
  fontes: [FONTE_COREN_ANOTACAO, FONTE_NPUAP],
  perguntas: blocoIntercorrencia(),
};

/**
 * Evolução Geral — o schema adaptativo.
 *
 * Pergunta o setor primeiro; o núcleo universal vale para todos; os blocos de
 * dor e curativo entram por resposta do próprio núcleo; os blocos de setor
 * entram pela variável de contexto do plantão. É o mesmo mecanismo (`showIf`)
 * nos três casos — o motor não distingue "ramificação clínica" de "contexto".
 */
export const schemaEvolucaoGeral: Schema = {
  id: 'evolucaogeral',
  nome: 'Evolução',
  titulo: 'Evolução de Enfermagem',
  fontes: [
    FONTE_COREN_ANOTACAO,
    FONTE_PORTO,
    FONTE_POTTER,
    FONTE_NPUAP,
    FONTE_NEWS2,
    FONTE_BRADEN,
    FONTE_MORSE,
    FONTE_ALDRETE,
    FONTE_RASS,
    FONTE_GLASGOW,
    FONTE_UFCSPA,
  ],
  perguntas: [
    ...blocoContexto(),
    ...blocoNucleo(),
    ...blocoDor({ tem_dor: true }),
    ...blocoCurativo({ tem_curativo: true }),
    ...blocoClinicaMedica({ setor: SETOR_CLINICA_MEDICA }),
    ...blocoPosOperatorio({ setor: SETOR_CENTRO_CIRURGICO }),
    ...blocoUTI({ setor: SETOR_UTI }),
    ...blocoCateterHD({ setor: SETOR_NEFROLOGIA }),
  ],
};

export const SCHEMAS_ADAPTATIVOS: Schema[] = [
  schemaEvolucaoGeral,
  schemaCurativo,
  schemaDor,
  schemaMedicacao,
  schemaIntercorrencia,
  schemaCateterHD,
];

export function getSchemaAdaptativo(id: string): Schema | undefined {
  return SCHEMAS_ADAPTATIVOS.find((s) => s.id === id);
}
