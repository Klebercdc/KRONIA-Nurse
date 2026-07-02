/**
 * POST /api/plantao/reclassificar
 * body: { listaNumerada: string }
 *
 * Roda no Encerramento. Corrige a marcação local de leito (feita por regex
 * em leito-parser.ts, que pode errar com ditado ruim) usando o entendimento
 * de contexto da IA. O cliente aplica o resultado localmente (cria pacientes
 * que faltarem, corrige patientId dos eventos) — ver useTurno.ts:reclassificar.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { chamarGroq, extrairJson } from '../../../lib/groq-client';
import { PROMPT_RECLASSIFICACAO } from '../../../lib/prompts';
import { getUsuarioAutenticado } from '../../../lib/auth-server';
import { dentroDoRateLimit, LIMITE_PLANTAO, MSG_RATE_LIMIT } from '../../../lib/rate-limit';

interface ItemReclassificacao {
  indice: number;
  leito: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });
  if (!(await dentroDoRateLimit(usuario.id, 'plantao/reclassificar', LIMITE_PLANTAO))) {
    return res.status(429).json({ erro: MSG_RATE_LIMIT });
  }

  const { listaNumerada } = req.body as { listaNumerada: string };
  if (!listaNumerada) return res.status(400).json({ erro: 'listaNumerada é obrigatória' });

  try {
    const texto = await chamarGroq(PROMPT_RECLASSIFICACAO, listaNumerada);
    // O modo JSON da Groq exige objeto na raiz ({"mapeamento":[...]}); array
    // puro é aceito por tolerância a variação do modelo.
    const raw = extrairJson<ItemReclassificacao[] | { mapeamento?: ItemReclassificacao[] }>(texto);
    const mapeamento = Array.isArray(raw) ? raw : raw.mapeamento ?? [];
    res.status(200).json({ mapeamento });
  } catch (e) {
    console.error('[plantao/reclassificar] erro:', e);
    res.status(500).json({ erro: 'Não foi possível reclassificar agora.' });
  }
}
