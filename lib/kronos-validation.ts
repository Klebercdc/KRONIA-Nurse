/**
 * Validation Engine (em tempo de resposta) — context/kits/
 * kronos-arquitetura-cognitiva.md, Domínio 3. Determinística, sem LLM:
 * nunca "confia" que o texto gerado está certo, só confirma que existe
 * evidência (fragmento) suficiente antes de liberar uma resposta.
 *
 * Nesta primeira fatia não há síntese em prosa (ver Domínio 9 do mesmo
 * kit) — a resposta final é a própria lista de fragmentos citáveis, então
 * "validar a resposta" aqui é validar os fragmentos que a sustentam.
 */
import type { FragmentoEncontrado } from './knowledge-retrieval';

export type ResultadoValidacao =
  | { valido: true; fragmentosValidos: FragmentoEncontrado[] }
  | { valido: false; motivo: string };

export const MSG_SEM_EVIDENCIA =
  'Não foi encontrada evidência suficiente na Base de Conhecimento para responder com segurança.';

/**
 * Filtra fragmentos abaixo do limiar (defesa em profundidade — buscar-rag.ts
 * já filtra no SQL, mas o Validation Engine não deve confiar cegamente no
 * chamador) e recusa liberar resposta se nenhum sobrar.
 */
export function validarFragmentos(
  fragmentos: FragmentoEncontrado[],
  limiar = 0.5
): ResultadoValidacao {
  const fragmentosValidos = fragmentos.filter((f) => f.similarity >= limiar);

  if (fragmentosValidos.length === 0) {
    return { valido: false, motivo: MSG_SEM_EVIDENCIA };
  }

  return { valido: true, fragmentosValidos };
}

/** true se o fragmento tem página de origem rastreável (documentos indexados antes da migration de página não têm). */
export function temPaginaRastreavel(fragmento: FragmentoEncontrado): boolean {
  return fragmento.pagina_inicio != null && fragmento.pagina_fim != null;
}

/** Formata a página de origem de um fragmento ("12" ou "12-13"), ou null se não rastreável. */
export function formatarPagina(paginaInicio: number | null, paginaFim: number | null): string | null {
  if (paginaInicio == null || paginaFim == null) return null;
  return paginaInicio === paginaFim ? `${paginaInicio}` : `${paginaInicio}-${paginaFim}`;
}
