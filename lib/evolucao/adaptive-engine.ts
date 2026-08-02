/**
 * Motor de fluxo condicional — uma pergunta por vez.
 *
 * O motor não sabe nada de enfermagem. Ele só interpreta `schema.perguntas`,
 * decide qual é a próxima pergunta visível a partir do que já foi respondido
 * (`showIf`) e monta o documento final de forma determinística. Todo o
 * conteúdo clínico vive nos schemas (dados), nunca aqui.
 *
 * Duas garantias que este arquivo existe para proteger:
 *
 * 1. **Determinístico.** Nenhuma chamada de IA. O texto gerado é função pura
 *    de (schema, respostas) — auditável e reprodutível, no mesmo espírito de
 *    `lib/scales.ts` (ver ANALISE-GERACAO-SAE.md: mover decisão do prompt para
 *    o código).
 * 2. **`(CONFERIR)` por borda, não por omissão.** Pergunta visível que ficou
 *    sem resposta ou foi pulada aparece marcada no próprio texto gerado —
 *    nunca é silenciosamente descartada.
 */

export type Valor = string | number | boolean;

/** Marca explícita de "pergunta vista e pulada" — distinta de `undefined` (nunca perguntada). */
export const PULADO = '__pulado__';

export type Respostas = Record<string, Valor | undefined>;

/**
 * Condição de exibição. Cada entrada precisa bater para a pergunta entrar na
 * fila. Um array significa "qualquer um destes valores".
 */
export type Condicao = Record<string, Valor | Valor[]>;

export type TipoPergunta = 'bool' | 'opcao' | 'texto' | 'numero';

export interface Pergunta {
  id: string;
  /** Texto exibido ao enfermeiro, na forma de pergunta direta. */
  texto: string;
  tipo: TipoPergunta;
  /** Obrigatório para `tipo: 'opcao'`. */
  opcoes?: string[];
  /** Somente `tipo: 'numero'`. */
  min?: number;
  max?: number;
  unidade?: string;
  /** Casas decimais aceitas (`0` = inteiro). Default: 0. */
  decimais?: number;
  /** Dica curta abaixo da pergunta (critério, referência, exemplo). */
  ajuda?: string;
  showIf?: Condicao;
  /** Agrupa a pergunta numa seção do documento gerado. */
  bloco: string;
  /**
   * Frase clínica determinística para o documento. Recebe o valor respondido e
   * o mapa completo de respostas (para frases que dependem de contexto).
   * Retornar string vazia omite o trecho.
   */
  frase: (valor: Valor, respostas: Respostas) => string;
}

export interface Schema {
  id: string;
  /** Nome do chip determinístico na Home — toda ação nasce nomeada. */
  nome: string;
  /** Título do documento gerado. */
  titulo: string;
  /** Fontes clínicas que sustentam o schema. Aparecem no rodapé do documento. */
  fontes: string[];
  perguntas: Pergunta[];
}

// ── Fluxo ────────────────────────────────────────────────────────────────────

function bate(esperado: Valor | Valor[], atual: Valor | undefined): boolean {
  if (atual === undefined || atual === PULADO) return false;
  return Array.isArray(esperado) ? esperado.includes(atual) : esperado === atual;
}

/** Todas as condições do `showIf` precisam bater com o que já foi respondido. */
export function condicaoSatisfeita(showIf: Condicao | undefined, respostas: Respostas): boolean {
  if (!showIf) return true;
  return Object.entries(showIf).every(([chave, esperado]) => bate(esperado, respostas[chave]));
}

/** Uma pergunta é visível quando seu `showIf` está satisfeito pelo estado atual. */
export function perguntaVisivel(pergunta: Pergunta, respostas: Respostas): boolean {
  return condicaoSatisfeita(pergunta.showIf, respostas);
}

/**
 * Próxima pergunta a exibir: a primeira ainda não respondida cujo `showIf`
 * bate. `null` significa fim do fluxo.
 */
export function proximaPergunta(schema: Schema, respostas: Respostas): Pergunta | null {
  for (const pergunta of schema.perguntas) {
    if (respostas[pergunta.id] !== undefined) continue;
    if (!perguntaVisivel(pergunta, respostas)) continue;
    return pergunta;
  }
  return null;
}

/** Perguntas visíveis no estado atual — a base do documento e do progresso. */
export function perguntasVisiveis(schema: Schema, respostas: Respostas): Pergunta[] {
  return schema.perguntas.filter((p) => perguntaVisivel(p, respostas));
}

export interface Progresso {
  respondidas: number;
  /** Perguntas visíveis agora. Cresce quando uma resposta abre um bloco novo. */
  visiveis: number;
  /** Fração 0–1. Estimativa: o total pode crescer conforme o fluxo ramifica. */
  fracao: number;
}

export function progresso(schema: Schema, respostas: Respostas): Progresso {
  const visiveis = perguntasVisiveis(schema, respostas);
  const respondidas = visiveis.filter((p) => respostas[p.id] !== undefined).length;
  return {
    respondidas,
    visiveis: visiveis.length,
    fracao: visiveis.length === 0 ? 0 : respondidas / visiveis.length,
  };
}

/** Registra a resposta. Não muta o mapa recebido. */
export function responder(respostas: Respostas, id: string, valor: Valor): Respostas {
  return { ...respostas, [id]: valor };
}

/** Marca a pergunta como vista e pulada — vira `(CONFERIR)` no documento. */
export function pular(respostas: Respostas, id: string): Respostas {
  return { ...respostas, [id]: PULADO };
}

/**
 * Remove a última resposta e tudo que dependia dela. Necessário porque voltar
 * atrás numa ramificação precisa invalidar o ramo que aquela resposta abriu —
 * senão sobra resposta órfã de bloco que não existe mais.
 */
export function desfazer(schema: Schema, respostas: Respostas, id: string): Respostas {
  const limpo: Respostas = { ...respostas };
  delete limpo[id];

  // Repete até estabilizar: remover uma resposta pode esconder perguntas que
  // escondem outras (LPP → estágio, exsudato → tipo de exsudato).
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const pergunta of schema.perguntas) {
      if (limpo[pergunta.id] === undefined) continue;
      if (perguntaVisivel(pergunta, limpo)) continue;
      delete limpo[pergunta.id];
      mudou = true;
    }
  }
  return limpo;
}

// ── Geração ──────────────────────────────────────────────────────────────────

export interface Trecho {
  texto: string;
  /**
   * `true` = campo visível que ficou sem resposta ou foi pulado. A UI renderiza
   * com borda tracejada âmbar dentro do próprio texto — nunca escondido, nunca
   * misturado com badge de sucesso.
   */
  conferir: boolean;
}

export interface Secao {
  titulo: string;
  trechos: Trecho[];
}

export interface DocumentoGerado {
  titulo: string;
  secoes: Secao[];
  /** Versão plana, para o botão Copiar. `(CONFERIR)` fica inline. */
  texto: string;
  fontes: string[];
  /** Quantos campos precisam de conferência antes de ir ao prontuário. */
  totalConferir: number;
}

export const MARCA_CONFERIR = '(CONFERIR)';

const RODAPE =
  'Documento estruturado a partir dos registros do enfermeiro — revisar e ' +
  'assinar (COREN) antes de inserir no prontuário oficial.';

/** Números em padrão brasileiro: vírgula decimal. */
export function fmtNumero(valor: number, decimais = 0): string {
  return valor.toFixed(decimais).replace('.', ',');
}

/**
 * Monta o documento a partir das perguntas visíveis, agrupadas por bloco na
 * ordem em que foram declaradas no schema.
 *
 * Regra central: itera sobre as perguntas VISÍVEIS, não sobre as respondidas.
 * É isso que faz um campo pulado virar `(CONFERIR)` em vez de sumir.
 */
export function gerarDocumento(
  schema: Schema,
  respostas: Respostas,
  titulosDeBloco: Record<string, string> = {},
): DocumentoGerado {
  const secoes: Secao[] = [];
  let totalConferir = 0;

  for (const pergunta of perguntasVisiveis(schema, respostas)) {
    const valor = respostas[pergunta.id];
    const pendente = valor === undefined || valor === PULADO;

    const texto = pendente
      ? `${pergunta.texto} ${MARCA_CONFERIR}`
      : pergunta.frase(valor, respostas);

    if (texto === '') continue;
    if (pendente) totalConferir += 1;

    const titulo = titulosDeBloco[pergunta.bloco] ?? pergunta.bloco;
    const ultima = secoes[secoes.length - 1];
    if (ultima && ultima.titulo === titulo) ultima.trechos.push({ texto, conferir: pendente });
    else secoes.push({ titulo, trechos: [{ texto, conferir: pendente }] });
  }

  const corpo = secoes
    .map((s) => `${s.titulo}\n${s.trechos.map((t) => t.texto).join(' ')}`)
    .join('\n\n');

  const texto = [corpo, `Enfermeiro(a) Responsável — [data/hora]`, RODAPE]
    .filter((p) => p !== '')
    .join('\n\n');

  return { titulo: schema.titulo, secoes, texto, fontes: schema.fontes, totalConferir };
}
