/**
 * POST /api/knowledge-spec/atualizar
 * Atualiza uma Knowledge Specification com status 'rascunho' ou 'reprovado'.
 * Redefine o pipeline ao atualizar conteúdo (o resultado anterior fica inválido).
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

  const { id, ...campos } = req.body as Record<string, unknown>;

  if (!id || typeof id !== 'string') return res.status(400).json({ erro: 'Campo "id" obrigatório.' });

  const supabase = getSupabase();

  // Só permite edição de rascunhos e reprovados
  const { data: atual, error: errBusca } = await supabase
    .from('knowledge_specs')
    .select('status, historico')
    .eq('id', id)
    .single();

  if (errBusca || !atual) return res.status(404).json({ erro: 'Spec não encontrada.' });

  if (!['rascunho', 'reprovado'].includes(atual.status)) {
    return res.status(400).json({ erro: `Não é possível editar uma spec com status "${atual.status}".` });
  }

  const refs: ReferenciaOficial[] = Array.isArray(campos.referencias_oficiais)
    ? (campos.referencias_oficiais as ReferenciaOficial[])
    : [];

  const spec: Partial<KnowledgeSpec> = {
    titulo: campos.titulo ? String(campos.titulo).trim() : undefined,
    categoria: campos.categoria ? String(campos.categoria).trim() : undefined,
    subcategoria: campos.subcategoria ? String(campos.subcategoria).trim() : undefined,
    resumo: campos.resumo ? String(campos.resumo).trim() : undefined,
    objetivo: campos.objetivo ? String(campos.objetivo).trim() : undefined,
    escopo: campos.escopo ? String(campos.escopo).trim() : undefined,
    indicacoes: campos.indicacoes ? String(campos.indicacoes).trim() : undefined,
    contraindicacoes: campos.contraindicacoes ? String(campos.contraindicacoes).trim() : undefined,
    materiais: campos.materiais ? String(campos.materiais).trim() : undefined,
    preparacao: campos.preparacao ? String(campos.preparacao).trim() : undefined,
    procedimento: campos.procedimento ? String(campos.procedimento).trim() : undefined,
    cuidados: campos.cuidados ? String(campos.cuidados).trim() : undefined,
    complicacoes: campos.complicacoes ? String(campos.complicacoes).trim() : undefined,
    prevencao_eventos_adversos: campos.prevencao_eventos_adversos ? String(campos.prevencao_eventos_adversos).trim() : undefined,
    pontos_criticos: campos.pontos_criticos ? String(campos.pontos_criticos).trim() : undefined,
    observacoes: campos.observacoes ? String(campos.observacoes).trim() : undefined,
    limitacoes: campos.limitacoes ? String(campos.limitacoes).trim() : undefined,
    variacoes_institucionais: campos.variacoes_institucionais ? String(campos.variacoes_institucionais).trim() : undefined,
    referencias_oficiais: refs,
  };

  const hash = computarHash(spec);
  const agora = new Date().toISOString();

  const historicoAtual: object[] = Array.isArray(atual.historico) ? atual.historico : [];
  const novaEntrada = {
    versao: historicoAtual.length + 1,
    usuario: usuario.email,
    acao: 'editar',
    data: agora,
    observacao: 'Conteúdo editado. Pipeline reiniciado.',
  };

  // Remover campos undefined para não sobrescrever com null
  const camposParaAtualizar: Record<string, unknown> = { hash, updated_at: agora, historico: [...historicoAtual, novaEntrada] };
  for (const [k, v] of Object.entries(spec)) {
    if (v !== undefined) camposParaAtualizar[k] = v;
  }
  // Ao editar, o pipeline anterior é invalidado
  camposParaAtualizar.pipeline_resultado = null;
  camposParaAtualizar.pipeline_classificacao = null;
  camposParaAtualizar.status = 'rascunho';

  const { error } = await supabase.from('knowledge_specs').update(camposParaAtualizar).eq('id', id);
  if (error) return res.status(500).json({ erro: error.message });

  await supabase.from('knowledge_spec_audit').insert({
    spec_id: id,
    usuario: usuario.email,
    acao: 'editar',
    dados: { campos_alterados: Object.keys(spec).filter((k) => spec[k as keyof typeof spec] !== undefined) },
  });

  return res.status(200).json({ ok: true, id });
}
