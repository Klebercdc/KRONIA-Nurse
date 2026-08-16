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

// O ditado por voz frequentemente transcreve o número do leito por extenso
// ("leito sete"). Normalizar para algarismo aqui garante que "leito sete" e
// "leito 7" virem o mesmo rótulo "Leito 7". Token fora do mapa fica literal.
const NUMEROS_EXTENSO: Record<string, number> = {
  um: 1, uma: 1,
  dois: 2, duas: 2,
  tres: 3, 'três': 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  catorze: 14, quatorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
};

export function detectarLeito(texto: string): DeteccaoLeito | null {
  const match = texto.match(/\b(?:e?leito)\s+([^\s,;:.]+)/i);
  if (!match || match.index === undefined) return null;

  const porExtenso = NUMEROS_EXTENSO[match[1].toLowerCase()];
  const leito = `Leito ${porExtenso ?? match[1]}`;
  let resto = (texto.slice(0, match.index) + texto.slice(match.index + match[0].length))
    .replace(/^[\s,;:.\-]+/, '')
    .trim();

  if (!resto) resto = '(sem detalhes adicionais)';
  return { leito, resto };
}
