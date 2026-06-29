/**
 * Escalas clínicas PUBLICADAS — cálculo determinístico em código puro.
 * Princípio: a IA nunca "decide" uma escala; ela só extrai valores explícitos
 * do texto (ver prompts.ts:PROMPT_ALERTAS) e este módulo aplica a tabela.
 * Isso é o que mantém o produto como "calculadora sobre o que você disse",
 * não "IA emitindo julgamento clínico" — a linha que separa documentação
 * de apoio à decisão (ver seção 9 do blueprint).
 */

export interface Opcao {
  label: string;
  valor: number;
}

export interface CampoEscala {
  chave: string;
  label: string;
  opcoes: Opcao[];
}

export const NEWS2_CAMPOS: CampoEscala[] = [
  { chave: 'fr', label: 'Frequência respiratória (irpm)', opcoes: [
    { label: '≤ 8', valor: 3 }, { label: '9–11', valor: 1 }, { label: '12–20', valor: 0 },
    { label: '21–24', valor: 2 }, { label: '≥ 25', valor: 3 },
  ]},
  { chave: 'spo2', label: 'SpO₂ (%)', opcoes: [
    { label: '≤ 91', valor: 3 }, { label: '92–93', valor: 2 }, { label: '94–95', valor: 1 }, { label: '≥ 96', valor: 0 },
  ]},
  { chave: 'o2', label: 'Suporte de oxigênio', opcoes: [
    { label: 'Ar ambiente', valor: 0 }, { label: 'Oxigênio suplementar', valor: 2 },
  ]},
  { chave: 'pas', label: 'PA sistólica (mmHg)', opcoes: [
    { label: '≤ 90', valor: 3 }, { label: '91–100', valor: 2 }, { label: '101–110', valor: 1 },
    { label: '111–219', valor: 0 }, { label: '≥ 220', valor: 3 },
  ]},
  { chave: 'fc', label: 'Frequência cardíaca (bpm)', opcoes: [
    { label: '≤ 40', valor: 3 }, { label: '41–50', valor: 1 }, { label: '51–90', valor: 0 },
    { label: '91–110', valor: 1 }, { label: '111–130', valor: 2 }, { label: '≥ 131', valor: 3 },
  ]},
  { chave: 'consc', label: 'Nível de consciência', opcoes: [
    { label: 'Alerta', valor: 0 }, { label: 'Não alerta (confuso/sonolento/inconsciente)', valor: 3 },
  ]},
  { chave: 'temp', label: 'Temperatura (°C)', opcoes: [
    { label: '≤ 35.0', valor: 3 }, { label: '35.1–36.0', valor: 1 }, { label: '36.1–38.0', valor: 0 },
    { label: '38.1–39.0', valor: 1 }, { label: '≥ 39.1', valor: 2 },
  ]},
];

export const BRADEN_CAMPOS: CampoEscala[] = [
  { chave: 'percepcao', label: 'Percepção sensorial', opcoes: [
    { label: 'Totalmente limitada', valor: 1 }, { label: 'Muito limitada', valor: 2 },
    { label: 'Levemente limitada', valor: 3 }, { label: 'Nenhuma limitação', valor: 4 },
  ]},
  { chave: 'umidade', label: 'Umidade da pele', opcoes: [
    { label: 'Constantemente úmida', valor: 1 }, { label: 'Muito úmida', valor: 2 },
    { label: 'Ocasionalmente úmida', valor: 3 }, { label: 'Raramente úmida', valor: 4 },
  ]},
  { chave: 'atividade', label: 'Atividade', opcoes: [
    { label: 'Acamado', valor: 1 }, { label: 'Confinado à cadeira', valor: 2 },
    { label: 'Anda ocasionalmente', valor: 3 }, { label: 'Anda frequentemente', valor: 4 },
  ]},
  { chave: 'mobilidade', label: 'Mobilidade', opcoes: [
    { label: 'Totalmente imóvel', valor: 1 }, { label: 'Muito limitada', valor: 2 },
    { label: 'Levemente limitada', valor: 3 }, { label: 'Nenhuma limitação', valor: 4 },
  ]},
  { chave: 'nutricao', label: 'Nutrição', opcoes: [
    { label: 'Muito pobre', valor: 1 }, { label: 'Provavelmente inadequada', valor: 2 },
    { label: 'Adequada', valor: 3 }, { label: 'Excelente', valor: 4 },
  ]},
  { chave: 'friccao', label: 'Fricção e cisalhamento', opcoes: [
    { label: 'Problema', valor: 1 }, { label: 'Problema em potencial', valor: 2 }, { label: 'Nenhum problema', valor: 3 },
  ]},
];

export const MORSE_CAMPOS: CampoEscala[] = [
  { chave: 'historico', label: 'Histórico de quedas', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 25 }] },
  { chave: 'diagnostico', label: 'Diagnóstico secundário (2+)', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 15 }] },
  { chave: 'auxilio', label: 'Auxílio de locomoção', opcoes: [
    { label: 'Nenhum / acamado / cadeira de rodas / acompanhado', valor: 0 },
    { label: 'Muletas / bengala / andador', valor: 15 },
    { label: 'Apoia-se em mobiliário', valor: 30 },
  ]},
  { chave: 'iv', label: 'Terapia endovenosa / heparinização', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 20 }] },
  { chave: 'marcha', label: 'Marcha', opcoes: [
    { label: 'Normal / acamado / sem deambulação', valor: 0 }, { label: 'Fraca', valor: 10 }, { label: 'Comprometida', valor: 20 },
  ]},
  { chave: 'mental', label: 'Estado mental', opcoes: [
    { label: 'Orientado quanto à própria capacidade', valor: 0 },
    { label: 'Sobrestima capacidade / esquece limitações', valor: 15 },
  ]},
];

export interface ResultadoEscala {
  total: number;
  risco: string;
}

export function calcularNews2(valores: number[]): ResultadoEscala {
  const total = valores.reduce((a, b) => a + b, 0);
  const algumTres = valores.some((v) => v === 3);
  let risco = 'Baixo';
  if (total >= 7) risco = 'Alto';
  else if (total >= 5 || algumTres) risco = 'Médio';
  return { total, risco };
}

export function calcularBraden(valores: number[]): ResultadoEscala {
  const total = valores.reduce((a, b) => a + b, 0);
  let risco = 'Sem risco / mínimo';
  if (total <= 9) risco = 'Muito alto';
  else if (total <= 12) risco = 'Alto';
  else if (total <= 14) risco = 'Moderado';
  else if (total <= 18) risco = 'Baixo';
  return { total, risco };
}

export function calcularMorse(valores: number[]): ResultadoEscala {
  const total = valores.reduce((a, b) => a + b, 0);
  let risco = 'Baixo';
  if (total >= 51) risco = 'Alto';
  else if (total >= 25) risco = 'Médio';
  return { total, risco };
}

/** qSOFA: 2+ pontos = "considerar avaliação de sepse" — contagem de critério publicado, nunca diagnóstico. */
export function calcularQsofa(pontos: number): ResultadoEscala {
  return { total: pontos, risco: pontos >= 2 ? 'Atenção — considerar avaliação de sepse' : 'Baixo' };
}
