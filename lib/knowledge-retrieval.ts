/**
 * Retrieval Engine — context/kits/kronos-arquitetura-cognitiva.md, Domínio 1.
 * Único objetivo: localizar Objetos de Conhecimento por busca vetorial.
 * Nunca responde perguntas, nunca interpreta documentos, nunca gera texto.
 *
 * Compartilhado por pages/api/conhecimento/buscar-rag.ts (uso manual/admin)
 * e pages/api/kronos/perguntar.ts (Response Engine mínimo) — mesma lógica,
 * um único lugar pra não divergir.
 */
import { gerarEmbedding } from './embeddings';
import { getSupabase } from './supabase-client';

export type FragmentoEncontrado = {
  fragmento_id: string;
  documento_id: string;
  nome_arquivo: string;
  tipo_documento: string;
  instituicao: string;
  versao: string | null;
  ano_publicacao: number | null;
  descricao: string | null;
  numero_sequencia: number;
  pagina_inicio: number | null;
  pagina_fim: number | null;
  conteudo: string;
  similarity: number;
};

export const MATCH_COUNT_MAX = 10;
export const MATCH_COUNT_PADRAO = 5;
export const SIMILARITY_THRESHOLD_PADRAO = 0.5;

/**
 * Gera o embedding da consulta e busca os fragmentos mais similares via RPC
 * `buscar_fragmentos_conhecimento`. Não interpreta nem sintetiza — só recupera.
 */
export async function buscarFragmentos(
  consulta: string,
  opcoes?: { matchCount?: number; limiar?: number }
): Promise<FragmentoEncontrado[]> {
  const matchCount = Math.min(
    Number.isInteger(opcoes?.matchCount) && (opcoes!.matchCount as number) > 0
      ? (opcoes!.matchCount as number)
      : MATCH_COUNT_PADRAO,
    MATCH_COUNT_MAX
  );
  const limiar = opcoes?.limiar ?? SIMILARITY_THRESHOLD_PADRAO;

  const embedding = await gerarEmbedding(consulta.trim());

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('buscar_fragmentos_conhecimento', {
    query_embedding: embedding,
    similarity_threshold: limiar,
    match_count: matchCount,
  });

  if (error) throw error;
  return (data ?? []) as FragmentoEncontrado[];
}
