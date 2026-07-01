/**
 * POST /api/knowledge-spec/reprovar
 * Reprovação humana manual de uma spec aguardando aprovação.
 * Permite ao revisor rejeitar mesmo specs classificadas como verde/amarelo
 * que ele considere inadequadas após análise.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabase } from '../../../lib/supabase-client';
import { getUsuarioAutenticado, usuarioEhAdmin } from '../../../lib/auth-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });
  if (!(await usuarioEhAdmin(usuario.id))) return res.status(403).json({ erro: 'Acesso restrito a administradores.' });

  const { id, motivo } = req.body as { id?: string; motivo?: string };
  if (!id) return res.status(400).json({ erro: 'Campo "id" obrigatório.' });
  if (!motivo || !motivo.trim()) return res.status(400).json({ erro: 'Campo "motivo" obrigatório para reprovação manual.' });

  const supabase = getSupabase();

  const { data: spec, error: errBusca } = await supabase
    .from('knowledge_specs')
    .select('status, historico')
    .eq('id', id)
    .single();

  if (errBusca || !spec) return res.status(404).json({ erro: 'Spec não encontrada.' });

  if (spec.status !== 'aguardando_aprovacao') {
    return res.status(400).json({ erro: `Reprovação manual requer status "aguardando_aprovacao". Status atual: "${spec.status}".` });
  }

  const agora = new Date().toISOString();
  const historicoAtual: object[] = Array.isArray(spec.historico) ? spec.historico : [];
  const novaEntrada = {
    versao: historicoAtual.length + 1,
    usuario: usuario.email,
    acao: 'reprovar_manual',
    data: agora,
    observacao: `Reprovação manual por ${usuario.nome}: ${motivo.trim()}`,
  };

  const { error } = await supabase.from('knowledge_specs').update({
    status: 'reprovado',
    updated_at: agora,
    historico: [...historicoAtual, novaEntrada],
  }).eq('id', id);

  if (error) return res.status(500).json({ erro: error.message });

  await supabase.from('knowledge_spec_audit').insert({
    spec_id: id,
    usuario: usuario.email,
    acao: 'reprovar_manual',
    dados: { motivo: motivo.trim() },
  });

  return res.status(200).json({ ok: true, id });
}
