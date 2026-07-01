-- Corrige o similarity_threshold default de buscar_conhecimento.
--
-- 0.82 era inatingível na prática: embeddings assimétricos do Cohere
-- (search_query vs search_document, embed-multilingual-v3.0) produzem
-- similaridades bem mais baixas que embeddings simétricos. Testado com
-- pergunta claramente relevante ao conteúdo publicado: similarity=0.725.
-- Pergunta irrelevante: similarity=0.321. Com threshold=0.82 o KRONOS
-- nunca encontrava nada, mesmo havendo conteúdo relevante publicado.
--
-- Novo default: 0.5 (separa claramente os dois casos testados).

CREATE OR REPLACE FUNCTION public.buscar_conhecimento(query_embedding vector, similarity_threshold double precision DEFAULT 0.5, match_count integer DEFAULT 3)
 RETURNS TABLE(id uuid, titulo text, resumo text, categoria text, subcategoria text, conteudo text, referencias text, similarity double precision)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    kb.id, kb.titulo, kb.resumo, kb.categoria, kb.subcategoria,
    kb.conteudo, kb.referencias,
    (1 - (kb.embedding <=> query_embedding))::FLOAT AS similarity
  FROM knowledge_base kb
  WHERE
    kb.deleted_at IS NULL
    AND kb.embedding IS NOT NULL
    AND (1 - (kb.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY kb.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$function$;
