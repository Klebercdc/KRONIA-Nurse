/**
 * POST /api/knowledge-spec/atualizar
 * Atualiza uma Knowledge Specification com status 'rascunho' ou 'reprovado'.
 * Redefine o pipeline ao atualizar conteúdo (o resultado anterior fica inválido).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';
import { getSupabase } from '../../../lib/supabase-client';
import { getUsuarioAutenticado, usuarioEhAdmin } from '../../../lib/auth-server';
import type { KnowledgeSpec, ReferenciaOficial } from '../../../lib/knowledge-spec';

function computarHash(spec: Partial<KnowledgeSpec>): string {
  const payload = JSON.stringify({
    titulo: spec.titulo ?? '',
    objetivo: spec.objetivo ?? '',
    execucao_passos: spec.execucao_passos ?? [],
    referencias_oficiais: spec.referencias_oficiais ?? [],
  });
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });
  if (!(await usuarioEhAdmin(usuario.id))) return res.status(403).json({ erro: 'Acesso restrito a administradores.' });

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

  const passos: string[] | undefined = Array.isArray(campos.execucao_passos)
    ? (campos.execucao_passos as unknown[]).filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    : undefined;

  const spec: Partial<KnowledgeSpec> = {
    titulo: campos.titulo ? String(campos.titulo).trim() : undefined,
    categoria: campos.categoria ? String(campos.categoria).trim() : undefined,
    subcategoria: campos.subcategoria ? String(campos.subcategoria).trim() : undefined,
    resumo: campos.resumo ? String(campos.resumo).trim() : undefined,
    definicao: campos.definicao ? String(campos.definicao).trim() : undefined,
    objetivo: campos.objetivo ? String(campos.objetivo).trim() : undefined,
    escopo: campos.escopo ? String(campos.escopo).trim() : undefined,
    indicacoes: campos.indicacoes ? String(campos.indicacoes).trim() : undefined,
    contraindicacoes: campos.contraindicacoes ? String(campos.contraindicacoes).trim() : undefined,
    materiais: campos.materiais ? String(campos.materiais).trim() : undefined,
    equipamentos: campos.equipamentos ? String(campos.equipamentos).trim() : undefined,
    epis: campos.epis ? String(campos.epis).trim() : undefined,
    preparacao: campos.preparacao ? String(campos.preparacao).trim() : undefined,
    execucao_passos: passos && passos.length > 0 ? passos : undefined,
    cuidados: campos.cuidados ? String(campos.cuidados).trim() : undefined,
    alertas: campos.alertas ? String(campos.alertas).trim() : undefined,
    complicacoes: campos.complicacoes ? String(campos.complicacoes).trim() : undefined,
    condutas: campos.condutas ? String(campos.condutas).trim() : undefined,
    registro: campos.registro ? String(campos.registro).trim() : undefined,
    fundamentacao_cientifica: campos.fundamentacao_cientifica ? String(campos.fundamentacao_cientifica).trim() : undefined,
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
