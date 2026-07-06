/**
 * Busca automática de foto de capa (Unsplash) para um conhecimento novo.
 *
 * Fluxo: traduz título/categoria (português) pra uma busca em inglês via
 * Groq — bancos de imagem indexam majoritariamente em inglês —, busca a
 * foto mais relevante no Unsplash e devolve URL + crédito de atribuição
 * (exigido pelos termos da API Unsplash). Sem revisão humana antes de
 * publicar, por decisão explícita do produto — falhas silenciosas caem
 * em cover_url null (front-end já trata capa ausente).
 *
 * UNSPLASH_ACCESS_KEY só existe no servidor. Importar apenas em pages/api/**.
 */
import { chamarGroq, extrairJson } from './groq-client';

const UNSPLASH_SEARCH_URL = 'https://api.unsplash.com/search/photos';
const UTM = 'utm_source=kronia_nurse&utm_medium=referral';

export type FotoCapa = {
  url: string;
  /** "{nome do fotógrafo}|{link do perfil com utm}" — ver composeCreditoHtml. */
  credito: string;
};

export async function buscarFotoCapa(
  titulo: string,
  categoria: string,
  subcategoria?: string | null
): Promise<FotoCapa | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  const query = await gerarBuscaEmIngles(titulo, categoria, subcategoria);

  try {
    const params = new URLSearchParams({
      query,
      per_page: '1',
      orientation: 'squarish',
      content_filter: 'high',
    });
    const resp = await fetch(`${UNSPLASH_SEARCH_URL}?${params.toString()}`, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });
    if (!resp.ok) return null;

    const data = await resp.json();
    const foto = data?.results?.[0];
    if (!foto?.urls?.regular) return null;

    // Termos da API Unsplash exigem disparar o "download" ao usar a foto.
    if (foto.links?.download_location) {
      fetch(`${foto.links.download_location}&client_id=${accessKey}`).catch(() => {});
    }

    const nomeFotografo = foto.user?.name ?? 'Unsplash';
    const linkFotografo = foto.user?.links?.html
      ? `${foto.user.links.html}?${UTM}`
      : `https://unsplash.com/?${UTM}`;

    return { url: foto.urls.regular, credito: `${nomeFotografo}|${linkFotografo}` };
  } catch (err) {
    console.error('[cover-photo] busca falhou:', err);
    return null;
  }
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
