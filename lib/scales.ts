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

// Chaves dos parâmetros NEWS2 — exportada para uso em calcular-alertas.ts e nos testes.
export type ChaveNews2 = 'fr' | 'spo2' | 'o2' | 'pas' | 'fc' | 'consc' | 'temp';

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

// Glasgow Coma Scale — Teasdale G, Jennett B. Lancet. 1974.
// Total 3–15. < 15 = alteração de consciência (critério de qSOFA e NEWS2).
export const GCS_CAMPOS: CampoEscala[] = [
  { chave: 'ocular', label: 'Abertura ocular', opcoes: [
    { label: 'Nenhuma', valor: 1 },
    { label: 'À dor', valor: 2 },
    { label: 'À voz', valor: 3 },
    { label: 'Espontânea', valor: 4 },
  ]},
  { chave: 'verbal', label: 'Resposta verbal', opcoes: [
    { label: 'Nenhuma (sem resposta)', valor: 1 },
    { label: 'Sons incompreensíveis', valor: 2 },
    { label: 'Palavras inapropriadas', valor: 3 },
    { label: 'Confusa', valor: 4 },
    { label: 'Orientada', valor: 5 },
  ]},
  { chave: 'motor', label: 'Resposta motora', opcoes: [
    { label: 'Nenhuma (sem resposta)', valor: 1 },
    { label: 'Extensão anormal (descerebração)', valor: 2 },
    { label: 'Flexão anormal (decorticação)', valor: 3 },
    { label: 'Retirada à dor', valor: 4 },
    { label: 'Localiza a dor', valor: 5 },
    { label: 'Obedece a comandos', valor: 6 },
  ]},
];

// PUSH Tool (Pressure Ulcer Scale for Healing)
// NPUAP; validação pt-BR: Santos VLCG, Sellmer D, Massulo MME (2004).
// Avalia TENDÊNCIA — requer pelo menos 2 avaliações registradas para gerar alerta de progressão.
export const PUSH_CAMPOS: CampoEscala[] = [
  { chave: 'area', label: 'Área da ferida (comprimento × largura)', opcoes: [
    { label: 'Fechada (0 cm²)', valor: 0 },
    { label: '< 0,3 cm²', valor: 1 },
    { label: '0,3–0,6 cm²', valor: 2 },
    { label: '0,7–1,0 cm²', valor: 3 },
    { label: '1,1–2,0 cm²', valor: 4 },
    { label: '2,1–3,0 cm²', valor: 5 },
    { label: '3,1–4,0 cm²', valor: 6 },
    { label: '4,1–8,0 cm²', valor: 7 },
    { label: '8,1–12,0 cm²', valor: 8 },
    { label: '12,1–24,0 cm²', valor: 9 },
    { label: '> 24,0 cm²', valor: 10 },
  ]},
  { chave: 'exsudato', label: 'Quantidade de exsudato', opcoes: [
    { label: 'Ausente', valor: 0 },
    { label: 'Pequeno', valor: 1 },
    { label: 'Moderado', valor: 2 },
    { label: 'Grande', valor: 3 },
  ]},
  { chave: 'tecido', label: 'Tipo de tecido (pior condição presente)', opcoes: [
    { label: 'Fechada / epitelizada', valor: 0 },
    { label: 'Tecido epitelial', valor: 1 },
    { label: 'Tecido de granulação', valor: 2 },
    { label: 'Esfacelo', valor: 3 },
    { label: 'Tecido necrótico (escara)', valor: 4 },
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

/** Nível de risco estável para estilização (badge/cor) — nunca inferir isso do texto de `risco`. */
export type NivelRisco = 'baixo' | 'medio' | 'alto';

export interface ResultadoEscala {
  total: number;
  risco: string;
  /** Ausente quando a escala não tem gradiente de risco (ex: PUSH, que mede tendência). */
  nivel?: NivelRisco;
}

/**
 * Converte um valor clínico bruto (ex: FR=22, PAS=90) para o sub-escore NEWS2 (0–3)
 * conforme tabela do Royal College of Physicians NEWS2 (2017).
 * Usada em calcularNews2FromRaw() para corrigir extração da IA.
 */
export function news2SubScore(chave: ChaveNews2, valor: number): number {
  switch (chave) {
    case 'fr':
      if (valor <= 8) return 3;
      if (valor <= 11) return 1;
      if (valor <= 20) return 0;
      if (valor <= 24) return 2;
      return 3;
    case 'spo2':
      if (valor <= 91) return 3;
      if (valor <= 93) return 2;
      if (valor <= 95) return 1;
      return 0;
    case 'o2':
      // 0 = ar ambiente; qualquer outro valor = O2 suplementar
      return valor === 0 ? 0 : 2;
    case 'pas':
      if (valor <= 90) return 3;
      if (valor <= 100) return 2;
      if (valor <= 110) return 1;
      if (valor <= 219) return 0;
      return 3;
    case 'fc':
      if (valor <= 40) return 3;
      if (valor <= 50) return 1;
      if (valor <= 90) return 0;
      if (valor <= 110) return 1;
      if (valor <= 130) return 2;
      return 3;
    case 'consc':
      // 0 = alerta (AVPU); 15 = GCS normal; qualquer outro = não-alerta
      return valor === 0 || valor === 15 ? 0 : 3;
    case 'temp':
      if (valor <= 35.0) return 3;
      if (valor <= 36.0) return 1;
      if (valor <= 38.0) return 0;
      if (valor <= 39.0) return 1;
      return 2;
  }
}

/** Calcula NEWS2 a partir de valores clínicos BRUTOS extraídos pela IA (FR em irpm, PAS em mmHg, etc.). */
export function calcularNews2FromRaw(valores: Partial<Record<ChaveNews2, number>>): ResultadoEscala {
  const subScores = (Object.entries(valores) as [ChaveNews2, number][])
    .map(([chave, valor]) => news2SubScore(chave, valor));
  return calcularNews2(subScores);
}

export function calcularNews2(valores: number[]): ResultadoEscala {
  const total = valores.reduce((a, b) => a + b, 0);
  // Máximo possível: fr(3)+spo2(3)+o2(2)+pas(3)+fc(3)+consc(3)+temp(3) = 20.
  // Se total > 20, os valores são brutos em vez de sub-escores — bug de integração.
  if (total < 0 || total > 20) {
    throw new RangeError(
      `NEWS2: escore ${total} fora do intervalo 0–20. Use calcularNews2FromRaw() para valores clínicos brutos.`
    );
  }
  const algumTres = valores.some((v) => v === 3);
  let risco = 'Baixo';
  let nivel: NivelRisco = 'baixo';
  if (total >= 7) { risco = 'Alto'; nivel = 'alto'; }
  else if (total >= 5 || algumTres) { risco = 'Médio'; nivel = 'medio'; }
  return { total, risco, nivel };
}

// Braden é invertido: quanto MENOR o total, MAIOR o risco.
export function calcularBraden(valores: number[]): ResultadoEscala {
  const total = valores.reduce((a, b) => a + b, 0);
  let risco = 'Sem risco / mínimo';
  let nivel: NivelRisco = 'baixo';
  if (total <= 9) { risco = 'Muito alto'; nivel = 'alto'; }
  else if (total <= 12) { risco = 'Alto'; nivel = 'alto'; }
  else if (total <= 14) { risco = 'Moderado'; nivel = 'medio'; }
  else if (total <= 18) { risco = 'Baixo'; nivel = 'baixo'; }
  return { total, risco, nivel };
}

export function calcularMorse(valores: number[]): ResultadoEscala {
  const total = valores.reduce((a, b) => a + b, 0);
  let risco = 'Baixo';
  let nivel: NivelRisco = 'baixo';
  if (total >= 51) { risco = 'Alto'; nivel = 'alto'; }
  else if (total >= 25) { risco = 'Médio'; nivel = 'medio'; }
  return { total, risco, nivel };
}

/** qSOFA: 2+ pontos = "considerar avaliação de sepse" — contagem de critério publicado, nunca diagnóstico. */
export function calcularQsofa(pontos: number): ResultadoEscala {
  const alto = pontos >= 2;
  return {
    total: pontos,
    risco: alto ? 'Atenção — considerar avaliação de sepse' : 'Baixo',
    nivel: alto ? 'alto' : 'baixo',
  };
}

/** GCS: Teasdale & Jennett 1974. Total 3–15. < 15 = alteração de consciência (critério de qSOFA). */
export function calcularGlasgow(valores: number[]): ResultadoEscala {
  const total = valores.reduce((a, b) => a + b, 0);
  let risco: string;
  let nivel: NivelRisco;
  if (total <= 8) { risco = 'Grave (≤ 8)'; nivel = 'alto'; }
  else if (total <= 12) { risco = 'Moderado (9–12)'; nivel = 'medio'; }
  else if (total < 15) { risco = 'Leve (13–14) — critério de consciência qSOFA ativo'; nivel = 'medio'; }
  else { risco = 'Normal (15) — sem alteração de consciência'; nivel = 'baixo'; }
  return { total, risco, nivel };
}

/** PUSH Tool: NPUAP / Santos et al. 2004. Escore 0–17. Avalia tendência — comparar com avaliação anterior. */
export function calcularPush(valores: number[]): ResultadoEscala {
  const total = valores.reduce((a, b) => a + b, 0);
  // Sem `nivel`: PUSH mede tendência de cicatrização, não tem gradiente de risco pontual.
  return { total, risco: 'Comparar com avaliação anterior para avaliar tendência de cicatrização' };
}

// RASS (Richmond Agitation-Sedation Scale)
// Reference: Sessler CN, et al. Chest. 2002;122(6):2163-2172.
// Ely EW, et al. JAMA. 2003;289(22):2983-2991.
export const RASS_CAMPOS: CampoEscala[] = [
  { chave: 'nivel', label: 'Nível de sedação/agitação (RASS)', opcoes: [
    { label: '+4 — Combativo: violento, risco imediato à equipe', valor: 4 },
    { label: '+3 — Muito agitado: arranca tubos, agressivo', valor: 3 },
    { label: '+2 — Agitado: movimentos não intencionais frequentes', valor: 2 },
    { label: '+1 — Inquieto: ansioso, sem movimentos agressivos', valor: 1 },
    { label: '0 — Alerta e calmo', valor: 0 },
    { label: '−1 — Sonolento: abre olhos brevemente à voz (> 10 s)', valor: -1 },
    { label: '−2 — Leve sedação: abre olhos à voz (< 10 s)', valor: -2 },
    { label: '−3 — Sedação moderada: movimentos ou abertura ocular à voz', valor: -3 },
    { label: '−4 — Sedação profunda: sem resposta à voz; responde a estímulo físico', valor: -4 },
    { label: '−5 — Não desperta: sem resposta à voz ou estímulo físico', valor: -5 },
  ]},
];

// Escala de Ramsay
// Reference: Ramsay MAE, et al. Controlled sedation with alphaxalone-alphadolone. BMJ. 1974;2(5920):656-659.
export const RAMSAY_CAMPOS: CampoEscala[] = [
  { chave: 'nivel', label: 'Nível de sedação (Ramsay)', opcoes: [
    { label: '1 — Ansioso, agitado ou inquieto', valor: 1 },
    { label: '2 — Cooperativo, orientado e tranquilo', valor: 2 },
    { label: '3 — Obedece a comandos', valor: 3 },
    { label: '4 — Dormindo, com resposta brusca a estímulo luminoso ou sonoro', valor: 4 },
    { label: '5 — Dormindo, com resposta lenta a estímulos', valor: 5 },
    { label: '6 — Sem resposta a qualquer estímulo', valor: 6 },
  ]},
];

/** RASS: Sessler et al. 2002 / Ely et al. 2003. Escala −5 a +4. Cada nível é um estado — não somar. */
export function calcularRASS(valores: number[]): ResultadoEscala {
  const nivel = valores[0];
  switch (nivel) {
    case 4: return { total: nivel, risco: 'Combativo (+4)' };
    case 3: return { total: nivel, risco: 'Muito agitado (+3)' };
    case 2: return { total: nivel, risco: 'Agitado (+2)' };
    case 1: return { total: nivel, risco: 'Inquieto (+1)' };
    case 0: return { total: nivel, risco: 'Alerta e calmo (0)' };
    case -1: return { total: nivel, risco: 'Sonolento (−1)' };
    case -2: return { total: nivel, risco: 'Leve sedação (−2)' };
    case -3: return { total: nivel, risco: 'Sedação moderada (−3)' };
    case -4: return { total: nivel, risco: 'Sedação profunda (−4)' };
    case -5: return { total: nivel, risco: 'Não desperta (−5)' };
    default: return { total: nivel, risco: `RASS ${nivel}` };
  }
}

/** Ramsay: Ramsay et al. BMJ 1974. Escala 1–6. Cada nível é um estado — não somar. */
export function calcularRamsay(valores: number[]): ResultadoEscala {
  const nivel = valores[0];
  switch (nivel) {
    case 1: return { total: nivel, risco: 'Nível 1 — Ansioso/agitado/inquieto' };
    case 2: return { total: nivel, risco: 'Nível 2 — Cooperativo, orientado e tranquilo' };
    case 3: return { total: nivel, risco: 'Nível 3 — Obedece a comandos' };
    case 4: return { total: nivel, risco: 'Nível 4 — Dormindo, resposta brusca a estímulos' };
    case 5: return { total: nivel, risco: 'Nível 5 — Dormindo, resposta lenta a estímulos' };
    case 6: return { total: nivel, risco: 'Nível 6 — Sem resposta a qualquer estímulo' };
    default: return { total: nivel, risco: `Ramsay ${nivel}` };
  }
}
