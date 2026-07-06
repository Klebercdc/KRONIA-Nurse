/**
 * POST /api/conhecimento/atualizar-foto
 * Rebusca a foto de capa (Unsplash) de um conhecimento já publicado —
 * usado quando a capa atual não corresponde ao tema (ver lib/cover-photo.ts).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabase } from '../../../lib/supabase-client';
import { getUsuarioAutenticado } from '../../../lib/auth-server';
import { buscarFotoCapa } from '../../../lib/cover-photo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });

  const { id } = req.body as { id?: string };
  if (!id) return res.status(400).json({ erro: 'Campo "id" obrigatório.' });

  const supabase = getSupabase();

  const { data: item, error: erroBusca } = await supabase
    .from('knowledge_base')
    .select('id, titulo, categoria, subcategoria')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (erroBusca) return res.status(500).json({ erro: erroBusca.message });
  if (!item) return res.status(404).json({ erro: 'Conhecimento não encontrado.' });

  const foto = await buscarFotoCapa(item.titulo, item.categoria, item.subcategoria);
  if (!foto) return res.status(502).json({ erro: 'Não foi possível encontrar uma foto para este conhecimento.' });

  const { error: erroUpdate } = await supabase
    .from('knowledge_base')
    .update({ cover_url: foto.url, cover_credito: foto.credito })
    .eq('id', id);

  if (erroUpdate) return res.status(500).json({ erro: erroUpdate.message });

  await supabase.from('knowledge_audit').insert({
    knowledge_base_id: id,
    realizado_por: usuario.email,
    acao: 'editar',
    detalhes: { campo: 'cover_url', cover_url: foto.url },
  });

  return res.status(200).json({ ok: true, cover_url: foto.url, cover_credito: foto.credito });
}
