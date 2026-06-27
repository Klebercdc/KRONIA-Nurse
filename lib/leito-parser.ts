/**
 * Detecção LOCAL e instantânea de "leito X" numa fala/texto — sem chamar IA.
 * Tolerante ao erro mais comum observado em teste real: o ditado do iOS
 * transcrevendo "leito" como "eleito".
 *
 * Esta é só a primeira passada (grátis, instantânea, roda no cliente).
 * A correção fina por contexto acontece em reclassificar.ts, que roda no
 * Encerramento e resolve os casos que esta regex não pegar — por isso ela
 * não precisa ser perfeita, só "boa o suficiente" para a experiência de
 * captura em tempo real.
 */

export interface DeteccaoLeito {
  leito: string;
  resto: string;
}

export function detectarLeito(texto: string): DeteccaoLeito | null {
  const match = texto.match(/\b(?:e?leito)\s+([^\s,;:.]+)/i);
  if (!match || match.index === undefined) return null;

  const leito = `Leito ${match[1]}`;
  let resto = (texto.slice(0, match.index) + texto.slice(match.index + match[0].length))
    .replace(/^[\s,;:.\-]+/, '')
    .trim();

  if (!resto) resto = '(sem detalhes adicionais)';
  return { leito, resto };
}
