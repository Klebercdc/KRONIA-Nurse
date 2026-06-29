/**
 * POST /api/plantao/calcular-alertas
 * body: { dados: string }
 *
 * Divisão de responsabilidade deliberada: a IA só EXTRAI valores explícitos
 * do texto (lib/prompts.ts:PROMPT_ALERTAS); a soma e a classificação de risco
 * são feitas aqui, em código puro (lib/scales.ts) — nunca pela IA. Isso é o
 * que mantém "calculadora sobre o que você disse", não "IA decidindo risco".
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { chamarGroq, extrairJson } from '../../../lib/groq-client';
import { PROMPT_ALERTAS } from '../../../lib/prompts';
import { calcularNews2, calcularQsofa } from '../../../lib/scales';

type ChaveNews2 = 'fr' | 'spo2' | 'o2' | 'pas' | 'fc' | 'consc' | 'temp';

interface TermoQualitativo {
  termo: string;
  parametro: string;
  chaveNews2: ChaveNews2 | null;
}

interface ExtracaoPaciente {
  leito: string;
  valores: Partial<Record<ChaveNews2, number>>;
  qsofaPontos?: number;
  fontes?: string;
  termosQualitativos?: TermoQualitativo[];
}

export interface TermoSemValor {
  termo: string;
  parametro: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  const { dados } = req.body as { dados: string };
  if (!dados) return res.status(400).json({ erro: 'dados é obrigatório' });

  try {
    const texto = await chamarGroq(PROMPT_ALERTAS, dados);
    const extracoes = extrairJson<ExtracaoPaciente[]>(texto);

    const resultado = extracoes.map((e) => {
      const valoresPresentes = Object.values(e.valores ?? {});
      // NEWS2 só é calculado se houver pelo menos os parâmetros mínimos
      // de PA, FC, FR e consciência — caso contrário fica null (sem dado).
      const completoOSuficiente = ['fr', 'pas', 'fc', 'consc'].every(
        (k) => e.valores && e.valores[k as ChaveNews2] !== undefined
      );

      // Filtra termos qualitativos cujo parâmetro numérico já foi extraído —
      // evita mostrar alerta qualitativo quando o número concreto já está presente.
      const termosSemValor: TermoSemValor[] = (e.termosQualitativos ?? [])
        .filter((t) => !t.chaveNews2 || e.valores?.[t.chaveNews2] === undefined)
        .map(({ termo, parametro }) => ({ termo, parametro }));

      return {
        leito: e.leito,
        news2: completoOSuficiente ? calcularNews2(valoresPresentes) : null,
        qsofa: e.qsofaPontos !== undefined ? calcularQsofa(e.qsofaPontos) : null,
        fontes: e.fontes ?? '',
        termosSemValor,
      };
    });

    res.status(200).json({ resultado });
  } catch (e) {
    res.status(500).json({ erro: 'Não foi possível calcular os alertas agora.' });
  }
}
