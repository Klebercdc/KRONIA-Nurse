/**
 * Processo de Enfermagem — encaixe da prosa do motor nos quatro blocos.
 *
 * Resolução COFEN nº 736/2024. A estrutura de saída é a MESMA já exigida do
 * motor por IA em lib/evolucao/generate-evolucao.ts (const ESTRUTURA_PE):
 * Dados, Diagnóstico de Enfermagem, Intervenção, Resultado — nesta ordem,
 * todos sempre presentes, e o que faltar vira "Sem registro para esta seção".
 * Nenhum bloco é omitido, nenhum é preenchido com suposição.
 *
 * ESTE ARQUIVO NÃO TEM IA. É composição determinística por cima de
 * gerarTexto(), que continua sendo a única coisa que redige. O motor em
 * grafo-adaptativo.js não foi tocado: aqui só chamamos ele com sequências
 * filtradas e montamos o documento.
 *
 * As duas travas do documento original continuam valendo, agora por
 * construção e não por instrução a um modelo:
 *
 *   1. DIAGNÓSTICO NUNCA É INFERIDO. O motor não coleta diagnóstico nomeado
 *      em lugar nenhum do schema, então o bloco sai sempre como "Sem registro
 *      para esta seção". Valor numérico e achado isolado não viram rótulo
 *      clínico — não existe caminho no código para isso acontecer.
 *   2. MEDICAÇÃO E CONDUTA NÃO ENTRAM EM DADOS. Ver INTERVENCAO_IDS abaixo.
 */

import { gerarTexto } from './grafo-adaptativo.js';

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

const SEM_REGISTRO = 'Sem registro para esta seção';
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
 * As condutas moram na categoria "geral", cujo parágrafo abre com "Paciente".
 * Isso está certo dentro da prosa corrida, mas em bloco próprio produziria
 * "Paciente equipe médica comunicada sobre a alteração...". O bloco já se
 * identifica pelo título, então a abertura sai e a frase recomeça.
 */
function tirarAberturaPaciente(prosa) {
  if (!prosa.startsWith('Paciente ')) return prosa;
  const resto = prosa.slice('Paciente '.length);
  return resto.charAt(0).toUpperCase() + resto.slice(1);
}

/**
 * Monta a evolução completa nos quatro blocos do Processo de Enfermagem.
 *
 * @param {object} context   contexto do schema (CONTEXTS[0])
 * @param {object} answers   respostas acumuladas
 * @param {Array}  sequence  sequência efetiva, vinda de buildSequence()
 * @returns {string} documento pronto para o prontuário
 */
export function gerarEvolucaoPE(context, answers, sequence) {
  const seqDados = sequence.filter((q) => !INTERVENCAO_IDS.includes(q.id));
  const seqIntervencao = sequence.filter((q) => INTERVENCAO_IDS.includes(q.id));

  const dados = separarPendencias(gerarTexto(context, answers, seqDados)).prosa;
  const intervencao = tirarAberturaPaciente(
    separarPendencias(gerarTexto(context, answers, seqIntervencao)).prosa,
  );

  // Pendências e inconsistências saem da sequência COMPLETA, uma vez só: é o
  // que garante que nada some por ter caído na fatia de outro bloco.
  const { pendencias } = separarPendencias(gerarTexto(context, answers, sequence));

  const partes = [
    bloco('Dados', dados),
    // Estrutural, nunca interpretativo: o motor não pergunta diagnóstico.
    bloco('Diagnóstico de Enfermagem', ''),
    bloco('Intervenção', intervencao),
    // O motor ainda não coleta a resposta do paciente após a intervenção —
    // ver histórico temporal, na lista do que falta do documento de origem.
    bloco('Resultado', ''),
  ];

  let documento = partes.join('\n\n');
  if (pendencias.length > 0) documento += `\n\n${pendencias.join('\n')}`;
  documento += `\n\n${ASSINATURA}`;

  return decimalBrasileiro(documento);
}
