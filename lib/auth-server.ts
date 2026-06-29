/**
 * Utilitário server-side para validar o token Supabase e retornar o usuário.
 * Usado nas rotas /api/** que precisam saber quem está autenticado.
 */
import type { NextApiRequest } from 'next';
import { getSupabase } from './supabase-client';

type UsuarioAutenticado = {
  id: string;
  email: string;
  nome: string;
};

export async function getUsuarioAutenticado(req: NextApiRequest): Promise<UsuarioAutenticado | null> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;

  const token = auth.slice(7);
  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) return null;

  return {
    id: user.id,
    email: user.email ?? '',
    nome: (user.user_metadata?.nome as string | undefined) || user.email?.split('@')[0] || user.id,
  };
}
