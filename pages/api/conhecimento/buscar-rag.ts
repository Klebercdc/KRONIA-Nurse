/**
 * Busca semântica (RAG) nos documentos oficiais indexados pelo
 * scripts/rag-pipeline.js (conhecimento_documentos / conhecimento_fragmentos).
 *
 * Retorna os fragmentos mais similares à consulta, com os metadados do
 * documento de origem para citação da fonte. Não gera texto — apenas
 * recupera; a composição de resposta fica a cargo do chamador (ex.: KRONOS).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { gerarEmbedding } from '../../../lib/embeddings';
import { getSupabase } from '../../../lib/supabase-client';
import { getUsuarioAutenticado } from '../../../lib/auth-server';
import { dentroDoRateLimit, LIMITE_PROFESSOR, MSG_RATE_LIMIT } from '../../../lib/rate-limit';

export type FragmentoEncontrado = {
  fragmento_id: string;
  documento_id: string;
  nome_arquivo: string;
  tipo_documento: string;
  instituicao: string;
  versao: string | null;
  ano_publicacao: number | null;
  descricao: string | null;
  numero_sequencia: number;
  pagina_inicio: number | null;
  pagina_fim: number | null;
  conteudo: string;
  similarity: number;
};

type Resultado = { fragmentos: FragmentoEncontrado[] };

const MATCH_COUNT_MAX = 10;

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resultado | { erro: string }>) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });
  if (!(await dentroDoRateLimit(usuario.id, 'conhecimento/buscar-rag', LIMITE_PROFESSOR))) {
    return res.status(429).json({ erro: MSG_RATE_LIMIT });
  }

  const { consulta, match_count } = req.body as { consulta?: string; match_count?: number };
  if (!consulta || typeof consulta !== 'string' || !consulta.trim()) {
    return res.status(400).json({ erro: 'Campo "consulta" obrigatório.' });
  }

  const matchCount = Math.min(
    Number.isInteger(match_count) && (match_count as number) > 0 ? (match_count as number) : 5,
    MATCH_COUNT_MAX
  );

  let embedding: number[];
  try {
    embedding = await gerarEmbedding(consulta.trim());
  } catch (err) {
    console.error('[conhecimento/buscar-rag] embedding error:', err);
    return res.status(500).json({ erro: 'Falha ao processar a consulta.' });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('buscar_fragmentos_conhecimento', {
    query_embedding: embedding,
    similarity_threshold: 0.5,
    match_count: matchCount,
  });

  if (error) {
    console.error('[conhecimento/buscar-rag] supabase error:', error);
    return res.status(500).json({ erro: 'Erro ao buscar nos documentos de conhecimento.' });
  }

  return res.status(200).json({ fragmentos: (data ?? []) as FragmentoEncontrado[] });
}
