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
import { getUsuarioAutenticado, usuarioEhAdmin } from '../../../lib/auth-server';
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
  if (!(await usuarioEhAdmin(usuario.id))) return res.status(403).json({ erro: 'Acesso restrito a administradores.' });

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

  // Inserir no knowledge_base (fonte canônica do KRONOS).
  // conteudo = texto composto de todas as seções (usado para embedding e KRONOS).
  // Colunas estruturadas = cada seção individualmente (requer ALTER TABLE — ver migration).
  const { data: kbEntry, error: errKb } = await supabase
    .from('knowledge_base')
    .insert({
      // Campos originais
      titulo:        specTyped.titulo,
      resumo:        specTyped.resumo        ?? '',
      categoria:     specTyped.categoria,
      subcategoria:  specTyped.subcategoria  ?? '',
      especialidade: '',
      palavras_chave: '',
      conteudo,    // texto composto de todas as seções — base do embedding
      referencias,
      autor:         usuario.nome,
      embedding,

      // Seções estruturadas (adicionadas via ALTER TABLE — migration 20260630_alter)
      objetivo:                   specTyped.objetivo                   ?? null,
      escopo:                     specTyped.escopo                     ?? null,
      indicacoes:                 specTyped.indicacoes                 ?? null,
      contraindicacoes:           specTyped.contraindicacoes           ?? null,
      materiais:                  specTyped.materiais                  ?? null,
      preparacao:                 specTyped.preparacao                 ?? null,
      procedimento:               specTyped.procedimento               ?? null,
      cuidados:                   specTyped.cuidados                   ?? null,
      complicacoes:               specTyped.complicacoes               ?? null,
      prevencao_eventos_adversos: specTyped.prevencao_eventos_adversos ?? null,
      pontos_criticos:            specTyped.pontos_criticos            ?? null,
      observacoes:                specTyped.observacoes                ?? null,
      limitacoes:                 specTyped.limitacoes                 ?? null,
      variacoes_institucionais:   specTyped.variacoes_institucionais   ?? null,
      // cover_url/cover_credito ficam null aqui de propósito — a foto é
      // escolhida por alguém da equipe depois da publicação, entre
      // candidatas reais (ver /api/conhecimento/buscar-fotos.ts e
      // /api/conhecimento/definir-foto.ts). Ver lib/cover-photo.ts.

      // Rastreabilidade
      spec_id: id,
      hash:    spec.hash ?? null,
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
    knowledge_base_id: kbEntry.id,
    realizado_por: usuario.email,
    acao: 'criar',
    detalhes: { titulo: specTyped.titulo, spec_id: id },
  });

  return res.status(200).json({ ok: true, id, knowledge_base_id: kbEntry.id });
}
