/**
 * Busca de fotos candidatas (Unsplash) para a capa de um conhecimento.
 *
 * Fluxo: traduz título/categoria (português) pra uma busca em inglês via
 * Groq — bancos de imagem indexam majoritariamente em inglês —, busca
 * candidatas no Unsplash e devolve URL + crédito de atribuição de cada
 * uma (exigido pelos termos da API Unsplash). NÃO escolhe sozinho — a
 * escolha final é de quem publica (ver /api/conhecimento/definir-foto.ts).
 * Testes com termos clínicos reais (punção, curativo, sonda) mostraram
 * que pegar o primeiro resultado sem revisão traz fotos sem relação
 * nenhuma com o tema — daí a revisão humana ser obrigatória aqui.
 *
 * UNSPLASH_ACCESS_KEY só existe no servidor. Importar apenas em pages/api/**.
 */
import { chamarGroq, extrairJson } from './groq-client';

const UNSPLASH_SEARCH_URL = 'https://api.unsplash.com/search/photos';
const UTM = 'utm_source=kronia_nurse&utm_medium=referral';
const QUANTIDADE_CANDIDATAS = 4;

export type CandidataFoto = {
  /** Miniatura — usada só pra exibir as opções na tela de escolha. */
  thumbUrl: string;
  /** URL em resolução de uso — só esta é salva em cover_url quando escolhida. */
  url: string;
  /** "{nome do fotógrafo}|{link do perfil com utm}" */
  credito: string;
  /** Endpoint de tracking exigido pela Unsplash — chamado só ao confirmar a escolha. */
  downloadLocation: string | null;
};

export async function buscarCandidatasFoto(
  titulo: string,
  categoria: string,
  subcategoria?: string | null
): Promise<CandidataFoto[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return [];

  const query = await gerarBuscaEmIngles(titulo, categoria, subcategoria);

  try {
    const params = new URLSearchParams({
      query,
      per_page: String(QUANTIDADE_CANDIDATAS),
      orientation: 'squarish',
      content_filter: 'high',
    });
    const resp = await fetch(`${UNSPLASH_SEARCH_URL}?${params.toString()}`, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });
    if (!resp.ok) return [];

    const data = await resp.json();
    const resultados: unknown[] = Array.isArray(data?.results) ? data.results : [];

    return resultados
      .map((foto: any): CandidataFoto | null => {
        if (!foto?.urls?.regular || !foto?.urls?.small) return null;
        const nomeFotografo = foto.user?.name ?? 'Unsplash';
        const linkFotografo = foto.user?.links?.html
          ? `${foto.user.links.html}?${UTM}`
          : `https://unsplash.com/?${UTM}`;
        return {
          thumbUrl: foto.urls.small,
          url: foto.urls.regular,
          credito: `${nomeFotografo}|${linkFotografo}`,
          downloadLocation: foto.links?.download_location ?? null,
        };
      })
      .filter((c): c is CandidataFoto => c !== null);
  } catch (err) {
    console.error('[cover-photo] busca falhou:', err);
    return [];
  }
}

/** Dispara o tracking de "download" exigido pela Unsplash — chamar só ao confirmar a escolha. */
export async function registrarUsoFoto(downloadLocation: string | null): Promise<void> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey || !downloadLocation) return;
  await fetch(`${downloadLocation}&client_id=${accessKey}`).catch(() => {});
}

async function gerarBuscaEmIngles(
  titulo: string,
  categoria: string,
  subcategoria?: string | null
): Promise<string> {
  const prompt = `Título: ${titulo}\nCategoria: ${categoria}${subcategoria ? ` / ${subcategoria}` : ''}`;
  const system = `Você gera termos de busca em INGLÊS para um banco de fotos de estoque (Unsplash), a partir do título de um procedimento ou tema de enfermagem em português.
Responda em JSON: {"query": "..."}.
A query deve ter de 2 a 5 palavras em inglês, descrevendo a cena ou ação clínica real (ex.: "venipuncture nurse arm", "wound dressing bandage", "urinary catheter tube", "blood culture collection").
Nunca inclua nomes de produto, marca, ou texto além do JSON.`;

  try {
    const resposta = await chamarGroq(system, prompt);
    const json = extrairJson<{ query?: string }>(resposta);
    return json.query?.trim() || titulo;
  } catch {
    return titulo;
  }
}
