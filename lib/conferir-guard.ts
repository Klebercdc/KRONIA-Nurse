/**
 * Guards determinísticos de segurança clínica, aplicados DEPOIS de cada
 * geração por LLM (código, não prompt — prompt é mitigação; isto é garantia).
 *
 * Caso real que motivou este módulo (04/07, Leito 7): o registro capturado
 * continha "1 g genta medicina 80 mg" (CONFERIR). A evolução gerada trocou
 * por "gentamicina 1 g (80 mg)" — nome de medicação reescrito e marcador
 * apagado — e o relatório final manteve o texto cru mas também sem o
 * (CONFERIR). Dois documentos divergentes sobre o mesmo dado, nenhum
 * alertando a dose ambígua (1 g vs 80 mg — ~12x de diferença).
 *
 * Invariantes garantidas aqui:
 * 1. garantirConferir — todo trecho marcado (CONFERIR) na ENTRADA de um
 *    estágio aparece na SAÍDA, literal e marcado. Se o LLM manteve o trecho
 *    mas omitiu o marcador, o marcador é reinjetado no lugar; se o LLM
 *    reescreveu ou omitiu o trecho, o original é anexado em bloco
 *    "ITENS A CONFERIR" no fim do documento. A geração nunca sai "limpa"
 *    por acidente.
 * 2. marcarConflitosDeDose — dois valores de massa (g/mg/mcg) diferentes
 *    colados ao mesmo item, sem separador de enumeração entre eles
 *    (ex: "1 g genta medicina 80 mg"), forçam (CONFERIR) se ainda não houver.
 *
 * Falso positivo aqui é aceitável por desenho: marcar demais pede uma
 * conferência humana a mais; marcar de menos deixa passar dose errada.
 */

export const MARCA_CONFERIR = '(CONFERIR)';

function normalizar(t: string): string {
  return t.toLowerCase().replace(/\s+/g, ' ').trim();
}

function escapeRegex(t: string): string {
  return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Regex que encontra o trecho literal tolerando apenas variação de espaço/caixa. */
function regexLiteralFlexivel(trecho: string): RegExp {
  const partes = trecho.split(/\s+/).map(escapeRegex);
  return new RegExp(partes.join('\\s+'), 'gi');
}

/** Caracteres de fechamento que o marcador deve pular antes de ser inserido. */
const FECHAMENTOS = '")»”’';

const MAX_PALAVRAS_CONTEXTO = 8;

/**
 * Extrai os trechos marcados (CONFERIR) de um texto. Prioriza o formato
 * canônico do organizador — "trecho literal" (CONFERIR) — e, para marcadores
 * sem aspas, usa as últimas palavras da frase anterior como trecho.
 */
export function extrairFragmentosConferir(texto: string): string[] {
  const frags: string[] = [];
  const vistos = new Set<string>();
  const add = (t: string) => {
    const chave = normalizar(t);
    if (chave && !vistos.has(chave)) {
      vistos.add(chave);
      frags.push(t);
    }
  };

  const cobertos: Array<[number, number]> = [];
  const reQuoted = /"([^"\n]+)"\s*\(CONFERIR\)/g;
  let m: RegExpExecArray | null;
  while ((m = reQuoted.exec(texto))) {
    cobertos.push([m.index, m.index + m[0].length]);
    add(m[1].trim());
  }

  const reMarca = /\(CONFERIR\)/g;
  while ((m = reMarca.exec(texto))) {
    const idx = m.index;
    if (cobertos.some(([a, b]) => idx >= a && idx < b)) continue;
    const antes = texto.slice(Math.max(0, idx - 120), idx);
    const corte = Math.max(
      antes.lastIndexOf('\n'),
      antes.lastIndexOf('.'),
      antes.lastIndexOf(';'),
      antes.lastIndexOf('"')
    );
    const trecho = antes
      .slice(corte + 1)
      .trim()
      .split(/\s+/)
      .slice(-MAX_PALAVRAS_CONTEXTO)
      .join(' ');
    if (trecho) add(trecho);
  }

  return frags;
}

export interface ResultadoConferir {
  texto: string;
  /** Marcadores reinjetados ao lado de trechos que o LLM manteve sem a marca. */
  reinjetados: number;
  /** Trechos que o LLM reescreveu/omitiu, anexados no bloco ITENS A CONFERIR. */
  anexados: number;
}

export const TITULO_BLOCO_CONFERIR =
  'ITENS A CONFERIR — trechos ambíguos preservados automaticamente do registro original (o texto acima pode tê-los alterado; vale o literal abaixo):';

/**
 * Invariante: todo trecho (CONFERIR) da entrada sobrevive na saída.
 * Puro e determinístico — nenhuma chamada de IA.
 */
export function garantirConferir(entrada: string, saida: string): ResultadoConferir {
  const fragmentos = extrairFragmentosConferir(entrada);
  let texto = saida;
  let reinjetados = 0;
  const perdidos: string[] = [];

  for (const frag of fragmentos) {
    const re = regexLiteralFlexivel(frag);
    const insercoes: number[] = [];
    let achou = false;
    let m: RegExpExecArray | null;
    while ((m = re.exec(texto))) {
      achou = true;
      let fim = m.index + m[0].length;
      while (fim < texto.length && FECHAMENTOS.includes(texto[fim])) fim++;
      if (!texto.slice(fim, fim + 30).includes('CONFERIR')) insercoes.push(fim);
    }
    if (!achou) {
      perdidos.push(frag);
      continue;
    }
    for (const pos of insercoes.reverse()) {
      texto = texto.slice(0, pos) + ' ' + MARCA_CONFERIR + texto.slice(pos);
      reinjetados++;
    }
  }

  if (perdidos.length > 0) {
    const bloco = [
      '',
      TITULO_BLOCO_CONFERIR,
      ...perdidos.map((p) => `"${p}" ${MARCA_CONFERIR}`),
    ].join('\n');
    texto = texto.trimEnd() + '\n' + bloco + '\n';
  }

  return { texto, reinjetados, anexados: perdidos.length };
}

// Doses de massa (g/mg/mcg). Exclui concentrações e taxas ("mg/dL",
// "mcg/kg/min") via lookahead de "/" e exclui unidades coladas em palavra
// ("kg" não casa: a alternativa começa no "k"). Comparar só massa evita
// falso conflito com volume (ml) e percentual.
const RE_DOSE_MASSA = /(\d+(?:[.,]\d+)?)\s*(mcg|µg|ug|mg|g)(?![a-zá-ú])(?!\s*\/)/gi;

function paraMg(valor: string, unidade: string): number {
  const v = parseFloat(valor.replace(',', '.'));
  const u = unidade.toLowerCase();
  if (u === 'g') return v * 1000;
  if (u === 'mg') return v;
  return v / 1000; // mcg/µg/ug
}

// Entre duas doses do MESMO item não há vírgula, "+" nem conjunção; se
// houver, é enumeração de itens diferentes ("dipirona 1 g e paracetamol
// 500 mg") e não conflito.
const RE_SEPARADOR_ITENS = /[,+]|\s(?:e|com|mais|ou)\s/i;
const MAX_DISTANCIA_CONFLITO = 60;

export interface ResultadoDose {
  texto: string;
  conflitos: number;
}

/**
 * Guard determinístico de conflito de dose: duas doses de massa com valores
 * diferentes no mesmo item ganham (CONFERIR) se ainda não houver por perto.
 */
export function marcarConflitosDeDose(texto: string): ResultadoDose {
  const doses = [...texto.matchAll(RE_DOSE_MASSA)].map((m) => ({
    inicio: m.index as number,
    fim: (m.index as number) + m[0].length,
    mg: paraMg(m[1], m[2]),
  }));

  const insercoes: number[] = [];
  for (let i = 0; i + 1 < doses.length; i++) {
    const a = doses[i];
    const b = doses[i + 1];
    const entre = texto.slice(a.fim, b.inicio);
    if (entre.length > MAX_DISTANCIA_CONFLITO) continue;
    if (/[.;\n!?]/.test(entre)) continue; // frases diferentes
    if (RE_SEPARADOR_ITENS.test(entre)) continue; // enumeração de itens
    if (a.mg === b.mg) continue; // mesma dose reescrita, sem conflito
    const contexto = texto.slice(Math.max(0, a.inicio - 80), Math.min(texto.length, b.fim + 80));
    if (contexto.includes('CONFERIR')) continue; // já marcado
    if (insercoes.length > 0 && b.fim - insercoes[insercoes.length - 1] < 80) continue;
    insercoes.push(b.fim);
  }

  let resultado = texto;
  for (const pos of [...insercoes].reverse()) {
    let fim = pos;
    while (fim < resultado.length && FECHAMENTOS.includes(resultado[fim])) fim++;
    resultado = resultado.slice(0, fim) + ' ' + MARCA_CONFERIR + resultado.slice(fim);
  }

  return { texto: resultado, conflitos: insercoes.length };
}

export interface ResultadoGuards {
  texto: string;
  reinjetados: number;
  anexados: number;
  conflitosDose: number;
}

/**
 * Composição usada pelas rotas: preserva os (CONFERIR) da entrada e depois
 * marca conflitos de dose que sobraram sem marca.
 */
export function aplicarGuardsClinicos(entrada: string, saida: string): ResultadoGuards {
  const conferir = garantirConferir(entrada, saida);
  const dose = marcarConflitosDeDose(conferir.texto);
  return {
    texto: dose.texto,
    reinjetados: conferir.reinjetados,
    anexados: conferir.anexados,
    conflitosDose: dose.conflitos,
  };
}
