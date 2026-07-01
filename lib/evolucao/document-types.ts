export type DocGroup =
  | 'admissao'
  | 'evolucao'
  | 'alta'
  | 'transferencia'
  | 'procedimento'
  | 'intercorrencia'
  | 'especifico';

export const GROUP_LABEL: Record<DocGroup, string> = {
  admissao: 'Admissão',
  evolucao: 'Evolução',
  alta: 'Alta',
  transferencia: 'Transferência',
  procedimento: 'Procedimentos',
  intercorrencia: 'Intercorrências',
  especifico: 'Específicos',
};

export interface DocType {
  id: string;
  nome: string;
  grupo: DocGroup;
  contexto: string;
}

export const DOC_TYPES: DocType[] = [
  // ── Admissão ──────────────────────────────────────────────────────────────
  {
    id: 'admissao_hospitalar',
    nome: 'Admissão Hospitalar',
    grupo: 'admissao',
    contexto: 'Registro de admissão em enfermaria hospitalar geral, contendo anamnese de enfermagem, avaliação inicial e plano de cuidados.',
  },
  {
    id: 'admissao_uti',
    nome: 'Admissão UTI',
    grupo: 'admissao',
    contexto: 'Admissão em Unidade de Terapia Intensiva com avaliação completa de sistemas, suporte ventilatório e hemodinâmico.',
  },
  {
    id: 'admissao_semi_intensiva',
    nome: 'Admissão Semi-Intensiva',
    grupo: 'admissao',
    contexto: 'Admissão em unidade semi-intensiva com monitorização contínua e avaliação de instabilidade clínica moderada.',
  },
  {
    id: 'admissao_pronto_socorro',
    nome: 'Admissão Pronto-Socorro',
    grupo: 'admissao',
    contexto: 'Acolhimento e classificação de risco em pronto-socorro com avaliação inicial de urgência/emergência.',
  },

  // ── Evolução ──────────────────────────────────────────────────────────────
  {
    id: 'evolucao_plantao',
    nome: 'Evolução de Plantão',
    grupo: 'evolucao',
    contexto: 'Evolução de enfermagem de plantão (12h) com avaliação por sistemas, procedimentos realizados e pendências.',
  },
  {
    id: 'evolucao_uti',
    nome: 'Evolução UTI',
    grupo: 'evolucao',
    contexto: 'Evolução de enfermagem em UTI com balanço hídrico, parâmetros ventilatórios, drogas vasoativas e avaliação neurológica.',
  },
  {
    id: 'evolucao_semi_intensiva',
    nome: 'Evolução Semi-Intensiva',
    grupo: 'evolucao',
    contexto: 'Evolução de enfermagem em unidade semi-intensiva com monitorização de parâmetros clínicos e resposta ao tratamento.',
  },
  {
    id: 'evolucao_pediatrica',
    nome: 'Evolução Pediátrica',
    grupo: 'evolucao',
    contexto: 'Evolução de enfermagem pediátrica com avaliação do desenvolvimento, padrão alimentar, e aspectos específicos da faixa etária.',
  },
  {
    id: 'evolucao_neonatal',
    nome: 'Evolução Neonatal',
    grupo: 'evolucao',
    contexto: 'Evolução de enfermagem neonatal com avaliação do recém-nascido, termorregulação, alimentação enteral e monitorização.',
  },
  {
    id: 'evolucao_hemodialise',
    nome: 'Evolução Hemodiálise',
    grupo: 'evolucao',
    contexto: 'Registro de sessão de hemodiálise com parâmetros de máquina, intercorrências, ultrafiltração e condição clínica.',
  },
  {
    id: 'evolucao_oncologia',
    nome: 'Evolução Oncologia',
    grupo: 'evolucao',
    contexto: 'Evolução de enfermagem oncológica com monitorização de toxicidades, manejo de sintomas e suporte psicoespiritual.',
  },

  // ── Alta ──────────────────────────────────────────────────────────────────
  {
    id: 'alta_hospitalar',
    nome: 'Alta Hospitalar',
    grupo: 'alta',
    contexto: 'Registro de alta hospitalar com sumário de internação, orientações ao paciente/familiar e encaminhamentos.',
  },
  {
    id: 'alta_uti',
    nome: 'Alta da UTI',
    grupo: 'alta',
    contexto: 'Registro de alta de UTI com condição clínica estabilizada, critérios de alta e passagem de caso.',
  },
  {
    id: 'alta_semi_intensiva',
    nome: 'Alta Semi-Intensiva',
    grupo: 'alta',
    contexto: 'Registro de alta de unidade semi-intensiva com avaliação de estabilidade e encaminhamento para enfermaria.',
  },
  {
    id: 'alta_a_pedido',
    nome: 'Alta a Pedido',
    grupo: 'alta',
    contexto: 'Registro de alta hospitalar a pedido do paciente ou responsável, com ciência dos riscos e orientações de segurança.',
  },

  // ── Transferência ─────────────────────────────────────────────────────────
  {
    id: 'transferencia_interna',
    nome: 'Transferência Interna',
    grupo: 'transferencia',
    contexto: 'Transferência entre setores do mesmo hospital com passagem de informações clínicas e pendências assistenciais.',
  },
  {
    id: 'transferencia_externa',
    nome: 'Transferência Externa',
    grupo: 'transferencia',
    contexto: 'Transferência para outro serviço de saúde (SAMU, UTI móvel) com sumário clínico e justificativa da transferência.',
  },
  {
    id: 'transferencia_uti_enfermaria',
    nome: 'Alta UTI → Enfermaria',
    grupo: 'transferencia',
    contexto: 'Transferência de paciente de UTI para enfermaria com critérios de estabilidade, continuidade de cuidados e orientações.',
  },

  // ── Procedimentos ─────────────────────────────────────────────────────────
  {
    id: 'cateter_venoso_central',
    nome: 'Inserção de CVC',
    grupo: 'procedimento',
    contexto: 'Registro de inserção de cateter venoso central com técnica asséptica, local de inserção, posicionamento e confirmação.',
  },
  {
    id: 'cateter_urinario',
    nome: 'Sondagem Vesical',
    grupo: 'procedimento',
    contexto: 'Registro de sondagem vesical de demora com indicação, calibre, volume drenado e cuidados com o dispositivo.',
  },
  {
    id: 'sonda_nasogastrica',
    nome: 'Inserção SNE/SNG',
    grupo: 'procedimento',
    contexto: 'Registro de inserção de sonda nasoenteral ou nasogástrica com confirmação de posicionamento e fixação.',
  },
  {
    id: 'traqueostomia_cuidados',
    nome: 'Cuidados com Traqueostomia',
    grupo: 'procedimento',
    contexto: 'Registro de troca de cânula de traqueostomia ou cuidados de manutenção com condições locais e perviabilidade.',
  },
  {
    id: 'acesso_venoso_periferico',
    nome: 'Acesso Venoso Periférico',
    grupo: 'procedimento',
    contexto: 'Registro de punção venosa periférica com local de acesso, calibre do cateter e avaliação do sítio.',
  },
  {
    id: 'curativo_complexo',
    nome: 'Curativo Complexo',
    grupo: 'procedimento',
    contexto: 'Registro de curativo em lesão complexa com avaliação da ferida, produto utilizado e resposta tissular.',
  },

  // ── Intercorrências ───────────────────────────────────────────────────────
  {
    id: 'intercorrencia_queda',
    nome: 'Notificação de Queda',
    grupo: 'intercorrencia',
    contexto: 'Registro de ocorrência de queda hospitalar com circunstâncias, avaliação de danos e medidas imediatas adotadas.',
  },
  {
    id: 'intercorrencia_lpp',
    nome: 'Lesão por Pressão (LPP)',
    grupo: 'intercorrencia',
    contexto: 'Registro de identificação ou evolução de lesão por pressão com estadiamento, localização e plano de cuidados.',
  },
  {
    id: 'intercorrencia_extubacao',
    nome: 'Extubação Acidental',
    grupo: 'intercorrencia',
    contexto: 'Registro de extubação não programada com circunstâncias, condição respiratória pós-evento e conduta imediata.',
  },
  {
    id: 'intercorrencia_ram',
    nome: 'Reação Adversa a Medicamento',
    grupo: 'intercorrencia',
    contexto: 'Notificação de reação adversa a medicamento com identificação do fármaco, manifestações clínicas e conduta.',
  },
  {
    id: 'intercorrencia_pcr',
    nome: 'PCR / Ressuscitação',
    grupo: 'intercorrencia',
    contexto: 'Registro de parada cardiorrespiratória com ritmo inicial, manobras realizadas, desfibrilações e desfecho.',
  },

  // ── Específicos ───────────────────────────────────────────────────────────
  {
    id: 'obito',
    nome: 'Registro de Óbito',
    grupo: 'especifico',
    contexto: 'Registro de óbito com constatação de sinais, notificação da família, providências administrativas e conduta post-mortem.',
  },
  {
    id: 'obito_fetal',
    nome: 'Óbito Fetal',
    grupo: 'especifico',
    contexto: 'Registro de óbito fetal com circunstâncias, suporte à família e providências obstétricas e administrativas.',
  },
  {
    id: 'avaliacao_dor',
    nome: 'Avaliação de Dor',
    grupo: 'especifico',
    contexto: 'Avaliação sistematizada da dor com escala numérica/comportamental, localização, qualidade e resposta a intervenções.',
  },
  {
    id: 'escala_braden',
    nome: 'Avaliação Braden / LPP',
    grupo: 'especifico',
    contexto: 'Aplicação da Escala de Braden com pontuação por subescalas e plano preventivo para lesão por pressão.',
  },
  {
    id: 'sae_sistematizacao',
    nome: 'SAE — Sistematização',
    grupo: 'especifico',
    contexto: 'Sistematização da Assistência de Enfermagem (SAE) conforme COFEN com diagnóstico, planejamento e avaliação.',
  },
  {
    id: 'contra_referencia',
    nome: 'Contra-referência / Resumo',
    grupo: 'especifico',
    contexto: 'Documento de contra-referência para UBS/APS com resumo da internação, condição de alta e recomendações de continuidade.',
  },
];

export function getDocType(id: string): DocType | undefined {
  return DOC_TYPES.find((d) => d.id === id);
}

export function getDocsByGroup(): Map<DocGroup, DocType[]> {
  const map = new Map<DocGroup, DocType[]>();
  for (const doc of DOC_TYPES) {
    const arr = map.get(doc.grupo) ?? [];
    arr.push(doc);
    map.set(doc.grupo, arr);
  }
  return map;
}
