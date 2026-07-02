/**
 * POST /api/plantao/sugerir-complexidade
 * body: { dados: string }
 *
 * Usa IA para sugerir um nível de complexidade por leito, com justificativa
 * rastreável aos dados de origem. A sugestão nunca é aplicada automaticamente —
 * exige confirmação explícita do enfermeiro na tela de Plantão.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { chamarGroq, extrairJson } from '../../../lib/groq-client';
import { promptSugestaoComplexidade } from '../../../lib/prompts';
import { Complexidade } from '../../../lib/types';
import { getUsuarioAutenticado } from '../../../lib/auth-server';
import { dentroDoRateLimit, LIMITE_PLANTAO, MSG_RATE_LIMIT } from '../../../lib/rate-limit';

const COMPLEXIDADES_VALIDAS: Complexidade[] = [
  'minimos', 'intermediarios', 'alta_dependencia', 'semi_intensivos', 'intensivos',
];

export interface SugestaoComplexidade {
  leito: string;
  complexidade: Complexidade;
  justificativa: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });
  if (!(await dentroDoRateLimit(usuario.id, 'plantao/sugerir-complexidade', LIMITE_PLANTAO))) {
    return res.status(429).json({ erro: MSG_RATE_LIMIT });
  }

  const { dados } = req.body as { dados: string };
  if (!dados) return res.status(400).json({ erro: 'dados é obrigatório' });

  try {
    const texto = await chamarGroq(promptSugestaoComplexidade(), dados);
    // O modo JSON da Groq exige objeto na raiz ({"sugestoes":[...]}); array
    // puro é aceito por tolerância a variação do modelo.
    const raw0 = extrairJson<SugestaoComplexidade[] | { sugestoes?: SugestaoComplexidade[] }>(texto);
    const raw = Array.isArray(raw0) ? raw0 : raw0.sugestoes ?? [];
    const sugestoes = raw.filter(
      (s) => s.leito && COMPLEXIDADES_VALIDAS.includes(s.complexidade) && s.justificativa?.trim()
    );
    res.status(200).json({ sugestoes });
  } catch (e) {
    console.error('[plantao/sugerir-complexidade] erro:', e);
    res.status(500).json({ erro: 'Não foi possível gerar sugestões de complexidade agora.' });
  }
}
