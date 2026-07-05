import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabase } from '../../../lib/supabase-client';
import { getUsuarioAutenticado } from '../../../lib/auth-server';

export type GuiaResumo = {
  id: string;
  titulo: string;
  categoria: string;
  subcategoria: string | null;
  resumo: string | null;
  cover_url: string | null;
  data_revisao: string | null;
  updated_at: string;
};

type CategoriaResumo = {
  categoria: string;
  total: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido.' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('knowledge_base')
    .select('id, titulo, categoria, subcategoria, resumo, cover_url, destaque, data_revisao, updated_at')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) return res.status(500).json({ erro: error.message });

  const guias = (data ?? []) as (GuiaResumo & { destaque: boolean })[];

  const destacados = guias.filter((g) => g.destaque);
  const destaque = destacados[0] ?? guias[0] ?? null;

  const contagemPorCategoria = new Map<string, number>();
  for (const g of guias) {
    contagemPorCategoria.set(g.categoria, (contagemPorCategoria.get(g.categoria) ?? 0) + 1);
  }
  const categorias: CategoriaResumo[] = Array.from(contagemPorCategoria.entries())
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total || a.categoria.localeCompare(b.categoria));

  const outros = guias.filter((g) => g.id !== destaque?.id);

  return res.status(200).json({
    categorias,
    destaque: destaque ? semDestaqueFlag(destaque) : null,
    guias: outros.map(semDestaqueFlag),
  });
}

function semDestaqueFlag(g: GuiaResumo & { destaque: boolean }): GuiaResumo {
  const { destaque: _destaque, ...resto } = g;
  return resto;
}
