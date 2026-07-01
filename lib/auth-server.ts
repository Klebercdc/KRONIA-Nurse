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

/**
 * Verifica se o usuário tem papel 'admin' na tabela user_roles
 * (migration 20260701_user_roles). Usuários sem registro são 'nurse'.
 * Papéis são gerenciados apenas via service_role — nunca pelo client.
 */
export async function usuarioEhAdmin(userId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[auth-server] usuarioEhAdmin error:', error);
    return false;
  }
  return data?.role === 'admin';
}
