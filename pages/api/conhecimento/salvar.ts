import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabase } from '../../../lib/supabase-client';
import { gerarEmbedding, textoParaEmbedding } from '../../../lib/embeddings';
import { getUsuarioAutenticado } from '../../../lib/auth-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });

  const { id, titulo, resumo, categoria, subcategoria, especialidade, palavras_chave, conteudo, referencias, data_revisao } = req.body as Record<string, string>;

  if (!titulo || !conteudo) return res.status(400).json({ erro: 'titulo e conteudo são obrigatórios.' });

  const supabase = getSupabase();

  let embedding: number[];
  try {
    embedding = await gerarEmbedding(textoParaEmbedding(titulo, resumo ?? '', conteudo), 'search_document');
  } catch (err) {
    console.error('[conhecimento/salvar] embedding error:', err);
    return res.status(500).json({ erro: 'Falha ao gerar embedding.' });
  }

  const agora = new Date().toISOString();
  const autor = usuario.nome;

  if (id) {
    const { data: atual } = await supabase
      .from('knowledge_base')
      .select('titulo, resumo, conteudo, referencias, autor, objetivo, escopo, indicacoes, contraindicacoes, materiais, preparacao, procedimento, cuidados, complicacoes, prevencao_eventos_adversos, pontos_criticos, observacoes, limitacoes, variacoes_institucionais')
      .eq('id', id)
      .single();

    if (!atual) return res.status(404).json({ erro: 'Entrada não encontrada.' });

    const { count } = await supabase
      .from('knowledge_versions')
      .select('*', { count: 'exact', head: true })
      .eq('knowledge_id', id);

    await supabase.from('knowledge_versions').insert({
      knowledge_id: id,
      versao: (count ?? 0) + 1,
      titulo: atual.titulo,
      resumo: atual.resumo,
      conteudo: atual.conteudo,
      referencias: atual.referencias,
      autor: atual.autor,
      // Seções estruturadas (colunas adicionadas via ALTER TABLE — migration 20260630_alter)
      objetivo:                   atual.objetivo                   ?? null,
      escopo:                     atual.escopo                     ?? null,
      indicacoes:                 atual.indicacoes                 ?? null,
      contraindicacoes:           atual.contraindicacoes           ?? null,
      materiais:                  atual.materiais                  ?? null,
      preparacao:                 atual.preparacao                 ?? null,
      procedimento:               atual.procedimento               ?? null,
      cuidados:                   atual.cuidados                   ?? null,
      complicacoes:               atual.complicacoes               ?? null,
      prevencao_eventos_adversos: atual.prevencao_eventos_adversos ?? null,
      pontos_criticos:            atual.pontos_criticos            ?? null,
      observacoes:                atual.observacoes                ?? null,
      limitacoes:                 atual.limitacoes                 ?? null,
      variacoes_institucionais:   atual.variacoes_institucionais   ?? null,
    });

    const { error } = await supabase
      .from('knowledge_base')
      .update({ titulo, resumo, categoria, subcategoria, especialidade, palavras_chave, conteudo, referencias, autor, data_revisao: data_revisao || null, embedding, updated_at: agora })
      .eq('id', id);

    if (error) return res.status(500).json({ erro: error.message });

    await supabase.from('knowledge_audit').insert({
      knowledge_base_id: id,
      realizado_por: usuario.email,
      acao: 'editar',
      detalhes: {
        anterior: { titulo: atual.titulo, resumo: atual.resumo, conteudo: atual.conteudo },
        novo: { titulo, resumo, conteudo },
      },
    });

    return res.status(200).json({ ok: true, id });
  }

  const { data, error } = await supabase
    .from('knowledge_base')
    .insert({ titulo, resumo, categoria, subcategoria, especialidade, palavras_chave, conteudo, referencias, autor, data_revisao: data_revisao || null, embedding })
    .select('id')
    .single();

  if (error) return res.status(500).json({ erro: error.message });

  await supabase.from('knowledge_audit').insert({
    knowledge_base_id: data.id,
    realizado_por: usuario.email,
    acao: 'criar',
    detalhes: { titulo, resumo, conteudo },
  });

  return res.status(201).json({ ok: true, id: data.id });
}
