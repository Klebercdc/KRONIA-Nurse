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
      .select('titulo, resumo, conteudo, referencias, autor')
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
    });

    const { error } = await supabase
      .from('knowledge_base')
      .update({ titulo, resumo, categoria, subcategoria, especialidade, palavras_chave, conteudo, referencias, autor, data_revisao: data_revisao || null, embedding, updated_at: agora })
      .eq('id', id);

    if (error) return res.status(500).json({ erro: error.message });

    await supabase.from('knowledge_audit').insert({
      knowledge_id: id,
      usuario: usuario.email,
      acao: 'editar',
      valor_anterior: JSON.stringify({ titulo: atual.titulo, resumo: atual.resumo, conteudo: atual.conteudo }),
      valor_novo: JSON.stringify({ titulo, resumo, conteudo }),
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
    knowledge_id: data.id,
    usuario: usuario.email,
    acao: 'criar',
    valor_novo: JSON.stringify({ titulo, resumo, conteudo }),
  });

  return res.status(201).json({ ok: true, id: data.id });
}
