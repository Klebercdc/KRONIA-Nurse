import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabase } from '../../../lib/supabase-client';
import { reconstruirTranscricao, type ContextoTranscricao } from '../../../lib/kronos/reconstruir';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'erro', erro_descricao: 'Método não permitido.' });
  }

  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return res.status(401).json({ status: 'erro', erro_descricao: 'Token ausente.' });

  const supabase = getSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ status: 'erro', erro_descricao: 'Não autorizado.' });
  }

  const { transcricao, contexto } = req.body as {
    transcricao?: string;
    contexto?: ContextoTranscricao;
  };

  if (!transcricao || typeof transcricao !== 'string') {
    return res.status(400).json({ status: 'erro', erro_descricao: 'Campo "transcricao" é obrigatório.' });
  }

  try {
    const resultado = await reconstruirTranscricao(transcricao, contexto);
    return res.status(200).json(resultado);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado.';
    return res.status(500).json({
      status: 'erro',
      confianca: 'indeterminada',
      texto_revisado: null,
      dados_extraidos: null,
      trechos_duvidosos: [],
      alteracoes_realizadas: [],
      erro_descricao: msg,
    });
  }
}
