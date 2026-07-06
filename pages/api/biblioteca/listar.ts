import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabase } from '../../../lib/supabase-client';
import { getUsuarioAutenticado } from '../../../lib/auth-server';

export type StatusConhecimento = 'novo' | 'atualizado' | 'revisado' | null;

export type GuiaResumo = {
  id: string;
  titulo: string;
  categoria: string;
  subcategoria: string | null;
  resumo: string | null;
  cover_url: string | null;
  data_revisao: string | null;
  created_at: string;
  updated_at: string;
  status: StatusConhecimento;
};

type CategoriaResumo = { categoria: string; total: number };

const LIMIAR_RECENTE_DIAS = 14;
const LIMITE_PADRAO = 20;
const LIMITE_MAXIMO = 50;
const LIMITE_ATUALIZACOES = 5;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido.' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });

  const categoriaFiltro = typeof req.query.categoria === 'string' && req.query.categoria.length > 0
    ? req.query.categoria
    : null;
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const limit = Math.min(LIMITE_MAXIMO, Math.max(1, Number(req.query.limit) || LIMITE_PADRAO));

  const supabase = getSupabase();

  // Visão geral (todas as linhas não deletadas) — base para contadores do topo e chips de categoria.
  const { data: todas, error: erroTodas } = await supabase
    .from('knowledge_base')
    .select('id, categoria, updated_at')
    .is('deleted_at', null);

  if (erroTodas) return res.status(500).json({ erro: erroTodas.message });

  const linhas = todas ?? [];
  const limiarMs = LIMIAR_RECENTE_DIAS * 24 * 60 * 60 * 1000;
  const agora = Date.now();

  const totalConhecimentos = linhas.length;
  const atualizadosRecentes = linhas.filter(
    (l) => agora - new Date(l.updated_at).getTime() <= limiarMs
  ).length;

  const contagemPorCategoria = new Map<string, number>();
  for (const l of linhas) {
    contagemPorCategoria.set(l.categoria, (contagemPorCategoria.get(l.categoria) ?? 0) + 1);
  }
  const categorias: CategoriaResumo[] = Array.from(contagemPorCategoria.entries())
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total || a.categoria.localeCompare(b.categoria));

  // Página atual (com filtro de categoria opcional).
  let pagina = supabase
    .from('knowledge_base')
    .select('id, titulo, categoria, subcategoria, resumo, cover_url, data_revisao, created_at, updated_at', { count: 'exact' })
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (categoriaFiltro) pagina = pagina.eq('categoria', categoriaFiltro);

  const { data: itensPagina, count: totalFiltrado, error: erroPagina } = await pagina;
  if (erroPagina) return res.status(500).json({ erro: erroPagina.message });

  // Feed de atualizações recentes — top N por updated_at, independente do filtro de categoria.
  const { data: recentes, error: erroRecentes } = await supabase
    .from('knowledge_base')
    .select('id, titulo, categoria, subcategoria, resumo, cover_url, data_revisao, created_at, updated_at')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(LIMITE_ATUALIZACOES);

  if (erroRecentes) return res.status(500).json({ erro: erroRecentes.message });

  return res.status(200).json({
    totalConhecimentos,
    atualizadosRecentes,
    categorias,
    itens: (itensPagina ?? []).map(comStatus),
    totalFiltrado: totalFiltrado ?? 0,
    atualizacoes: (recentes ?? []).map(comStatus),
  });
}

/**
 * Deriva o selo de exibição (novo/atualizado/revisado) só a partir de colunas
 * já existentes — não há campo de status editorial em knowledge_base.
 * Prioridade: criado recentemente > editado recentemente > revisado recentemente.
 */
function comStatus(row: Omit<GuiaResumo, 'status'>): GuiaResumo {
  const agora = Date.now();
  const limiarMs = LIMIAR_RECENTE_DIAS * 24 * 60 * 60 * 1000;
  const criado = new Date(row.created_at).getTime();
  const atualizado = new Date(row.updated_at).getTime();
  const revisao = row.data_revisao ? new Date(row.data_revisao).getTime() : null;

  let status: StatusConhecimento = null;
  if (agora - criado <= limiarMs) status = 'novo';
  else if (atualizado > criado && agora - atualizado <= limiarMs) status = 'atualizado';
  else if (revisao !== null && agora - revisao <= limiarMs) status = 'revisado';

  return { ...row, status };
}
