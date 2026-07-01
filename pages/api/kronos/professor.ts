import type { NextApiRequest, NextApiResponse } from 'next';
import { chamarGroq } from '../../../lib/groq-client';
import { gerarEmbedding } from '../../../lib/embeddings';
import { getSupabase } from '../../../lib/supabase-client';
import { getUsuarioAutenticado } from '../../../lib/auth-server';

// Palavras que indicam referência a paciente/leito específico
const REGEX_CASO_ESPECIFICO = /\b(leito|leit[oa]|paciente|p[oa]cient[eo]|meu paciente|minha paciente|caso|turno|plantão|este paciente|essa paciente)\b/i;

const RECUSA_CASO = 'Isso depende do caso — não posso decidir por você. Posso explicar a técnica geral de [tema], se ajudar.';
const SEM_REFERENCIA = 'Não tenho referência cadastrada sobre esse assunto.';

type Resultado = {
  resposta: string;
  fontes?: { titulo: string; categoria: string }[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resultado | { erro: string }>) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });

  const { pergunta } = req.body as { pergunta?: string };
  if (!pergunta || typeof pergunta !== 'string' || !pergunta.trim()) {
    return res.status(400).json({ erro: 'Campo "pergunta" obrigatório.' });
  }

  const texto = pergunta.trim();

  // Detectar referência a caso/leito/paciente específico → recusar sem buscar
  if (REGEX_CASO_ESPECIFICO.test(texto)) {
    return res.status(200).json({ resposta: RECUSA_CASO });
  }

  // Gerar embedding da pergunta e buscar na knowledge_base
  let embedding: number[];
  try {
    embedding = await gerarEmbedding(texto);
  } catch (err) {
    console.error('[kronos/professor] embedding error:', err);
    return res.status(500).json({ erro: 'Falha ao processar a pergunta.' });
  }

  const supabase = getSupabase();
  const { data: resultados, error } = await supabase.rpc('buscar_conhecimento', {
    query_embedding: embedding,
    similarity_threshold: 0.5,
    match_count: 3,
  });

  if (error) {
    console.error('[kronos/professor] supabase error:', error);
    return res.status(500).json({ erro: 'Erro ao buscar no banco de conhecimento.' });
  }

  if (!resultados || resultados.length === 0) {
    return res.status(200).json({ resposta: SEM_REFERENCIA });
  }

  // Montar contexto para o LLM
  const contexto = resultados
    .map((r: { titulo: string; resumo: string; categoria: string; subcategoria: string; conteudo: string; referencias: string }, i: number) => {
      const linhas = [
        `--- Referência ${i + 1} ---`,
        `Título: ${r.titulo}`,
        `Categoria: ${r.categoria}${r.subcategoria ? ' / ' + r.subcategoria : ''}`,
        `Resumo: ${r.resumo || ''}`,
        `Conteúdo: ${r.conteudo}`,
        `Referências: ${r.referencias || '(não informadas)'}`,
      ];
      return linhas.join('\n');
    })
    .join('\n\n');

  const system = `Você é o KRONOS, assistente de aprendizado da KRONIA Nurse. Responde APENAS com base nas referências fornecidas — nunca acrescenta conhecimento externo, nunca raciocina sobre casos clínicos e nunca recomenda condutas.

REGRAS ABSOLUTAS:
- Nunca decida, interprete ou recomende conduta para nenhum paciente.
- Nunca complete ou invente informações ausentes nas referências.
- Referências: exiba EXATAMENTE como cadastradas, sem modificar nem omitir.
- Se a referência for de categoria "procedimento", preserve os subtítulos "Material necessário" e "Como fazer" em negrito.
- Se a referência for de categoria "aprazamento", responda em bloco único de texto sem subdivisões.
- Para qualquer outra categoria, use sempre 4 seções: **Título**, **Resumo**, **Conteúdo Técnico**, **Referências**.

Referências disponíveis:
${contexto}`;

  const promptUsuario = `Pergunta do enfermeiro: ${texto}

Responda com base exclusivamente nas referências acima. Use formatação Markdown.`;

  let resposta: string;
  try {
    resposta = await chamarGroq(system, promptUsuario);
  } catch (err) {
    console.error('[kronos/professor] groq error:', err);
    return res.status(500).json({ erro: 'Falha ao gerar resposta.' });
  }

  const fontes = resultados.map((r: { titulo: string; categoria: string }) => ({ titulo: r.titulo, categoria: r.categoria }));
  return res.status(200).json({ resposta, fontes });
}
