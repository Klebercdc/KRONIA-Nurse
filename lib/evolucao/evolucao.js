/**
 * Evolução de Enfermagem — a foto do paciente no momento da avaliação.
 *
 * ESTE DOCUMENTO NÃO É O REGISTRO DO PROCESSO DE ENFERMAGEM. A distinção
 * custou uma refatoração e vale deixar escrita:
 *
 *   - O Processo de Enfermagem tem etapas (Res. COFEN 736/2024, Art. 4º):
 *     Avaliação, Diagnóstico, Planejamento, Implementação e Evolução.
 *   - A EVOLUÇÃO é UMA dessas etapas, não o invólucro das outras. O § 5º a
 *     define como "a avaliação dos resultados alcançados (...) permite a
 *     análise e a revisão de todo o Processo de Enfermagem".
 *   - Diagnóstico e Planejamento (a prescrição de enfermagem) são registros
 *     PRÓPRIOS E SEPARADOS — a Res. 358/2009 já os listava assim: "privativo
 *     do enfermeiro o registro dos diagnósticos de enfermagem, da prescrição
 *     de enfermagem e da evolução ou avaliação de enfermagem". Três coisas,
 *     não uma com três seções.
 *
 * Por isso não há aqui bloco de diagnóstico nem de planejamento, e a ausência
 * NÃO é lacuna a fechar: eles nunca pertenceram a este documento. Cada
 * hospital os registra no sistema próprio. Uma versão anterior deste arquivo
 * montava a saída em "blocos do Processo de Enfermagem", o que era o erro de
 * enquadramento que esta refatoração desfaz.
 *
 * ESTE ARQUIVO NÃO TEM IA. É composição determinística por cima de
 * gerarTexto(), que continua sendo a única coisa que redige. O motor em
 * grafo-adaptativo.js não é tocado: aqui só o chamamos com sequências
 * filtradas e montamos o documento.
 *
 * A trava que continua valendo por construção: MEDICAÇÃO E CONDUTA NÃO
 * ENTRAM NA DESCRIÇÃO DO PACIENTE. Ver CUIDADOS, abaixo.
 */

import {
  gerarTexto,
  comoChamar,
  isAnswered,
  achadoAlterado,
  ABERTURA_PARAGRAFO,
  SUBGRUPO_POR_ID,
} from './grafo-adaptativo.js';

/**
 * Destino de cada pergunta na evolução.
 *
 * A chave é o subgrupo do motor; SISTEMA_POR_ID abaixo abre exceção por
 * pergunta. Mover uma pergunta de seção é editar uma linha aqui — o texto se
 * reorganiza sozinho.
 */
const SISTEMA_POR_SUBGRUPO = {
  // Abertura: quem é o paciente e como ele se apresenta agora.
  aparencia: 'abertura',
  funcional: 'abertura',

  // Sinais vitais têm linha própria, com os valores aferidos.
  // ATENÇÃO: só entra aqui o que a linha de sinais vitais realmente imprime,
  // ou seja, os ids listados em VITAIS. Qualquer outra pergunta mandada para
  // 'vitais' teria a frase engolida — a linha imprime números, não prosa. O
  // teste "nenhuma resposta some do documento" existe por causa disso.
  hemodinamica: 'vitais',
  respiratorio_geral: 'vitais',
  temperatura: 'vitais',

  // Exame físico, por sistema.
  olhos_pupilas: 'neurologico',
  reflexos_neo: 'neurologico',
  sedacao: 'neurologico',
  dor: 'neurologico',
  pulmonar: 'respiratorio',
  via_aerea: 'respiratorio',
  cardiaco: 'cardiovascular',
  abdominal: 'gastrointestinal',
  umbilical: 'gastrointestinal',
  eliminacoes: 'geniturinario',
  obstetrico: 'geniturinario',
  puerperio: 'geniturinario',
  pele: 'pele',
  cirurgico: 'pele',
  membros: 'membros',
  cranio_face: 'cabeca_pescoco',
  orl: 'cabeca_pescoco',
  pescoco: 'cabeca_pescoco',
  acessos: 'dispositivos',

  // Depois do exame.
  dieta_grupo: 'dieta',
  metabolico: 'dieta',
  drogas: 'cuidados',
  fototerapia_neo: 'cuidados',
  resultado: 'resposta',
  psico: 'fecho',
  seguranca: 'fecho',
};

/**
 * Exceções por pergunta, onde o subgrupo do motor agrupa coisas que a
 * evolução separa.
 */
const SISTEMA_POR_ID = {
  // Coloração e hidratação abrem a evolução ("corado, hidratado"); o resto do
  // subgrupo `pele` descreve o tegumento no exame.
  pele_coloracao: 'apresentacao',
  hidratacao: 'apresentacao',

  // O dispositivo de via aérea entra na abertura ("em ar ambiente", "sob O₂
  // por cateter nasal"); os parâmetros do ventilador são detalhe do exame
  // respiratório.
  via_aerea: 'suporte_abertura',
  via_aerea_neo: 'suporte_abertura',
  fluxo_o2: 'suporte_abertura',

  // Força motora é achado de membros; a mobilidade é como o paciente se
  // apresenta, e abre a evolução ("deambulando", "acamado").
  forca_motora: 'membros',

  // Silverman é achado do exame respiratório, não sinal vital medido: sem
  // esta exceção ele cairia na fatia 'vitais' e a frase sumiria do documento.
  silverman: 'respiratorio',

  // RASS é avaliação neurológica; a droga que sedou é terapia em curso.
  sedativo_qual: 'cuidados',
  sedativo_outro_nome: 'cuidados',
  dose_midazolam: 'cuidados',
  dose_propofol: 'cuidados',
  dose_fentanil: 'cuidados',
  dose_dexmedetomidina: 'cuidados',
  dose_outra_sedativo: 'cuidados',

  // Conduta é o que foi FEITO frente a um achado — vai para cuidados, não
  // para a descrição do achado.
  conduta_fc_alterada: 'cuidados',
  conduta_pa_alterada: 'cuidados',
  conduta_hipoxemia: 'cuidados',
  conduta_febre: 'cuidados',
  conduta_termica_neo: 'cuidados',
  conduta_dor_toracica: 'cuidados',
  conduta_desconforto_grave: 'cuidados',
  conduta_loquios_odor: 'cuidados',
};

/** Seções do exame físico, na ordem em que saem no documento. */
const SISTEMAS_EXAME = [
  ['neurologico', 'Neurológico'],
  ['cabeca_pescoco', 'Cabeça e pescoço'],
  ['respiratorio', 'Respiratório'],
  ['cardiovascular', 'Cardiovascular'],
  ['gastrointestinal', 'Gastrointestinal'],
  ['geniturinario', 'Geniturinário'],
  ['pele', 'Pele e tegumento'],
  ['membros', 'Membros'],
  ['dispositivos', 'Dispositivos'],
];

/** Sigla e ordem dos sinais vitais na linha própria. */
const VITAIS = [
  ['pa', 'PA'],
  ['fc', 'FC'],
  ['fr', 'FR'],
  ['spo2', 'SpO₂'],
  ['temperatura', 'T'],
];

const ASSINATURA = 'Enfermeiro(a) Responsável — [data/hora]';

/**
 * A assinatura NÃO leva marcador de número/categoria do COREN, e isso é
 * decisão tomada, não lacuna: o Art. 35 do Código de Ética (Res. COFEN
 * 564/2017) exige a identificação do profissional no documento, mas quem a
 * aplica é o prontuário eletrônico onde este texto é colado — ele já sabe
 * quem está logado.
 *
 * Data e hora ficam como marcador literal pelo mesmo motivo, com uma razão a
 * mais: o app nunca inventa horário de registro.
 */

/** Em qual seção da evolução esta pergunta cai. */
export function sistemaDe(id) {
  return SISTEMA_POR_ID[id] || SISTEMA_POR_SUBGRUPO[SUBGRUPO_POR_ID[id]] || null;
}

/**
 * gerarTexto() devolve a prosa e, colada no fim, as linhas (CONFERIR — ...).
 * Como o documento chama gerarTexto uma vez por seção, as pendências
 * precisam ser separadas: senão apareceriam repetidas em cada uma. Elas são
 * recolhidas uma única vez, da sequência completa, e entram no fim.
 */
function separarPendencias(bruto) {
  const linhas = bruto.split('\n');
  return {
    prosa: linhas.filter((l) => !l.startsWith('(CONFERIR')).join('\n').trim(),
    pendencias: linhas.filter((l) => l.startsWith('(CONFERIR')),
  };
}

/**
 * Decimal em padrão brasileiro: 38,4°C e não 38.4°C. Só troca ponto entre
 * dígitos, então "120x80 mmHg", "+2/4" e "RASS -4" passam intactos.
 */
function decimalBrasileiro(texto) {
  return texto.replace(/(\d)\.(\d)/g, '$1,$2');
}

/**
 * gerarTexto() abre cada parágrafo com a expressão da categoria ("Ao exame
 * físico,", "Em suporte respiratório,"). Numa seção com título próprio isso
 * viraria "Respiratório: Ao exame físico, murmúrio vesicular...".
 *
 * As aberturas possíveis são lidas do próprio ABERTURA_PARAGRAFO, e não de
 * uma lista copiada aqui: se o motor ganhar uma abertura nova, ela é
 * removida junto, sem este arquivo ficar para trás.
 */
function aberturasPossiveis(answers) {
  const todosSubgrupos = new Set(Object.keys(SISTEMA_POR_SUBGRUPO));
  const saidas = [];
  Object.values(ABERTURA_PARAGRAFO).forEach((bruta) => {
    const candidatos =
      typeof bruta === 'function'
        ? [bruta(todosSubgrupos, answers), bruta(new Set(), answers)]
        : [bruta];
    candidatos.forEach((c) => {
      if (c) saidas.push(c);
    });
  });
  saidas.push(comoChamar(answers));
  // Mais longas primeiro: "Em suporte respiratório e sedação," antes de
  // "Em suporte respiratório,".
  return [...new Set(saidas)].sort((a, b) => b.length - a.length);
}

function semAbertura(prosa, aberturas) {
  for (const abertura of aberturas) {
    const prefixo = `${abertura} `;
    if (prosa.startsWith(prefixo)) {
      const resto = prosa.slice(prefixo.length);
      return resto.charAt(0).toUpperCase() + resto.slice(1);
    }
  }
  return prosa;
}

/**
 * Monta a linha "Sinais vitais: PA 120x80 mmHg, FC 78 bpm, ...".
 *
 * Os valores vêm das respostas e as unidades do próprio schema, não de uma
 * tabela paralela aqui. Sinal não respondido simplesmente não aparece — a
 * pendência (CONFERIR) é que o cobra, como qualquer outra pergunta.
 */
function linhaVitais(sequence, answers) {
  const porId = new Map(sequence.map((q) => [q.id, q]));
  const partes = [];
  VITAIS.forEach(([id, sigla]) => {
    const q = porId.get(id);
    if (!q || !isAnswered(q, answers)) return;
    if (q.type === 'numeric_pair') {
      const { a, b } = answers[id];
      partes.push(`${sigla} ${a}x${b} ${q.unitA}`);
    } else {
      // "%" e "°C" colam no número; "bpm", "irpm" e "mmHg" levam espaço.
      const colado = q.unit === '%' || q.unit === '°C';
      partes.push(`${sigla} ${answers[id]}${colado ? '' : ' '}${q.unit}`);
    }
  });
  return partes.length ? `Sinais vitais: ${partes.join(', ')}.` : null;
}

/**
 * Descritores dos sinais vitais ALTERADOS, para a abertura: "febril",
 * "taquicárdico", "hipotenso".
 *
 * O valor exato não vem junto — ele está na linha de sinais vitais, uma vez
 * só. E o achado dentro da faixa não gera descritor nenhum: o COREN-SP
 * proíbe registrar sinal vital como "afebril"/"eupneico", e a linha de
 * vitais já diz o número.
 */
function descritoresAlterados(sequence, answers) {
  return sequence
    .filter((q) => typeof q.classify === 'function' && VITAIS.some(([id]) => id === q.id))
    .filter((q) => isAnswered(q, answers))
    .map((q) => {
      const r =
        q.type === 'numeric_pair'
          ? q.classify(Number(answers[q.id].a), Number(answers[q.id].b), answers)
          : q.classify(Number(answers[q.id]), answers);
      return achadoAlterado(r) ? r.label : null;
    })
    .filter(Boolean);
}

/**
 * Monta a Evolução de Enfermagem.
 *
 * @param {object} context   contexto do schema (CONTEXTS[0])
 * @param {object} answers   respostas acumuladas
 * @param {Array}  sequence  sequência efetiva, vinda de buildSequence()
 * @returns {string} documento pronto para o prontuário
 */
export function gerarEvolucao(context, answers, sequence) {
  const destino = (q) =>
    SISTEMA_POR_ID[q.id] || SISTEMA_POR_SUBGRUPO[SUBGRUPO_POR_ID[q.id]] || 'fecho';

  const fatia = (nome) => sequence.filter((q) => destino(q) === nome);
  const aberturas = aberturasPossiveis(answers);
  /**
   * Prosa de uma seção, em UM parágrafo.
   *
   * gerarTexto quebra a fatia nos parágrafos das categorias do motor
   * (geral, exame físico, suporte...). Numa seção com título próprio isso
   * viraria "Neurológico:" seguido de duas linhas soltas — então os
   * parágrafos são juntados, e a abertura de cada um sai.
   */
  const prosaDe = (nome, manterIdentificacao = false) => {
    const seq = fatia(nome);
    if (!seq.length) return '';
    const bruto = separarPendencias(gerarTexto(context, answers, seq)).prosa;
    const lista = manterIdentificacao ? aberturas.filter((a) => a !== comoChamar(answers)) : aberturas;
    return bruto
      .split('\n\n')
      .map((par) => semAbertura(par.trim(), lista))
      .filter(Boolean)
      .join(' ');
  };

  const partes = [];

  // ── Abertura ─────────────────────────────────────────────────────────────
  //
  // Ordem do template: quem é e como está (identificação, consciência,
  // mobilidade) → "Apresenta-se" com coloração, hidratação e os sinais vitais
  // ALTERADOS → via aérea. Tudo num parágrafo só.
  //
  // O sinal vital dentro da faixa não vira descritor: o COREN-SP proíbe
  // registrar como "afebril"/"eupneico", e a linha de sinais vitais logo
  // abaixo já traz o valor exato.
  const apresentacao = [prosaDe('apresentacao'), ...descritoresAlterados(sequence, answers)]
    .filter(Boolean)
    .map((t) => t.replace(/\.$/, ''))
    .join(', ');
  const primeiro = [
    prosaDe('abertura', true),
    apresentacao ? `Apresenta-se ${lowerInicial(apresentacao)}.` : '',
    prosaDe('suporte_abertura'),
  ]
    .filter(Boolean)
    .join(' ');
  if (primeiro) partes.push(primeiro);

  const vitais = linhaVitais(sequence, answers);
  if (vitais) partes.push(vitais);

  // ── Exame físico, por sistema ────────────────────────────────────────────
  const linhas = SISTEMAS_EXAME.map(([nome, titulo]) => {
    const prosa = prosaDe(nome);
    // Depois de dois-pontos a frase segue em minúscula.
    return prosa ? `- ${titulo}: ${lowerInicial(prosa)}` : null;
  }).filter(Boolean);
  if (linhas.length) partes.push(`Ao exame físico:\n${linhas.join('\n')}`);

  // ── Dieta e metabólico ───────────────────────────────────────────────────
  const dieta = prosaDe('dieta');
  if (dieta) partes.push(dieta);

  // ── O que foi feito ──────────────────────────────────────────────────────
  const cuidados = prosaDe('cuidados');
  if (cuidados) partes.push(`Realizados cuidados de enfermagem: ${lowerInicial(cuidados)}`);

  // ── Como o paciente respondeu ────────────────────────────────────────────
  const resposta = prosaDe('resposta');
  if (resposta) partes.push(`Paciente apresentou: ${lowerInicial(resposta)}`);

  // ── Fecho ────────────────────────────────────────────────────────────────
  const fecho = prosaDe('fecho');
  partes.push(
    [
      'Mantido em acompanhamento pela equipe de enfermagem, com cuidados conforme prescrição e protocolo institucional.',
      fecho,
    ]
      .filter(Boolean)
      .join(' '),
  );

  // Pendências e inconsistências saem da sequência COMPLETA, uma vez só: é o
  // que garante que nada some por ter caído na fatia de outra seção.
  const { pendencias } = separarPendencias(gerarTexto(context, answers, sequence));

  let documento = partes.join('\n\n');
  if (pendencias.length > 0) documento += `\n\n${pendencias.join('\n')}`;
  documento += `\n\n${ASSINATURA}`;

  return decimalBrasileiro(documento);
}

function lowerInicial(texto) {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

export { SISTEMA_POR_SUBGRUPO, SISTEMA_POR_ID, SISTEMAS_EXAME, VITAIS };
