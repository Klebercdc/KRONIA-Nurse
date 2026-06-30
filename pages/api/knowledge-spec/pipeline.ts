/**
 * POST /api/knowledge-spec/pipeline
 * Executa o pipeline de auditoria (Etapas 3–8) sobre uma Knowledge Specification.
 * Execução sequencial: interrompida em qualquer reprovação das Etapas 3–6.
 * Status resultante: 'aguardando_aprovacao' (se vermelho=false) ou 'reprovado' (se vermelho=true).
 *
 * IMPORTANTE: esta rota NÃO aprova nem publica nada no knowledge_base.
 * A aprovação é um ato humano separado em /api/knowledge-spec/aprovar.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabase } from '../../../lib/supabase-client';
import { getUsuarioAutenticado } from '../../../lib/auth-server';
import { executarPipeline } from '../../../lib/knowledge-pipeline';
import type { KnowledgeSpec } from '../../../lib/knowledge-spec';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });

  const { id } = req.body as { id?: string };
  if (!id) return res.status(400).json({ erro: 'Campo "id" obrigatório.' });

  const supabase = getSupabase();

  const { data: spec, error: errBusca } = await supabase
    .from('knowledge_specs')
    .select('*')
    .eq('id', id)
    .single();

  if (errBusca || !spec) return res.status(404).json({ erro: 'Spec não encontrada.' });

  if (!['rascunho', 'reprovado'].includes(spec.status)) {
    return res.status(400).json({ erro: `Pipeline não pode ser executado em specs com status "${spec.status}".` });
  }

  if (!spec.titulo || !spec.categoria) {
    return res.status(400).json({ erro: 'A spec precisa ter ao menos título e categoria preenchidos.' });
  }

  const agora = new Date().toISOString();

  // Marcar como em_auditoria enquanto processa
  await supabase.from('knowledge_specs').update({ status: 'em_auditoria', updated_at: agora }).eq('id', id);

  let resultado;
  try {
    resultado = await executarPipeline(spec as KnowledgeSpec);
  } catch (err) {
    console.error('[knowledge-spec/pipeline] erro na execução:', err);
    // Reverter para rascunho em caso de falha técnica
    await supabase.from('knowledge_specs').update({ status: 'rascunho', updated_at: agora }).eq('id', id);
    return res.status(500).json({ erro: 'Falha ao executar o pipeline de auditoria. Tente novamente.' });
  }

  const statusFinal = resultado.classificacao === 'vermelho' ? 'reprovado' : 'aguardando_aprovacao';

  const historicoAtual: object[] = Array.isArray(spec.historico) ? spec.historico : [];
  const novaEntrada = {
    versao: historicoAtual.length + 1,
    usuario: usuario.email,
    acao: 'pipeline',
    data: agora,
    observacao: `Pipeline executado. Classificação: ${resultado.classificacao}. Score: ${resultado.score}%.`,
  };

  const { error: errUpdate } = await supabase
    .from('knowledge_specs')
    .update({
      pipeline_resultado: resultado,
      pipeline_classificacao: resultado.classificacao,
      status: statusFinal,
      updated_at: agora,
      historico: [...historicoAtual, novaEntrada],
    })
    .eq('id', id);

  if (errUpdate) return res.status(500).json({ erro: errUpdate.message });

  await supabase.from('knowledge_spec_audit').insert({
    spec_id: id,
    usuario: usuario.email,
    acao: 'pipeline',
    dados: {
      classificacao: resultado.classificacao,
      score: resultado.score,
      parado_em: resultado.parado_em ?? null,
      status_final: statusFinal,
    },
  });

  return res.status(200).json({ ok: true, resultado, status: statusFinal });
}
