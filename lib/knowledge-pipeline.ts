/**
 * Pipeline de auditoria da Base de Conhecimento — Etapas 1–8.
 *
 * Etapas 1 (Pesquisador) e 2 (Redator) podem ser executadas por IA via
 * processar.ts, ou manualmente pelo usuário no formulário da Base de Conhecimento.
 * Etapas 3–6 são auditores binários: qualquer reprovação interrompe o
 * pipeline imediatamente (Constitution §PIPELINE OBRIGATÓRIO).
 *
 * Importar apenas em pages/api/** (usa GROQ_API_KEY).
 */

import { chamarGroq, extrairJson } from './groq-client';
import { buscarFragmentos } from './knowledge-retrieval';
import { validarFragmentos, temPaginaRastreavel, formatarPagina } from './kronos-validation';
import type {
  KnowledgeSpec,
  ResultadoEstagio,
  ResultadoDominio,
  ResultadoPipeline,
  ClassificacaoPipeline,
  ReferenciaOficial,
} from './knowledge-spec';

// ─── Tipos de retorno das Etapas 1 e 2 ────────────────────────────────────

export interface ResultadoPesquisador {
  referencias: ReferenciaOficial[];
  observacao: string;
  categoria: string;
  subcategoria: string;
}

export type RascunhoRedator = Pick<KnowledgeSpec,
  | 'titulo' | 'resumo' | 'objetivo' | 'escopo' | 'definicao'
  | 'indicacoes' | 'contraindicacoes' | 'materiais' | 'equipamentos' | 'epis' | 'preparacao'
  | 'execucao_passos' | 'cuidados' | 'complicacoes' | 'registro' | 'fundamentacao_cientifica'
>;

// ─── Etapa 1: Pesquisador ──────────────────────────────────────────────────
//
// Não usa recall do LLM (nenhuma fonte é "lembrada" de treinamento) — busca
// de verdade nos documentos oficiais indexados via RAG (Retrieval Engine,
// ver context/kits/kronos-arquitetura-cognitiva.md, Domínio 1) e reaproveita
// o mesmo Validation Engine do KRONOS (lib/kronos-validation.ts) pra decidir
// se há evidência suficiente. Cada referência carrega o trecho literal e a
// página de origem (quando o documento já foi reindexado com rastreamento
// de página) — o Redator (Etapa 2) parafraseia esse trecho real, nunca
// texto inventado pelo modelo.

const MATCH_COUNT_PESQUISADOR = 8;

const PROMPT_CLASSIFICADOR = `Você é o classificador da Base de Conhecimento KRONIA Nurse.

Sua única tarefa: escolher a categoria e subcategoria mais adequadas da lista fornecida para o tema, com base nos trechos de evidência já recuperados. Não redija conteúdo técnico, não avalie fontes — apenas classifique.

Responda SOMENTE com JSON válido, sem markdown, sem texto antes ou depois:
{"categoria":"string da lista fornecida","subcategoria":"string ou vazio"}`;

async function classificarTema(
  tema: string,
  dominios: readonly string[],
  contextoTrechos: string
): Promise<{ categoria: string; subcategoria: string }> {
  const listaDominios = dominios.join(', ');
  const resposta = await chamarGroq(
    PROMPT_CLASSIFICADOR,
    `Tema: "${tema}"\n\nLista de categorias disponíveis: ${listaDominios}\n\nTrechos de evidência recuperados:\n${contextoTrechos}`
  );
  const resultado = extrairJson<{ categoria?: string; subcategoria?: string }>(resposta);
  return {
    categoria: resultado.categoria ?? dominios[0],
    subcategoria: resultado.subcategoria ?? '',
  };
}

export async function pesquisarFontes(tema: string, dominios: readonly string[]): Promise<ResultadoPesquisador> {
  const fragmentos = await buscarFragmentos(tema, { matchCount: MATCH_COUNT_PESQUISADOR });
  const validacao = validarFragmentos(fragmentos);

  if (!validacao.valido) {
    return {
      referencias: [],
      observacao: `Nenhuma fonte indexada encontrada para este tema na Base de Conhecimento (busca RAG). ${validacao.motivo}`,
      categoria: dominios[0],
      subcategoria: '',
    };
  }

  const referencias: ReferenciaOficial[] = validacao.fragmentosValidos.map((f) => ({
    instituicao: f.instituicao,
    documento: f.nome_arquivo,
    ano: f.ano_publicacao != null ? String(f.ano_publicacao) : undefined,
    versao: f.versao ?? undefined,
    pagina: temPaginaRastreavel(f) ? (formatarPagina(f.pagina_inicio, f.pagina_fim) ?? undefined) : undefined,
    trecho: f.conteudo,
  }));

  const contextoTrechos = referencias
    .slice(0, 4)
    .map((r, i) => `${i + 1}. ${r.trecho}`)
    .join('\n');
  const { categoria, subcategoria } = await classificarTema(tema, dominios, contextoTrechos);

  return { referencias, observacao: '', categoria, subcategoria };
}

// ─── Etapa 2: Redator ─────────────────────────────────────────────────────

const PROMPT_REDATOR = `Você é o Redator da Base de Conhecimento KRONIA Nurse.

Sua tarefa: redigir o conteúdo técnico de enfermagem para o tema indicado, usando EXCLUSIVAMENTE as referências fornecidas.

REGRAS OBRIGATÓRIAS:
1. NUNCA acrescente informação que não esteja nas referências fornecidas
2. NUNCA copie texto das fontes — parafraseie sempre com suas próprias palavras técnicas. Trocar só algumas palavras isoladas mantendo a mesma sequência de itens/frases da fonte NÃO é paráfrase — reestruture de verdade: combine itens relacionados em frases corridas, reordene quando fizer sentido clínico, condense o que for redundante
3. Se uma seção não tiver embasamento nas referências, deixe vazia ("") — nunca invente
4. O conteúdo é REFERÊNCIA TÉCNICA GERAL — não dirija recomendações a um paciente específico
5. Use linguagem técnica de enfermagem clara, objetiva e no presente
6. "execucao_passos" é um ARRAY de strings, um item por passo — nunca uma string única com números embutidos

Responda SOMENTE com JSON válido, sem markdown, sem texto antes ou depois:
{
  "titulo": "título formal do procedimento/tema",
  "resumo": "1-2 frases descrevendo o procedimento e sua finalidade",
  "definicao": "definição formal e técnica do que é o procedimento",
  "objetivo": "o que o procedimento visa alcançar clinicamente",
  "escopo": "a quem se aplica e em que contexto clínico",
  "indicacoes": "situações que justificam a realização",
  "contraindicacoes": "situações em que não deve ser realizado",
  "materiais": "materiais de consumo necessários",
  "equipamentos": "equipamentos (não consumíveis) necessários",
  "epis": "equipamentos de proteção individual exigidos",
  "preparacao": "higiene das mãos, paramentação, preparo do paciente e do ambiente",
  "execucao_passos": ["passo 1", "passo 2", "passo 3"],
  "cuidados": "cuidados de enfermagem durante e após o procedimento",
  "complicacoes": "complicações descritas na literatura para este procedimento",
  "registro": "o que deve constar no registro/anotação de enfermagem após a execução",
  "fundamentacao_cientifica": "síntese da base científica/racional clínico do procedimento, a partir das referências"
}`;

export async function redigirConteudo(
  tema: string,
  referencias: ReferenciaOficial[],
): Promise<RascunhoRedator> {
  const refsFormatadas = referencias.length > 0
    ? referencias.map((r, i) => {
        const partes = [`${i + 1}. ${r.instituicao} — ${r.documento}`];
        if (r.numero) partes.push(`Nº ${r.numero}`);
        if (r.versao) partes.push(r.versao);
        if (r.ano) partes.push(`(${r.ano})`);
        if (r.pagina) partes.push(`p. ${r.pagina}`);
        if (r.trecho) partes.push(`\n   Conteúdo relevante: "${r.trecho}"`);
        return partes.join(' ');
      }).join('\n')
    : 'Nenhuma referência oficial encontrada para este tema.';

  const resposta = await chamarGroq(
    PROMPT_REDATOR,
    `Tema: "${tema}"\n\nReferências disponíveis:\n${refsFormatadas}`
  );

  const resultado = extrairJson<RascunhoRedator>(resposta);
  return {
    titulo:                 resultado.titulo                 ?? tema,
    resumo:                 resultado.resumo                 ?? '',
    definicao:              resultado.definicao              ?? '',
    objetivo:               resultado.objetivo               ?? '',
    escopo:                 resultado.escopo                 ?? '',
    indicacoes:             resultado.indicacoes             ?? '',
    contraindicacoes:       resultado.contraindicacoes       ?? '',
    materiais:              resultado.materiais              ?? '',
    equipamentos:           resultado.equipamentos           ?? '',
    epis:                   resultado.epis                   ?? '',
    preparacao:             resultado.preparacao             ?? '',
    execucao_passos:        Array.isArray(resultado.execucao_passos) ? resultado.execucao_passos : [],
    cuidados:               resultado.cuidados               ?? '',
    complicacoes:           resultado.complicacoes           ?? '',
    registro:               resultado.registro               ?? '',
    fundamentacao_cientifica: resultado.fundamentacao_cientifica ?? '',
  };
}

// ─── Montagem do contexto para os auditores ────────────────────────────────

function montarContextoSpec(spec: KnowledgeSpec): string {
  const execucaoTexto = Array.isArray(spec.execucao_passos) && spec.execucao_passos.length > 0
    ? spec.execucao_passos.map((p, i) => `${i + 1}. ${p}`).join('\n')
    : spec.procedimento;

  const secoes: [string, string | undefined][] = [
    ['Título', spec.titulo],
    ['Categoria', spec.categoria],
    ['Subcategoria', spec.subcategoria],
    ['Resumo', spec.resumo],
    ['Definição', spec.definicao],
    ['Objetivo', spec.objetivo],
    ['Escopo', spec.escopo],
    ['Indicações', spec.indicacoes],
    ['Contraindicações', spec.contraindicacoes],
    ['Materiais Necessários', spec.materiais],
    ['Equipamentos', spec.equipamentos],
    ['EPIs', spec.epis],
    ['Preparação', spec.preparacao],
    ['Execução', execucaoTexto],
    ['Cuidados', spec.cuidados],
    ['Complicações', spec.complicacoes],
    ['Registro', spec.registro],
    ['Fundamentação Científica', spec.fundamentacao_cientifica],
    // Campos legados — só aparecem em specs antigas.
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
      if (r.versao) partes.push(r.versao);
      if (r.ano) partes.push(`(${r.ano})`);
      if (r.pagina) partes.push(`p. ${r.pagina}`);
      if (r.trecho) partes.push(`\n   Trecho: "${r.trecho}"`);
      if (r.data_atualizacao) partes.push(`\n   Última atualização: ${r.data_atualizacao}`);
      return partes.join(' ');
    })
    .join('\n');

  return `=== RASCUNHO ===\n${conteudo}\n\n=== REFERÊNCIAS OFICIAIS ===\n${refs || '(nenhuma referência cadastrada)'}`;
}

// ─── Etapa 3: Auditor de Origem ────────────────────────────────────────────

const PROMPT_AUDITOR_ORIGEM = `Você é o Auditor de Origem da Base de Conhecimento KRONIA Nurse.

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

const PROMPT_AUDITOR_ESCOPO = `Você é o Auditor de Escopo da Base de Conhecimento KRONIA Nurse.

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

const PROMPT_AUDITOR_COERENCIA = `Você é o Auditor de Coerência da Base de Conhecimento KRONIA Nurse.

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

const PROMPT_AUDITOR_ATUALIZACAO = `Você é o Auditor de Atualização da Base de Conhecimento KRONIA Nurse.

Seu objetivo é identificar referências que merecem revisão humana pontual — nunca invalidar automaticamente um documento antigo.

REGRA ABSOLUTA: a idade de uma norma NÃO é, por si só, motivo de reprovação. É PROIBIDO sinalizar uma referência com base apenas em "é antiga", "possivelmente substituída", "provavelmente desatualizada" ou qualquer especulação sobre o que pode ter mudado. Você não tem acesso à internet e não pode confirmar revogação, substituição ou perda de vigência — portanto NUNCA afirme isso como fato.

Para cada referência, decida entre:
- "mantida": nenhuma indicação de problema. Não incluir na lista de verificação.
- "verificar": não há como confirmar, a partir dos dados fornecidos, se a referência permanece vigente, foi revogada, substituída ou tornou-se incompatível com regulamentação mais recente. Incluir na lista com um motivo objetivo (ex.: "confirmar vigência e normas complementares", "verificar guideline oficial mais recente") — sem especular sobre o que pode ter acontecido.

Esta etapa NUNCA reprova a spec. Ela apenas informa pontos que um revisor humano deve checar antes da aprovação final.

Responda SOMENTE com JSON válido, sem markdown:
{"observacoes":["resumo geral da análise, sem especulação"],"referencias_para_verificar":[{"referencia":"nome da instituição + documento, como aparece na referência","motivo":"motivo objetivo de verificação, sem especular sobre revogação"}]}`;

export async function auditarAtualizacao(spec: KnowledgeSpec): Promise<ResultadoEstagio> {
  const contexto = montarContextoSpec(spec);
  const resposta = await chamarGroq(
    PROMPT_AUDITOR_ATUALIZACAO,
    `Analise o seguinte material:\n\n${contexto}`
  );
  const resultado = extrairJson<{
    observacoes?: string[];
    referencias_para_verificar?: { referencia: string; motivo: string }[];
  }>(resposta);

  // Esta etapa nunca reprova — idade de norma não é motivo de bloqueio (ver prompt acima).
  return {
    aprovado: true,
    observacoes: resultado.observacoes ?? [],
    itens_reprovados: [],
    referencias_para_verificar: resultado.referencias_para_verificar ?? [],
  };
}

// ─── Etapa 7: Auditor de Domínio e Variabilidade ───────────────────────────

const PROMPT_AUDITOR_DOMINIO = `Você é o Auditor de Domínio e Variabilidade da Base de Conhecimento KRONIA Nurse.

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
  // Se o pipeline foi interrompido nos auditores de conteúdo (Origem/Escopo/
  // Coerência), é vermelho — são gates de conformidade, não de atualidade.
  if (parado_em) {
    return {
      score: 0,
      classificacao: 'vermelho',
      resumo: `Pipeline interrompido na Etapa de ${nomearEstagio(parado_em)}. Corrija os itens reprovados e reenvie para auditoria.`,
    };
  }

  const estagiosCriticos = [estagio_origem, estagio_escopo, estagio_coerencia];
  const estagiosTodos = [estagio_origem, estagio_escopo, estagio_coerencia, estagio_atualizacao];
  const aprovados = estagiosTodos.filter((e) => e?.aprovado === true).length;
  const total = estagiosTodos.filter((e) => e !== undefined).length;
  const score = total > 0 ? Math.round((aprovados / total) * 100) : 0;

  // Origem/Escopo/Coerência reprovados são hard-fail (vermelho).
  const algumCriticoReprovado = estagiosCriticos.some((e) => e !== undefined && !e.aprovado);
  if (algumCriticoReprovado) {
    return { score, classificacao: 'vermelho', resumo: 'Uma ou mais auditorias reprovaram. Revisar itens sinalizados antes de reenviar.' };
  }

  // Atualização nunca reprova — apenas sinaliza referências que merecem
  // verificação humana pontual (idade de norma não é motivo de bloqueio).
  const referenciasParaVerificar = estagio_atualizacao?.referencias_para_verificar ?? [];
  const temReferenciasParaVerificar = referenciasParaVerificar.length > 0;
  const dominioDistante = estagio_dominio?.dominio === 'distante';
  const riscoAlto = estagio_dominio?.risco_tecnico === 'alto';
  const variabilidadeRelevante = estagio_dominio && estagio_dominio.variabilidade !== 'nenhuma';
  const divergencias = (estagio_dominio?.divergencias ?? []).length > 0;

  if (temReferenciasParaVerificar || dominioDistante || riscoAlto || variabilidadeRelevante || divergencias) {
    const motivos: string[] = [];
    if (temReferenciasParaVerificar) motivos.push(`${referenciasParaVerificar.length} referência(s) pendente(s) de verificação de vigência`);
    if (dominioDistante) motivos.push('domínio distante');
    if (riscoAlto) motivos.push('risco técnico alto');
    if (variabilidadeRelevante) motivos.push(`variabilidade institucional ${estagio_dominio!.variabilidade}`);
    if (divergencias) motivos.push('divergências entre fontes oficiais detectadas');
    return {
      score,
      classificacao: 'amarelo',
      resumo: `Auditorias de conteúdo aprovadas. Revisão humana pontual necessária: ${motivos.join(', ')}.`,
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
 * Reprovação nas Etapas 3–5 (Origem/Escopo/Coerência) interrompe a execução
 * imediatamente (vermelho). A Etapa 6 (Atualização) nunca interrompe — sua
 * reprovação só sinaliza revisão humana pontual (amarelo) na Etapa 8.
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

  // Etapa 6 — Auditor de Atualização (reprovação não interrompe o pipeline;
  // vira sinalização de revisão humana pontual na Etapa 8)
  const atualizacao = await auditarAtualizacao(spec);
  resultado.auditor_atualizacao = atualizacao;

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
