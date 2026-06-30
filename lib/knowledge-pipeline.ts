/**
 * Pipeline de auditoria da Biblioteca Técnica — Etapas 3–8.
 * Etapas 1 (Pesquisador) e 2 (Redator) são responsabilidade humana:
 * o usuário preenche as fontes e o conteúdo antes de executar o pipeline.
 *
 * Execução é SEQUENCIAL: qualquer reprovação nas Etapas 3–6 interrompe
 * o pipeline imediatamente (Constitution §PIPELINE OBRIGATÓRIO).
 *
 * Importar apenas em pages/api/** (usa GROQ_API_KEY).
 */

import { chamarGroq, extrairJson } from './groq-client';
import type {
  KnowledgeSpec,
  ResultadoEstagio,
  ResultadoDominio,
  ResultadoPipeline,
  ClassificacaoPipeline,
} from './knowledge-spec';

// ─── Montagem do contexto para os auditores ────────────────────────────────

function montarContextoSpec(spec: KnowledgeSpec): string {
  const secoes: [string, string | undefined][] = [
    ['Título', spec.titulo],
    ['Categoria', spec.categoria],
    ['Subcategoria', spec.subcategoria],
    ['Resumo', spec.resumo],
    ['Objetivo', spec.objetivo],
    ['Escopo', spec.escopo],
    ['Indicações', spec.indicacoes],
    ['Contraindicações', spec.contraindicacoes],
    ['Materiais Necessários', spec.materiais],
    ['Preparação', spec.preparacao],
    ['Procedimento Técnico', spec.procedimento],
    ['Cuidados', spec.cuidados],
    ['Complicações', spec.complicacoes],
    ['Prevenção de Eventos Adversos', spec.prevencao_eventos_adversos],
    ['Pontos Críticos', spec.pontos_criticos],
    ['Observações', spec.observacoes],
    ['Limitações', spec.limitacoes],
    ['Variações Institucionais', spec.variacoes_institucionais],
  ];

  const conteudo = secoes
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${k}:\n${v!.trim()}`)
    .join('\n\n');

  const refs = spec.referencias_oficiais
    .map((r, i) => {
      const partes = [`${i + 1}. ${r.instituicao} — ${r.documento}`];
      if (r.numero) partes.push(`Nº ${r.numero}`);
      if (r.ano) partes.push(`(${r.ano})`);
      if (r.trecho) partes.push(`\n   Trecho: "${r.trecho}"`);
      if (r.data_atualizacao) partes.push(`\n   Última atualização: ${r.data_atualizacao}`);
      return partes.join(' ');
    })
    .join('\n');

  return `=== RASCUNHO ===\n${conteudo}\n\n=== REFERÊNCIAS OFICIAIS ===\n${refs || '(nenhuma referência cadastrada)'}`;
}

// ─── Etapa 3: Auditor de Origem ────────────────────────────────────────────

const PROMPT_AUDITOR_ORIGEM = `Você é o Auditor de Origem da Biblioteca Técnica KRONIA Nurse.

Sua função: verificar se o rascunho foi corretamente elaborado com base nas referências, sem cópias e com rastreabilidade.

Verifique:
1. SIMILARIDADE TEXTUAL: o rascunho parece cópia ou paráfrase muito próxima de alguma referência? (cópia reprova)
2. AUSÊNCIA DE REFERÊNCIA: existem afirmações técnicas sem nenhuma referência que as sustente?
3. CORRESPONDÊNCIA: cada afirmação relevante tem ao menos uma referência compatível?
4. PARÁFRASE: o conteúdo foi reescrito com palavras próprias (exigido) ou há trechos copiados literalmente?

IMPORTANTE: conteúdo técnico de enfermagem usa terminologia padrão — isso é esperado e não configura cópia.
O que reprova é a reprodução literal de parágrafos ou frases completas de documentos.

Responda SOMENTE com JSON válido, sem markdown, sem texto antes ou depois:
{"aprovado":true|false,"observacoes":["..."],"itens_reprovados":["frase/trecho exato que motiva reprovação — somente se aprovado=false"]}`;

export async function auditarOrigem(spec: KnowledgeSpec): Promise<ResultadoEstagio> {
  const contexto = montarContextoSpec(spec);
  const resposta = await chamarGroq(
    PROMPT_AUDITOR_ORIGEM,
    `Analise o seguinte material:\n\n${contexto}`
  );
  const resultado = extrairJson<{ aprovado: boolean; observacoes: string[]; itens_reprovados?: string[] }>(resposta);
  return {
    aprovado: !!resultado.aprovado,
    observacoes: resultado.observacoes ?? [],
    itens_reprovados: resultado.itens_reprovados ?? [],
  };
}

// ─── Etapa 4: Auditor de Escopo ────────────────────────────────────────────

const PROMPT_AUDITOR_ESCOPO = `Você é o Auditor de Escopo da Biblioteca Técnica KRONIA Nurse.

Este conteúdo é REFERÊNCIA TÉCNICA GERAL para estudo e consulta — NUNCA pode conter decisão clínica aplicada a caso específico.

Verifique se existe QUALQUER conteúdo que:
- Faça PRESCRIÇÃO (de medicamento, dose, via, horário para um paciente)
- Realize DIAGNÓSTICO (identifique condição ou risco em um paciente específico)
- Tome DECISÃO CLÍNICA (escolha de tratamento ou protocolo para um caso)
- Oriente INDIVIDUALMENTE um paciente
- Faça RECOMENDAÇÃO DE CONDUTA específica aplicável a um paciente real

O conteúdo PODE e DEVE descrever técnicas, procedimentos, indicações gerais, contraindicações gerais — isso é o objetivo da biblioteca.
O que NÃO PODE é aplicar esse conhecimento a um paciente específico.

Se encontrar qualquer trecho que cruce essa fronteira, copie-o exatamente e reprove.

Responda SOMENTE com JSON válido, sem markdown:
{"aprovado":true|false,"observacoes":["..."],"itens_reprovados":["COPIAR A FRASE EXATA que reprova — somente se aprovado=false"]}`;

export async function auditarEscopo(spec: KnowledgeSpec): Promise<ResultadoEstagio> {
  const contexto = montarContextoSpec(spec);
  const resposta = await chamarGroq(
    PROMPT_AUDITOR_ESCOPO,
    `Analise o seguinte material:\n\n${contexto}`
  );
  const resultado = extrairJson<{ aprovado: boolean; observacoes: string[]; itens_reprovados?: string[] }>(resposta);
  return {
    aprovado: !!resultado.aprovado,
    observacoes: resultado.observacoes ?? [],
    itens_reprovados: resultado.itens_reprovados ?? [],
  };
}

// ─── Etapa 5: Auditor de Coerência ─────────────────────────────────────────

const PROMPT_AUDITOR_COERENCIA = `Você é o Auditor de Coerência da Biblioteca Técnica KRONIA Nurse.

Compare o rascunho com as referências fornecidas e verifique:
1. ORDEM LÓGICA: o conteúdo segue progressão coerente (preparação → procedimento → cuidados)?
2. CONSISTÊNCIA INTERNA: o rascunho contradiz a si mesmo em algum ponto?
3. FIDELIDADE: o rascunho distorce ou inverte o que as referências dizem?
4. AUSÊNCIA DE DISTORÇÕES: o conteúdo mantém o sentido original sem amplificar ou minimizar?
5. COMPLETUDE: as seções preenchidas contêm informação suficiente para o objetivo declarado?

Qualquer inconsistência ou distorção reprova o item.

Responda SOMENTE com JSON válido, sem markdown:
{"aprovado":true|false,"observacoes":["..."],"itens_reprovados":["item que reprova — somente se aprovado=false"]}`;

export async function auditarCoerencia(spec: KnowledgeSpec): Promise<ResultadoEstagio> {
  const contexto = montarContextoSpec(spec);
  const resposta = await chamarGroq(
    PROMPT_AUDITOR_COERENCIA,
    `Analise o seguinte material:\n\n${contexto}`
  );
  const resultado = extrairJson<{ aprovado: boolean; observacoes: string[]; itens_reprovados?: string[] }>(resposta);
  return {
    aprovado: !!resultado.aprovado,
    observacoes: resultado.observacoes ?? [],
    itens_reprovados: resultado.itens_reprovados ?? [],
  };
}

// ─── Etapa 6: Auditor de Atualização ───────────────────────────────────────

const PROMPT_AUDITOR_ATUALIZACAO = `Você é o Auditor de Atualização da Biblioteca Técnica KRONIA Nurse.

Analise as referências listadas e identifique possíveis problemas de atualidade:
1. DOCUMENTOS ANTIGOS: referências com ano de publicação muito antigo sem indicação de reedição ou validade atual
2. RDCs E PORTARIAS: resolução da ANVISA ou portaria do Ministério da Saúde que possam ter sido substituídas por versão mais recente (baseie-se nas datas informadas)
3. GUIDELINES: guidelines internacionais de organizações como CDC, OMS que tipicamente são atualizados a cada 3–5 anos
4. REFERÊNCIAS SEM DATA: qualquer referência sem data de publicação ou atualização deve ser flagueada
5. NOTAS TÉCNICAS: notas técnicas têm prazo de validade — verifique se há indicação de expiração

LIMITAÇÃO IMPORTANTE: você não tem acesso à internet. Baseie sua análise exclusivamente nos dados fornecidos (datas, números de documento, tipo de documento). Em caso de dúvida, flag para revisão humana.

Se houver documento que necessite verificação de atualidade pelo revisor humano, reprove e registre.

Responda SOMENTE com JSON válido, sem markdown:
{"aprovado":true|false,"observacoes":["..."],"itens_reprovados":["documento que requer verificação — somente se aprovado=false"]}`;

export async function auditarAtualizacao(spec: KnowledgeSpec): Promise<ResultadoEstagio> {
  const contexto = montarContextoSpec(spec);
  const resposta = await chamarGroq(
    PROMPT_AUDITOR_ATUALIZACAO,
    `Analise o seguinte material:\n\n${contexto}`
  );
  const resultado = extrairJson<{ aprovado: boolean; observacoes: string[]; itens_reprovados?: string[] }>(resposta);
  return {
    aprovado: !!resultado.aprovado,
    observacoes: resultado.observacoes ?? [],
    itens_reprovados: resultado.itens_reprovados ?? [],
  };
}

// ─── Etapa 7: Auditor de Domínio e Variabilidade ───────────────────────────

const PROMPT_AUDITOR_DOMINIO = `Você é o Auditor de Domínio e Variabilidade da Biblioteca Técnica KRONIA Nurse.

Esta etapa classifica o conteúdo — não aprova nem reprova. Sempre retorne aprovado=true.

Classifique o conteúdo em três dimensões:

DOMÍNIO (proximidade ao conhecimento central de enfermagem):
- "proximo": conteúdo de enfermagem geral, amplamente padronizado, consensual entre fontes nacionais
- "intermediario": especialidade reconhecida com alguma variação de prática, base científica estabelecida
- "distante": conteúdo altamente especializado, em área limítrofe, com poucas referências nacionais padronizadas

RISCO TÉCNICO (consequência de erros na aplicação):
- "baixo": erros de aplicação têm impacto mínimo ou facilmente reversível
- "moderado": erros podem causar danos reversíveis ao paciente
- "alto": erros podem causar danos graves, irreversíveis ou risco à vida

VARIABILIDADE INSTITUCIONAL (diferença entre protocolos de diferentes serviços):
- "nenhuma": protocolo idêntico na esmagadora maioria das instituições
- "moderada": pequenas variações existem mas o núcleo técnico é o mesmo
- "elevada": protocolos diferem significativamente entre diferentes serviços/regiões

DIVERGÊNCIAS ENTRE FONTES:
Se as referências listadas tiverem posições conflitantes entre si, registre TODAS as posições.
NUNCA escolha automaticamente uma posição. Registre: "Divergência entre [fonte A] e [fonte B]: [descrição]".

Responda SOMENTE com JSON válido, sem markdown:
{"aprovado":true,"observacoes":["..."],"itens_reprovados":[],"dominio":"proximo|intermediario|distante","risco_tecnico":"baixo|moderado|alto","variabilidade":"nenhuma|moderada|elevada","divergencias":["descrição de divergência — array vazio se nenhuma"]}`;

export async function auditarDominio(spec: KnowledgeSpec): Promise<ResultadoDominio> {
  const contexto = montarContextoSpec(spec);
  const resposta = await chamarGroq(
    PROMPT_AUDITOR_DOMINIO,
    `Analise o seguinte material:\n\n${contexto}`
  );
  const resultado = extrairJson<{
    aprovado: true;
    observacoes: string[];
    itens_reprovados: [];
    dominio: string;
    risco_tecnico: string;
    variabilidade: string;
    divergencias: string[];
  }>(resposta);

  return {
    aprovado: true,
    observacoes: resultado.observacoes ?? [],
    itens_reprovados: [],
    dominio: (resultado.dominio as ResultadoDominio['dominio']) ?? 'intermediario',
    risco_tecnico: (resultado.risco_tecnico as ResultadoDominio['risco_tecnico']) ?? 'moderado',
    variabilidade: (resultado.variabilidade as ResultadoDominio['variabilidade']) ?? 'moderada',
    divergencias: resultado.divergencias ?? [],
  };
}

// ─── Etapa 8: Consolidação ─────────────────────────────────────────────────

function classificar(
  estagio_origem?: ResultadoEstagio,
  estagio_escopo?: ResultadoEstagio,
  estagio_coerencia?: ResultadoEstagio,
  estagio_atualizacao?: ResultadoEstagio,
  estagio_dominio?: ResultadoDominio,
  parado_em?: string
): { score: number; classificacao: ClassificacaoPipeline; resumo: string } {
  // Se o pipeline foi interrompido, é vermelho
  if (parado_em) {
    return {
      score: 0,
      classificacao: 'vermelho',
      resumo: `Pipeline interrompido na Etapa de ${nomearEstagio(parado_em)}. Corrija os itens reprovados e reenvie para auditoria.`,
    };
  }

  const estagios = [estagio_origem, estagio_escopo, estagio_coerencia, estagio_atualizacao];
  const aprovados = estagios.filter((e) => e?.aprovado === true).length;
  const total = estagios.filter((e) => e !== undefined).length;
  const score = total > 0 ? Math.round((aprovados / total) * 100) : 0;

  // Algum auditor binário reprovou?
  const algumReprovado = estagios.some((e) => e !== undefined && !e.aprovado);
  if (algumReprovado) {
    return { score, classificacao: 'vermelho', resumo: 'Uma ou mais auditorias reprovaram. Revisar itens sinalizados antes de reenviar.' };
  }

  // Todos aprovados — verificar classificação pelo Domínio
  const dominioDistante = estagio_dominio?.dominio === 'distante';
  const riscoAlto = estagio_dominio?.risco_tecnico === 'alto';
  const variabilidadeRelevante = estagio_dominio && estagio_dominio.variabilidade !== 'nenhuma';
  const divergencias = (estagio_dominio?.divergencias ?? []).length > 0;

  if (dominioDistante || riscoAlto || variabilidadeRelevante || divergencias) {
    const motivos: string[] = [];
    if (dominioDistante) motivos.push('domínio distante');
    if (riscoAlto) motivos.push('risco técnico alto');
    if (variabilidadeRelevante) motivos.push(`variabilidade institucional ${estagio_dominio!.variabilidade}`);
    if (divergencias) motivos.push('divergências entre fontes oficiais detectadas');
    return {
      score,
      classificacao: 'amarelo',
      resumo: `Todas as auditorias aprovadas. Revisão humana pontual necessária: ${motivos.join(', ')}.`,
    };
  }

  return {
    score,
    classificacao: 'verde',
    resumo: 'Todas as auditorias aprovadas. Aprovação rápida recomendada. Clique de aprovação humana obrigatório.',
  };
}

function nomearEstagio(estagio: string): string {
  const mapa: Record<string, string> = {
    origem: 'Auditor de Origem',
    escopo: 'Auditor de Escopo',
    coerencia: 'Auditor de Coerência',
    atualizacao: 'Auditor de Atualização',
  };
  return mapa[estagio] ?? estagio;
}

// ─── Pipeline principal (Etapas 3–8) ───────────────────────────────────────

/**
 * Executa o pipeline completo de auditoria de forma sequencial.
 * Qualquer reprovação nas Etapas 3–6 interrompe a execução imediatamente.
 * Etapa 7 (Domínio) só é executada se as Etapas 3–6 todas aprovarem.
 */
export async function executarPipeline(spec: KnowledgeSpec): Promise<ResultadoPipeline> {
  const resultado: Partial<ResultadoPipeline> = {};

  // Etapa 3 — Auditor de Origem
  const origem = await auditarOrigem(spec);
  resultado.auditor_origem = origem;
  if (!origem.aprovado) {
    const { score, classificacao, resumo } = classificar(origem, undefined, undefined, undefined, undefined, 'origem');
    return { ...resultado, parado_em: 'origem', score, classificacao, resumo_consolidacao: resumo, executado_em: new Date().toISOString() } as ResultadoPipeline;
  }

  // Etapa 4 — Auditor de Escopo
  const escopo = await auditarEscopo(spec);
  resultado.auditor_escopo = escopo;
  if (!escopo.aprovado) {
    const { score, classificacao, resumo } = classificar(origem, escopo, undefined, undefined, undefined, 'escopo');
    return { ...resultado, parado_em: 'escopo', score, classificacao, resumo_consolidacao: resumo, executado_em: new Date().toISOString() } as ResultadoPipeline;
  }

  // Etapa 5 — Auditor de Coerência
  const coerencia = await auditarCoerencia(spec);
  resultado.auditor_coerencia = coerencia;
  if (!coerencia.aprovado) {
    const { score, classificacao, resumo } = classificar(origem, escopo, coerencia, undefined, undefined, 'coerencia');
    return { ...resultado, parado_em: 'coerencia', score, classificacao, resumo_consolidacao: resumo, executado_em: new Date().toISOString() } as ResultadoPipeline;
  }

  // Etapa 6 — Auditor de Atualização
  const atualizacao = await auditarAtualizacao(spec);
  resultado.auditor_atualizacao = atualizacao;
  if (!atualizacao.aprovado) {
    const { score, classificacao, resumo } = classificar(origem, escopo, coerencia, atualizacao, undefined, 'atualizacao');
    return { ...resultado, parado_em: 'atualizacao', score, classificacao, resumo_consolidacao: resumo, executado_em: new Date().toISOString() } as ResultadoPipeline;
  }

  // Etapa 7 — Auditor de Domínio e Variabilidade (sempre classifica)
  const dominio = await auditarDominio(spec);
  resultado.auditor_dominio = dominio;

  // Etapa 8 — Consolidação
  const { score, classificacao, resumo } = classificar(origem, escopo, coerencia, atualizacao, dominio);

  return {
    ...resultado,
    score,
    classificacao,
    resumo_consolidacao: resumo,
    executado_em: new Date().toISOString(),
  } as ResultadoPipeline;
}
