/**
 * Busca semântica (RAG) nos documentos oficiais indexados pelo
 * scripts/rag-pipeline.js (conhecimento_documentos / conhecimento_fragmentos).
 *
 * Retorna os fragmentos mais similares à consulta, com os metadados do
 * documento de origem para citação da fonte. Não gera texto — apenas
 * recupera; a composição de resposta fica a cargo do chamador (ex.: KRONOS).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getUsuarioAutenticado } from '../../../lib/auth-server';
import { dentroDoRateLimit, LIMITE_PROFESSOR, MSG_RATE_LIMIT } from '../../../lib/rate-limit';
import { buscarFragmentos, type FragmentoEncontrado } from '../../../lib/knowledge-retrieval';

export type { FragmentoEncontrado };

type Resultado = { fragmentos: FragmentoEncontrado[] };

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

  let fragmentos: FragmentoEncontrado[];
  try {
    fragmentos = await buscarFragmentos(consulta, { matchCount: match_count });
  } catch (err) {
    console.error('[conhecimento/buscar-rag] erro:', err);
    return res.status(500).json({ erro: 'Erro ao buscar nos documentos de conhecimento.' });
  }

  return res.status(200).json({ fragmentos });
}
