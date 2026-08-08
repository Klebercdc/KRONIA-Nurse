/**
 * Registro único dos campos clínicos que NÃO puderam ser fundamentados e que
 * aguardam validação com fonte clínica formal.
 *
 * Por que este arquivo existe: já houve caso de marcador (CONFERIR) se perder
 * silenciosamente e chegar em produção. A regra aqui é simples —
 *
 *   um campo clínico só vira campo ativo em FIELD_SCHEMAS depois de ter
 *   procedência declarada. Enquanto não tiver, ele mora AQUI e em nenhum
 *   outro lugar.
 *
 * O teste em lib/__tests__/campos-a-conferir.test.ts falha se um item deste
 * registro aparecer como campo ativo sem ter sido liberado. O marcador não
 * some sem quebrar o CI.
 *
 * Procedência possível de um campo clínico, em ordem de preferência:
 *   1. 'kronos'  — corpus ingerido (COFEN/COREN/ANVISA/MS/NANDA-I)
 *   2. 'escala'  — escala padronizada amplamente conhecida (conhecimento
 *                  geral, NÃO KRONOS — precisa ser declarado como tal)
 *   3. 'conferir'— prática institucional ou faixa de referência não coberta
 *                  pelas duas anteriores. NUNCA inventar: entra aqui.
 */

export type Procedencia = 'kronos' | 'escala' | 'conferir';

export interface CampoAConferir {
  /** Rótulo do campo como apareceria no formulário. */
  campo: string;
  /** Setor ou tipo de registro a que pertence. */
  setor: string;
  /** Por que não foi possível fundamentar. */
  motivo: string;
  /**
   * Liberado pelo enfermeiro responsável, com a fonte que ele validou.
   * Enquanto for null, o campo NÃO pode virar campo ativo.
   */
  liberadoCom: string | null;
}

export const CAMPOS_A_CONFERIR: readonly CampoAConferir[] = [
  // ── Avaliação de Ferida/Ostomia ─────────────────────────────────────────
  // O tipo foi implementado; estes dois campos ficaram de fora dele.
  {
    campo: 'Pele perilesional',
    setor: 'Avaliação de Ferida/Ostomia',
    motivo:
      'Os descritores (íntegra / macerada / hiperemiada / descamativa) variam por protocolo institucional. O corpus KRONOS não padroniza a lista.',
    liberadoCom: null,
  },
  {
    campo: 'Tipo de estoma',
    setor: 'Avaliação de Ferida/Ostomia',
    motivo:
      'COFEN §9.21 exige registrar "Tipo", mas o fragmento correspondente está truncado no corpus e não enumera as opções.',
    liberadoCom: null,
  },

  // ── Faixas de referência: resolvidas por desenho, não pendentes ──────────
  // Pediatria e UTI Neonatal foram implementadas SEM faixa de referência
  // embutida, e isso não é uma pendência — é a mesma regra que vale para todo
  // o projeto. Faixa de referência transforma número em rótulo clínico, que é
  // o que as travas do produto proíbem ("38,7°C não pode virar hipertermia").
  // Em todo o field-schemas, min/max só aparece como limite da própria escala
  // (Glasgow 3–15, dor 0–10), nunca como "valor normal".
  //
  // Consequência: o campo captura o valor aferido e quem interpreta é o
  // enfermeiro. Se um dia o produto for classificar valor por idade, isso é
  // decisão clínica nova — e aí precisa de fonte primária, que hoje não existe
  // no corpus KRONOS nem foi possível obter fora dele.

  // ── Setores ainda não implementados ─────────────────────────────────────
  {
    campo: 'Faixa normal de BCF',
    setor: 'Gestante / Centro de Parto Normal',
    motivo: 'Nenhuma fonte obstétrica no corpus KRONOS.',
    liberadoCom: null,
  },
  {
    campo: 'Fase do trabalho de parto',
    setor: 'Centro de Parto Normal',
    motivo: 'A nomenclatura das fases varia por protocolo institucional.',
    liberadoCom: null,
  },
  {
    campo: 'Loquiação — descritores',
    setor: 'Puerpério',
    motivo: 'Sem fonte no corpus KRONOS; descritores variam por protocolo.',
    liberadoCom: null,
  },
  {
    campo: 'Involução uterina — descritores',
    setor: 'Puerpério',
    motivo: 'Sem fonte no corpus KRONOS; descritores variam por protocolo.',
    liberadoCom: null,
  },
];

/** Itens ainda pendentes de validação clínica. */
export function pendentes(): CampoAConferir[] {
  return CAMPOS_A_CONFERIR.filter((c) => c.liberadoCom === null);
}

/** Resumo legível — serve para log de build e para revisão rápida. */
export function resumoPendencias(): string {
  const lista = pendentes();
  if (lista.length === 0) return 'Nenhum campo pendente de validação clínica.';
  return [
    `${lista.length} campo(s) aguardando validação clínica:`,
    ...lista.map((c) => `  - [${c.setor}] ${c.campo}`),
  ].join('\n');
}
