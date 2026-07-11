/**
 * Tipos canônicos para o sistema de Base de Conhecimento (Knowledge System).
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
export type TipoConhecimento = 'procedimento' | 'diagnostico_enfermagem' | 'resultado_enfermagem';

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

/** Campos próprios de um Resultado de Enfermagem (tipo = 'resultado_enfermagem'), taxonomia NOC — ver context/kits/knowledge-engine-tipos-objeto.md item 6. */
export interface CamposEspecificosResultado {
  taxonomia: 'NOC';
  codigo?: string;
  dominio?: string;
  classe?: string;
  definicao: string;
  /** Indicadores mensuráveis do resultado. */
  indicadores?: string[];
  /** Escala usada para avaliar cada indicador (ex.: Likert 1-5 NOC). */
  escala_avaliacao?: string;
}

/** Registro de uma fonte oficial coletada na Etapa 1 (Pesquisador). */
export interface ReferenciaOficial {
  instituicao: string;
  documento: string;
  numero?: string;
  ano?: string;
  versao?: string;
  /** Página (ou intervalo, ex.: "12-13") do documento original de onde veio o trecho — ver lib/knowledge-retrieval.ts. */
  pagina?: string;
  url?: string;
  /**
   * uuid real de conhecimento_fragmentos.id — âncora mecânica anti-alucinação.
   * Quando presente, `trecho` DEVE ser cópia literal (substring ou ≥90%
   * similar via pg_trgm) do `conteudo` dessa linha — verificável por SQL ou
   * scripts/verificar_citacoes.py antes de gravar. Ausente em referências
   * herdadas de fontes externas não indexadas em conhecimento_fragmentos.
   */
  fragmento_id?: string;
  /**
   * Trecho bruto do fragmento RAG que fundamentou a referência — evidência de
   * trabalho interna (auditores comparam o rascunho contra ele), NUNCA o que é
   * exibido como citação. Ver `citacao_abnt`, montado por lib/abnt.ts a partir
   * só de metadados estruturados.
   */
  trecho?: string;
  /** Citação formatada em ABNT (lib/abnt.ts) — determinística, o que de fato aparece como referência. */
  citacao_abnt?: string;
  /** Citação literal opcional, ≤20 palavras, só quando a formulação exata importa (ver lib/abnt.ts). */
  citacao_literal_opcional?: string;
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
  campos_especificos?: CamposEspecificosDiagnostico | CamposEspecificosResultado | null;

  // Seções de conteúdo (Etapa 2: Redator) — modelo conceitual atual
  definicao?: string;
  indicacoes?: string;
  contraindicacoes?: string;
  materiais?: string;
  equipamentos?: string;
  epis?: string;
  preparacao?: string;
  /** Passo a passo estruturado — um item por passo. */
  execucao_passos?: string[];
  cuidados?: string;
  /** Sinais que exigem atenção imediata durante/após a execução. */
  alertas?: string;
  complicacoes?: string;
  /** O que fazer diante de um alerta/complicação — distinto de execucao_passos (execução padrão). */
  condutas?: string;
  /** O que deve constar no registro/anotação de enfermagem. */
  registro?: string;
  /** Síntese da base científica/racional clínico — distinta de referencias_oficiais. */
  fundamentacao_cientifica?: string;

  /** @deprecated Mantido para specs antigas — não preenchido em specs novas (ver execucao_passos). */
  procedimento?: string;
  /** @deprecated Mantido para specs antigas — não preenchido em specs novas. */
  prevencao_eventos_adversos?: string;
  /** @deprecated Mantido para specs antigas — não preenchido em specs novas. */
  pontos_criticos?: string;
  /** @deprecated Mantido para specs antigas — não preenchido em specs novas. */
  observacoes?: string;
  /** @deprecated Mantido para specs antigas — não preenchido em specs novas. */
  limitacoes?: string;
  /** @deprecated Mantido para specs antigas — não preenchido em specs novas. */
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

// Taxonomia v2.0 de Áreas Clínicas da Base de Conhecimento — vocabulário
// controlado e fechado (ver migration 20260710_categoria_taxonomia_v2.sql).
// Substitui a lista anterior de 19 domínios livres, que deixou "Documentação
// de Enfermagem" virar um balde genérico (98/102 specs) e permitiu specs
// como "Os 13 Certos" nascerem fora da árvore de Administração de
// Medicamentos. Toda categoria nova PRECISA vir desta lista.
export const DOMINIOS_BIBLIOTECA = [
  'Fundamentos de Enfermagem',
  'Administração de Medicamentos',
  'Acesso Vascular',
  'Terapia Intravenosa',
  'Feridas e Curativos',
  'Sondas e Drenos',
  'Oxigenoterapia',
  'Ventilação Mecânica',
  'Hemodinâmica',
  'Centro Cirúrgico',
  'CME',
  'UTI Adulto',
  'Pediatria',
  'Neonatologia',
  'Obstetrícia',
  'Emergência',
  'Trauma',
  'Oncologia',
  'Saúde Mental',
  'Cuidados Paliativos',
  'Infectologia',
  'Controle de Infecção',
  'Hemoterapia',
  'Hemodiálise',
  'Exames Laboratoriais',
  'Monitorização',
  'Equipamentos',
  'Escalas Clínicas',
  'Diagnósticos de Enfermagem',
  'Intervenções de Enfermagem',
  'Resultados de Enfermagem',
  'Protocolos Institucionais',
  'POPs',
  'Diretrizes Clínicas',
  'Legislação',
  'Educação Permanente',
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

/** Formata o array de passos da Execução como texto numerado, ou usa o campo legado "procedimento" se não houver array. */
export function formatarExecucao(spec: KnowledgeSpec): string | undefined {
  if (Array.isArray(spec.execucao_passos) && spec.execucao_passos.length > 0) {
    return spec.execucao_passos.map((passo, i) => `${i + 1}. ${passo}`).join('\n');
  }
  return spec.procedimento;
}

/** Compõe o texto de conteúdo para inserção no knowledge_base após aprovação. */
export function composeConteudoKnowledgeBase(spec: KnowledgeSpec): string {
  const secoes: [string, string | undefined][] = [
    ['DEFINIÇÃO', spec.definicao],
    ['OBJETIVO', spec.objetivo],
    ['ESCOPO', spec.escopo],
    ['INDICAÇÕES', spec.indicacoes],
    ['CONTRAINDICAÇÕES', spec.contraindicacoes],
    ['MATERIAIS NECESSÁRIOS', spec.materiais],
    ['EQUIPAMENTOS', spec.equipamentos],
    ['EPIs', spec.epis],
    ['PREPARAÇÃO', spec.preparacao],
    ['EXECUÇÃO', formatarExecucao(spec)],
    ['CUIDADOS', spec.cuidados],
    ['ALERTAS', spec.alertas],
    ['COMPLICAÇÕES', spec.complicacoes],
    ['CONDUTAS', spec.condutas],
    ['REGISTRO', spec.registro],
    ['FUNDAMENTAÇÃO CIENTÍFICA', spec.fundamentacao_cientifica],
    // Campos legados — só aparecem em specs antigas que ainda os têm preenchidos.
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

/**
 * Formata as referências oficiais como texto para o campo referencias do
 * knowledge_base. Usa `citacao_abnt` (formatador determinístico, lib/abnt.ts)
 * quando disponível — só cai para a montagem ad hoc por partes em specs
 * antigas que nunca tiveram a citação ABNT calculada.
 */
export function composeReferenciasTexto(refs: ReferenciaOficial[]): string {
  return refs
    .map((r) => {
      if (r.citacao_abnt) return r.citacao_abnt;
      const partes = [r.instituicao, r.documento];
      if (r.numero) partes.push(`Nº ${r.numero}`);
      if (r.versao) partes.push(r.versao);
      if (r.ano) partes.push(r.ano);
      if (r.pagina) partes.push(`p. ${r.pagina}`);
      if (r.url) partes.push(r.url);
      return partes.join('. ');
    })
    .join('\n');
}
