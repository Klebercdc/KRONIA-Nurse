/**
 * POST /api/plantao/gerar-documento
 * body: { formato: 'evolucao' | 'sbar', dados: string }
 *
 * "dados" é texto já montado no cliente (leito, dx, complexidade + eventos
 * cronológicos com [HH:MM]) — ver components/useTurno.ts:montarDadosPaciente.
 * Nenhum dado de paciente é persistido aqui; a rota só repassa para a Groq
 * e devolve o texto gerado.
 *
 * Antes de processar: checar se o usuário tem assinatura ativa (reaproveitar
 * a tabela de plano já existente no KRONIA) — ver TODO abaixo.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { chamarGroq } from '../../../lib/groq-client';
import { promptDocumento, FormatoDocumento } from '../../../lib/prompts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  // TODO: checar assinatura ativa do usuário (plano R$19,90) antes de processar.
  // const autorizado = await checarAssinaturaAtiva(req);
  // if (!autorizado) return res.status(402).json({ erro: 'Assinatura necessária' });

  const { formato, dados } = req.body as { formato: FormatoDocumento; dados: string };
  if (!formato || !dados) return res.status(400).json({ erro: 'formato e dados são obrigatórios' });

  try {
    const texto = await chamarGroq(promptDocumento(formato), dados);
    res.status(200).json({ texto });
  } catch (e) {
    res.status(500).json({ erro: 'Não foi possível gerar o documento agora.' });
  }
}
