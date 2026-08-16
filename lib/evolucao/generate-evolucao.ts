import { chamarGroq } from '../groq-client';
import { getDocType, type DocGroup, type DocType } from './document-types';
import { getFieldSchema } from './field-schemas';

/**
 * Grupos cujo documento é uma avaliação e por isso sai nos quatro blocos do
 * Processo de Enfermagem (Resolução COFEN nº 736/2024). Registros de
 * procedimento e de intercorrência são Anotação de Enfermagem, não Evolução —
 * o COFEN trata os dois como documentos distintos, então continuam com a
 * estrutura livre por sistema avaliado.
 *
 * Para aplicar os quatro blocos a todos os tipos, basta acrescentar os grupos
 * restantes aqui — nenhuma outra mudança é necessária.
 */
export const GRUPOS_COM_ESTRUTURA_PE: readonly DocGroup[] = ['admissao', 'evolucao'];

export function usaEstruturaPE(tipo: DocType): boolean {
  return GRUPOS_COM_ESTRUTURA_PE.includes(tipo.grupo);
}

/**
 * Bloco de estrutura do Processo de Enfermagem — espelha lib/prompts.ts
 * (Motor A) de propósito: os dois motores precisam produzir a MESMA estrutura
 * de saída, incluindo a mesma trava contra diagnóstico inferido pela IA.
 *
 * A trava é o ponto mais importante deste arquivo: o bloco Diagnóstico é
 * ESTRUTURAL, não interpretativo. Ele sempre aparece, mas só é preenchido com
 * o que o enfermeiro registrou em palavras. Valor numérico ou achado isolado
 * NUNCA autoriza a IA a criar diagnóstico — isso é decisão clínica, não
 * redação. Ver CHECKLIST_NAO_REGRESSAO.md antes de alterar.
 */
const ESTRUTURA_PE = `ESTRUTURA OBRIGATÓRIA DA SAÍDA — quatro blocos, nesta ordem, sempre todos presentes:

Dados
  Inclui: o que foi observado ou coletado no paciente — sinais vitais, queixas, achados de avaliação física, dados clínicos informados nos campos.
  NÃO inclui: intervenções realizadas, medicamentos administrados, procedimentos executados.

Diagnóstico de Enfermagem
  APENAS se o enfermeiro informou explicitamente um diagnóstico nomeado (ex: "risco de queda", "integridade da pele prejudicada"). É PROIBIDO inferir, deduzir ou criar diagnóstico a partir dos dados: valores numéricos e achados isolados (ex: temperatura 38,7°C, PA 90x60 mmHg) NUNCA autorizam criar diagnóstico — isso é decisão clínica, não redação. Se nenhum diagnóstico foi informado em palavras, escreva "Sem registro para esta seção".

Intervenção
  Inclui: TUDO que foi feito — medicamentos administrados, procedimentos realizados, curativos, posicionamentos, orientações dadas, ajustes de dispositivos.
  ATENÇÃO: medicações e condutas vão SEMPRE aqui, nunca no bloco Dados.

Resultado
  Inclui: a resposta do paciente observada após as intervenções.
  NÃO inclui: novas intervenções.

Todos os quatro blocos devem aparecer, na ordem acima, com o título em linha própria e texto puro. Se faltar dado para um bloco, escreva "Sem registro para esta seção" — nunca omita o bloco, nunca preencha com suposição.`;

/** Prompt de sistema. Exportado puro para poder ser testado sem chamar a IA. */
export function montarPromptSistema(tipo: DocType): string {
  const regras = `Você é um assistente especializado em documentação clínica de enfermagem hospitalar brasileira.
Sua função é redigir documentos de enfermagem profissionais, claros e objetivos, em português do Brasil.

Regras absolutas:
1. NUNCA inclua nomes reais de pacientes, CPF, endereços ou quaisquer dados pessoais identificáveis.
2. Use apenas os dados fornecidos nos campos — NÃO invente informações clínicas.
3. Estruture APENAS o que foi fornecido nos campos. Se um campo estiver vazio ou uma seção não tiver dado correspondente, escreva "Sem registro para esta seção".
4. É PROIBIDO criar diagnósticos de enfermagem, rótulos NANDA, julgamentos clínicos, condutas ou recomendações que não estejam literalmente nos dados fornecidos. Valores numéricos (temperatura, PA, FC) NUNCA podem virar rótulo clínico (ex: 38,7°C não pode virar "hipertermia" nem gerar diagnóstico).
5. Números decimais sempre com vírgula (padrão brasileiro): 38,7°C, nunca 38.7.
6. Escreva em linguagem técnica de enfermagem, conforme padrões COFEN.
7. O documento deve ser pronto para copiar e colar no prontuário.
8. Não inclua títulos como "Documento:", "Resposta:", apenas o texto do documento.
9. ${
    usaEstruturaPE(tipo)
      ? 'Siga a estrutura de quatro blocos definida abaixo.'
      : 'Use parágrafos separados para cada sistema/seção avaliada.'
  }
10. Sempre conclua com a assinatura no formato: "Enfermeiro(a) Responsável — [data/hora]", mantendo o marcador [data/hora] literal para o enfermeiro preencher — NUNCA invente data ou horário.`;

  return usaEstruturaPE(tipo) ? `${regras}\n\n${ESTRUTURA_PE}` : regras;
}

export interface CampoValor {
  id: string;
  label: string;
  valor: string;
}

export interface GenerateResult {
  documento: string;
}

export async function generateEvolucao(
  tipoId: string,
  campos: CampoValor[],
): Promise<GenerateResult> {
  const tipo = getDocType(tipoId);
  if (!tipo) throw new Error(`Tipo de documento desconhecido: ${tipoId}`);

  // Descarta campos que não pertencem ao schema do tipo — nada de campo
  // desconhecido virar conteúdo no prompt.
  const schema = getFieldSchema(tipoId);
  const camposValidos = schema
    ? campos.filter((c) => schema.campos.some((f) => f.id === c.id))
    : campos;

  const camposPreenchidos = camposValidos.filter((c) => c.valor && c.valor.trim() !== '');
  if (camposPreenchidos.length === 0) throw new Error('Nenhum campo preenchido.');

  const tabelaCampos = camposPreenchidos
    .map((c) => `- ${c.label}: ${c.valor}`)
    .join('\n');

  const system = montarPromptSistema(tipo);

  const userMsg = `Tipo de documento: ${tipo.nome}
Contexto: ${tipo.contexto}

Dados fornecidos:
${tabelaCampos}

Redija o documento de enfermagem completo e profissional baseado exclusivamente nos dados acima.`;

  const texto = await chamarGroq(system, userMsg, { json: false });

  return { documento: texto };
}
