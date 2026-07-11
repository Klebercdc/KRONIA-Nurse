import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabase } from '../../../lib/supabase-client';
import { getUsuarioAutenticado } from '../../../lib/auth-server';

export type ConhecimentoCompleto = {
  id: string;
  titulo: string;
  categoria: string;
  subcategoria: string | null;
  especialidade: string | null;
  resumo: string | null;
  objetivo: string | null;
  escopo: string | null;
  definicao: string | null;
  indicacoes: string | null;
  contraindicacoes: string | null;
  materiais: string | null;
  equipamentos: string | null;
  epis: string | null;
  preparacao: string | null;
  execucao_passos: string[] | null;
  procedimento: string | null;
  cuidados: string | null;
  alertas: string | null;
  complicacoes: string | null;
  condutas: string | null;
  registro: string | null;
  fundamentacao_cientifica: string | null;
  prevencao_eventos_adversos: string | null;
  pontos_criticos: string | null;
  observacoes: string | null;
  limitacoes: string | null;
  variacoes_institucionais: string | null;
  referencias: string | null;
  autor: string | null;
  data_revisao: string | null;
  cover_url: string | null;
  cover_credito: string | null;
  created_at: string;
  updated_at: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido.' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });

  const id = typeof req.query.id === 'string' ? req.query.id : null;
  if (!id) return res.status(400).json({ erro: 'Parâmetro id é obrigatório.' });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('knowledge_base')
    .select(`
      id, titulo, categoria, subcategoria, especialidade, resumo,
      objetivo, escopo, definicao,
      indicacoes, contraindicacoes, materiais, equipamentos, epis,
      preparacao, execucao_passos, procedimento,
      cuidados, alertas, complicacoes, condutas, registro, fundamentacao_cientifica,
      prevencao_eventos_adversos, pontos_criticos,
      observacoes, limitacoes, variacoes_institucionais, referencias,
      autor, data_revisao, cover_url, cover_credito, created_at, updated_at
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) return res.status(500).json({ erro: error.message });
  if (!data) return res.status(404).json({ erro: 'Conhecimento não encontrado.' });

  return res.status(200).json(data as ConhecimentoCompleto);
}
