/**
 * GET /api/knowledge-spec/listar?status=rascunho,aguardando_aprovacao
 * Lista Knowledge Specifications com filtro opcional por status.
 * Retorna apenas campos de sumário — sem conteúdo completo nem pipeline detalhado.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabase } from '../../../lib/supabase-client';
import { getUsuarioAutenticado } from '../../../lib/auth-server';
import type { KnowledgeSpecStatus } from '../../../lib/knowledge-spec';

const STATUSES_VALIDOS: KnowledgeSpecStatus[] = [
  'rascunho', 'em_auditoria', 'aguardando_aprovacao', 'aprovado', 'reprovado', 'arquivado',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido.' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });

  const supabase = getSupabase();

  let query = supabase
    .from('knowledge_specs')
    .select('id, titulo, categoria, subcategoria, status, pipeline_classificacao, criado_por, updated_at, aprovado_por, aprovado_em')
    .order('updated_at', { ascending: false });

  const statusParam = req.query.status;
  if (statusParam && typeof statusParam === 'string') {
    const filtros = statusParam.split(',').filter((s) => STATUSES_VALIDOS.includes(s as KnowledgeSpecStatus));
    if (filtros.length > 0) {
      query = query.in('status', filtros);
    }
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ erro: error.message });

  return res.status(200).json({ specs: data ?? [] });
}
