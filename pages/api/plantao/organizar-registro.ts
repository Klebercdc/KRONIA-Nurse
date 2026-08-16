/**
 * POST /api/plantao/organizar-registro
 * body: { texto: string } -> { textoOrganizado: string }
 *
 * Roda logo após o "Adicionar" na tela Registrar: reorganiza UM registro
 * ditado em texto claro (sem seções SAE). O cliente já salvou o texto cru
 * antes de chamar aqui — qualquer erro/timeout desta rota é ignorado no
 * cliente e o registro permanece cru. Nenhuma persistência server-side.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { chamarGroq } from '../../../lib/groq-client';
import { PROMPT_ORGANIZAR_REGISTRO } from '../../../lib/prompts';
import { getUsuarioAutenticado } from '../../../lib/auth-server';
import { dentroDoRateLimit, LIMITE_PLANTAO, MSG_RATE_LIMIT } from '../../../lib/rate-limit';

// Timeout curto: a organização é cosmética e o cliente segue com o texto
// cru — melhor desistir rápido do que segurar a UI. chamarGroq não aceita
// AbortSignal (groq-client fora do escopo desta mudança), então a chamada
// perdedora do race continua até terminar e é descartada.
const TIMEOUT_MS = 5000;

function timeoutEm(ms: number): { promessa: Promise<never>; cancelar: () => void } {
  let timer: NodeJS.Timeout;
  const promessa = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout de ${ms}ms excedido.`)), ms);
  });
  return { promessa, cancelar: () => clearTimeout(timer) };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });
  if (!(await dentroDoRateLimit(usuario.id, 'plantao/organizar-registro', LIMITE_PLANTAO))) {
    return res.status(429).json({ erro: MSG_RATE_LIMIT });
  }

  const { texto } = req.body as { texto?: string };
  if (!texto || !texto.trim()) return res.status(400).json({ erro: 'texto é obrigatório' });

  const timeout = timeoutEm(TIMEOUT_MS);
  try {
    const textoOrganizado = await Promise.race([
      chamarGroq(PROMPT_ORGANIZAR_REGISTRO, texto, { json: false }),
      timeout.promessa,
    ]);
    res.status(200).json({ textoOrganizado });
  } catch (e) {
    console.error('[plantao/organizar-registro] erro:', e);
    res.status(502).json({ erro: 'Não foi possível organizar o registro agora.' });
  } finally {
    timeout.cancelar();
  }
}
