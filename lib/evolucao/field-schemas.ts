export type FieldType = 'text' | 'textarea' | 'select' | 'number' | 'date' | 'time' | 'chips';

export interface SelectOption {
  value: string;
  label: string;
}

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  unit?: string;
  options?: SelectOption[];
  min?: number;
  max?: number;
}

export interface FieldSchema {
  tipoId: string;
  campos: FormField[];
}

const CONDICAO_GERAL: SelectOption[] = [
  { value: 'bom', label: 'Bom' },
  { value: 'regular', label: 'Regular' },
  { value: 'grave', label: 'Grave' },
  { value: 'critico', label: 'Crítico' },
];

const VIA_AEREA: SelectOption[] = [
  { value: 'via_natural', label: 'Via aérea natural' },
  { value: 'mascara_o2', label: 'Máscara de O₂' },
  { value: 'cateter_nasal', label: 'Cateter nasal' },
  { value: 'vni', label: 'VNI (CPAP/BiPAP)' },
  { value: 'intubado', label: 'IOT / Ventilação mecânica' },
  { value: 'traqueostomia', label: 'Traqueostomia' },
];

const SIM_NAO: SelectOption[] = [
  { value: 'sim', label: 'Sim' },
  { value: 'nao', label: 'Não' },
];

const PUPILAS: SelectOption[] = [
  { value: 'isocoricas_fotorreagentes', label: 'Isocóricas e fotorreagentes' },
  { value: 'isocoricas_pouco_reativas', label: 'Isocóricas, pouco reativas' },
  { value: 'anisocoricas', label: 'Anisocóricas' },
  { value: 'miose', label: 'Miose bilateral' },
  { value: 'midriase', label: 'Midríase bilateral' },
];

export const FIELD_SCHEMAS: FieldSchema[] = [
  // ── 1. Admissão Hospitalar ────────────────────────────────────────────────
  {
    tipoId: 'admissao_hospitalar',
    campos: [
      { id: 'data_admissao', label: 'Data da admissão', type: 'date', required: true },
      { id: 'hora_admissao', label: 'Hora da admissão', type: 'time', required: true },
      { id: 'leito', label: 'Leito / setor', type: 'text', required: true, placeholder: 'ex: Leito 5 — Enfermaria B' },
      { id: 'motivo_internacao', label: 'Motivo da internação', type: 'textarea', required: true, placeholder: 'Queixa principal e motivo do encaminhamento' },
      { id: 'condicao_geral', label: 'Condição geral na admissão', type: 'select', required: true, options: CONDICAO_GERAL },
      { id: 'sinais_vitais', label: 'Sinais vitais', type: 'text', required: true, placeholder: 'PA: / FC: / FR: / T: / SpO₂: %', hint: 'Registre todos os parâmetros mensurados na admissão' },
      { id: 'nivel_consciencia', label: 'Nível de consciência', type: 'text', placeholder: 'ex: Consciente, orientado em tempo e espaço' },
      { id: 'queixas', label: 'Queixas referidas', type: 'textarea', placeholder: 'Dor, dispneia, náuseas, etc.' },
      { id: 'historico_saude', label: 'Histórico de saúde', type: 'textarea', placeholder: 'Comorbidades, cirurgias prévias, internações anteriores' },
      { id: 'alergias', label: 'Alergias conhecidas', type: 'text', placeholder: 'Medicamentos, alimentos, látex ou NCDA' },
      { id: 'medicacoes_em_uso', label: 'Medicações em uso domiciliar', type: 'textarea', placeholder: 'Nome, dose e frequência' },
      { id: 'via_aerea', label: 'Via aérea', type: 'select', options: VIA_AEREA },
      { id: 'acesso_venoso', label: 'Acesso venoso', type: 'text', placeholder: 'Local, calibre e tipo do acesso' },
      { id: 'exames_admissionais', label: 'Exames solicitados / resultados', type: 'textarea', placeholder: 'Laboratoriais, imagem, ECG' },
      { id: 'conduta_enfermagem', label: 'Conduta / plano de cuidados', type: 'textarea', required: true, placeholder: 'Intervenções de enfermagem iniciadas na admissão' },
    ],
  },

  // ── 2. Admissão UTI ───────────────────────────────────────────────────────
  {
    tipoId: 'admissao_uti',
    campos: [
      { id: 'data_admissao', label: 'Data da admissão', type: 'date', required: true },
      { id: 'hora_admissao', label: 'Hora da admissão', type: 'time', required: true },
      { id: 'leito', label: 'Leito UTI', type: 'text', required: true, placeholder: 'ex: UTI Box 3' },
      { id: 'motivo_admissao', label: 'Motivo da admissão na UTI', type: 'textarea', required: true, placeholder: 'Diagnóstico e indicação de UTI' },
      { id: 'glasgow', label: 'Escala de Glasgow', type: 'number', required: true, min: 3, max: 15, unit: 'pts' },
      { id: 'pupilas', label: 'Pupilas', type: 'select', required: true, options: PUPILAS },
      { id: 'via_aerea', label: 'Via aérea', type: 'select', required: true, options: VIA_AEREA },
      { id: 'vm_parametros', label: 'Parâmetros ventilatórios', type: 'text', placeholder: 'FiO₂: / PEEP: / VC: / FR prog: / Modo:' },
      { id: 'sinais_vitais', label: 'Sinais vitais', type: 'text', required: true, placeholder: 'PA: / FC: / FR: / T: / SpO₂: %' },
      { id: 'drogas_vasoativas', label: 'Drogas vasoativas', type: 'text', placeholder: 'Nome e dose em mcg/kg/min ou mL/h' },
      { id: 'acesso_venoso', label: 'Acessos vasculares', type: 'text', placeholder: 'CVC, PAI, AVP — sítio e calibre' },
      { id: 'balanco_hidrico', label: 'Balanço hídrico (admissão)', type: 'text', placeholder: 'Entrada: mL / Saída: mL / BH: mL' },
      { id: 'medicacoes_em_curso', label: 'Medicações em curso', type: 'textarea', placeholder: 'Sedação, antibióticos, outras infusões' },
      { id: 'exames', label: 'Exames coletados / solicitados', type: 'textarea', placeholder: 'Laboratoriais, gasometria, imagem' },
      { id: 'conduta_enfermagem', label: 'Conduta de enfermagem', type: 'textarea', required: true, placeholder: 'Medidas imediatas e plano de cuidados críticos' },
    ],
  },

  // ── 3. Evolução de Plantão ────────────────────────────────────────────────
  {
    tipoId: 'evolucao_plantao',
    campos: [
      { id: 'data', label: 'Data', type: 'date', required: true },
      { id: 'hora_inicio', label: 'Hora início', type: 'time', required: true },
      { id: 'hora_fim', label: 'Hora fim', type: 'time', required: true },
      { id: 'leito', label: 'Leito / setor', type: 'text', required: true },
      { id: 'condicao_geral', label: 'Condição geral', type: 'select', required: true, options: CONDICAO_GERAL },
      { id: 'sinais_vitais', label: 'Sinais vitais (plantão)', type: 'text', required: true, placeholder: 'PA: / FC: / FR: / T: / SpO₂: %' },
      { id: 'nivel_consciencia', label: 'Avaliação neurológica', type: 'text', placeholder: 'Consciência, orientação, Glasgow' },
      { id: 'avaliacao_respiratoria', label: 'Avaliação respiratória', type: 'text', placeholder: 'Padrão, ausculta, O₂ em uso' },
      { id: 'avaliacao_cardiovascular', label: 'Avaliação cardiovascular', type: 'text', placeholder: 'Ritmo, perfusão, edemas' },
      { id: 'avaliacao_digestiva', label: 'Avaliação gastrointestinal', type: 'text', placeholder: 'Abdome, dieta, evacuações, SVD' },
      { id: 'pele', label: 'Pele e integridade', type: 'text', placeholder: 'Lesões, edemas, coloração' },
      { id: 'procedimentos', label: 'Procedimentos realizados', type: 'textarea', placeholder: 'Curativos, sondagens, punções, etc.' },
      { id: 'medicacoes', label: 'Medicações administradas', type: 'textarea', placeholder: 'Antibióticos, analgésicos, etc.' },
      { id: 'intercorrencias', label: 'Intercorrências', type: 'textarea', placeholder: 'Relatar se houve alguma ocorrência no plantão' },
      { id: 'pendencias', label: 'Pendências para próximo plantão', type: 'textarea', placeholder: 'Exames, retornos, avaliações solicitadas' },
    ],
  },

  // ── 4. Evolução UTI ───────────────────────────────────────────────────────
  {
    tipoId: 'evolucao_uti',
    campos: [
      { id: 'data', label: 'Data', type: 'date', required: true },
      { id: 'hora_inicio', label: 'Hora início', type: 'time', required: true },
      { id: 'hora_fim', label: 'Hora fim', type: 'time', required: true },
      { id: 'leito', label: 'Leito UTI', type: 'text', required: true },
      { id: 'glasgow', label: 'Glasgow', type: 'number', required: true, min: 3, max: 15, unit: 'pts' },
      { id: 'pupilas', label: 'Pupilas', type: 'select', required: true, options: PUPILAS },
      { id: 'via_aerea', label: 'Via aérea', type: 'select', required: true, options: VIA_AEREA },
      { id: 'vm_parametros', label: 'Parâmetros ventilatórios', type: 'text', placeholder: 'FiO₂: / PEEP: / VC: / FR: / Modo: / SpO₂:' },
      { id: 'sinais_vitais', label: 'Sinais vitais', type: 'text', required: true, placeholder: 'PA: / FC: / FR: / T: / SpO₂: %' },
      { id: 'drogas_vasoativas', label: 'Drogas vasoativas', type: 'text', placeholder: 'Nome, dose e titulação' },
      { id: 'balanco_hidrico_24h', label: 'Balanço hídrico 24h', type: 'text', placeholder: 'Entrada: / Saída: / BH 24h:' },
      { id: 'avaliacao_sistemas', label: 'Avaliação por sistemas', type: 'textarea', required: true, placeholder: 'Neuro / Resp / Cardio / Renal / GI / Pele' },
      { id: 'exames_24h', label: 'Exames últimas 24h', type: 'textarea', placeholder: 'Laboratoriais, imagem, gasometria' },
      { id: 'sedoanalgesia', label: 'Sedoanalgesia', type: 'text', placeholder: 'Drogas, dose, RASS alvo e atual' },
      { id: 'procedimentos', label: 'Procedimentos realizados', type: 'textarea', placeholder: 'Curativos, coletas, posicionamento' },
      { id: 'intercorrencias', label: 'Intercorrências', type: 'textarea' },
      { id: 'conduta_enfermagem', label: 'Conduta / continuidade', type: 'textarea', required: true },
    ],
  },

  // ── 5. Alta Hospitalar ────────────────────────────────────────────────────
  {
    tipoId: 'alta_hospitalar',
    campos: [
      { id: 'data_alta', label: 'Data da alta', type: 'date', required: true },
      { id: 'hora_alta', label: 'Hora da alta', type: 'time', required: true },
      { id: 'leito', label: 'Leito / setor', type: 'text', required: true },
      {
        id: 'condicao_saida',
        label: 'Condição de saída',
        type: 'select',
        required: true,
        options: [
          { value: 'melhorado', label: 'Melhorado' },
          { value: 'curado', label: 'Curado' },
          { value: 'inalterado', label: 'Inalterado' },
          { value: 'a_pedido', label: 'A pedido' },
          { value: 'transferido', label: 'Transferido' },
          { value: 'obito', label: 'Óbito' },
        ],
      },
      { id: 'motivo_internacao', label: 'Motivo da internação', type: 'text', required: true, placeholder: 'Diagnóstico principal' },
      { id: 'evolucao_internacao', label: 'Resumo da evolução', type: 'textarea', required: true, placeholder: 'Principais eventos, procedimentos e resposta ao tratamento' },
      { id: 'condicao_alta', label: 'Condição na alta', type: 'textarea', placeholder: 'Estado geral, sinais vitais, mobilidade, autonomia' },
      { id: 'orientacoes_alta', label: 'Orientações de alta', type: 'textarea', required: true, placeholder: 'Cuidados domiciliares, sinais de alerta, restrições' },
      { id: 'medicacoes_alta', label: 'Medicações na alta', type: 'textarea', placeholder: 'Nome, dose, frequência e via' },
      { id: 'retorno', label: 'Retorno / encaminhamento', type: 'text', placeholder: 'Local, data prevista e especialidade' },
      { id: 'acompanhante', label: 'Acompanhante na alta', type: 'text', placeholder: 'Nome e relação com o paciente' },
    ],
  },

  // ── 6. Transferência Interna ──────────────────────────────────────────────
  {
    tipoId: 'transferencia_interna',
    campos: [
      { id: 'data_transferencia', label: 'Data', type: 'date', required: true },
      { id: 'hora_transferencia', label: 'Hora', type: 'time', required: true },
      { id: 'leito_origem', label: 'Leito de origem', type: 'text', required: true, placeholder: 'ex: UTI Box 2' },
      { id: 'leito_destino', label: 'Leito de destino', type: 'text', required: true, placeholder: 'ex: Enf. B — Leito 8' },
      {
        id: 'motivo_transferencia',
        label: 'Motivo da transferência',
        type: 'select',
        required: true,
        options: [
          { value: 'melhora_clinica', label: 'Melhora clínica' },
          { value: 'piora_clinica', label: 'Piora clínica' },
          { value: 'disponibilidade_leito', label: 'Disponibilidade de leito' },
          { value: 'necessidade_procedimento', label: 'Necessidade de procedimento' },
          { value: 'pedido_familiar', label: 'Pedido familiar / médico' },
        ],
      },
      { id: 'condicao_geral', label: 'Condição na transferência', type: 'select', required: true, options: CONDICAO_GERAL },
      { id: 'sinais_vitais', label: 'Sinais vitais', type: 'text', required: true, placeholder: 'PA: / FC: / FR: / T: / SpO₂: %' },
      { id: 'via_aerea', label: 'Via aérea', type: 'select', options: VIA_AEREA },
      { id: 'acessos', label: 'Acessos vasculares', type: 'text', placeholder: 'Tipo e sítio dos acessos' },
      { id: 'infusoes_em_curso', label: 'Infusões em curso', type: 'textarea', placeholder: 'Medicamentos em infusão contínua' },
      { id: 'pendencias', label: 'Pendências transferidas', type: 'textarea', required: true, placeholder: 'Exames, condutas, observações para o setor receptor' },
      { id: 'responsavel_recepcao', label: 'Profissional que recebeu', type: 'text', placeholder: 'Nome e categoria do profissional do setor destino' },
    ],
  },

  // ── 7. Óbito ──────────────────────────────────────────────────────────────
  {
    tipoId: 'obito',
    campos: [
      { id: 'data_obito', label: 'Data do óbito', type: 'date', required: true },
      { id: 'hora_obito', label: 'Hora do óbito', type: 'time', required: true },
      { id: 'leito', label: 'Leito / setor', type: 'text', required: true },
      { id: 'medico_responsavel', label: 'Médico que constato/declarou', type: 'text', required: true, placeholder: 'Nome e CRM' },
      { id: 'causa_presumida', label: 'Causa presumida do óbito', type: 'textarea', required: true },
      {
        id: 'sinais_constatados',
        label: 'Sinais de óbito constatados',
        type: 'chips',
        required: true,
        options: [
          { value: 'ausencia_batimentos', label: 'Ausência de batimentos cardíacos' },
          { value: 'ausencia_respiracao', label: 'Ausência de movimentos respiratórios' },
          { value: 'pupilas_midriase', label: 'Pupilas em midríase fixa' },
          { value: 'ausencia_pulso', label: 'Ausência de pulso' },
          { value: 'ausencia_reflexos', label: 'Ausência de reflexos' },
        ],
      },
      { id: 'familia_notificada', label: 'Família notificada', type: 'select', required: true, options: SIM_NAO },
      { id: 'hora_notificacao', label: 'Hora da notificação familiar', type: 'time' },
      { id: 'providencias', label: 'Providências tomadas', type: 'textarea', required: true, placeholder: 'Preparo do corpo, retirada de cateteres, papelada, setor funerário' },
      { id: 'observacoes', label: 'Observações', type: 'textarea' },
    ],
  },

  // ── 8. Hemodiálise ────────────────────────────────────────────────────────
  {
    tipoId: 'evolucao_hemodialise',
    campos: [
      { id: 'data', label: 'Data da sessão', type: 'date', required: true },
      { id: 'hora_inicio', label: 'Hora início', type: 'time', required: true },
      { id: 'hora_fim', label: 'Hora fim', type: 'time', required: true },
      { id: 'leito', label: 'Leito / local', type: 'text', required: true },
      {
        id: 'tipo_acesso',
        label: 'Tipo de acesso',
        type: 'select',
        required: true,
        options: [
          { value: 'cateter_femoral', label: 'Cateter femoral' },
          { value: 'cateter_jugular', label: 'Cateter jugular' },
          { value: 'cateter_subclavio', label: 'Cateter subclávio' },
          { value: 'fistula_av', label: 'Fístula arteriovenosa' },
          { value: 'enxerto', label: 'Enxerto vascular' },
        ],
      },
      {
        id: 'condicao_acesso',
        label: 'Condição do acesso',
        type: 'select',
        required: true,
        options: [
          { value: 'otimo', label: 'Ótimo' },
          { value: 'bom', label: 'Bom' },
          { value: 'regular', label: 'Regular' },
          { value: 'ruim', label: 'Ruim — comunicado ao médico' },
        ],
      },
      { id: 'maquina', label: 'Máquina / número', type: 'text', placeholder: 'ex: HD-03' },
      { id: 'parametros', label: 'Parâmetros prescritos', type: 'text', required: true, placeholder: 'Tempo: h / Fluxo: mL/min / Anticoag: / UF alvo: L' },
      { id: 'sinais_vitais_pre', label: 'Sinais vitais pré-sessão', type: 'text', required: true, placeholder: 'PA: / FC: / Peso: kg' },
      { id: 'sinais_vitais_pos', label: 'Sinais vitais pós-sessão', type: 'text', required: true, placeholder: 'PA: / FC: / Peso: kg' },
      { id: 'intercorrencias', label: 'Intercorrências durante sessão', type: 'textarea', placeholder: 'Hipotensão, cãibras, reações, alarmes' },
      { id: 'volume_uf', label: 'Volume ultrafiltrado total', type: 'text', required: true, unit: 'L / mL', placeholder: 'ex: 2,1 L' },
      { id: 'balanco', label: 'Balanço da sessão', type: 'text', placeholder: 'Entrada: / Saída: / Saldo:' },
      {
        id: 'condicao_final',
        label: 'Condição ao final da sessão',
        type: 'select',
        required: true,
        options: CONDICAO_GERAL,
      },
      { id: 'observacoes', label: 'Observações', type: 'textarea' },
    ],
  },
];

export function getFieldSchema(tipoId: string): FieldSchema | undefined {
  return FIELD_SCHEMAS.find((s) => s.tipoId === tipoId);
}

export function hasSchema(tipoId: string): boolean {
  return FIELD_SCHEMAS.some((s) => s.tipoId === tipoId);
}
