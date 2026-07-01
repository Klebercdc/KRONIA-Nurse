/**
 * GET /api/knowledge-spec/obter?id=<uuid>
 * Retorna uma Knowledge Specification completa com todos os campos e resultado do pipeline.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabase } from '../../../lib/supabase-client';
import { getUsuarioAutenticado } from '../../../lib/auth-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido.' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });

  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ erro: 'Parâmetro "id" obrigatório.' });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('knowledge_specs')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return res.status(404).json({ erro: 'Spec não encontrada.' });

  return res.status(200).json({ spec: data });
}
