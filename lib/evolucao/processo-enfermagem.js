/**
 * Processo de Enfermagem — encaixe da prosa do motor nos blocos do documento.
 *
 * Resolução COFEN nº 736/2024. Blocos: Dados, Intervenção e Resultado, nesta
 * ordem, sempre presentes, e o que faltar vira "Sem registro para esta seção".
 * Nenhum bloco é omitido, nenhum é preenchido com suposição.
 *
 * A Res. 736/2024 define CINCO etapas. Duas delas — DIAGNÓSTICO e
 * PLANEJAMENTO — não têm bloco aqui, e isso é decisão de produto, não
 * esquecimento nem lacuna a fechar numa próxima auditoria:
 *
 *   - o diagnóstico de enfermagem é registrado no sistema próprio de cada
 *     hospital, em documento à parte;
 *   - o planejamento (a prescrição de enfermagem, o que a SAE antiga chamava
 *     assim) segue a mesma lógica — é documento separado, de cada instituição.
 *
 * O Art. 8º exige o registro de todas as etapas no PRONTUÁRIO. O prontuário,
 * não necessariamente ESTE documento: esta evolução é uma das peças dele.
 *
 * Ou seja: as três etapas que sobram aqui são as que descrevem o paciente no
 * momento (Dados), o que foi feito (Intervenção) e como ele respondeu
 * (Resultado). As outras duas descrevem o plano, e o plano mora em outro
 * lugar.
 *
 * ESTE ARQUIVO NÃO TEM IA. É composição determinística por cima de
 * gerarTexto(), que continua sendo a única coisa que redige. O motor em
 * grafo-adaptativo.js não foi tocado: aqui só chamamos ele com sequências
 * filtradas e montamos o documento.
 *
 * As duas travas do documento original continuam valendo, agora por
 * construção e não por instrução a um modelo:
 *
 *   1. DIAGNÓSTICO NUNCA É INFERIDO. Não existe pergunta de diagnóstico no
 *      schema nem bloco para ele na saída, então não há caminho no código
 *      para um achado numérico virar rótulo clínico.
 *   2. MEDICAÇÃO E CONDUTA NÃO ENTRAM EM DADOS. Ver INTERVENCAO_IDS abaixo.
 */

import { gerarTexto, comoChamar } from './grafo-adaptativo.js';

/**
 * Perguntas cuja resposta é intervenção, não dado observado.
 *
 * Critério, tirado da própria definição dos blocos: entra aqui o que foi
 * FEITO — conduta tomada frente a um achado e medicação em curso. Fica em
 * Dados o que foi OBSERVADO ou o estado em que o paciente se encontra
 * (sinais vitais, exame físico, dispositivos presentes, suporte ventilatório
 * em curso, via de dieta, eliminações).
 *
 * A fronteira entre "terapia em curso" e "estado do paciente" é decisão
 * clínica, não técnica. Mover um id entre esta lista e o resto é a única
 * mudança necessária para reclassificar um achado — o texto se reorganiza
 * sozinho.
 */
export const INTERVENCAO_IDS = [
  // Condutas frente a sinal de alerta.
  'conduta_fc_alterada',
  'conduta_pa_alterada',
  'conduta_hipoxemia',
  'conduta_febre',
  'conduta_termica_neo',
  'conduta_dor_toracica',
  'conduta_desconforto_grave',
  'conduta_loquios_odor',
  // Terapia instituída.
  'fototerapia',
  // Medicação em infusão contínua — a regra do bloco é explícita: medicação
  // vai SEMPRE para Intervenção, nunca para Dados.
  'sedativo_qual',
  'sedativo_outro_nome',
  'dose_midazolam',
  'dose_propofol',
  'dose_fentanil',
  'dose_dexmedetomidina',
  'dose_outra_sedativo',
  'droga_vasoativa',
  'droga_vasoativa_qual',
  'droga_vasoativa_outro_nome',
  'droga_vasoativa_dose',
];

/** Perguntas que alimentam o bloco Resultado — resposta do paciente. */
export const RESULTADO_IDS = ['tem_resultado', 'resultado_avaliacao'];

const SEM_REGISTRO = 'Sem registro para esta seção';

/**
 * A assinatura NÃO leva marcador de número/categoria do COREN, e isso é
 * decisão tomada, não lacuna: o Art. 35 do Código de Ética (Res. COFEN
 * 564/2017) exige a identificação do profissional no documento, mas quem a
 * aplica é o prontuário eletrônico onde este texto é colado — ele já sabe
 * quem está logado. Repetir aqui seria pedir ao enfermeiro que digitasse à
 * mão o que o sistema dele preenche sozinho.
 *
 * Data e hora ficam como marcador literal pelo mesmo motivo, com uma razão a
 * mais: o app nunca inventa horário de registro.
 */
const ASSINATURA = 'Enfermeiro(a) Responsável — [data/hora]';

/**
 * gerarTexto() devolve a prosa e, colada no fim, as linhas (CONFERIR — ...).
 * Como o documento chama gerarTexto mais de uma vez (uma por bloco), as
 * pendências precisam ser separadas: senão apareceriam repetidas dentro de
 * cada bloco. Elas são recolhidas uma única vez, da sequência completa, e
 * entram no fim do documento.
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

function bloco(titulo, corpo) {
  return `${titulo}\n${corpo && corpo.trim() ? corpo : SEM_REGISTRO}`;
}

/**
 * As condutas moram na categoria "geral", cujo parágrafo abre chamando o
 * paciente pelo termo da faixa etária. Isso está certo dentro da prosa
 * corrida, mas em bloco próprio produziria "Paciente equipe médica
 * comunicada..." ou "Recém-nascido incubadora ajustada...". O bloco já se
 * identifica pelo título, então a abertura sai e a frase recomeça.
 *
 * O termo vem de comoChamar() e não de uma lista fixa aqui: assim, mudar a
 * nomenclatura no motor não deixa este arquivo para trás.
 */
function tirarAbertura(prosa, answers) {
  const abertura = comoChamar(answers) + ' ';
  if (!prosa.startsWith(abertura)) return prosa;
  const resto = prosa.slice(abertura.length);
  return resto.charAt(0).toUpperCase() + resto.slice(1);
}

/**
 * Monta a evolução completa nos blocos do Processo de Enfermagem.
 *
 * @param {object} context   contexto do schema (CONTEXTS[0])
 * @param {object} answers   respostas acumuladas
 * @param {Array}  sequence  sequência efetiva, vinda de buildSequence()
 * @returns {string} documento pronto para o prontuário
 */
export function gerarEvolucaoPE(context, answers, sequence) {
  const de = (ids) => sequence.filter((q) => ids.includes(q.id));
  const seqIntervencao = de(INTERVENCAO_IDS);
  const seqResultado = de(RESULTADO_IDS);
  const fora = [...INTERVENCAO_IDS, ...RESULTADO_IDS];
  const seqDados = sequence.filter((q) => !fora.includes(q.id));

  const prosaDe = (seq) => separarPendencias(gerarTexto(context, answers, seq)).prosa;

  const dados = prosaDe(seqDados);
  const intervencao = tirarAbertura(prosaDe(seqIntervencao), answers);
  const resultado = prosaDe(seqResultado);

  // Pendências e inconsistências saem da sequência COMPLETA, uma vez só: é o
  // que garante que nada some por ter caído na fatia de outro bloco.
  const { pendencias } = separarPendencias(gerarTexto(context, answers, sequence));

  const partes = [
    bloco('Dados', dados),
    bloco('Intervenção', intervencao),
    bloco('Resultado', resultado),
  ];

  let documento = partes.join('\n\n');
  if (pendencias.length > 0) documento += `\n\n${pendencias.join('\n')}`;
  documento += `\n\n${ASSINATURA}`;

  return decimalBrasileiro(documento);
}
