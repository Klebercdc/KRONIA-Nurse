import { chamarGroq } from '../groq-client';
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

  const schema = getFieldSchema(tipoId);

  const camposPreenchidos = campos.filter((c) => c.valor && c.valor.trim() !== '');
  if (camposPreenchidos.length === 0) throw new Error('Nenhum campo preenchido.');

  const tabelaCampos = camposPreenchidos
    .map((c) => `- ${c.label}: ${c.valor}`)
    .join('\n');

  const system = `Você é um assistente especializado em documentação clínica de enfermagem hospitalar brasileira.
Sua função é redigir documentos de enfermagem profissionais, claros e objetivos, em português do Brasil.

Regras absolutas:
1. NUNCA inclua nomes reais de pacientes, CPF, endereços ou quaisquer dados pessoais identificáveis.
2. Use apenas os dados fornecidos nos campos — NÃO invente informações clínicas.
3. Escreva em linguagem técnica de enfermagem, conforme padrões COFEN.
4. O documento deve ser pronto para copiar e colar no prontuário.
5. Não inclua títulos como "Documento:", "Resposta:", apenas o texto do documento.
6. Use parágrafos separados para cada sistema/seção avaliada.
7. Sempre conclua com a assinatura no formato: "Enfermeiro(a) Responsável — [data/hora]".`;

  const userMsg = `Tipo de documento: ${tipo.nome}
Contexto: ${tipo.contexto}

Dados fornecidos:
${tabelaCampos}

Redija o documento de enfermagem completo e profissional baseado exclusivamente nos dados acima.`;

  const texto = await chamarGroq(system, userMsg, { json: false });

  return { documento: texto };
}
