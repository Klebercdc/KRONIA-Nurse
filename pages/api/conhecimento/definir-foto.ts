/**
 * POST /api/conhecimento/definir-foto
 * Salva a foto de capa escolhida por um humano dentre as candidatas
 * devolvidas por /api/conhecimento/buscar-fotos. Dispara o tracking de
 * uso exigido pelos termos da API Unsplash só agora, na confirmação.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabase } from '../../../lib/supabase-client';
import { getUsuarioAutenticado } from '../../../lib/auth-server';
import { registrarUsoFoto } from '../../../lib/cover-photo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });

  const { id, url, credito, downloadLocation } = req.body as {
    id?: string; url?: string; credito?: string; downloadLocation?: string | null;
  };
  if (!id || !url || !credito) {
    return res.status(400).json({ erro: 'Campos "id", "url" e "credito" são obrigatórios.' });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('knowledge_base')
    .update({ cover_url: url, cover_credito: credito })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) return res.status(500).json({ erro: error.message });

  await registrarUsoFoto(downloadLocation ?? null);

  await supabase.from('knowledge_audit').insert({
    knowledge_base_id: id,
    realizado_por: usuario.email,
    acao: 'editar',
    detalhes: { campo: 'cover_url', cover_url: url },
  });

  return res.status(200).json({ ok: true });
}
