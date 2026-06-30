/**
 * POST /api/knowledge-spec/criar
 * Cria uma nova Knowledge Specification com status 'rascunho'.
 * Nenhum embedding é gerado aqui. Nenhum conteúdo vai ao knowledge_base.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';
import { getSupabase } from '../../../lib/supabase-client';
import { getUsuarioAutenticado } from '../../../lib/auth-server';
import type { KnowledgeSpec, ReferenciaOficial } from '../../../lib/knowledge-spec';

function computarHash(spec: Partial<KnowledgeSpec>): string {
  const payload = JSON.stringify({
    titulo: spec.titulo ?? '',
    objetivo: spec.objetivo ?? '',
    procedimento: spec.procedimento ?? '',
    referencias_oficiais: spec.referencias_oficiais ?? [],
  });
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });

  const {
    titulo, categoria, subcategoria, resumo, objetivo, escopo,
    indicacoes, contraindicacoes, materiais, preparacao, procedimento,
    cuidados, complicacoes, prevencao_eventos_adversos, pontos_criticos,
    observacoes, limitacoes, variacoes_institucionais,
    referencias_oficiais,
  } = req.body as Record<string, unknown>;

  if (!titulo || typeof titulo !== 'string' || !titulo.trim()) {
    return res.status(400).json({ erro: 'Campo "titulo" obrigatório.' });
  }
  if (!categoria || typeof categoria !== 'string' || !categoria.trim()) {
    return res.status(400).json({ erro: 'Campo "categoria" obrigatório.' });
  }

  const refs: ReferenciaOficial[] = Array.isArray(referencias_oficiais) ? referencias_oficiais : [];

  const spec: Partial<KnowledgeSpec> = {
    titulo: String(titulo).trim(),
    categoria: String(categoria).trim(),
    subcategoria: subcategoria ? String(subcategoria).trim() : undefined,
    resumo: resumo ? String(resumo).trim() : undefined,
    objetivo: objetivo ? String(objetivo).trim() : undefined,
    escopo: escopo ? String(escopo).trim() : undefined,
    indicacoes: indicacoes ? String(indicacoes).trim() : undefined,
    contraindicacoes: contraindicacoes ? String(contraindicacoes).trim() : undefined,
    materiais: materiais ? String(materiais).trim() : undefined,
    preparacao: preparacao ? String(preparacao).trim() : undefined,
    procedimento: procedimento ? String(procedimento).trim() : undefined,
    cuidados: cuidados ? String(cuidados).trim() : undefined,
    complicacoes: complicacoes ? String(complicacoes).trim() : undefined,
    prevencao_eventos_adversos: prevencao_eventos_adversos ? String(prevencao_eventos_adversos).trim() : undefined,
    pontos_criticos: pontos_criticos ? String(pontos_criticos).trim() : undefined,
    observacoes: observacoes ? String(observacoes).trim() : undefined,
    limitacoes: limitacoes ? String(limitacoes).trim() : undefined,
    variacoes_institucionais: variacoes_institucionais ? String(variacoes_institucionais).trim() : undefined,
    referencias_oficiais: refs,
  };

  const hash = computarHash(spec);
  const agora = new Date().toISOString();

  const entradaHistorico = {
    versao: 1,
    usuario: usuario.email,
    acao: 'criar',
    data: agora,
    observacao: 'Rascunho criado.',
  };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('knowledge_specs')
    .insert({
      ...spec,
      referencias_oficiais: refs,
      status: 'rascunho',
      hash,
      criado_por: usuario.nome,
      historico: [entradaHistorico],
    })
    .select('id')
    .single();

  if (error) return res.status(500).json({ erro: error.message });

  await supabase.from('knowledge_spec_audit').insert({
    spec_id: data.id,
    usuario: usuario.email,
    acao: 'criar',
    dados: { titulo: spec.titulo, categoria: spec.categoria },
  });

  return res.status(201).json({ ok: true, id: data.id });
}
