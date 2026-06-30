/**
 * POST /api/knowledge-spec/aprovar
 * Única rota que publica conteúdo no knowledge_base.
 *
 * REQUISITOS MANDATÓRIOS (Constitution §APROVAÇÃO HUMANA):
 * 1. A spec DEVE estar com status 'aguardando_aprovacao'.
 * 2. É necessária ação humana explícita (Bearer token do usuário aprovador).
 * 3. O embedding é gerado AQUI, APÓS a aprovação — nunca antes.
 * 4. Não existe nenhum caminho de código que publique sem esta rota.
 *
 * NÃO há flags, bypasses, auto-aprovação ou publicação silenciosa.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabase } from '../../../lib/supabase-client';
import { getUsuarioAutenticado } from '../../../lib/auth-server';
import { gerarEmbedding, textoParaEmbedding } from '../../../lib/embeddings';
import {
  composeConteudoKnowledgeBase,
  composeReferenciasTexto,
} from '../../../lib/knowledge-spec';
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

  // VERIFICAÇÃO MANDATÓRIA: apenas specs que passaram pelo pipeline podem ser aprovadas
  if (spec.status !== 'aguardando_aprovacao') {
    return res.status(400).json({
      erro: `Aprovação requer status "aguardando_aprovacao". Status atual: "${spec.status}".`,
    });
  }

  // VERIFICAÇÃO MANDATÓRIA: pipeline deve ter sido executado
  if (!spec.pipeline_resultado) {
    return res.status(400).json({ erro: 'Esta spec não possui resultado de pipeline. Execute o pipeline antes de aprovar.' });
  }

  // Pipeline vermelho NÃO pode ser aprovado (a UI não deveria permitir, mas esta é a garantia de backend)
  if (spec.pipeline_classificacao === 'vermelho') {
    return res.status(400).json({ erro: 'Specs com classificação vermelha não podem ser aprovadas. Corrija os itens reprovados.' });
  }

  const specTyped = spec as KnowledgeSpec;
  const agora = new Date().toISOString();

  // Compor conteúdo estruturado para o knowledge_base
  const conteudo = composeConteudoKnowledgeBase(specTyped);
  const referencias = composeReferenciasTexto(specTyped.referencias_oficiais ?? []);

  if (!conteudo.trim()) {
    return res.status(400).json({ erro: 'A spec não possui conteúdo suficiente para publicação. Preencha ao menos uma seção de conteúdo.' });
  }

  // GERAÇÃO DE EMBEDDING — apenas após aprovação humana explícita
  let embedding: number[];
  try {
    embedding = await gerarEmbedding(
      textoParaEmbedding(specTyped.titulo, specTyped.resumo ?? '', conteudo),
      'search_document'
    );
  } catch (err) {
    console.error('[knowledge-spec/aprovar] embedding error:', err);
    return res.status(500).json({ erro: 'Falha ao gerar embedding. Tente novamente.' });
  }

  // Inserir no knowledge_base (fonte canônica do KRONOS)
  const { data: kbEntry, error: errKb } = await supabase
    .from('knowledge_base')
    .insert({
      titulo: specTyped.titulo,
      resumo: specTyped.resumo ?? '',
      categoria: specTyped.categoria,
      subcategoria: specTyped.subcategoria ?? '',
      especialidade: '',
      palavras_chave: '',
      conteudo,
      referencias,
      autor: usuario.nome,
      embedding,
    })
    .select('id')
    .single();

  if (errKb) {
    console.error('[knowledge-spec/aprovar] knowledge_base insert error:', errKb);
    return res.status(500).json({ erro: 'Falha ao publicar no knowledge_base.' });
  }

  const historicoAtual: object[] = Array.isArray(spec.historico) ? spec.historico : [];
  const novaEntrada = {
    versao: historicoAtual.length + 1,
    usuario: usuario.email,
    acao: 'aprovar',
    data: agora,
    observacao: `Aprovado por ${usuario.nome}. Publicado em knowledge_base ID: ${kbEntry.id}.`,
  };

  // Marcar spec como aprovada e registrar referência ao knowledge_base
  await supabase.from('knowledge_specs').update({
    status: 'aprovado',
    aprovado_por: usuario.nome,
    aprovado_em: agora,
    knowledge_base_id: kbEntry.id,
    updated_at: agora,
    historico: [...historicoAtual, novaEntrada],
  }).eq('id', id);

  // Registro de auditoria
  await supabase.from('knowledge_spec_audit').insert({
    spec_id: id,
    usuario: usuario.email,
    acao: 'aprovar',
    dados: { knowledge_base_id: kbEntry.id, aprovado_por: usuario.nome },
  });

  await supabase.from('knowledge_audit').insert({
    knowledge_id: kbEntry.id,
    usuario: usuario.email,
    acao: 'criar',
    valor_novo: JSON.stringify({ titulo: specTyped.titulo, spec_id: id }),
  });

  return res.status(200).json({ ok: true, id, knowledge_base_id: kbEntry.id });
}
