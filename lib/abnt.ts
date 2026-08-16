/**
 * Formatador de citação ABNT — determinístico, sem IA.
 *
 * Substitui o antigo comportamento de usar o `trecho` bruto retornado pelo
 * RAG como se fosse a "referência" de uma Knowledge Specification (ver
 * diagnóstico da reconstrução da Base de Conhecimento: 79% dos trechos
 * salvos eram parágrafos colados, não citações). A citação ABNT é montada
 * só a partir de metadados estruturados do documento de origem — nunca do
 * texto livre do fragmento.
 */

export interface FonteParaCitacao {
  instituicao: string;
  /** Título limpo do documento (ex.: conhecimento_documentos.descricao). Cai para o nome do arquivo se ausente. */
  titulo: string;
  versao?: string | null;
  ano?: number | string | null;
}

export function formatarCitacaoAbnt(fonte: FonteParaCitacao, pagina?: string | null): string {
  const instituicao = fonte.instituicao.toUpperCase();
  const titulo = fonte.titulo.trim().replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();
  const anoStr = fonte.ano != null && String(fonte.ano).trim() ? String(fonte.ano).trim() : '[s.d.]';

  let citacao = `${instituicao}. ${titulo}.`;
  // Alguns documentos têm `versao` preenchida só com o ano de publicação
  // repetido (sem edição/resolução real) — omitir para não gerar "2023. 2023.".
  if (fonte.versao && fonte.versao.trim() && fonte.versao.trim() !== anoStr) {
    citacao += ` ${fonte.versao.trim()}.`;
  }
  citacao += ` ${anoStr}.`;

  if (pagina && pagina.trim()) {
    citacao += ` p. ${pagina.trim()}.`;
  }

  return citacao;
}

const LIMITE_PALAVRAS_CITACAO_LITERAL = 20;

/**
 * Valida a regra da citação literal opcional: no máximo 20 palavras.
 * Quem decide SE uma citação literal é essencial continua sendo humano/Redator
 * — esta função só impede que algo maior que uma citação vire "literal".
 */
export function citacaoLiteralValida(texto: string | undefined | null): boolean {
  if (!texto || !texto.trim()) return true;
  return texto.trim().split(/\s+/).length <= LIMITE_PALAVRAS_CITACAO_LITERAL;
}
