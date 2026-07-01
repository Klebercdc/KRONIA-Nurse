import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabase } from '../../../lib/supabase-client';
import { generateEvolucao, type CampoValor } from '../../../lib/evolucao/generate-evolucao';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return res.status(401).json({ erro: 'Token ausente.' });

  const supabase = getSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ erro: 'Não autorizado.' });

  const { tipoId, campos } = req.body as { tipoId?: string; campos?: CampoValor[] };

  if (!tipoId || typeof tipoId !== 'string') {
    return res.status(400).json({ erro: 'tipoId é obrigatório.' });
  }
  if (!Array.isArray(campos) || campos.length === 0) {
    return res.status(400).json({ erro: 'campos deve ser um array não vazio.' });
  }

  try {
    const result = await generateEvolucao(tipoId, campos);
    return res.status(200).json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado.';
    return res.status(500).json({ erro: msg });
  }
}
