/**
 * Tipos canônicos para o sistema de Biblioteca Técnica (Knowledge System).
 * Toda Knowledge Specification segue exatamente esta estrutura.
 * Nenhum campo pode ser removido sem revisão da Constitution.
 */

export type KnowledgeSpecStatus =
  | 'rascunho'
  | 'em_auditoria'
  | 'aguardando_aprovacao'
  | 'aprovado'
  | 'reprovado'
  | 'arquivado';

export type DominioProximidade = 'proximo' | 'intermediario' | 'distante';
export type NivelRisco = 'baixo' | 'moderado' | 'alto';
export type NivelVariabilidade = 'nenhuma' | 'moderada' | 'elevada';
export type ClassificacaoPipeline = 'verde' | 'amarelo' | 'vermelho';

/**
 * Tipo de Objeto de Conhecimento. "procedimento" cobre Procedimentos,
 * Protocolos e POPs (campos indicacoes..variacoes_institucionais abaixo).
 * Outros tipos guardam seus campos próprios em `campos_especificos` — ver
 * context/kits/knowledge-engine-tipos-objeto.md.
 */
export type TipoConhecimento = 'procedimento' | 'diagnostico_enfermagem';

/** Taxonomia de diagnóstico de enfermagem — NANDA-I é o primeiro tipo implementado. */
export type TaxonomiaDiagnostico = 'NANDA-I' | 'CIPE';

/** Campos próprios de um Diagnóstico de Enfermagem (tipo = 'diagnostico_enfermagem'). */
export interface CamposEspecificosDiagnostico {
  taxonomia: TaxonomiaDiagnostico;
  codigo?: string;
  dominio?: string;
  classe?: string;
  definicao: string;
  caracteristicas_definidoras?: string[];
  fatores_relacionados?: string[];
  fatores_de_risco?: string[];
}

/** Registro de uma fonte oficial coletada na Etapa 1 (Pesquisador). */
export interface ReferenciaOficial {
  instituicao: string;
  documento: string;
  numero?: string;
  ano?: string;
  url?: string;
  trecho?: string;
  data_publicacao?: string;
  data_atualizacao?: string;
}

/** Referência sinalizada pelo Auditor de Atualização para verificação humana pontual (nunca reprovação). */
export interface ReferenciaParaVerificar {
  referencia: string;
  motivo: string;
}

/** Resultado de um auditor binário (Etapas 3–6). */
export interface ResultadoEstagio {
  aprovado: boolean;
  observacoes: string[];
  itens_reprovados: string[];
  /** Somente preenchido pelo Auditor de Atualização (Etapa 6) — nunca é motivo de reprovação. */
  referencias_para_verificar?: ReferenciaParaVerificar[];
}

/** Resultado do Auditor de Domínio e Variabilidade (Etapa 7). */
export interface ResultadoDominio {
  aprovado: true;
  observacoes: string[];
  itens_reprovados: [];
  dominio: DominioProximidade;
  risco_tecnico: NivelRisco;
  variabilidade: NivelVariabilidade;
  divergencias: string[];
}

/** Resultado completo do pipeline de auditoria (Etapas 3–8). */
export interface ResultadoPipeline {
  auditor_origem?: ResultadoEstagio;
  auditor_escopo?: ResultadoEstagio;
  auditor_coerencia?: ResultadoEstagio;
  auditor_atualizacao?: ResultadoEstagio;
  auditor_dominio?: ResultadoDominio;
  parado_em?: 'origem' | 'escopo' | 'coerencia' | 'atualizacao';
  score: number;
  classificacao: ClassificacaoPipeline;
  resumo_consolidacao: string;
  executado_em: string;
}

/** Registro de uma ação no histórico de auditoria da spec. */
export interface HistoricoEstruturado {
  versao: number;
  usuario: string;
  acao: string;
  data: string;
  observacao?: string;
}

/** Estrutura completa de uma Knowledge Specification. */
export interface KnowledgeSpec {
  id: string;

  // Metadados
  titulo: string;
  categoria: string;
  subcategoria?: string;
  resumo?: string;
  objetivo?: string;
  escopo?: string;

  /** Default 'procedimento' no banco — ausente aqui significa 'procedimento'. */
  tipo?: TipoConhecimento;
  /** Só preenchido quando tipo !== 'procedimento'. */
  campos_especificos?: CamposEspecificosDiagnostico | null;

  // Seções de conteúdo (Etapa 2: Redator)
  indicacoes?: string;
  contraindicacoes?: string;
  materiais?: string;
  preparacao?: string;
  procedimento?: string;
  cuidados?: string;
  complicacoes?: string;
  prevencao_eventos_adversos?: string;
  pontos_criticos?: string;
  observacoes?: string;
  limitacoes?: string;
  variacoes_institucionais?: string;

  // Fontes coletadas (Etapa 1: Pesquisador)
  referencias_oficiais: ReferenciaOficial[];

  // Resultado do pipeline (Etapas 3–8)
  pipeline_resultado?: ResultadoPipeline;
  pipeline_classificacao?: ClassificacaoPipeline;

  // Controle de status e integridade
  status: KnowledgeSpecStatus;
  hash?: string;

  // Rastreabilidade
  criado_por: string;
  aprovado_por?: string;
  knowledge_base_id?: string;
  created_at: string;
  updated_at: string;
  aprovado_em?: string;
  historico: HistoricoEstruturado[];
}

/** Resumo de uma spec para exibição em listagens. */
export interface KnowledgeSpecSummary {
  id: string;
  titulo: string;
  categoria: string;
  subcategoria?: string;
  status: KnowledgeSpecStatus;
  pipeline_classificacao?: ClassificacaoPipeline;
  criado_por: string;
  updated_at: string;
  aprovado_por?: string;
  aprovado_em?: string;
}

// Taxonomia de domínios da Biblioteca Técnica
export const DOMINIOS_BIBLIOTECA = [
  'Fundamentos de Enfermagem',
  'Procedimentos Gerais',
  'Administração de Medicamentos',
  'Segurança do Paciente',
  'Controle de Infecção',
  'Curativos',
  'Punção Venosa',
  'Cateter Venoso Central',
  'Cateter de Hemodiálise',
  'Fístula Arteriovenosa',
  'Hemodiálise',
  'Nefrologia',
  'Terapia Intensiva (UTI)',
  'Urgência e Emergência',
  'Dispositivos',
  'Documentação de Enfermagem',
  'Legislação Profissional',
  'Biossegurança',
  'Protocolos Técnicos',
] as const;

export type DominioBiblioteca = (typeof DOMINIOS_BIBLIOTECA)[number];

export const STATUS_LABEL: Record<KnowledgeSpecStatus, string> = {
  rascunho: 'Rascunho',
  em_auditoria: 'Em Auditoria',
  aguardando_aprovacao: 'Aguardando Aprovação',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  arquivado: 'Arquivado',
};

export const CLASSIFICACAO_LABEL: Record<ClassificacaoPipeline, string> = {
  verde: 'Aprovação Rápida',
  amarelo: 'Revisão Necessária',
  vermelho: 'Reprovado',
};

/** Compõe o texto de conteúdo para inserção no knowledge_base após aprovação. */
export function composeConteudoKnowledgeBase(spec: KnowledgeSpec): string {
  const secoes: [string, string | undefined][] = [
    ['OBJETIVO', spec.objetivo],
    ['ESCOPO', spec.escopo],
    ['INDICAÇÕES', spec.indicacoes],
    ['CONTRAINDICAÇÕES', spec.contraindicacoes],
    ['MATERIAIS NECESSÁRIOS', spec.materiais],
    ['PREPARAÇÃO', spec.preparacao],
    ['PROCEDIMENTO TÉCNICO', spec.procedimento],
    ['CUIDADOS', spec.cuidados],
    ['COMPLICAÇÕES', spec.complicacoes],
    ['PREVENÇÃO DE EVENTOS ADVERSOS', spec.prevencao_eventos_adversos],
    ['PONTOS CRÍTICOS', spec.pontos_criticos],
    ['OBSERVAÇÕES', spec.observacoes],
    ['LIMITAÇÕES', spec.limitacoes],
    ['VARIAÇÕES INSTITUCIONAIS', spec.variacoes_institucionais],
  ];

  return secoes
    .filter(([, valor]) => valor?.trim())
    .map(([titulo, valor]) => `${titulo}\n${valor!.trim()}`)
    .join('\n\n');
}

/** Formata as referências oficiais como texto para o campo referencias do knowledge_base. */
export function composeReferenciasTexto(refs: ReferenciaOficial[]): string {
  return refs
    .map((r) => {
      const partes = [r.instituicao, r.documento];
      if (r.numero) partes.push(`Nº ${r.numero}`);
      if (r.ano) partes.push(r.ano);
      if (r.url) partes.push(r.url);
      return partes.join('. ');
    })
    .join('\n');
}
