import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabase } from '../../../lib/supabase-client';
import { gerarEmbedding, textoParaEmbedding } from '../../../lib/embeddings';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });

  const { id, titulo, resumo, categoria, subcategoria, especialidade, palavras_chave, conteudo, referencias, autor, data_revisao } = req.body as Record<string, string>;

  if (!titulo || !conteudo) return res.status(400).json({ erro: 'titulo e conteudo são obrigatórios.' });

  const supabase = getSupabase();

  // Gerar embedding a partir de titulo + resumo + conteudo
  let embedding: number[];
  try {
    embedding = await gerarEmbedding(textoParaEmbedding(titulo, resumo ?? '', conteudo));
  } catch (err) {
    console.error('[conhecimento/salvar] embedding error:', err);
    return res.status(500).json({ erro: 'Falha ao gerar embedding.' });
  }

  const agora = new Date().toISOString();

  if (id) {
    // Edição: buscar versão atual para registrar histórico
    const { data: atual } = await supabase
      .from('knowledge_base')
      .select('titulo, resumo, conteudo, referencias, autor')
      .eq('id', id)
      .single();

    if (!atual) return res.status(404).json({ erro: 'Entrada não encontrada.' });

    // Contar versões existentes
    const { count } = await supabase
      .from('knowledge_versions')
      .select('*', { count: 'exact', head: true })
      .eq('knowledge_id', id);

    // Salvar versão anterior
    await supabase.from('knowledge_versions').insert({
      knowledge_id: id,
      versao: (count ?? 0) + 1,
      titulo: atual.titulo,
      resumo: atual.resumo,
      conteudo: atual.conteudo,
      referencias: atual.referencias,
      autor: atual.autor,
    });

    // Atualizar registro principal
    const { error } = await supabase
      .from('knowledge_base')
      .update({ titulo, resumo, categoria, subcategoria, especialidade, palavras_chave, conteudo, referencias, autor, data_revisao: data_revisao || null, embedding, updated_at: agora })
      .eq('id', id);

    if (error) return res.status(500).json({ erro: error.message });

    // Audit log
    await supabase.from('knowledge_audit').insert({
      knowledge_id: id, usuario: autor || 'sistema', acao: 'editar',
      valor_anterior: JSON.stringify(atual),
      valor_novo: JSON.stringify({ titulo, resumo, conteudo, referencias }),
    });

    return res.status(200).json({ ok: true, id });
  }

  // Inserção nova
  const { data, error } = await supabase
    .from('knowledge_base')
    .insert({ titulo, resumo, categoria, subcategoria, especialidade, palavras_chave, conteudo, referencias, autor, data_revisao: data_revisao || null, embedding })
    .select('id')
    .single();

  if (error) return res.status(500).json({ erro: error.message });

  await supabase.from('knowledge_audit').insert({
    knowledge_id: data.id, usuario: autor || 'sistema', acao: 'criar',
    valor_novo: JSON.stringify({ titulo, resumo, conteudo }),
  });

  return res.status(201).json({ ok: true, id: data.id });
}
