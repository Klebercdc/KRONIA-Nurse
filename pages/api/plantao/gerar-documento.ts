/**
 * POST /api/plantao/gerar-documento
 * body: { formato: 'evolucao' | 'sbar', dados: string }
 *
 * "dados" é texto já montado no cliente (leito, dx, complexidade + eventos
 * cronológicos com [HH:MM]) — ver components/useTurno.ts:montarDadosPaciente.
 * Nenhum dado de paciente é persistido aqui; a rota só repassa para a Groq
 * e devolve o texto gerado.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { chamarGroq } from '../../../lib/groq-client';
import { promptDocumento, FormatoDocumento } from '../../../lib/prompts';
import { getUsuarioAutenticado } from '../../../lib/auth-server';
import { dentroDoRateLimit, LIMITE_PLANTAO, MSG_RATE_LIMIT } from '../../../lib/rate-limit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });
  if (!(await dentroDoRateLimit(usuario.id, 'plantao/gerar-documento', LIMITE_PLANTAO))) {
    return res.status(429).json({ erro: MSG_RATE_LIMIT });
  }

  const { formato, dados } = req.body as { formato: FormatoDocumento; dados: string };
  if (!formato || !dados) return res.status(400).json({ erro: 'formato e dados são obrigatórios' });

  try {
    const texto = await chamarGroq(promptDocumento(formato), dados, { json: false });
    res.status(200).json({ texto });
  } catch (e) {
    res.status(500).json({ erro: 'Não foi possível gerar o documento agora.' });
  }
}
