import { chamarGroq } from '../groq-client';
import { aplicarGuardsClinicos } from '../conferir-guard';
import { getDocType } from './document-types';
import { getFieldSchema } from './field-schemas';

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

  const system = `Você é um assistente especializado em documentação clínica de enfermagem hospitalar brasileira.
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
9. Use parágrafos separados para cada sistema/seção avaliada.
10. Sempre conclua com a assinatura no formato: "Enfermeiro(a) Responsável — [data/hora]", mantendo o marcador [data/hora] literal para o enfermeiro preencher — NUNCA invente data ou horário.
11. Trechos marcados com (CONFERIR) nos dados são fragmentos ambíguos não validados: copie-os LITERALMENTE, com a marca (CONFERIR) ao lado — é PROIBIDO interpretar, corrigir ou omitir.
12. NUNCA corrija, normalize ou "adivinhe" nome de medicação. Nome estranho ou foneticamente ambíguo permanece literal, com (CONFERIR) ao lado. Doses conflitantes para o mesmo item (ex: "1 g" e "80 mg") permanecem literais com (CONFERIR) — nunca escolha um valor.`;

  const userMsg = `Tipo de documento: ${tipo.nome}
Contexto: ${tipo.contexto}

Dados fornecidos:
${tabelaCampos}

Redija o documento de enfermagem completo e profissional baseado exclusivamente nos dados acima.`;

  const t0 = Date.now();
  const bruto = await chamarGroq(system, userMsg, { json: false, reasoningEffort: 'medium' });
  // Invariante de segurança clínica (código, não prompt): (CONFERIR) da
  // entrada sobrevive na saída e conflito de dose força (CONFERIR).
  const guards = aplicarGuardsClinicos(tabelaCampos, bruto);
  console.log(
    `[evolucao/generate] ${tipoId}: ${Date.now() - t0}ms ` +
      `(reinjetados=${guards.reinjetados} anexados=${guards.anexados} conflitosDose=${guards.conflitosDose})`
  );

  return { documento: guards.texto };
}
