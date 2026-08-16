/**
 * POST /api/kronos/perguntar
 *
 * Response Engine mínimo (context/kits/kronos-arquitetura-cognitiva.md,
 * Domínio 9): orquestra Context -> Retrieval -> Validation -> Response.
 *
 * Sem síntese em prosa nesta primeira fatia — a resposta é a própria lista
 * de fragmentos citáveis (documento, instituição, página quando existir,
 * trecho), nunca um texto gerado por LLM. Ver "Fora deste plano" em
 * context/plans/plan-kronos-mvp-retrieval-validacao-resposta.md: síntese em
 * prosa só entra depois que o Validation Engine tiver como auditar texto
 * gerado, não só fragmentos recuperados.
 *
 * Sem UI de chat, sem histórico de conversa — decisão já registrada no kit
 * (Agent Engine fica para depois).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getUsuarioAutenticado } from '../../../lib/auth-server';
import { dentroDoRateLimit, LIMITE_PROFESSOR, MSG_RATE_LIMIT } from '../../../lib/rate-limit';
import { montarContexto } from '../../../lib/kronos-context';
import { buscarFragmentos } from '../../../lib/knowledge-retrieval';
import { validarFragmentos, temPaginaRastreavel, formatarPagina } from '../../../lib/kronos-validation';

interface Evidencia {
  documento: string;
  instituicao: string;
  pagina: string | null;
  trecho: string;
  similaridade: number;
}

type RespostaKronos =
  | { resposta: null; motivo: string }
  | { resposta: { evidencias: Evidencia[] } };

export default async function handler(req: NextApiRequest, res: NextApiResponse<RespostaKronos | { erro: string }>) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });
  if (!(await dentroDoRateLimit(usuario.id, 'kronos/perguntar', LIMITE_PROFESSOR))) {
    return res.status(429).json({ erro: MSG_RATE_LIMIT });
  }

  const { pergunta } = req.body as { pergunta?: string };
  if (!pergunta || typeof pergunta !== 'string' || !pergunta.trim()) {
    return res.status(400).json({ erro: 'Campo "pergunta" obrigatório.' });
  }

  // Context Engine
  const contexto = montarContexto(usuario, pergunta);

  // Retrieval Engine
  let fragmentos;
  try {
    fragmentos = await buscarFragmentos(contexto.pergunta);
  } catch (err) {
    console.error('[kronos/perguntar] erro na recuperação:', err);
    return res.status(500).json({ erro: 'Erro ao buscar na Base de Conhecimento.' });
  }

  // Validation Engine
  const validacao = validarFragmentos(fragmentos);
  if (!validacao.valido) {
    return res.status(200).json({ resposta: null, motivo: validacao.motivo });
  }

  // Response Engine — só monta a lista de evidências, não sintetiza texto novo
  const evidencias: Evidencia[] = validacao.fragmentosValidos.map((f) => ({
    documento: f.nome_arquivo,
    instituicao: f.instituicao,
    pagina: temPaginaRastreavel(f) ? formatarPagina(f.pagina_inicio, f.pagina_fim) : null,
    trecho: f.conteudo,
    similaridade: f.similarity,
  }));

  return res.status(200).json({ resposta: { evidencias } });
}
