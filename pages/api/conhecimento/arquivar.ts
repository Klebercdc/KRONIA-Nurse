import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabase } from '../../../lib/supabase-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });

  const { id, usuario } = req.body as { id?: string; usuario?: string };
  if (!id) return res.status(400).json({ erro: 'Campo "id" obrigatório.' });

  const supabase = getSupabase();
  const agora = new Date().toISOString();

  const { error } = await supabase
    .from('knowledge_base')
    .update({ deleted_at: agora })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) return res.status(500).json({ erro: error.message });

  await supabase.from('knowledge_audit').insert({
    knowledge_id: id,
    usuario: usuario || 'sistema',
    acao: 'arquivar',
    valor_novo: agora,
  });

  return res.status(200).json({ ok: true });
}
