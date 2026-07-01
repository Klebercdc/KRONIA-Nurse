import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabase } from '../../../lib/supabase-client';
import { getUsuarioAutenticado } from '../../../lib/auth-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido.' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('knowledge_base')
    .select('id, titulo, categoria, subcategoria, autor, data_revisao, created_at, updated_at')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) return res.status(500).json({ erro: error.message });
  return res.status(200).json({ entradas: data ?? [] });
}
