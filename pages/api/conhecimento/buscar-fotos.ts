/**
 * POST /api/conhecimento/buscar-fotos
 * Busca fotos candidatas (Unsplash) pra capa de um conhecimento já
 * publicado. Não salva nada — só devolve as opções pra quem publica
 * escolher (ver /api/conhecimento/definir-foto.ts).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabase } from '../../../lib/supabase-client';
import { getUsuarioAutenticado } from '../../../lib/auth-server';
import { buscarCandidatasFoto } from '../../../lib/cover-photo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });

  const { id } = req.body as { id?: string };
  if (!id) return res.status(400).json({ erro: 'Campo "id" obrigatório.' });

  const supabase = getSupabase();
  const { data: item, error } = await supabase
    .from('knowledge_base')
    .select('id, titulo, categoria, subcategoria')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) return res.status(500).json({ erro: error.message });
  if (!item) return res.status(404).json({ erro: 'Conhecimento não encontrado.' });

  const candidatas = await buscarCandidatasFoto(item.titulo, item.categoria, item.subcategoria);
  return res.status(200).json({ candidatas });
}
