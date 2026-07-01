/**
 * POST /api/plantao/relatorio-final
 * body: { dados: string }
 *
 * "dados" já vem montado e ordenado por complexidade do cliente
 * (ver useTurno.ts:montarDadosRelatorioFinal), incluindo o bloco
 * "NOTAS GERAIS (sem leito identificado)" quando existir.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { chamarGroq } from '../../../lib/groq-client';
import { promptRelatorioFinal } from '../../../lib/prompts';
import { getUsuarioAutenticado } from '../../../lib/auth-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });

  const { dados } = req.body as { dados: string };
  if (!dados) return res.status(400).json({ erro: 'dados é obrigatório' });

  try {
    const texto = await chamarGroq(promptRelatorioFinal(), dados, { json: false });
    res.status(200).json({ texto });
  } catch (e) {
    res.status(500).json({ erro: 'Não foi possível gerar o relatório final agora.' });
  }
}
