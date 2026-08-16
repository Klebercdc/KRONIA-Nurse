// =============================================================================
// KRONIA Nurse — app do motor adaptativo (splash → login → home → evolução).
//
// ESCOPO: só o motor determinístico. Nenhuma chamada de IA, nenhuma tela
// Kronos — o texto da evolução é montado por regras (schema + showIf +
// classify), sem custo de inferência.
//
// MAPEAMENTO: "Grafo Clínico Adaptativo Universal" → implementação real
// -----------------------------------------------------------------------------
//   NODE_ID            → question.id
//   DOMAIN              → question.layer ("universal" | "nucleo_area" | "condicional")
//   CONTEXT             → context.id (qual área)
//   QUESTION            → question.titulo
//   OPTION              → question.options[].label
//   CONDITION/TRIGGER    → question.showIf
//   DEPENDENCY          → showIf.questionId
//   NEXT_NODE            → resolvido dinamicamente por buildSequence() (não é
//                          um campo estático — a "próxima pergunta" depende
//                          das respostas acumuladas, recalculada a cada passo)
//   SEVERITY/RISK        → question.classify() (para numéricos) e
//                          context.validacoesCruzadas (para combinações)
//   REASSESSMENT         → ainda não implementado (histórico temporal)
//   EVIDENCE_REFERENCE    → comentários inline no schema, citando a fonte
//                          quando existe (ex: Silverman-Andrade, NPUAP)
//
// "REGRA DE NÃO INVENÇÃO" do documento — como é respeitada aqui:
//   - Nenhum showIf assume uma condição por causa de outra (ex: via_aerea=vm
//     NUNCA seta consciencia=sedado automaticamente, e vice-versa).
//   - Quando a resposta certa seria uma sub-árvore clínica sem fonte segura
//     pra categorizar, o sistema NÃO inventa opções — marca needsReview
//     (CONFERIR) e deixa a decisão de detalhamento pro profissional.
//   - "NÃO AVALIADO ≠ NORMAL": pergunta não respondida NUNCA vira "normal"
//     por omissão — vira pendência (CONFERIR — ... não respondido).
// =============================================================================

import { useState, useEffect } from "react";
import {
  Target,
  ArrowLeft,
  ArrowRight,
  Copy,
  RotateCcw,
  X,
  CheckCircle2,
  Check,
  Bell,
  User,
  MessageCircleQuestion,
  Share2,
  ShieldCheck,
  FileText,
  Lightbulb,
  Home,
  Users,
  Plus,
  ClipboardList,
  Building2,
  Zap,
  Clock,
  Heart,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
} from "lucide-react";

// Ícone real do logo (recorte do arquivo oficial enviado pelo usuário).
const LOGO_ICON_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAPAAAACYCAMAAADtLJSXAAAAP1BMVEUAAAD3+PhY1rANFRIaIB+eoqFIsZFdYWFpdXU3j3MqZ1RYXV01jHAoMjAlX01cZGMAAAAAAAAAAAAAAAAAAADbB97MAAAAEHRSTlMA/f5fkOzo6A/hnp+U5F1ZSwztkgAABYNJREFUeNrtnQmyoyAQQNEGomj0/reN4IobGkHWrhrDzP9j5aX3Fg1CSZLcETj9IYTDiavPPala7C8+/pDsDyGVn8jwyf4V0nrIW6HsgVT+AWfPhEXGm2XYK9x2dkfy+fA/3XEdkAlZLLl0r4sPyis/HqMzwTzHqvMsCBH52kurHuPzk8/KKx2TJ2944cfglwc/dX+PdPwEGEux2idgpAM480jBf5pjk/lH/CjitOsKxP3IBY9UswEmzhNjvcDu61g7sOs61g6coSIyYMetegAudAI7bdUmNOw0sRFgl4nNAGckNmB3iU0ELaeJnwHjk8FedMBZdMBZgMBF5h0xPAJG/l2EeQisIg4tD6ts2kEV46eaUFxLDQ8YTq+ju1dU4+e+ViGykcmHXQXWNKWYtnwUxNVhgF7ghZDYgJnbwMZOHBuws0HLwPtyOy0ZA8bJpEON0t9IgxaKRsOupiUwDOzeHr3YgpZhDaNUablbeIC4IaBayAeh/h+6RXPtxB5VWqot8iqUr2eVVqXcI32p8PBoxKO+1+EKsEel5VMN4ziBPRrxFJScCW1DAw58xJOA0wAgASfgBJyA0wDA3ognAXe6Z+yL8bcTcRALIWLxlY44BJO+dQPxITDyJWhVWfaM2LchHtEEjH3RMApcwxvg9iZw4b2GW3JHmoMTk5Aqrf5BAJ3R7j42INbSEscGnJqH6IAZzeMCzjuJqT1kHLgMEfh7omHqYC1tSsNUAEO4PrzKw5ALaVwEhrbpun1oC8BrgaKA/zTMemAXo7RqB8Dn2olXwGUPXLoHXGm6PryyGprbVvERMHm6A2C/Wxp4LTrx/8CXTrza1MJyZzWsNun2j6A1WrRFJz4MWhVRPLH0j7QkkpKALsEy8H5/vys8LV14Ii/s+LCwaKFmCs5p+HHNSrbJSySl4RhcaSniHtnWlRSEnlmAwJtZV9OHK2y1f3hz7wkbbNmqE78JPDpvabP0eBEYRs3WNp0Y3gPGY8XRWC09Xnw4Aeesx4Vl4Dce60Yn17UatV4DhjkbWY1aBm4vqmlvuTtJqZyNW3WWpuwMgdaGgHU+b0OQwX5SYnL4OvvUhr6KmiHW7qtsNynleJGgLvHqJ251h+m+ya/3XRgWn8lZ1GryWWojNp3pVfBSL8DKeq4rZ/2x2ecp//Wyk25F+Uu+FEOZWFeg3r5LodpSYlxqrswVwsyoWI+Od+aSvcYlK4ZF1AKqAjYUqPl8gt97J+Y7YlFVn6oSf5mO6pSU7wOv7HwZtfLXgW9sUVIa/haOze+8lB0dLgI3NomzC8C9+aKtizZyKGfz/2A1FyaEr5Z+baTqvkEMSgV/pdJx4aIg/+K8Kg9ivcGh/fWthkTV4lMpBfX5l1EZS0SqGXgbhxtqKg1PBQjRoOIhxkgN7zCGXm3tGBsmoEdhieamZ19dPJJOT4g48BexGq2gUil4G4TZ/mczufB+tcVQjazK8DQ4cl4Prvq/Aw3WS2Bnv8oHFF81NGtrcj440OBo9dT2rp4roY2ceXAz9X90yj9HLtq5tu09LgoZrinuX1paXiWbnLg8Mtmy7xadtugpX/Pv3uKX1aTLa0xKmtP6qBEUTtw4btHH6Zr21ZXc/9VnrX4/8bG9Te2qTW9lVRVNA6xjDRrr/t5RMZL7mnG+wY5rpamUcvs7BI+ezIpWxfIwwTobyBqb0r1CvA63fTsEJ0TMcK2ssepG25aRz6KkGfIwiT0LStY39NzU9LjRY/rex+2oh55N3IF6YdGXpZzSzvl4sw4FeEo7x1fNbG+s1StYPaEJyqKv7CP1KWTdAD6uK3hMa8IhZioXRiicgLWIWiWKRSC0tHMtE4fkpJdsmkbEy8JKOxeduI6JuI7LormOUZIkSZIkiU9+d9wwBNIvTuMAAAAASUVORK5CYII=";

// Wordmark do header, desenhado em texto (mesma proporção do arquivo oficial:
// "KRONIA" fino e espaçado + "Nurse" itálico em verde).
function Wordmark({ height = 13 }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 7, lineHeight: 1 }}>
      <span style={{ fontSize: height + 5, fontWeight: 300, letterSpacing: 3.5, color: TEXT }}>KRONIA</span>
      <span style={{ fontSize: height + 3, fontWeight: 600, fontStyle: "italic", color: ACCENT }}>Nurse</span>
    </div>
  );
}

function LogoLockup({ size = 132 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: size * 0.12 }}>
      <img
        src={`data:image/png;base64,${LOGO_ICON_B64}`}
        alt="Kronia Nurse"
        style={{ width: size, height: "auto", display: "block" }}
      />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: size * 0.03 }}>
        <span style={{ fontSize: size * 0.26, fontWeight: 300, letterSpacing: size * 0.075, color: TEXT, paddingLeft: size * 0.075 }}>
          KRONIA
        </span>
        <span style={{ fontSize: size * 0.15, fontWeight: 400, letterSpacing: size * 0.12, color: ACCENT, paddingLeft: size * 0.12 }}>
          NURSE
        </span>
      </div>
    </div>
  );
}

// ---- Tokens de cor (extraídos das telas oficiais) ----
const ACCENT = "#25E08C";
const ACCENT_2 = "#7DF3BE";
const BG = "#020B08";
const SURFACE = "#08170F";
const BORDER = "#153A28";
const TEXT = "#F3F8F5";
const MUTED = "#8FA79C";
const DIM = "#5C7A6D";

// =============================================================================
// Motor de perguntas: universal + núcleo de área + condicionais (showIf).
// =============================================================================

// Faixas de FC/FR por idade — fonte: Enfermagem Bio (2015), adaptado de
// Custer JW et al. 2009, via IFF/Fiocruz "Abordagem Inicial da Criança em
// Emergência". Idoso mantém faixa adulta (60-100/12-20) — sem evidência
// sólida de threshold vital diferente por fragilidade, ao contrário da PA.
function faixaVitalPorIdade(answers) {
  if (!answers) return { minFc: 60, maxFc: 100, minFr: 12, maxFr: 20, rotulo: "" };
  if (answers.idade_unidade === "dias") return { minFc: 120, maxFc: 160, minFr: 30, maxFr: 60, rotulo: " para a idade" };
  if (answers.idade_unidade === "meses") return { minFc: 90, maxFc: 140, minFr: 24, maxFr: 40, rotulo: " para a idade" };
  if (answers.idade_unidade === "anos") {
    const idade = Number(answers.idade_anos);
    if (!Number.isNaN(idade)) {
      if (idade <= 6) return { minFc: 80, maxFc: 110, minFr: 22, maxFr: 34, rotulo: " para a idade" };
      if (idade <= 9) return { minFc: 75, maxFc: 100, minFr: 18, maxFr: 30, rotulo: " para a idade" };
      if (idade < 18) return { minFc: 60, maxFc: 100, minFr: 12, maxFr: 20, rotulo: " para a idade" };
    }
  }
  return { minFc: 60, maxFc: 100, minFr: 12, maxFr: 20, rotulo: "" };
}

// Resolve as opções de uma pergunta — podem ser um array fixo, ou uma função
// (answers) => array, quando a lista de opções em si depende de respostas
// anteriores (ex: situação clínica filtra opções obstétricas pelo sexo).
function getOptions(q, answers) {
  return typeof q.options === "function" ? q.options(answers) : q.options;
}

function matchesShowIf(showIf, answers) {
  if (!showIf) return true;
  if (typeof showIf.check === "function") return showIf.check(answers);
  const val = answers[showIf.questionId];
  if (showIf.equals !== undefined) {
    if (Array.isArray(showIf.equals)) return showIf.equals.includes(val);
    return val === showIf.equals;
  }
  if (showIf.includes !== undefined) {
    return Array.isArray(val) && val.includes(showIf.includes);
  }
  if (showIf.lessThan !== undefined) {
    const num = Number(val);
    return val !== undefined && val !== "" && !Number.isNaN(num) && num < showIf.lessThan;
  }
  if (showIf.greaterThanOrEqual !== undefined) {
    const num = Number(val);
    return val !== undefined && val !== "" && !Number.isNaN(num) && num >= showIf.greaterThanOrEqual;
  }
  return false;
}

// Monta a sequência efetiva de perguntas: percorre o array na ordem em que
// foi escrito (que já é a ordem narrativa/clínica correta — cada condicional
// posicionada logo após sua pergunta-gatilho) e inclui cada uma só se sua
// condição (showIf) bater com as respostas atuais. Recalculada a cada
// resposta — é isso que faz "Contexto adaptativo" ser literal.
function buildSequence(context, answers) {
  return context.questions.filter((q) => matchesShowIf(q.showIf, answers));
}

const CONTEXTS = [
  {
    id: "evolucao_universal",
    nome: "Evolução de Enfermagem",
    subtitulo: "Um único caminho, adaptado pela idade e pelos achados",
    validacoesCruzadas: [
      {
        check: (answers) =>
          answers.sexo === "masculino" &&
          ["gestante", "trabalho_parto", "puerpera"].includes(answers.situacao_clinica),
        mensagem: "situação clínica obstétrica registrada com sexo masculino — fisicamente incompatível, revisar",
      },
      {
        check: (answers) =>
          ["sedado", "comatoso"].includes(answers.consciencia) &&
          answers.via_aerea !== undefined &&
          answers.via_aerea !== "vm",
        mensagem: "paciente sedado/comatoso sem ventilação mecânica registrada em via aérea — combinação incomum, confirmar se a via aérea foi respondida corretamente",
      },
      {
        check: (answers) =>
          ["sem_auxilio", "com_auxilio"].includes(answers.mobilidade) &&
          ["sedado", "comatoso"].includes(answers.consciencia),
        mensagem: "mobilidade registrada como deambulando, mas paciente está sedado/comatoso — fisicamente incompatível, revisar",
      },
      {
        check: (answers) =>
          ["sem_auxilio", "com_auxilio"].includes(answers.mobilidade) &&
          answers.via_aerea === "vm",
        mensagem: "mobilidade registrada como deambulando, mas paciente está em ventilação mecânica invasiva — fisicamente incompatível, revisar",
      },
      {
        check: (answers) => answers.dieta === "oral" && answers.via_aerea === "vm",
        mensagem: "dieta por via oral registrada com paciente em ventilação mecânica invasiva — via oral é impossível com tubo orotraqueal, revisar",
      },
      {
        check: (answers) => answers.dieta === "oral" && answers.consciencia === "comatoso",
        mensagem: "dieta por via oral registrada com paciente comatoso — risco de aspiração, incapaz de deglutir com segurança, revisar",
      },
      {
        check: (answers) =>
          answers.perfusao_perif !== undefined &&
          answers.perfusao_perif !== "adequada" &&
          answers.mmss === "normal" &&
          answers.mmii === "normal",
        mensagem: "perfusão periférica alterada, mas membros superiores e inferiores registrados como sem alterações — checar consistência entre os três campos",
      },
      {
        check: (answers) => answers.silverman === "grave" && answers.via_aerea_neo === "ar_ambiente",
        mensagem: "desconforto respiratório grave (Silverman-Andrade) registrado com paciente em ar ambiente, sem suporte — combinação incomum, confirmar se via aérea foi respondida corretamente",
      },
      {
        check: (answers) => answers.via_aerea_neo === "vm" && answers.estado_alerta === "ativo_reativo",
        mensagem: "paciente em ventilação mecânica invasiva registrado como ativo/reativo — combinação incomum para intubação, confirmar consciência",
      },
    ],
    questions: [
      // ---- TRIAGEM — idade + situação clínica decidem a árvore inteira ----
      {
        id: "idade_unidade", layer: "universal", type: "select",
        titulo: "Idade do paciente informada em qual unidade?",
        options: [
          { value: "anos", label: "Anos", frase: null },
          { value: "meses", label: "Meses", frase: null },
          { value: "dias", label: "Dias", frase: null },
        ],
      },
      {
        id: "idade_anos", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "numeric",
        titulo: "Qual a idade em anos?", unit: "anos", min: 1, max: 120,
        classify: (v) => ({ label: null, frase: `de ${v} anos` }),
      },
      {
        id: "idade_meses", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "meses" }, type: "numeric",
        titulo: "Qual a idade em meses?", unit: "meses", min: 0, max: 23,
        classify: (v) => ({ label: null, frase: `de ${v} meses` }),
      },
      {
        id: "idade_dias", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "dias" }, type: "numeric",
        titulo: "Qual a idade em dias?", unit: "dias", min: 0, max: 29,
        classify: (v) => ({ label: null, frase: `de ${v} dias de vida` }),
      },
      {
        id: "sexo", layer: "universal", type: "select",
        titulo: "Sexo do paciente?",
        options: [
          { value: "feminino", label: "Feminino", frase: null },
          { value: "masculino", label: "Masculino", frase: null },
        ],
      },
      {
        id: "idoso_fragil", layer: "condicional",
        showIf: { questionId: "idade_anos", check: (answers) => Number(answers.idade_anos) >= 65 },
        type: "select",
        titulo: "O paciente idoso é considerado frágil (funcionalidade reduzida, múltiplas comorbidades, dependência)?",
        options: [
          { value: "fragil", label: "Sim, considerado frágil", frase: "idoso frágil" },
          { value: "higido", label: "Não, considerado hígido", frase: "idoso hígido" },
        ],
      },
      {
        id: "idade_gestacional", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: ["dias", "meses"] }, type: "numeric",
        titulo: "Qual a idade gestacional corrigida?", unit: "sem", min: 22, max: 44,
        classify: (v) =>
          v < 37 ? { label: "pré-termo", frase: `pré-termo, com ${v} semanas de idade gestacional corrigida` }
          : { label: "a termo", frase: `a termo, com ${v} semanas de idade gestacional corrigida` },
      },
      {
        id: "peso", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: ["dias", "meses"] }, type: "numeric",
        titulo: "Qual o peso atual?", unit: "g", min: 300, max: 15000,
        classify: (v) => ({ label: null, frase: `pesando ${v}g na aferição atual` }),
      },

      // ---- Situação clínica — segundo eixo de decisão (só faz sentido pra
      // quem já está na trilha "anos"; RN/lactente não entra aqui) ----
      {
        id: "situacao_clinica", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Qual a situação clínica do paciente?",
        options: (answers) => {
          const base = [
            { value: "geral", label: "Internação clínica geral", frase: null },
            { value: "cirurgico", label: "Pré/pós-operatório (cirúrgico)", frase: null },
          ];
          const obstetrico = [
            { value: "gestante", label: "Gestante", frase: "gestante" },
            { value: "trabalho_parto", label: "Em trabalho de parto", frase: "em trabalho de parto" },
            { value: "puerpera", label: "Puérpera (pós-parto)", frase: "puérpera" },
          ];
          return answers.sexo === "masculino" ? base : [...base, ...obstetrico];
        },
      },

      // ---- Fim da triagem — árvore já direcionada. Núcleo da área escolhida. ----

      // ---- Núcleo cirúrgico ----
      {
        id: "tipo_cirurgia", layer: "condicional",
        showIf: { questionId: "situacao_clinica", equals: "cirurgico" }, type: "texto_livre",
        titulo: "Qual o procedimento cirúrgico realizado/a realizar?",
        placeholder: "Ex: colecistectomia, artroplastia de quadril...",
        montarFrase: (texto) => `em pós-operatório de ${texto}`,
      },
      {
        id: "anestesia", layer: "condicional",
        showIf: { questionId: "situacao_clinica", equals: "cirurgico" }, type: "select",
        titulo: "Qual o tipo de anestesia?",
        options: [
          { value: "geral", label: "Geral", frase: "sob anestesia geral" },
          { value: "regional", label: "Regional (raqui/peridural)", frase: "sob anestesia regional" },
          { value: "local_sedacao", label: "Local com sedação", frase: "sob anestesia local com sedação" },
        ],
      },
      {
        id: "ferida_operatoria", layer: "condicional",
        showIf: { questionId: "situacao_clinica", equals: "cirurgico" }, type: "select",
        titulo: "Como está a ferida operatória?",
        options: [
          { value: "limpa_seca", label: "Limpa e seca, sem sinais de infecção", frase: "ferida operatória limpa e seca, sem sinais de infecção" },
          { value: "hiperemiada", label: "Hiperemiada/com calor local", frase: "ferida operatória hiperemiada, com calor local" },
          { value: "deiscencia", label: "Deiscência", frase: "deiscência de ferida operatória" },
          { value: "secrecao", label: "Secreção presente", frase: "ferida operatória com secreção presente" },
        ],
      },

      // ---- Núcleo gestante ----
      {
        id: "gestacao_semanas", layer: "condicional",
        showIf: { questionId: "situacao_clinica", equals: ["gestante", "trabalho_parto"] }, type: "numeric",
        titulo: "Qual a idade gestacional atual?", unit: "sem", min: 4, max: 42,
        classify: (v) => ({ label: null, frase: `com ${v} semanas de idade gestacional` }),
      },
      {
        id: "movimentos_fetais", layer: "condicional",
        showIf: { questionId: "situacao_clinica", equals: ["gestante", "trabalho_parto"] }, type: "select",
        titulo: "Como estão os movimentos fetais?",
        options: [
          { value: "presentes", label: "Presentes e ativos", frase: "movimentos fetais presentes e ativos" },
          { value: "diminuidos", label: "Diminuídos (referido pela paciente)", frase: "movimentos fetais diminuídos, conforme referido" },
          { value: "ausentes", label: "Ausentes (referido pela paciente)", frase: "ausência de movimentos fetais referida", },
        ],
      },
      {
        id: "bcf", layer: "condicional",
        showIf: { questionId: "situacao_clinica", equals: ["gestante", "trabalho_parto"] }, type: "numeric",
        titulo: "Qual o batimento cardiofetal (BCF)?", unit: "bpm", min: 80, max: 220,
        classify: (v) =>
          v < 110 ? { label: "bradicardia fetal", frase: `com bradicardia fetal, BCF de ${v} bpm` }
          : v > 160 ? { label: "taquicardia fetal", frase: `com taquicardia fetal, BCF de ${v} bpm` }
          : { label: "normal", frase: `BCF de ${v} bpm, dentro da normalidade` },
      },
      {
        id: "contracoes", layer: "condicional",
        showIf: { questionId: "situacao_clinica", equals: "gestante" }, type: "select",
        titulo: "Presença de contrações uterinas?",
        options: [
          { value: "ausentes", label: "Ausentes", frase: "nega contrações uterinas" },
          { value: "irregulares", label: "Presentes, irregulares", frase: "contrações uterinas irregulares" },
          { value: "regulares", label: "Presentes, regulares", frase: "contrações uterinas regulares" },
        ],
      },

      // ---- Núcleo trabalho de parto ----
      {
        id: "dilatacao", layer: "condicional",
        showIf: { questionId: "situacao_clinica", equals: "trabalho_parto" }, type: "numeric",
        titulo: "Qual a dilatação cervical?", unit: "cm", min: 0, max: 10,
        classify: (v) => ({ label: null, frase: `dilatação cervical de ${v} cm` }),
      },
      {
        id: "dinamica_uterina", layer: "condicional",
        showIf: { questionId: "situacao_clinica", equals: "trabalho_parto" }, type: "texto_livre",
        titulo: "Como está a dinâmica uterina?",
        placeholder: "Ex: 3 contrações em 10 minutos",
        montarFrase: (texto) => `dinâmica uterina de ${texto}`,
      },
      {
        id: "bolsa", layer: "condicional",
        showIf: { questionId: "situacao_clinica", equals: "trabalho_parto" }, type: "select",
        titulo: "Como está a bolsa?",
        options: [
          { value: "integra", label: "Íntegra", frase: "bolsa íntegra" },
          { value: "rota_clara", label: "Rota, líquido claro", frase: "bolsa rota, líquido amniótico claro" },
          { value: "rota_meconial", label: "Rota, líquido meconial", frase: "bolsa rota, líquido amniótico meconial" },
        ],
      },

      // ---- Núcleo puérpera ----
      {
        id: "tipo_parto", layer: "condicional",
        showIf: { questionId: "situacao_clinica", equals: "puerpera" }, type: "select",
        titulo: "Qual o tipo de parto?",
        options: [
          { value: "normal", label: "Vaginal", frase: "de parto vaginal" },
          { value: "cesarea", label: "Cesárea", frase: "de parto cesáreo" },
        ],
      },
      {
        id: "sitio_cirurgico_obstetrico", layer: "condicional",
        showIf: { questionId: "tipo_parto", equals: "cesarea" }, type: "select",
        titulo: "Como está o sítio cirúrgico?",
        options: [
          { value: "sem_sinais", label: "Sem sinais flogísticos", frase: "sítio cirúrgico sem sinais flogísticos" },
          { value: "hiperemia_calor", label: "Hiperemia/calor local", frase: "sítio cirúrgico com hiperemia e calor local" },
          { value: "deiscencia", label: "Deiscência", frase: "deiscência de sítio cirúrgico" },
        ],
      },
      {
        id: "involucao_uterina", layer: "condicional",
        showIf: { questionId: "situacao_clinica", equals: "puerpera" }, type: "select",
        titulo: "Como está a involução uterina?",
        options: [
          { value: "adequada", label: "Adequada para o tempo de puerpério", frase: "involução uterina adequada para o tempo de puerpério" },
          { value: "inadequada", label: "Inadequada/subinvoluída", frase: "involução uterina inadequada, útero subinvoluído" },
          { value: "nao_palpavel", label: "Não palpável", frase: "fundo uterino não palpável" },
        ],
      },
      {
        id: "loquios", layer: "condicional",
        // Progressão de cor esperada: rubra (1-3º dia) → fusca (4-10º dia) →
        // flava (até 21º dia) → alba (após 21º dia). Odor fétido = alerta.
        showIf: { questionId: "situacao_clinica", equals: "puerpera" }, type: "select",
        titulo: "Qual o aspecto dos lóquios?",
        options: [
          { value: "rubra", label: "Rubra (avermelhados)", frase: "lóquios rubros" },
          { value: "fusca", label: "Fusca (acastanhados)", frase: "lóquios fuscos" },
          { value: "flava", label: "Flava (amarelados)", frase: "lóquios flavos" },
          { value: "alba", label: "Alba (esbranquiçados)", frase: "lóquios albos" },
          { value: "odor_fetido", label: "Odor fétido presente", frase: "lóquios com odor fétido — sinal de alerta para infecção puerperal" },
        ],
      },
      {
        id: "conduta_loquios_odor", layer: "condicional",
        showIf: { questionId: "loquios", equals: "odor_fetido" }, type: "select",
        titulo: "Médico foi comunicado sobre o odor fétido?",
        options: [
          { value: "sim", label: "Sim, comunicado", frase: "equipe médica comunicada sobre alteração de lóquios" },
          { value: "nao", label: "Ainda não", frase: null, needsReview: true },
        ],
      },
      {
        id: "mamas", layer: "condicional",
        showIf: { questionId: "situacao_clinica", equals: "puerpera" }, type: "select",
        titulo: "Como estão as mamas?",
        options: [
          { value: "normais", label: "Simétricas, sem sinais de ingurgitamento", frase: "mamas simétricas, sem sinais de ingurgitamento" },
          { value: "ingurgitadas", label: "Ingurgitadas", frase: "mamas ingurgitadas" },
          { value: "sinais_mastite", label: "Sinais de mastite (calor, hiperemia, dor)", frase: "mamas com sinais sugestivos de mastite" },
        ],
      },
      {
        id: "mamilos", layer: "condicional",
        showIf: { questionId: "situacao_clinica", equals: "puerpera" }, type: "select",
        titulo: "Como estão os mamilos?",
        options: [
          { value: "integros", label: "Íntegros, sem fissuras", frase: "mamilos íntegros, sem fissuras" },
          { value: "fissura", label: "Fissura presente", frase: "presença de fissura mamilar" },
          { value: "invertido", label: "Invertido/plano", frase: "mamilo invertido/plano, dificultando a pega" },
        ],
      },
      {
        id: "amamentacao", layer: "condicional",
        showIf: { questionId: "situacao_clinica", equals: "puerpera" }, type: "select",
        titulo: "Como está a amamentação?",
        options: [
          { value: "pega_adequada", label: "Pega adequada, sem dificuldades", frase: "amamentando com pega adequada" },
          { value: "dificuldade_pega", label: "Dificuldade de pega", frase: "com dificuldade de pega ao amamentar" },
          { value: "nao_amamentando", label: "Não amamentando", frase: "não amamentando no momento" },
        ],
      },
      {
        id: "perineo", layer: "condicional",
        showIf: { questionId: "situacao_clinica", equals: "puerpera" }, type: "select",
        titulo: "Como está o períneo?",
        options: [
          { value: "integro", label: "Íntegro/sem sinais inflamatórios", frase: "períneo íntegro, sem sinais inflamatórios" },
          { value: "episiotomia_cicatrizando", label: "Episiotomia/laceração, cicatrização adequada", frase: "episiotomia com boa cicatrização" },
          { value: "sinais_infeccao_perineo", label: "Sinais de infecção/deiscência", frase: "sinais de infecção ou deiscência em local de episiotomia/laceração" },
        ],
      },

      // ---- Estado de consciência/alerta — vocabulário muda por idade ----
      {
        id: "consciencia", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Como está o nível de consciência?",
        options: [
          { value: "alerta", label: "Alerta e orientado", frase: "alerta e orientado" },
          { value: "sonolento", label: "Sonolento", frase: "sonolento, despertável ao chamado" },
          { value: "confuso", label: "Confuso", frase: "confuso, desorientado" },
          { value: "sedado", label: "Sob sedação", frase: "sob efeito de sedação" },
          { value: "comatoso", label: "Comatoso / sem resposta", frase: "sem resposta a estímulos" },
        ],
      },
      // ---- Condicionais de sedação (adulto — dispara por "sedado"/"comatoso") ----
      {
        id: "sedativo_qual", layer: "condicional",
        showIf: { questionId: "consciencia", equals: ["sedado", "comatoso"] }, type: "multi_select",
        titulo: "Sedado/em coma induzido com qual(is) droga(s)?",
        options: [
          { value: "midazolam", label: "Midazolam (Dormonid)", frase: "midazolam" },
          { value: "propofol", label: "Propofol", frase: "propofol" },
          { value: "fentanil", label: "Fentanil", frase: "fentanil" },
          { value: "dexmedetomidina", label: "Dexmedetomidina", frase: "dexmedetomidina" },
          { value: "outra", label: "Outra", frase: null },
        ],
      },
      {
        id: "sedativo_outro_nome", layer: "condicional",
        showIf: { questionId: "sedativo_qual", includes: "outra" }, type: "texto_livre",
        titulo: "Qual o nome da droga sedativa?",
        placeholder: "Ex: Dexametasona, Etomidato...",
        montarFrase: (texto) => `sedativo ${texto}`,
      },
      {
        id: "dose_midazolam", layer: "condicional",
        showIf: { questionId: "sedativo_qual", includes: "midazolam" }, type: "numeric",
        titulo: "Qual a dose de midazolam?", unit: "mL/h", min: 0.1, max: 100,
        classify: (v) => ({ label: null, frase: `midazolam em infusão contínua a ${v} mL/h` }),
      },
      {
        id: "dose_propofol", layer: "condicional",
        showIf: { questionId: "sedativo_qual", includes: "propofol" }, type: "numeric",
        titulo: "Qual a dose de propofol?", unit: "mL/h", min: 0.1, max: 100,
        classify: (v) => ({ label: null, frase: `propofol em infusão contínua a ${v} mL/h` }),
      },
      {
        id: "dose_fentanil", layer: "condicional",
        showIf: { questionId: "sedativo_qual", includes: "fentanil" }, type: "numeric",
        titulo: "Qual a dose de fentanil?", unit: "mL/h", min: 0.1, max: 100,
        classify: (v) => ({ label: null, frase: `fentanil em infusão contínua a ${v} mL/h` }),
      },
      {
        id: "dose_dexmedetomidina", layer: "condicional",
        showIf: { questionId: "sedativo_qual", includes: "dexmedetomidina" }, type: "numeric",
        titulo: "Qual a dose de dexmedetomidina?", unit: "mL/h", min: 0.1, max: 100,
        classify: (v) => ({ label: null, frase: `dexmedetomidina em infusão contínua a ${v} mL/h` }),
      },
      {
        id: "dose_outra_sedativo", layer: "condicional",
        showIf: { questionId: "sedativo_qual", includes: "outra" }, type: "numeric",
        titulo: "Qual a dose da droga não listada?", unit: "mL/h", min: 0.1, max: 100,
        classify: (v) => ({ label: null, frase: `em infusão contínua a ${v} mL/h` }),
      },
      {
        id: "sedacao_rass", layer: "condicional",
        showIf: { questionId: "consciencia", equals: ["sedado", "comatoso"] }, type: "select",
        titulo: "Qual o nível de sedação (RASS)?",
        options: [
          { value: "+4", label: "+4 — Combativo", frase: "RASS +4, combativo" },
          { value: "+3", label: "+3 — Muito agitado", frase: "RASS +3, muito agitado" },
          { value: "+2", label: "+2 — Agitado", frase: "RASS +2, agitado" },
          { value: "+1", label: "+1 — Inquieto", frase: "RASS +1, inquieto" },
          { value: "0", label: "0 — Alerta e calmo", frase: "RASS 0, alerta e calmo" },
          { value: "-1", label: "-1 — Sonolento", frase: "RASS -1, sonolento" },
          { value: "-2", label: "-2 — Sedação leve", frase: "RASS -2, sedação leve" },
          { value: "-3", label: "-3 — Sedação moderada", frase: "RASS -3, sedação moderada" },
          { value: "-4", label: "-4 — Sedação profunda", frase: "RASS -4, sedação profunda" },
          { value: "-5", label: "-5 — Não desperta", frase: "RASS -5, não desperta ao estímulo" },
        ],
      },
      {
        id: "estado_alerta", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: ["dias", "meses"] }, type: "select",
        titulo: "Como está o estado de alerta?",
        options: [
          { value: "ativo_reativo", label: "Ativo e reativo", frase: "ativo e reativo aos estímulos" },
          { value: "hipoativo", label: "Hipoativo", frase: "hipoativo" },
          { value: "irritado", label: "Irritado/choro excessivo", frase: "irritado, com choro excessivo" },
          { value: "letargico", label: "Letárgico", frase: "letárgico" },
        ],
      },
      // ---- Sinais vitais — UMA pergunta cada, classificação se adapta à idade ----
      {
        id: "fc", layer: "universal", type: "numeric",
        titulo: "Qual a frequência cardíaca?", unit: "bpm", min: 40, max: 240,
        classify: (v, answers) => {
          const { minFc, maxFc, rotulo } = faixaVitalPorIdade(answers);
          if (v < minFc) return { label: "bradicárdico", frase: `bradicárdico${rotulo}, com frequência cardíaca de ${v} bpm` };
          if (v > maxFc) return { label: "taquicárdico", frase: `taquicárdico${rotulo}, com frequência cardíaca de ${v} bpm` };
          return { label: "normocárdico", frase: `normocárdico${rotulo}, com frequência cardíaca de ${v} bpm` };
        },
      },
      // ---- Condutas — sinais de alerta (idade-conscientes onde precisa) ----
      {
        id: "conduta_fc_alterada", layer: "condicional",
        showIf: {
          questionId: "fc",
          check: (answers) => {
            const v = Number(answers.fc);
            if (answers.fc === undefined || answers.fc === "" || Number.isNaN(v)) return false;
            const { minFc, maxFc } = faixaVitalPorIdade(answers);
            return v < minFc || v > maxFc;
          },
        },
        type: "select",
        titulo: "Qual conduta foi adotada frente à alteração de frequência cardíaca?",
        options: [
          { value: "comunicado_fc", label: "Comunicado à equipe médica", frase: "equipe médica comunicada sobre a alteração de frequência cardíaca" },
          { value: "ecg_fc", label: "ECG realizado", frase: "ECG realizado frente à alteração de frequência cardíaca" },
          { value: "ajuste_medicacao_fc", label: "Medicação ajustada conforme prescrição", frase: "medicação ajustada conforme prescrição frente à alteração de frequência cardíaca" },
          { value: "sem_conduta_fc", label: "Nenhuma conduta até o momento", frase: null, needsReview: true },
        ],
      },
      {
        id: "pa", layer: "condicional",
        showIf: { questionId: "idade_unidade", check: (answers) => answers.idade_unidade === "anos" && Number(answers.idade_anos) >= 18 },
        type: "numeric_pair",
        titulo: "Qual a pressão arterial?",
        unitA: "mmHg", labelA: "Sistólica", minA: 40, maxA: 260,
        unitB: "mmHg", labelB: "Diastólica", minB: 20, maxB: 160,
        // Classificação conforme Diretriz Brasileira de Hipertensão Arterial
        // 2020 (SBH/DHA-SBC/SBN) — Quadro 3.4. Só se aplica a adultos — não
        // temos referência confiável de PA neonatal, por isso "pa" só
        // aparece quando idade_unidade === "anos".
        classify: (sist, diast, answers) => {
          let notaMeta = "";
          if (answers && Number(answers.idade_anos) >= 65 && answers.idoso_fragil) {
            const higido = answers.idoso_fragil === "higido";
            const metaTexto = higido ? "130-139x70-79 mmHg (idoso hígido)" : "140-149x70-79 mmHg (idoso frágil)";
            const minS = higido ? 130 : 140, maxS = higido ? 139 : 149, minD = 70, maxD = 79;
            const dentroMeta = sist >= minS && sist <= maxS && diast >= minD && diast <= maxD;
            notaMeta = ` — ${dentroMeta ? "dentro" : "fora"} da meta pressórica de ${metaTexto}, Diretriz Brasileira de HAS 2020`;
          }
          if (sist < 90 || diast < 60) {
            return { label: "hipotenso", frase: `hipotenso, com pressão arterial de ${sist}x${diast} mmHg${notaMeta}` };
          }
          const categorias = [
            { nome: "hipertenso — estágio 3", minS: 180, minD: 110 },
            { nome: "hipertenso — estágio 2", minS: 160, minD: 100 },
            { nome: "hipertenso — estágio 1", minS: 140, minD: 90 },
            { nome: "pré-hipertenso", minS: 130, minD: 85 },
            { nome: "com PA normal", minS: 120, minD: 80 },
          ];
          const achado = categorias.find((c) => sist >= c.minS || diast >= c.minD);
          const nome = achado ? achado.nome : "com PA ótima";
          return { label: nome, frase: `${nome}, com pressão arterial de ${sist}x${diast} mmHg${notaMeta}` };
        },
      },
      {
        id: "conduta_pa_alterada", layer: "condicional",
        showIf: {
          questionId: "pa",
          check: (answers) => {
            const pa = answers.pa;
            if (!pa || pa.a === undefined || pa.a === "" || pa.b === undefined || pa.b === "") return false;
            const s = Number(pa.a);
            const d = Number(pa.b);
            if (Number.isNaN(s) || Number.isNaN(d)) return false;
            return s < 90 || d < 60 || s >= 140 || d >= 90;
          },
        },
        type: "select",
        titulo: "Qual conduta foi adotada frente à alteração de pressão arterial?",
        options: [
          { value: "comunicado_pa", label: "Comunicado à equipe médica", frase: "equipe médica comunicada sobre a alteração de pressão arterial" },
          { value: "reposicao_volemica", label: "Reposição volêmica iniciada", frase: "iniciada reposição volêmica frente à alteração de pressão arterial" },
          { value: "ajuste_droga_pa", label: "Droga vasoativa ajustada", frase: "droga vasoativa ajustada frente à alteração de pressão arterial" },
          { value: "sem_conduta_pa", label: "Nenhuma conduta até o momento", frase: null, needsReview: true },
        ],
      },
      {
        id: "fr", layer: "universal", type: "numeric",
        titulo: "Qual a frequência respiratória?", unit: "irpm", min: 4, max: 100,
        classify: (v, answers) => {
          const { minFr, maxFr, rotulo } = faixaVitalPorIdade(answers);
          if (v < minFr) return { label: "bradipneico", frase: `bradipneico${rotulo}, com frequência respiratória de ${v} irpm` };
          if (v > maxFr) return { label: "taquipneico", frase: `taquipneico${rotulo}, com frequência respiratória de ${v} irpm` };
          return { label: "eupneico", frase: `eupneico${rotulo}, com frequência respiratória de ${v} irpm` };
        },
      },
      {
        id: "spo2", layer: "universal", type: "numeric",
        titulo: "Qual a saturação de oxigênio (SpO₂)?", unit: "%", min: 50, max: 100,
        classify: (v) =>
          v < 90 ? { label: "hipoxemia grave", frase: `apresentando hipoxemia, com SpO₂ de ${v}%` }
          : v < 95 ? { label: "hipoxemia leve", frase: `com SpO₂ discretamente reduzida, de ${v}%` }
          : { label: "normal", frase: `saturando ${v}% em oxigênio` },
      },
      {
        id: "conduta_hipoxemia", layer: "condicional",
        showIf: { questionId: "spo2", lessThan: 95 }, type: "select",
        titulo: "Qual conduta foi adotada frente à queda de SpO₂?",
        options: [
          { value: "aumento_fluxo", label: "Aumento de fluxo/FiO₂", frase: "com aumento de fluxo/FiO₂ frente à queda de saturação" },
          { value: "inicio_o2", label: "Início de suporte de oxigênio", frase: "iniciado suporte de oxigênio frente à queda de saturação" },
          { value: "comunicado_equipe", label: "Comunicado à equipe médica", frase: "equipe médica comunicada sobre a queda de saturação" },
          { value: "sem_conduta", label: "Nenhuma conduta até o momento", frase: null, needsReview: true },
        ],
      },
      {
        id: "temperatura", layer: "universal", type: "numeric",
        titulo: "Qual a temperatura axilar?", unit: "°C", min: 30, max: 43,
        // Idoso (≥65) tem resposta febril embotada — limiar reduzido é
        // ensino consolidado de geriatria (RSBMT/SciELO). Neonato tem faixa
        // própria mais estreita. CONFIRMAR com protocolo do INDI antes de
        // tratar como regra definitiva de produção.
        classify: (v, answers) => {
          const neonatal = answers && ["dias", "meses"].includes(answers.idade_unidade);
          if (neonatal) {
            if (v < 36.5) return { label: "hipotérmico", frase: `hipotérmico, temperatura axilar de ${v}°C` };
            if (v > 37.5) return { label: "febril", frase: `febril, temperatura axilar de ${v}°C` };
            return { label: "normotérmico", frase: `normotérmico, temperatura axilar de ${v}°C` };
          }
          const idoso = answers && Number(answers.idade_anos) >= 65;
          const limiarFebre = idoso ? 37.2 : 37.8;
          if (v < 36) return { label: "hipotérmico", frase: `hipotérmico, temperatura axilar de ${v}°C` };
          if (v > limiarFebre) {
            const nota = idoso ? " (limiar reduzido por idade ≥ 65 anos)" : "";
            return { label: "febril", frase: `febril, temperatura axilar de ${v}°C${nota}` };
          }
          return { label: "afebril", frase: `afebril, temperatura axilar de ${v}°C` };
        },
      },
      {
        id: "conduta_febre", layer: "condicional",
        showIf: {
          questionId: "temperatura",
          check: (answers) => {
            if (answers.idade_unidade !== "anos") return false; // adulto só — neonato usa conduta_termica_neo
            const v = Number(answers.temperatura);
            if (answers.temperatura === undefined || answers.temperatura === "" || Number.isNaN(v)) return false;
            const idoso = Number(answers.idade_anos) >= 65;
            const limiarFebre = idoso ? 37.2 : 37.8;
            return v > limiarFebre;
          },
        },
        type: "select",
        titulo: "Qual conduta foi adotada frente à febre?",
        options: [
          { value: "antitermico", label: "Antitérmico administrado", frase: "administrado antitérmico frente ao quadro febril" },
          { value: "hemocultura", label: "Hemocultura coletada", frase: "coletada hemocultura frente ao quadro febril" },
          { value: "medidas_fisicas", label: "Medidas físicas (compressa, desagasalho)", frase: "instituídas medidas físicas para redução térmica" },
          { value: "comunicado_equipe_febre", label: "Comunicado à equipe médica", frase: "equipe médica comunicada sobre o quadro febril" },
          { value: "sem_conduta_febre", label: "Nenhuma conduta até o momento", frase: null, needsReview: true },
        ],
      },
      {
        id: "conduta_termica_neo", layer: "condicional",
        showIf: {
          questionId: "temperatura",
          check: (answers) => {
            if (!["dias", "meses"].includes(answers.idade_unidade)) return false; // neonato só
            const v = Number(answers.temperatura);
            return answers.temperatura !== undefined && answers.temperatura !== "" && !Number.isNaN(v) && (v < 36.5 || v > 37.5);
          },
        },
        type: "select",
        titulo: "Qual conduta foi adotada frente à alteração térmica?",
        options: [
          { value: "incubadora_ajustada", label: "Incubadora/berço aquecido ajustado", frase: "incubadora ajustada frente à alteração térmica" },
          { value: "comunicado_termica", label: "Equipe médica comunicada", frase: "equipe médica comunicada sobre a alteração térmica" },
          { value: "sem_conduta_termica_neo", label: "Nenhuma conduta até o momento", frase: null, needsReview: true },
        ],
      },
      // ---- Dor (adulto — EVA) / Desconforto respiratório (neonatal — Silverman) ----
      {
        id: "dor", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Qual a intensidade da dor referida (EVA 0–10)?",
        options: [
          { value: "sem_dor", label: "Sem dor (0)", frase: "nega dor" },
          { value: "leve", label: "Leve (1–3)", frase: "refere dor de leve intensidade" },
          { value: "moderada", label: "Moderada (4–6)", frase: "refere dor de moderada intensidade" },
          { value: "intensa", label: "Intensa (7–10)", frase: "refere dor de forte intensidade" },
        ],
      },
      // ---- Dor torácica (adulto) ----
      {
        id: "dor_localizacao", layer: "condicional",
        showIf: { questionId: "dor", equals: ["leve", "moderada", "intensa"] }, type: "select",
        titulo: "Qual a localização predominante da dor?",
        options: [
          { value: "toracica", label: "Torácica", frase: "localizada em região torácica" },
          { value: "abdominal", label: "Abdominal", frase: "localizada em região abdominal" },
          { value: "incisional", label: "Incisional/cirúrgica", frase: "em região da incisão cirúrgica" },
          { value: "outra", label: "Outra", frase: null },
        ],
      },
      {
        id: "dor_outra_localizacao", layer: "condicional",
        showIf: { questionId: "dor_localizacao", equals: "outra" }, type: "texto_livre",
        titulo: "Qual a localização da dor?",
        placeholder: "Ex: região lombar, cervical...",
        montarFrase: (texto) => `localizada em ${texto}`,
      },
      {
        id: "dor_toracica_caracteristicas", layer: "condicional",
        showIf: { questionId: "dor_localizacao", equals: "toracica" }, type: "multi_select",
        titulo: "A dor torácica tem alguma característica associada?",
        options: [
          { value: "irradiacao", label: "Irradiação para braço/mandíbula", frase: "com irradiação para braço/mandíbula" },
          { value: "sudorese", label: "Sudorese associada", frase: "com sudorese associada" },
          { value: "dispneia", label: "Dispneia associada", frase: "com dispneia associada" },
          { value: "nausea", label: "Náusea/vômito associado", frase: "com náusea associada" },
          { value: "nenhuma", label: "Nenhuma característica associada", frase: null },
        ],
      },
      {
        id: "conduta_dor_toracica", layer: "condicional",
        showIf: { questionId: "dor_localizacao", equals: "toracica" }, type: "select",
        titulo: "Qual conduta foi adotada frente à dor torácica?",
        options: [
          { value: "ecg", label: "ECG realizado", frase: "ECG realizado frente ao quadro de dor torácica" },
          { value: "comunicado_iam", label: "Equipe médica comunicada imediatamente", frase: "equipe médica comunicada imediatamente frente ao quadro de dor torácica" },
          { value: "troponina", label: "Troponina/marcadores coletados", frase: "coletados marcadores de necrose miocárdica" },
          { value: "sem_conduta_dor", label: "Nenhuma conduta até o momento", frase: null, needsReview: true },
        ],
      },
      {
        id: "silverman", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: ["dias", "meses"] }, type: "select",
        titulo: "Há sinais de desconforto respiratório (Silverman-Andrade)?",
        options: [
          { value: "ausente", label: "Ausente — sem tiragem, sem gemido", frase: "sem sinais de desconforto respiratório" },
          { value: "leve", label: "Leve — discreta tiragem", frase: "com discreta tiragem intercostal" },
          { value: "moderado", label: "Moderado — tiragem + batimento de asa de nariz", frase: "com tiragem intercostal e batimento de asa de nariz" },
          { value: "grave", label: "Grave — gemido expiratório audível", frase: "com gemido expiratório audível e desconforto respiratório importante" },
        ],
      },
      {
        id: "conduta_desconforto_grave", layer: "condicional",
        showIf: { questionId: "silverman", equals: "grave" }, type: "select",
        titulo: "Qual conduta foi adotada frente ao desconforto respiratório grave?",
        options: [
          { value: "comunicado_neo", label: "Neonatologista comunicado imediatamente", frase: "neonatologista comunicado imediatamente frente ao desconforto respiratório grave" },
          { value: "iniciado_cpap", label: "CPAP/suporte iniciado", frase: "iniciado suporte ventilatório frente ao desconforto respiratório grave" },
          { value: "intubacao_considerada", label: "Intubação considerada/realizada", frase: "intubação considerada frente ao desconforto respiratório grave" },
          { value: "sem_conduta_resp_neo", label: "Nenhuma conduta até o momento", frase: null, needsReview: true },
        ],
      },
      // ---- Pele — vocabulário muda por idade ----
      {
        id: "pele", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Como está a integridade da pele?",
        options: [
          { value: "integra", label: "Íntegra", frase: "pele íntegra, sem lesões" },
          { value: "hiperemia", label: "Hiperemia em ponto de pressão", frase: "hiperemia não reativa em região de proeminência óssea" },
          { value: "lesao", label: "Lesão por pressão presente", frase: "presença de lesão por pressão" },
        ],
      },
      {
        id: "pele_estadiamento", layer: "condicional",
        showIf: { questionId: "pele", equals: "lesao" }, type: "select",
        titulo: "Qual o estágio da lesão por pressão?",
        options: [
          { value: "1", label: "Estágio I", frase: "lesão por pressão estágio I" },
          { value: "2", label: "Estágio II", frase: "lesão por pressão estágio II" },
          { value: "3", label: "Estágio III", frase: "lesão por pressão estágio III" },
          { value: "4", label: "Estágio IV", frase: "lesão por pressão estágio IV" },
          { value: "nao_classificavel", label: "Não classificável", frase: "lesão por pressão não classificável" },
        ],
      },
      {
        id: "pele_neo", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: ["dias", "meses"] }, type: "select",
        titulo: "Como está a coloração da pele?",
        options: [
          { value: "rosada", label: "Rosada, corada", frase: "pele rosada e corada" },
          { value: "ictericia", label: "Ictérica", frase: "presença de icterícia" },
          { value: "cianose", label: "Cianose (central ou periférica)", frase: "presença de cianose" },
          { value: "palida", label: "Pálida", frase: "pele pálida" },
        ],
      },
      {
        id: "fototerapia", layer: "condicional",
        showIf: { questionId: "pele_neo", equals: "ictericia" }, type: "select",
        titulo: "Está em fototerapia?",
        options: [
          { value: "sim", label: "Sim", frase: "em fototerapia" },
          { value: "nao_indicada", label: "Não, aguardando avaliação/bilirrubina", frase: null, needsReview: true },
        ],
      },
      {
        id: "coto_umbilical", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: ["dias", "meses"] }, type: "select",
        titulo: "Como está o coto umbilical?",
        options: [
          { value: "seco_integro", label: "Seco e íntegro, sem sinais de infecção", frase: "coto umbilical seco e íntegro, sem sinais de infecção" },
          { value: "hiperemia", label: "Hiperemia periumbilical", frase: "hiperemia periumbilical" },
          { value: "secrecao", label: "Secreção purulenta", frase: "presença de secreção purulenta em coto umbilical" },
        ],
      },
      {
        id: "reflexos", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: ["dias", "meses"] }, type: "select",
        titulo: "Reflexos primitivos presentes e simétricos?",
        options: [
          { value: "presentes", label: "Presentes e simétricos (sucção, preensão, Moro)", frase: "reflexos primitivos presentes e simétricos" },
          { value: "diminuidos", label: "Diminuídos/assimétricos", frase: "reflexos primitivos diminuídos ou assimétricos" },
        ],
      },
      // ---- Mobilidade / força motora (só adulto — sem escala neonatal validada) ----
      {
        id: "mobilidade", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Qual o grau de mobilidade?",
        options: [
          { value: "sem_auxilio", label: "Deambulando sem auxílio", frase: "deambulando sem auxílio" },
          { value: "com_auxilio", label: "Deambulando com auxílio", frase: "deambulando com auxílio" },
          { value: "restrito", label: "Restrito ao leito", frase: "restrito ao leito" },
          { value: "dependente", label: "Dependente total", frase: "totalmente dependente para mobilização" },
        ],
      },
      {
        id: "forca_motora", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Como está a força motora?",
        options: [
          { value: "preservada", label: "Preservada em todos os membros", frase: "força motora preservada em todos os membros" },
          { value: "assimetrica", label: "Assimetria de força entre os lados", frase: "assimetria de força motora" },
          { value: "deficit_global", label: "Déficit motor global", frase: "déficit motor global" },
        ],
      },
      // ---- Eliminações — vocabulário muda por idade ----
      {
        id: "eliminacoes", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Como estão as eliminações?",
        options: [
          { value: "espontaneas", label: "Espontâneas, sem alterações", frase: "eliminações vesicointestinais espontâneas, sem alterações" },
          { value: "sonda_vesical", label: "Sonda vesical de demora", frase: "em uso de sonda vesical de demora" },
          { value: "fralda", label: "Fralda / incontinência", frase: "em uso de fralda por incontinência" },
          { value: "ostomia", label: "Ostomia", frase: "portador de ostomia" },
        ],
      },
      {
        id: "diurese_volume", layer: "condicional",
        showIf: { questionId: "eliminacoes", equals: "sonda_vesical" }, type: "numeric",
        titulo: "Qual o volume urinário nas últimas 24h?", unit: "mL", min: 0, max: 6000,
        classify: (v) =>
          v < 400 ? { label: "oligúrico", frase: `oligúrico, diurese de ${v} mL nas últimas 24h` }
          : { label: null, frase: `diurese de ${v} mL nas últimas 24h` },
      },
      {
        id: "eliminacoes_neo", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: ["dias", "meses"] }, type: "select",
        titulo: "Como estão as eliminações?",
        options: [
          { value: "presentes", label: "Diurese e evacuações presentes", frase: "eliminações vesicointestinais presentes" },
          { value: "sem_diurese", label: "Ainda sem diurese", frase: "ainda sem diurese registrada" },
          { value: "sem_evacuacao", label: "Ainda sem evacuação (mecônio)", frase: "ainda sem eliminação de mecônio" },
        ],
      },
      // ---- Dieta — vocabulário muda por idade ----
      {
        id: "dieta", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Qual a via de dieta?",
        options: [
          { value: "oral", label: "Via oral", frase: "aceitando dieta por via oral" },
          { value: "enteral", label: "Enteral por sonda", frase: "em dieta enteral por sonda" },
          { value: "parenteral", label: "Parenteral", frase: "em nutrição parenteral" },
          { value: "zero", label: "Dieta zero", frase: "mantido em dieta zero" },
        ],
      },
      {
        id: "dieta_tolerancia", layer: "condicional",
        showIf: { questionId: "dieta", equals: "enteral" }, type: "select",
        titulo: "Como está a tolerância à dieta enteral?",
        options: [
          { value: "bem_tolerada", label: "Bem tolerada", frase: "com boa tolerância à dieta enteral" },
          { value: "residuo", label: "Resíduo gástrico aumentado", frase: "com resíduo gástrico aumentado" },
          { value: "vomitos", label: "Vômitos/distensão", frase: "apresentando vômitos e distensão abdominal" },
        ],
      },
      {
        id: "dieta_neo", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: ["dias", "meses"] }, type: "select",
        titulo: "Qual a via de alimentação?",
        options: [
          { value: "seio_livre_demanda", label: "Seio materno em livre demanda", frase: "em aleitamento materno em livre demanda" },
          { value: "sonda_gastrica", label: "Sonda gástrica/orogástrica", frase: "em dieta por sonda gástrica" },
          { value: "formula", label: "Fórmula infantil", frase: "recebendo fórmula infantil" },
          { value: "zero", label: "Dieta zero", frase: "mantido em dieta zero" },
        ],
      },
      // ---- Exame físico complementar (adulto) ----
      {
        id: "ausculta_pulmonar", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Como está a ausculta pulmonar?",
        options: [
          { value: "mv_presente", label: "MV presente bilateralmente, sem ruídos adventícios", frase: "murmúrio vesicular presente bilateralmente, sem ruídos adventícios" },
          { value: "mv_diminuido", label: "MV diminuído", frase: "murmúrio vesicular diminuído" },
          { value: "ra_presentes", label: "Ruídos adventícios presentes", frase: "presença de ruídos adventícios à ausculta pulmonar" },
          { value: "mv_abolido", label: "MV abolido", frase: "murmúrio vesicular abolido" },
        ],
      },
      {
        id: "ausculta_cardiaca", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Como está a ausculta cardíaca?",
        options: [
          { value: "bnf_2t", label: "Bulhas normofonéticas em 2 tempos, sem sopro", frase: "bulhas cardíacas normofonéticas em 2 tempos, sem sopro" },
          { value: "hipofoneticas", label: "Bulhas hipofonéticas", frase: "bulhas cardíacas hipofonéticas" },
          { value: "sopro", label: "Sopro audível", frase: "presença de sopro à ausculta cardíaca" },
        ],
      },
      {
        id: "perfusao_perif", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Como está a perfusão periférica?",
        options: [
          { value: "adequada", label: "Adequada (TEC < 3s, extremidades quentes)", frase: "perfusão periférica adequada, tempo de enchimento capilar inferior a 3 segundos" },
          { value: "tec_lento", label: "Tempo de enchimento capilar prolongado (> 3s)", frase: "tempo de enchimento capilar prolongado" },
          { value: "fria_cianotica", label: "Extremidades frias/cianóticas", frase: "extremidades frias e cianóticas" },
        ],
      },
      {
        id: "exame_abdominal", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Como está o exame abdominal?",
        options: [
          { value: "normal", label: "RHA presentes, abdome flácido e indolor", frase: "ruídos hidroaéreos presentes, abdome flácido e indolor à palpação" },
          { value: "hipoativo", label: "RHA diminuídos/ausentes", frase: "ruídos hidroaéreos diminuídos" },
          { value: "distendido", label: "Distendido/doloroso", frase: "abdome distendido e doloroso à palpação" },
        ],
      },
      {
        id: "pupilas", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Como estão as pupilas?",
        options: [
          { value: "isocoricas", label: "Isocóricas e fotorreagentes", frase: "pupilas isocóricas e fotorreagentes" },
          { value: "anisocoria", label: "Anisocoria", frase: "anisocoria" },
          { value: "midriase", label: "Midríase bilateral", frase: "midríase pupilar bilateral" },
          { value: "miose", label: "Miose bilateral", frase: "miose pupilar bilateral" },
        ],
      },
      // ---- Domínios céfalo-podais restantes (só adulto — RAIZ UNIVERSAL do
      // grafo, mas sem cobertura neonatal validada ainda) ----
      {
        id: "estado_geral", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Como está o estado geral?",
        options: [
          { value: "normal", label: "Preservado, colaborativo, sem sinais de sofrimento", frase: "estado geral preservado, colaborativo, sem sinais de sofrimento" },
          { value: "alterado", label: "Alterado", frase: null, needsReview: true },
        ],
      },
      {
        id: "cabeca", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Cabeça/crânio sem alterações?",
        options: [
          { value: "normal", label: "Sem alterações à inspeção/palpação", frase: "crânio sem alterações à inspeção e palpação" },
          { value: "alterado", label: "Alterado", frase: null, needsReview: true },
        ],
      },
      {
        id: "cabeca_detalhe", layer: "condicional",
        showIf: { questionId: "cabeca", equals: "alterado" }, type: "texto_livre",
        titulo: "Descreva a alteração em cabeça/crânio",
        placeholder: "Descreva o que foi encontrado",
        montarFrase: (texto) => `alteração em cabeça/crânio: ${texto}`,
      },
      {
        id: "face", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Face simétrica, sem alterações?",
        options: [
          { value: "normal", label: "Simétrica, sem alterações", frase: "face simétrica, sem alterações" },
          { value: "alterado", label: "Alterada", frase: null, needsReview: true },
        ],
      },
      {
        id: "face_detalhe", layer: "condicional",
        showIf: { questionId: "face", equals: "alterado" }, type: "texto_livre",
        titulo: "Descreva a alteração em face",
        placeholder: "Descreva o que foi encontrado",
        montarFrase: (texto) => `alteração em face: ${texto}`,
      },
      {
        id: "olhos", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Olhos sem alterações (além das pupilas)?",
        options: [
          { value: "normal", label: "Sem secreção, sem hiperemia", frase: "olhos sem secreção, sem hiperemia" },
          { value: "alterado", label: "Alterado", frase: null, needsReview: true },
        ],
      },
      {
        id: "olhos_detalhe", layer: "condicional",
        showIf: { questionId: "olhos", equals: "alterado" }, type: "texto_livre",
        titulo: "Descreva a alteração em olhos",
        placeholder: "Descreva o que foi encontrado",
        montarFrase: (texto) => `alteração em olhos: ${texto}`,
      },
      {
        id: "ouvidos", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Ouvidos sem alterações?",
        options: [
          { value: "normal", label: "Pavilhões sem alterações, sem secreção", frase: "pavilhões auriculares sem alterações, sem secreção" },
          { value: "alterado", label: "Alterado", frase: null, needsReview: true },
        ],
      },
      {
        id: "ouvidos_detalhe", layer: "condicional",
        showIf: { questionId: "ouvidos", equals: "alterado" }, type: "texto_livre",
        titulo: "Descreva a alteração em ouvidos",
        placeholder: "Descreva o que foi encontrado",
        montarFrase: (texto) => `alteração em ouvidos: ${texto}`,
      },
      {
        id: "nariz", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Nariz sem alterações?",
        options: [
          { value: "normal", label: "Sem secreção, sem obstrução", frase: "nariz sem secreção, sem obstrução" },
          { value: "alterado", label: "Alterado", frase: null, needsReview: true },
        ],
      },
      {
        id: "nariz_detalhe", layer: "condicional",
        showIf: { questionId: "nariz", equals: "alterado" }, type: "texto_livre",
        titulo: "Descreva a alteração em nariz",
        placeholder: "Descreva o que foi encontrado",
        montarFrase: (texto) => `alteração em nariz: ${texto}`,
      },
      {
        id: "boca", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Boca/cavidade oral sem alterações?",
        options: [
          { value: "normal", label: "Mucosa íntegra, sem lesões", frase: "mucosa oral íntegra, sem lesões" },
          { value: "alterado", label: "Alterada", frase: null, needsReview: true },
        ],
      },
      {
        id: "boca_detalhe", layer: "condicional",
        showIf: { questionId: "boca", equals: "alterado" }, type: "texto_livre",
        titulo: "Descreva a alteração em boca/cavidade oral",
        placeholder: "Descreva o que foi encontrado",
        montarFrase: (texto) => `alteração em boca/cavidade oral: ${texto}`,
      },
      {
        id: "pescoco", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Pescoço sem alterações?",
        options: [
          { value: "normal", label: "Sem linfonodomegalias, sem turgência jugular", frase: "pescoço sem linfonodomegalias, sem turgência jugular" },
          { value: "alterado", label: "Alterado", frase: null, needsReview: true },
        ],
      },
      {
        id: "pescoco_detalhe", layer: "condicional",
        showIf: { questionId: "pescoco", equals: "alterado" }, type: "texto_livre",
        titulo: "Descreva a alteração em pescoço",
        placeholder: "Descreva o que foi encontrado",
        montarFrase: (texto) => `alteração em pescoço: ${texto}`,
      },
      {
        id: "mmss", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Membros superiores sem alterações?",
        options: [
          { value: "normal", label: "Sem edema, sem deformidades aparentes", frase: "membros superiores sem edema, sem deformidades aparentes" },
          { value: "alterado", label: "Alterado", frase: null, needsReview: true },
        ],
      },
      {
        id: "mmss_detalhe", layer: "condicional",
        showIf: { questionId: "mmss", equals: "alterado" }, type: "texto_livre",
        titulo: "Descreva a alteração em membros superiores",
        placeholder: "Descreva o que foi encontrado",
        montarFrase: (texto) => `alteração em membros superiores: ${texto}`,
      },
      {
        id: "mmii", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Membros inferiores sem alterações?",
        options: [
          { value: "normal", label: "Sem edema, sem deformidades aparentes", frase: "membros inferiores sem edema, sem deformidades aparentes" },
          { value: "alterado", label: "Alterado", frase: null, needsReview: true },
        ],
      },
      {
        id: "mmii_detalhe", layer: "condicional",
        showIf: { questionId: "mmii", equals: "alterado" }, type: "texto_livre",
        titulo: "Descreva a alteração em membros inferiores",
        placeholder: "Descreva o que foi encontrado",
        montarFrase: (texto) => `alteração em membros inferiores: ${texto}`,
      },
      {
        id: "pes", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Pés sem alterações?",
        options: [
          { value: "normal", label: "Sem lesões, sem deformidades", frase: "pés sem lesões, sem deformidades" },
          { value: "alterado", label: "Alterado", frase: null, needsReview: true },
        ],
      },
      {
        id: "pes_detalhe", layer: "condicional",
        showIf: { questionId: "pes", equals: "alterado" }, type: "texto_livre",
        titulo: "Descreva a alteração em pés",
        placeholder: "Descreva o que foi encontrado",
        montarFrase: (texto) => `alteração em pés: ${texto}`,
      },
      {
        id: "psicossocial", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Sem alterações psicossociais identificadas?",
        options: [
          { value: "normal", label: "Sem alterações identificadas", frase: "sem alterações psicossociais identificadas no momento" },
          { value: "alterado", label: "Alterado", frase: null, needsReview: true },
        ],
      },
      {
        id: "psicossocial_detalhe", layer: "condicional",
        showIf: { questionId: "psicossocial", equals: "alterado" }, type: "texto_livre",
        titulo: "Descreva a alteração em aspecto psicossocial",
        placeholder: "Descreva o que foi encontrado",
        montarFrase: (texto) => `alteração em aspecto psicossocial: ${texto}`,
      },
      {
        id: "seguranca", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Sem risco de segurança identificado (queda, alergia, identificação)?",
        options: [
          { value: "normal", label: "Sem risco identificado no momento", frase: "sem risco de segurança identificado no momento" },
          { value: "alterado", label: "Risco identificado", frase: null, needsReview: true },
        ],
      },
      {
        id: "seguranca_detalhe", layer: "condicional",
        showIf: { questionId: "seguranca", equals: "alterado" }, type: "texto_livre",
        titulo: "Descreva a alteração em segurança",
        placeholder: "Descreva o que foi encontrado",
        montarFrase: (texto) => `alteração em segurança: ${texto}`,
      },
      // ---- Núcleo da área — via aérea e dispositivos, vocabulário por idade ----
      {
        id: "via_aerea", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Qual o suporte de via aérea?",
        options: [
          { value: "ar_ambiente", label: "Ar ambiente", frase: "em ar ambiente" },
          { value: "cateter_o2", label: "Cateter nasal de O₂", frase: "em uso de cateter nasal de oxigênio" },
          { value: "mascara_reinalante", label: "Máscara não reinalante", frase: "em uso de máscara não reinalante" },
          { value: "vni", label: "Ventilação não invasiva", frase: "em ventilação não invasiva" },
          { value: "vm", label: "Ventilação mecânica invasiva", frase: "em ventilação mecânica invasiva" },
        ],
      },
      // ---- Parâmetros ventilatórios — adulto e neonatal ----
      {
        id: "modo_ventilatorio", layer: "condicional",
        showIf: { questionId: "via_aerea", equals: "vm" }, type: "select",
        titulo: "Qual o modo ventilatório?",
        options: [
          { value: "vcv", label: "VCV", frase: "em modo ventilatório VCV" },
          { value: "pcv", label: "PCV", frase: "em modo ventilatório PCV" },
          { value: "psv", label: "PSV", frase: "em modo ventilatório PSV, em desmame" },
        ],
      },
      {
        id: "fio2", layer: "condicional",
        showIf: { questionId: "via_aerea", equals: "vm" }, type: "numeric",
        titulo: "Qual a FiO₂ programada?", unit: "%", min: 21, max: 100,
        classify: (v) => ({ label: null, frase: `FiO₂ de ${v}%` }),
      },
      {
        id: "peep", layer: "condicional",
        showIf: { questionId: "via_aerea", equals: "vm" }, type: "numeric",
        titulo: "Qual o PEEP programado?", unit: "cmH₂O", min: 0, max: 20,
        classify: (v) => ({ label: null, frase: `PEEP de ${v} cmH₂O` }),
      },
      {
        id: "fluxo_o2", layer: "condicional",
        showIf: { questionId: "via_aerea", equals: ["cateter_o2", "mascara_reinalante"] }, type: "numeric",
        titulo: "Qual o fluxo de oxigênio?", unit: "L/min", min: 0.5, max: 15,
        classify: (v) => ({ label: null, frase: `oxigenoterapia com fluxo de ${v} L/min` }),
      },
      {
        id: "via_aerea_neo", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: ["dias", "meses"] }, type: "select",
        titulo: "Qual o suporte de via aérea?",
        options: [
          { value: "ar_ambiente", label: "Ar ambiente", frase: "em ar ambiente" },
          { value: "cpap", label: "CPAP nasal", frase: "em uso de CPAP nasal" },
          { value: "capacete_o2", label: "Capacete de O₂ (Halo)", frase: "em uso de capacete de oxigênio" },
          { value: "vm", label: "Ventilação mecânica invasiva", frase: "em ventilação mecânica invasiva" },
        ],
      },
      {
        id: "modo_ventilatorio_neo", layer: "condicional",
        showIf: { questionId: "via_aerea_neo", equals: "vm" }, type: "select",
        titulo: "Qual o modo ventilatório?",
        options: [
          { value: "vcv", label: "VCV", frase: "em modo ventilatório VCV" },
          { value: "pcv", label: "PCV", frase: "em modo ventilatório PCV" },
          { value: "psv", label: "PSV", frase: "em modo ventilatório PSV, em desmame" },
        ],
      },
      {
        id: "fio2_neo", layer: "condicional",
        showIf: { questionId: "via_aerea_neo", equals: "vm" }, type: "numeric",
        titulo: "Qual a FiO₂ programada?", unit: "%", min: 21, max: 100,
        classify: (v) => ({ label: null, frase: `FiO₂ de ${v}%` }),
      },
      {
        id: "peep_neo", layer: "condicional",
        showIf: { questionId: "via_aerea_neo", equals: "vm" }, type: "numeric",
        titulo: "Qual o PEEP programado?", unit: "cmH₂O", min: 2, max: 10,
        classify: (v) => ({ label: null, frase: `PEEP de ${v} cmH₂O` }),
      },
      {
        id: "cpap_pressao", layer: "condicional",
        showIf: { questionId: "via_aerea_neo", equals: "cpap" }, type: "numeric",
        titulo: "Qual a pressão do CPAP?", unit: "cmH₂O", min: 3, max: 10,
        classify: (v) => ({ label: null, frase: `CPAP com pressão de ${v} cmH₂O` }),
      },
      {
        id: "dispositivos", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "multi_select",
        titulo: "Quais dispositivos invasivos estão presentes?",
        options: [
          { value: "avp", label: "Acesso venoso periférico", frase: "em uso de acesso venoso periférico" },
          { value: "cvc", label: "Cateter venoso central", frase: "em uso de cateter venoso central" },
          { value: "pam", label: "Pressão arterial invasiva (PAM)", frase: "em monitorização de pressão arterial invasiva" },
          { value: "sng", label: "Sonda nasogástrica/enteral", frase: "em uso de sonda nasoenteral" },
          { value: "dreno", label: "Dreno", frase: "em uso de dreno" },
          { value: "nenhum", label: "Nenhum", frase: null },
        ],
      },
      // ---- Dispositivos com detalhe (adulto) ----
      {
        id: "avp_calibre", layer: "condicional",
        showIf: { questionId: "dispositivos", includes: "avp" }, type: "select",
        titulo: "Qual o calibre do acesso venoso periférico?",
        options: [
          { value: "14g", label: "14G", frase: "calibre 14G" },
          { value: "16g", label: "16G", frase: "calibre 16G" },
          { value: "18g", label: "18G", frase: "calibre 18G" },
          { value: "20g", label: "20G", frase: "calibre 20G" },
          { value: "22g", label: "22G", frase: "calibre 22G" },
          { value: "24g", label: "24G", frase: "calibre 24G" },
        ],
      },
      {
        id: "avp_local", layer: "condicional",
        showIf: { questionId: "dispositivos", includes: "avp" }, type: "texto_livre",
        titulo: "Qual o membro/região do acesso venoso periférico?",
        placeholder: "Ex: antebraço direito, dorso da mão esquerda",
        montarFrase: (texto) => `em ${texto}`,
      },
      {
        id: "cvc_sitio", layer: "condicional",
        showIf: { questionId: "dispositivos", includes: "cvc" }, type: "select",
        titulo: "Qual o sítio de inserção do cateter venoso central?",
        options: [
          { value: "jugular_d", label: "Jugular direita", frase: "sítio jugular direito" },
          { value: "jugular_e", label: "Jugular esquerda", frase: "sítio jugular esquerdo" },
          { value: "subclavia_d", label: "Subclávia direita", frase: "sítio subclávio direito" },
          { value: "subclavia_e", label: "Subclávia esquerda", frase: "sítio subclávio esquerdo" },
          { value: "femoral_d", label: "Femoral direita", frase: "sítio femoral direito" },
          { value: "femoral_e", label: "Femoral esquerda", frase: "sítio femoral esquerdo" },
        ],
      },
      {
        id: "dreno_debito", layer: "condicional",
        showIf: { questionId: "dispositivos", includes: "dreno" }, type: "numeric",
        titulo: "Qual o débito do dreno nas últimas 24h?", unit: "mL", min: 0, max: 3000,
        classify: (v) => ({ label: null, frase: `dreno com débito de ${v} mL nas últimas 24h` }),
      },
      {
        id: "dreno_aspecto", layer: "condicional",
        showIf: { questionId: "dispositivos", includes: "dreno" }, type: "select",
        titulo: "Qual o aspecto do débito do dreno?",
        options: [
          { value: "serosanguinolento", label: "Serossanguinolento", frase: "de aspecto serossanguinolento" },
          { value: "purulento", label: "Purulento", frase: "de aspecto purulento" },
          { value: "claro", label: "Claro", frase: "de aspecto claro" },
        ],
      },
      {
        id: "dispositivos_neo", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: ["dias", "meses"] }, type: "multi_select",
        titulo: "Quais acessos/dispositivos estão presentes?",
        options: [
          { value: "cateter_umbilical", label: "Cateter umbilical (arterial/venoso)", frase: "em uso de cateter umbilical" },
          { value: "picc", label: "PICC", frase: "em uso de cateter central de inserção periférica (PICC)" },
          { value: "avp", label: "Acesso venoso periférico", frase: "em uso de acesso venoso periférico" },
          { value: "nenhum", label: "Nenhum", frase: null },
        ],
      },
      {
        id: "droga_vasoativa", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "select",
        titulo: "Está em uso de droga vasoativa?",
        options: [
          { value: "nao", label: "Não", frase: null },
          { value: "sim", label: "Sim", frase: "em uso de droga vasoativa" },
        ],
      },
      {
        id: "droga_vasoativa_qual", layer: "condicional",
        showIf: { questionId: "droga_vasoativa", equals: "sim" }, type: "select",
        titulo: "Qual droga vasoativa está em uso?",
        options: [
          { value: "noradrenalina", label: "Noradrenalina", frase: "noradrenalina" },
          { value: "dobutamina", label: "Dobutamina", frase: "dobutamina" },
          { value: "outra", label: "Outra", frase: null },
        ],
      },
      {
        id: "droga_vasoativa_outro_nome", layer: "condicional",
        showIf: { questionId: "droga_vasoativa_qual", equals: "outra" }, type: "texto_livre",
        titulo: "Qual o nome da droga vasoativa?",
        placeholder: "Ex: Vasopressina, Adrenalina...",
      },
      {
        id: "droga_vasoativa_dose", layer: "condicional",
        showIf: { questionId: "droga_vasoativa", equals: "sim" }, type: "numeric",
        titulo: "Qual a dose de infusão?", unit: "mL/h", min: 0.1, max: 100,
        classify: (v) => ({ label: null, frase: `em infusão contínua a ${v} mL/h` }),
      },
      {
        id: "balanco_hidrico", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "numeric_pair",
        titulo: "Qual o balanço hídrico das últimas 24h?",
        unitA: "mL", labelA: "Ganhos", minA: 0, maxA: 10000,
        unitB: "mL", labelB: "Perdas", minB: 0, maxB: 10000,
        classify: (ganhos, perdas) => {
          const liquido = ganhos - perdas;
          const status = liquido > 500 ? "positivo" : liquido < -500 ? "negativo" : "neutro";
          return {
            label: status,
            frase: `com balanço hídrico ${status} nas últimas 24h (ganhos de ${ganhos} mL, perdas de ${perdas} mL, líquido de ${liquido} mL)`,
          };
        },
      },
      {
        id: "glicemia", layer: "condicional",
        showIf: { questionId: "idade_unidade", equals: "anos" }, type: "numeric",
        titulo: "Qual a glicemia capilar?", unit: "mg/dL", min: 20, max: 600,
        classify: (v) =>
          v < 70 ? { label: "hipoglicêmico", frase: `hipoglicêmico, glicemia capilar de ${v} mg/dL` }
          : v > 180 ? { label: "hiperglicêmico", frase: `hiperglicêmico, glicemia capilar de ${v} mg/dL` }
          : { label: "normoglicêmico", frase: `normoglicêmico, glicemia capilar de ${v} mg/dL` },
      },
    ],
  },
];

function isAnswered(question, answers) {
  const val = answers[question.id];
  if (question.type === "multi_select") {
    return Array.isArray(val) && val.length > 0;
  }
  if (question.type === "numeric") {
    if (val === undefined || val === "") return false;
    const num = Number(val);
    return !Number.isNaN(num) && num >= question.min && num <= question.max;
  }
  if (question.type === "numeric_pair") {
    if (!val || val.a === undefined || val.a === "" || val.b === undefined || val.b === "") return false;
    const a = Number(val.a);
    const b = Number(val.b);
    return !Number.isNaN(a) && !Number.isNaN(b) && a >= question.minA && a <= question.maxA && b >= question.minB && b <= question.maxB;
  }
  if (question.type === "texto_livre") {
    return typeof val === "string" && val.trim().length > 0;
  }
  return val !== undefined;
}

// Mapa de categoria clínica por id de pergunta — define em qual parágrafo
// cada achado entra e em que ordem os parágrafos aparecem. Perguntas sem
// entrada aqui caem em "outros" (parágrafo final, evita perder dado).
const ORDEM_PARAGRAFOS = ["geral", "exame_fisico", "abdome", "suporte", "dispositivos", "psicossocial", "outros"];

const ABERTURA_PARAGRAFO = {
  geral: "Paciente",
  exame_fisico: "Ao exame físico,",
  abdome: null,
  suporte: "Em suporte respiratório e sedação,",
  dispositivos: "Em uso de dispositivos e terapias,",
  psicossocial: null,
  outros: null,
};

// Sub-agrupamento dentro de cada parágrafo: itens do mesmo subgrupo ficam
// juntos numa frase só (vírgula); ao mudar de subgrupo, fecha frase (ponto)
// e abre a próxima com maiúscula. É isso que troca "lista com vírgula" por
// "texto com frases curtas".
const SUBGRUPO_POR_ID = {
  queixa_principal: "triagem", classificacao_risco: "triagem",
  sexo: "aparencia",
  idade_unidade: "aparencia", idade_anos: "aparencia", idade_meses: "aparencia", idade_dias: "aparencia", idoso_fragil: "aparencia", consciencia: "aparencia", estado_geral: "aparencia", estado_geral_detalhe: "aparencia",
  idade_gestacional: "aparencia", peso: "aparencia", estado_alerta: "aparencia",
  situacao_clinica: "aparencia",
  tipo_cirurgia: "cirurgico", anestesia: "cirurgico", ferida_operatoria: "cirurgico",
  gestacao_semanas: "obstetrico", movimentos_fetais: "obstetrico", bcf: "obstetrico", contracoes: "obstetrico",
  dilatacao: "obstetrico", dinamica_uterina: "obstetrico", bolsa: "obstetrico",
  tipo_parto: "puerperio", sitio_cirurgico_obstetrico: "puerperio", involucao_uterina: "puerperio",
  loquios: "puerperio", conduta_loquios_odor: "puerperio",
  mamas: "puerperio", mamilos: "puerperio", amamentacao: "puerperio", perineo: "puerperio",
  silverman: "respiratorio_geral", conduta_desconforto_grave: "respiratorio_geral",
  conduta_termica_neo: "temperatura",
  coto_umbilical: "umbilical", reflexos: "reflexos_neo",
  cpap_pressao: "via_aerea", fototerapia: "fototerapia_neo",
  fc: "hemodinamica", pa: "hemodinamica", conduta_fc_alterada: "hemodinamica", conduta_pa_alterada: "hemodinamica",
  fr: "respiratorio_geral", spo2: "respiratorio_geral", conduta_hipoxemia: "respiratorio_geral",
  temperatura: "temperatura", conduta_febre: "temperatura",
  dor: "dor", dor_localizacao: "dor", dor_outra_localizacao: "dor",
  dor_toracica_caracteristicas: "dor", conduta_dor_toracica: "dor",

  pele: "pele", pele_estadiamento: "pele", pele_neo: "pele",
  eliminacoes_neo: "eliminacoes", dieta_neo: "dieta_grupo",
  via_aerea_neo: "via_aerea", dispositivos_neo: "acessos",
  modo_ventilatorio_neo: "via_aerea", fio2_neo: "via_aerea", peep_neo: "via_aerea",
  cabeca: "cranio_face", cabeca_detalhe: "cranio_face", face: "cranio_face", face_detalhe: "cranio_face",
  olhos: "olhos_pupilas", olhos_detalhe: "olhos_pupilas", pupilas: "olhos_pupilas",
  ouvidos: "orl", ouvidos_detalhe: "orl", nariz: "orl", nariz_detalhe: "orl",
  boca: "orl", boca_detalhe: "orl",
  pescoco: "pescoco", pescoco_detalhe: "pescoco",
  ausculta_pulmonar: "pulmonar",
  ausculta_cardiaca: "cardiaco", perfusao_perif: "cardiaco",
  mmss: "membros", mmss_detalhe: "membros", mmii: "membros", mmii_detalhe: "membros",
  pes: "membros", pes_detalhe: "membros",

  mobilidade: "funcional", forca_motora: "funcional",
  exame_abdominal: "abdominal",
  eliminacoes: "eliminacoes", diurese_volume: "eliminacoes",
  dieta: "dieta_grupo", dieta_tolerancia: "dieta_grupo",

  via_aerea: "via_aerea", modo_ventilatorio: "via_aerea", fio2: "via_aerea",
  peep: "via_aerea", fluxo_o2: "via_aerea",
  sedativo_qual: "sedacao", sedativo_outro_nome: "sedacao",
  dose_midazolam: "sedacao", dose_propofol: "sedacao", dose_fentanil: "sedacao",
  dose_dexmedetomidina: "sedacao", dose_outra_sedativo: "sedacao", sedacao_rass: "sedacao",

  dispositivos: "acessos", avp_calibre: "acessos", avp_local: "acessos", cvc_sitio: "acessos",
  dreno_debito: "acessos", dreno_aspecto: "acessos",
  droga_vasoativa: "drogas", droga_vasoativa_qual: "drogas", droga_vasoativa_outro_nome: "drogas",
  droga_vasoativa_dose: "drogas",
  balanco_hidrico: "metabolico", glicemia: "metabolico",

  psicossocial: "psico", psicossocial_detalhe: "psico",
  seguranca: "seguranca", seguranca_detalhe: "seguranca",
};

const CATEGORIA_POR_ID = {
  queixa_principal: "geral", classificacao_risco: "geral",
  sexo: "geral",
  idade_unidade: "geral", idade_anos: "geral", idade_meses: "geral", idade_dias: "geral", idoso_fragil: "geral", consciencia: "geral", estado_geral: "geral", estado_geral_detalhe: "geral",
  idade_gestacional: "geral", peso: "geral", estado_alerta: "geral",
  situacao_clinica: "geral",
  tipo_cirurgia: "geral", anestesia: "geral", ferida_operatoria: "geral",
  gestacao_semanas: "geral", movimentos_fetais: "geral", bcf: "geral", contracoes: "geral",
  dilatacao: "geral", dinamica_uterina: "geral", bolsa: "geral",
  tipo_parto: "geral", sitio_cirurgico_obstetrico: "geral", involucao_uterina: "geral",
  loquios: "geral", conduta_loquios_odor: "geral",
  mamas: "geral", mamilos: "geral", amamentacao: "geral", perineo: "geral",
  silverman: "geral", conduta_desconforto_grave: "geral", conduta_termica_neo: "geral",
  coto_umbilical: "exame_fisico", reflexos: "exame_fisico",
  cpap_pressao: "suporte", fototerapia: "dispositivos",
  fc: "geral", pa: "geral", fr: "geral", spo2: "geral", temperatura: "geral",
  conduta_hipoxemia: "geral", conduta_febre: "geral",
  conduta_fc_alterada: "geral", conduta_pa_alterada: "geral",
  dor: "geral", dor_localizacao: "geral", dor_outra_localizacao: "geral",
  dor_toracica_caracteristicas: "geral", conduta_dor_toracica: "geral",

  pele: "exame_fisico", cabeca: "exame_fisico", cabeca_detalhe: "exame_fisico",
  face: "exame_fisico", face_detalhe: "exame_fisico",
  olhos: "exame_fisico", olhos_detalhe: "exame_fisico", pupilas: "exame_fisico",
  ouvidos: "exame_fisico", ouvidos_detalhe: "exame_fisico",
  nariz: "exame_fisico", nariz_detalhe: "exame_fisico",
  boca: "exame_fisico", boca_detalhe: "exame_fisico",
  pescoco: "exame_fisico", pescoco_detalhe: "exame_fisico",
  ausculta_pulmonar: "exame_fisico", ausculta_cardiaca: "exame_fisico",
  perfusao_perif: "exame_fisico",
  mmss: "exame_fisico", mmss_detalhe: "exame_fisico",
  mmii: "exame_fisico", mmii_detalhe: "exame_fisico",
  pes: "exame_fisico", pes_detalhe: "exame_fisico",
  pele_estadiamento: "exame_fisico", pele_neo: "exame_fisico",

  exame_abdominal: "abdome", eliminacoes: "abdome", diurese_volume: "abdome",
  dieta: "abdome", dieta_tolerancia: "abdome",
  mobilidade: "abdome", forca_motora: "abdome",
  eliminacoes_neo: "abdome", dieta_neo: "abdome",

  via_aerea: "suporte", modo_ventilatorio: "suporte", fio2: "suporte",
  peep: "suporte", fluxo_o2: "suporte",
  sedativo_qual: "suporte", sedativo_outro_nome: "suporte",
  dose_midazolam: "suporte", dose_propofol: "suporte", dose_fentanil: "suporte",
  dose_dexmedetomidina: "suporte", dose_outra_sedativo: "suporte",
  sedacao_rass: "suporte",
  via_aerea_neo: "suporte", modo_ventilatorio_neo: "suporte", fio2_neo: "suporte",
  peep_neo: "suporte",

  dispositivos: "dispositivos", avp_calibre: "dispositivos", avp_local: "dispositivos",
  cvc_sitio: "dispositivos", dreno_debito: "dispositivos", dreno_aspecto: "dispositivos",
  droga_vasoativa: "dispositivos", droga_vasoativa_qual: "dispositivos",
  droga_vasoativa_outro_nome: "dispositivos", droga_vasoativa_dose: "dispositivos",
  balanco_hidrico: "dispositivos", glicemia: "dispositivos",
  dispositivos_neo: "dispositivos",

  psicossocial: "psicossocial", psicossocial_detalhe: "psicossocial",
  seguranca: "psicossocial", seguranca_detalhe: "psicossocial",
};

function obterFrase(q, answers) {
  if (q.type === "numeric") {
    return q.classify(Number(answers[q.id]), answers).frase || null;
  }
  if (q.type === "numeric_pair") {
    const { a, b } = answers[q.id];
    return q.classify(Number(a), Number(b), answers).frase || null;
  }
  if (q.type === "texto_livre") {
    const bruto = answers[q.id].trim();
    const texto = bruto.charAt(0).toLowerCase() + bruto.slice(1);
    return texto ? (q.montarFrase ? q.montarFrase(texto) : texto) : null;
  }
  return null;
}

function gerarTexto(context, answers, sequence) {
  // paragrafos[cat] = array de { subgrupo, frase }, na ordem em que apareceram
  const paragrafos = { geral: [], exame_fisico: [], abdome: [], suporte: [], dispositivos: [], psicossocial: [], outros: [] };
  const pendencias = [];
  const revisar = [];

  function registrar(q, frase) {
    if (!frase) return;
    const categoria = CATEGORIA_POR_ID[q.id] || "outros";
    const subgrupo = SUBGRUPO_POR_ID[q.id] || q.id;
    paragrafos[categoria].push({ subgrupo, frase });
  }

  sequence.forEach((q) => {
    if (!isAnswered(q, answers)) {
      pendencias.push(q.titulo);
      return;
    }
    if (q.type === "multi_select") {
      const selected = answers[q.id] || [];
      const opcoes = getOptions(q, answers);
      selected.forEach((val) => {
        const opt = opcoes.find((o) => o.value === val);
        if (opt) registrar(q, opt.frase);
        if (opt && opt.needsReview) revisar.push(`${q.titulo} — resposta "${opt.label}" precisa de detalhamento`);
      });
    } else if (q.type === "select") {
      const opt = getOptions(q, answers).find((o) => o.value === answers[q.id]);
      if (opt) registrar(q, opt.frase);
      if (opt && opt.needsReview) revisar.push(`${q.titulo} — resposta "${opt.label}" precisa de detalhamento`);
    } else {
      registrar(q, obterFrase(q, answers));
    }
  });

  // Transforma a lista de { subgrupo, frase } em frases curtas: mesmo
  // subgrupo consecutivo vira uma frase só (vírgula); subgrupo novo fecha
  // com ponto e abre frase nova.
  function montarParagrafo(itens, abertura) {
    // Agrupa por subgrupo em qualquer posição (não exige que sejam vizinhas
    // no array) — a ordem da frase segue a ordem em que o subgrupo apareceu
    // pela primeira vez, mas todos os itens daquele subgrupo entram juntos,
    // mesmo que outras perguntas de outro subgrupo tenham aparecido entre eles.
    const porSubgrupo = new Map();
    itens.forEach(({ subgrupo, frase }) => {
      if (!porSubgrupo.has(subgrupo)) porSubgrupo.set(subgrupo, []);
      porSubgrupo.get(subgrupo).push(frase);
    });

    const frases = Array.from(porSubgrupo.values()).map((grupo) => grupo.join(", "));

    // Primeira frase recebe a abertura do parágrafo ("Paciente", "Ao exame
    // físico,"); as seguintes só começam com maiúscula, como frases normais.
    const frasesFormatadas = frases.map((f, i) => {
      const corpo = f.charAt(0).toUpperCase() + f.slice(1) + ".";
      if (i === 0 && abertura) return `${abertura} ${f}.`;
      return corpo;
    });
    return frasesFormatadas.join(" ");
  }

  const blocosTexto = [];
  ORDEM_PARAGRAFOS.forEach((cat) => {
    if (paragrafos[cat].length === 0) return;
    blocosTexto.push(montarParagrafo(paragrafos[cat], ABERTURA_PARAGRAFO[cat]));
  });

  let texto = blocosTexto.join("\n\n");

  const inconsistencias = (context.validacoesCruzadas || [])
    .filter((v) => v.check(answers))
    .map((v) => v.mensagem);

  const todasPendencias = [
    ...pendencias.map((p) => `(CONFERIR — ${p} não respondido)`),
    ...revisar.map((r) => `(CONFERIR — ${r})`),
    ...inconsistencias.map((i) => `(CONFERIR — ${i})`),
  ];

  if (todasPendencias.length > 0) {
    texto += "\n\n" + todasPendencias.join("\n");
  }

  return texto;
}

// =============================================================================
// Persistência local do histórico do plantão. Usa window.storage quando
// existe (ambiente de artifact) e cai em localStorage no navegador comum.
// Nada aqui sai do dispositivo — não há chamada de rede em todo o app.
// =============================================================================
const store = {
  async get(key) {
    if (typeof window === "undefined") return null;
    if (window.storage && window.storage.get) {
      const res = await window.storage.get(key);
      return res ? res.value : null;
    }
    return window.localStorage.getItem(key);
  },
  async set(key, value) {
    if (typeof window === "undefined") return;
    if (window.storage && window.storage.set) return window.storage.set(key, value);
    window.localStorage.setItem(key, value);
  },
};

function Radio({ checked }) {
  return (
    <span style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${checked ? ACCENT : "#3A4F47"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {checked && <span style={{ width: 11, height: 11, borderRadius: "50%", background: ACCENT }} />}
    </span>
  );
}

function CheckBox({ checked }) {
  return (
    <span style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${checked ? ACCENT : "#3A4F47"}`, background: checked ? ACCENT : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {checked && <Check size={14} color={BG} strokeWidth={3} />}
    </span>
  );
}

function NumericField({ question, value, onChange, answers }) {
  const num = value === undefined || value === "" ? null : Number(value);
  const isValid = num !== null && !Number.isNaN(num) && num >= question.min && num <= question.max;
  const result = isValid ? question.classify(num, answers) : null;

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, background: BG, border: `1.5px solid ${isValid ? ACCENT : BORDER}`, borderRadius: 12, padding: "14px 16px", boxShadow: isValid ? `0 0 0 1px ${ACCENT}40, 0 6px 18px -8px ${ACCENT}55` : "none", transition: "box-shadow 0.15s ease, border-color 0.15s ease" }}>
        <input
          type="number"
          inputMode="decimal"
          value={value === undefined ? "" : value}
          placeholder={question.placeholder || `Ex: ${Math.round((question.min + question.max) / 2)}`}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, background: "none", border: "none", outline: "none", color: TEXT, fontSize: 28, fontWeight: 700, fontFamily: "inherit" }}
        />
        <span style={{ color: MUTED, fontSize: 15, fontWeight: 600 }}>{question.unit}</span>
      </div>
      <div style={{ minHeight: 22, marginTop: 10, fontSize: 13, color: isValid ? ACCENT : DIM }}>
        {isValid
          ? result.label
            ? `Classificação automática: ${result.label}`
            : "Valor registrado"
          : `Faixa esperada: ${question.min}–${question.max} ${question.unit}`}
      </div>
    </div>
  );
}

function BPField({ question, value, onChange, answers }) {
  const a = value && value.a !== undefined && value.a !== "" ? Number(value.a) : null;
  const b = value && value.b !== undefined && value.b !== "" ? Number(value.b) : null;
  const aValid = a !== null && !Number.isNaN(a) && a >= question.minA && a <= question.maxA;
  const bValid = b !== null && !Number.isNaN(b) && b >= question.minB && b <= question.maxB;
  const isValid = aValid && bValid;
  const result = isValid ? question.classify(a, b, answers) : null;

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginBottom: 6 }}>{question.labelA}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, background: BG, border: `1.5px solid ${aValid ? ACCENT : BORDER}`, borderRadius: 12, padding: "14px 14px" }}>
            <input
              type="number"
              inputMode="decimal"
              value={value && value.a !== undefined ? value.a : ""}
              placeholder={`${Math.round((question.minA + question.maxA) / 2)}`}
              onChange={(e) => onChange({ ...(value || {}), a: e.target.value })}
              style={{ width: "100%", background: "none", border: "none", outline: "none", color: TEXT, fontSize: 26, fontWeight: 700, fontFamily: "inherit" }}
            />
          </div>
        </div>
        <div style={{ fontSize: 22, color: DIM, fontWeight: 700, marginTop: 20 }}>×</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginBottom: 6 }}>{question.labelB}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, background: BG, border: `1.5px solid ${bValid ? ACCENT : BORDER}`, borderRadius: 12, padding: "14px 14px" }}>
            <input
              type="number"
              inputMode="decimal"
              value={value && value.b !== undefined ? value.b : ""}
              placeholder={`${Math.round((question.minB + question.maxB) / 2)}`}
              onChange={(e) => onChange({ ...(value || {}), b: e.target.value })}
              style={{ width: "100%", background: "none", border: "none", outline: "none", color: TEXT, fontSize: 26, fontWeight: 700, fontFamily: "inherit" }}
            />
          </div>
        </div>
        <span style={{ color: MUTED, fontSize: 13, fontWeight: 600, marginTop: 20 }}>{question.unitA}</span>
      </div>
      <div style={{ minHeight: 22, marginTop: 10, fontSize: 13, color: isValid ? ACCENT : DIM }}>
        {isValid ? `Classificação automática: ${result.label}` : `Faixas esperadas: ${question.labelA} ${question.minA}–${question.maxA}, ${question.labelB} ${question.minB}–${question.maxB} ${question.unitA}`}
      </div>
    </div>
  );
}

function TextField({ question, value, onChange }) {
  const preenchido = typeof value === "string" && value.trim().length > 0;
  return (
    <div style={{ marginTop: 18 }}>
      <input
        type="text"
        value={value || ""}
        placeholder={question.placeholder || "Digite aqui"}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: BG,
          border: `1.5px solid ${preenchido ? ACCENT : BORDER}`,
          borderRadius: 12,
          padding: "16px",
          color: TEXT,
          fontSize: 18,
          fontWeight: 600,
          fontFamily: "inherit",
          outline: "none",
        }}
      />
    </div>
  );
}

function IconButton({ icon, onClick }) {
  return (
    <button onClick={onClick} style={{ width: 36, height: 36, borderRadius: "50%", border: `1.5px solid ${ACCENT}55`, background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
      {icon}
    </button>
  );
}

function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}

// Onda de ECG do topo da home — traço grosso com brilho, sobre grade fraca.
function PulseHero({ width = 150, height = 82 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 170 96" style={{ flexShrink: 0 }}>
      <defs>
        <pattern id="knGrid" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M14 0 H0 V14" fill="none" stroke={ACCENT} strokeOpacity="0.13" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="14" y="4" width="156" height="88" fill="url(#knGrid)" />
      <path
        className="kn-pulso-path"
        d="M0 56 H30 L42 44 L54 22 L66 76 L78 8 L90 62 L104 56 H150"
        fill="none" stroke={ACCENT} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="340"
      />
      <circle cx="150" cy="56" r="6" fill={ACCENT} style={{ filter: `drop-shadow(0 0 8px ${ACCENT})` }} />
    </svg>
  );
}

export default function KroniaNurseApp() {
  const [contextId, setContextId] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  // "splash" | "login" | "home" | "identificacao" | "quiz" | "historico"
  const [screen, setScreen] = useState("splash");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [leito, setLeito] = useState("");
  const [iniciais, setIniciais] = useState("");
  const [historico, setHistorico] = useState([]);
  const [historicoCarregado, setHistoricoCarregado] = useState(false);
  const [savedThisResult, setSavedThisResult] = useState(false);

  const context = CONTEXTS.find((c) => c.id === contextId) || null;
  const sequence = context ? buildSequence(context, answers) : [];
  const safeStep = Math.min(step, Math.max(sequence.length - 1, 0));
  const current = sequence[safeStep];
  const total = sequence.length;

  // Splash → login depois de 2s.
  useEffect(() => {
    if (screen !== "splash") return;
    const t = setTimeout(() => setScreen("login"), 2000);
    return () => clearTimeout(t);
  }, [screen]);

  // Carrega o histórico do plantão (persistente entre sessões) uma vez.
  useEffect(() => {
    (async () => {
      try {
        const value = await store.get("historico_plantao");
        setHistorico(value ? JSON.parse(value) : []);
      } catch (e) {
        setHistorico([]);
      } finally {
        setHistoricoCarregado(true);
      }
    })();
  }, []);

  // Salva a evolução gerada no histórico assim que a tela de resultado abre
  // (uma única vez por evolução, mesmo se o componente re-renderizar).
  useEffect(() => {
    if (showResult && context && !savedThisResult) {
      const registro = {
        id: Date.now(),
        contextoId: context.id,
        contextoNome: context.nome,
        leito,
        iniciais: iniciais.toUpperCase(),
        dataHora: new Date().toISOString(),
        texto: gerarTexto(context, answers, sequence),
      };
      const novaLista = [registro, ...historico];
      setHistorico(novaLista);
      setSavedThisResult(true);
      store.set("historico_plantao", JSON.stringify(novaLista)).catch(() => {});
    }
  }, [showResult]);

  function pickContext(c) {
    setContextId(c.id);
    setAnswers({});
    setStep(0);
    setShowResult(false);
    setSavedThisResult(false);
    setLeito("");
    setIniciais("");
    setScreen("identificacao");
  }

  function iniciarPerguntas() {
    setScreen("quiz");
  }

  function backToHome() {
    setContextId(null);
    setAnswers({});
    setStep(0);
    setShowResult(false);
    setSavedThisResult(false);
    setLeito("");
    setIniciais("");
    setScreen("home");
  }

  function abrirHistorico() {
    setScreen("historico");
  }

  function selectValue(qId, value) {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  }

  function toggleMulti(qId, value) {
    setAnswers((prev) => {
      const cur = prev[qId] || [];
      if (value === "nenhum") return { ...prev, [qId]: ["nenhum"] };
      const withoutNenhum = cur.filter((v) => v !== "nenhum");
      const next = withoutNenhum.includes(value)
        ? withoutNenhum.filter((v) => v !== value)
        : [...withoutNenhum, value];
      return { ...prev, [qId]: next };
    });
  }

  function next() {
    if (safeStep < total - 1) setStep(safeStep + 1);
    else setShowResult(true);
  }

  function back() {
    if (safeStep > 0) setStep(safeStep - 1);
    else setScreen("identificacao");
  }

  const pct = total > 0 ? Math.round(((safeStep + 1) / total) * 100) : 0;
  const identificacaoValida = leito.trim().length > 0 && iniciais.trim().length > 0;
  const semShell = screen === "splash" || screen === "login";

  const estilosGlobais = `
    @keyframes pulsoLinha {
      0% { stroke-dashoffset: 340; }
      60% { stroke-dashoffset: 0; }
      100% { stroke-dashoffset: 0; }
    }
    .kn-pulso-path { animation: pulsoLinha 2.6s ease-out infinite; filter: drop-shadow(0 0 6px ${ACCENT}) drop-shadow(0 0 16px ${ACCENT}80); }
    @keyframes vivoDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.7); }
    }
    .kn-vivo-dot { animation: vivoDot 1.6s ease-in-out infinite; }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: none; }
    }
    .kn-fade { animation: fadeUp 0.6s ease-out both; }
    .kn-input::placeholder { color: ${DIM}; font-weight: 400; }
    @media (prefers-reduced-motion: reduce) {
      .kn-pulso-path { animation: none; stroke-dashoffset: 0; }
      .kn-vivo-dot, .kn-fade { animation: none; }
    }
  `;

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", justifyContent: "center" }}>
      <style>{estilosGlobais}</style>
      <div style={{ width: "100%", maxWidth: 480, minHeight: "100vh", display: "flex", flexDirection: "column" }}>

        {/* Header — só nas telas internas */}
        {!semShell && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px 10px", borderBottom: `1px solid ${BORDER}`, boxShadow: `0 1px 0 0 ${ACCENT}12` }}>
            <button onClick={backToHome} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }}>
              <Wordmark height={13} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <Bell size={19} color={TEXT} />
                <span style={{ position: "absolute", top: 2, right: 2, width: 7, height: 7, borderRadius: "50%", background: ACCENT, boxShadow: `0 0 6px ${ACCENT}` }} />
              </button>
              <button style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${BORDER}`, background: SURFACE, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <User size={16} color={TEXT} />
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* SPLASH                                                            */}
        {/* ---------------------------------------------------------------- */}
        {screen === "splash" && (
          <button
            onClick={() => setScreen("login")}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              background: `radial-gradient(circle at 50% 45%, #08201A 0%, ${BG} 62%)`,
              border: "none", cursor: "pointer", minHeight: "100vh", width: "100%",
            }}
          >
            <div className="kn-fade">
              <LogoLockup size={150} />
            </div>
          </button>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* LOGIN                                                             */}
        {/* ---------------------------------------------------------------- */}
        {screen === "login" && (
          <div style={{ position: "relative", flex: 1, padding: "26px 22px 30px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Grafismos de fundo: arcos à esquerda, onda à direita */}
            <svg width="220" height="240" viewBox="0 0 220 240" style={{ position: "absolute", left: -70, top: 150, opacity: 0.5, pointerEvents: "none" }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <path key={i} d={`M-40 ${240 - i * 16} Q 90 ${150 - i * 22} 220 ${40 - i * 10}`} fill="none" stroke={ACCENT} strokeOpacity={0.16 - i * 0.02} strokeWidth="1.4" />
              ))}
            </svg>
            <svg width="118" height="120" viewBox="0 0 118 120" style={{ position: "absolute", right: -14, top: 74, opacity: 0.5, pointerEvents: "none" }}>
              <path d="M0 60 H20 L30 40 L42 84 L54 14 L66 100 L78 60 H118" fill="none" stroke={ACCENT} strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center", marginTop: 18 }}>
              <LogoLockup size={128} />
            </div>

            <div style={{ position: "relative", zIndex: 1, textAlign: "center", marginTop: 22 }}>
              <div style={{ fontSize: 27, fontWeight: 800, lineHeight: 1.15, letterSpacing: -0.6 }}>
                Evolua em minutos.<br />
                <span style={{ color: ACCENT }}>Ganhe tempo no plantão.</span>
              </div>
              <div style={{ fontSize: 13.5, color: MUTED, marginTop: 12, lineHeight: 1.5 }}>
                Inteligência que organiza o raciocínio clínico<br />
                e transforma sua documentação em algo<br />
                <span style={{ color: ACCENT, fontWeight: 600 }}>simples</span>, <span style={{ color: ACCENT, fontWeight: 600 }}>rápido</span> e <span style={{ color: ACCENT, fontWeight: 600 }}>seguro</span>.
              </div>
            </div>

            <div style={{ position: "relative", zIndex: 1, marginTop: 22, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 7 }}>E-mail</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "15px 16px" }}>
                  <Mail size={18} color={ACCENT} />
                  <input
                    className="kn-input"
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    style={{ flex: 1, background: "none", border: "none", outline: "none", color: TEXT, fontSize: 15.5, fontFamily: "inherit" }}
                  />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 7 }}>Senha</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "15px 16px" }}>
                  <Lock size={18} color={ACCENT} />
                  <input
                    className="kn-input"
                    type={verSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Digite sua senha"
                    style={{ flex: 1, background: "none", border: "none", outline: "none", color: TEXT, fontSize: 15.5, fontFamily: "inherit" }}
                  />
                  <button onClick={() => setVerSenha((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                    {verSenha ? <EyeOff size={18} color={MUTED} /> : <Eye size={18} color={MUTED} />}
                  </button>
                </div>
              </div>

              <button style={{ alignSelf: "flex-end", background: "none", border: "none", cursor: "pointer", color: ACCENT, fontSize: 13, fontWeight: 600, padding: 0 }}>
                Esqueci minha senha
              </button>

              <button
                onClick={() => setScreen("home")}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  background: `linear-gradient(100deg, ${ACCENT} 0%, ${ACCENT_2} 100%)`,
                  border: "none", borderRadius: 14, padding: "16px", cursor: "pointer",
                  color: BG, fontSize: 17, fontWeight: 800,
                  boxShadow: `0 14px 30px -12px ${ACCENT}99`,
                }}
              >
                <LogIn size={19} /> Entrar
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 12, color: MUTED, fontSize: 12.5 }}>
                <span style={{ flex: 1, height: 1, background: BORDER }} /> ou <span style={{ flex: 1, height: 1, background: BORDER }} />
              </div>

              <button
                onClick={() => setScreen("home")}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "none", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "15px", cursor: "pointer", color: TEXT, fontSize: 15.5, fontWeight: 600 }}
              >
                <GoogleIcon size={19} /> Entrar com Google
              </button>

              <div style={{ textAlign: "center", fontSize: 13.5, color: MUTED, marginTop: 2 }}>
                Não tem uma conta?{" "}
                <button style={{ background: "none", border: "none", cursor: "pointer", color: ACCENT, fontSize: 13.5, fontWeight: 700, padding: 0 }}>Criar conta</button>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 8, color: MUTED, fontSize: 12, textAlign: "center", lineHeight: 1.4, marginTop: 2 }}>
                <Lock size={14} color={ACCENT} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Seus dados protegidos com segurança<br />e sigilo profissional.</span>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* HOME                                                              */}
        {/* ---------------------------------------------------------------- */}
        {screen === "home" && (
          <div style={{ position: "relative", padding: "14px 18px 84px", display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
            {/* Glow radial de fundo */}
            <div style={{
              position: "absolute", top: -110, right: -70, width: 330, height: 330, borderRadius: "50%",
              background: `radial-gradient(circle, ${ACCENT}22 0%, ${ACCENT}00 70%)`,
              pointerEvents: "none", zIndex: 0,
            }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: `${ACCENT}12`, border: `1px solid ${ACCENT}44`, borderRadius: 999, padding: "6px 14px 6px 11px" }}>
                <span className="kn-vivo-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, display: "inline-block", boxShadow: `0 0 8px ${ACCENT}` }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.1, color: ACCENT, textTransform: "uppercase" }}>
                  Evolução de enfermagem hospitalar
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 14 }}>
                <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.06, letterSpacing: -0.8 }}>
                  Um caminho.<br />
                  <span style={{ fontStyle: "italic", fontWeight: 700, color: ACCENT, textShadow: `0 0 22px ${ACCENT}55` }}>Toda a clínica.</span>
                </div>
                <PulseHero width={148} height={80} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${ACCENT}12`, border: `1px solid ${ACCENT}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Building2 size={20} color={ACCENT} />
                </div>
                <div>
                  <div style={{ fontSize: 15.5, fontWeight: 700 }}>Todas as áreas hospitalares.</div>
                  <div style={{ fontSize: 13.5, color: MUTED, marginTop: 1 }}>Um único fluxo adaptativo.</div>
                </div>
              </div>
            </div>

            {/* Card de destaque — a promessa central do produto */}
            <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "flex-start", gap: 12, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: "14px 14px" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${ACCENT}1A`, border: `1px solid ${ACCENT}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Zap size={19} color={ACCENT} fill={ACCENT} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.25 }}>
                  Evolua em minutos.<br />
                  <span style={{ color: ACCENT }}>Ganhe tempo no plantão.</span>
                </div>
                <div style={{ fontSize: 11.5, color: MUTED, marginTop: 7, lineHeight: 1.4 }}>
                  Responda às perguntas. O KRONIA conduz o fluxo, organiza as informações e gera sua evolução pronta para revisar e copiar.
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9, flexShrink: 0 }}>
                <Clock size={30} color={ACCENT} style={{ filter: `drop-shadow(0 0 10px ${ACCENT}66)` }} />
                <div style={{ border: `1px solid ${ACCENT}55`, borderRadius: 8, padding: "6px 8px", textAlign: "center", lineHeight: 1.25 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: ACCENT, letterSpacing: 0.3, textTransform: "uppercase" }}>Mais tempo<br />para cuidar</span>
                    <Heart size={11} color={ACCENT} />
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de recursos — cada linha é um pilar real do motor, não enfeite */}
            <div style={{ position: "relative", zIndex: 1, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: "4px 15px" }}>
              {[
                { icon: <MessageCircleQuestion size={18} color={ACCENT} />, titulo: "Perguntas adaptativas", sub: "Baseadas no contexto do paciente", tag: `até ${CONTEXTS[0]?.questions.length} perguntas` },
                { icon: <Share2 size={18} color={ACCENT} />, titulo: "Árvore inteligente", sub: "Se adapta a cada resposta", tag: "100% adaptativa" },
                { icon: <ShieldCheck size={18} color={ACCENT} />, titulo: "Clínica & Segurança", sub: "Conteúdo validado e estruturado", tag: "Confiável" },
                { icon: <FileText size={18} color={ACCENT} />, titulo: "Evolução completa", sub: "Gere, revise e copie para o prontuário", tag: "Pronta para uso" },
              ].map((item, i, arr) => (
                <div key={item.titulo} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 0", borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: `${ACCENT}12`, border: `1px solid ${ACCENT}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{item.titulo}</div>
                    <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>{item.sub}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT, background: `${ACCENT}14`, border: `1px solid ${ACCENT}44`, borderRadius: 999, padding: "6px 10px", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {item.tag}
                  </span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0 12px", color: MUTED, fontSize: 11.5 }}>
                <ShieldCheck size={14} color={MUTED} /> Privacidade e segurança de dados garantidas
              </div>
            </div>

            {/* CTA principal */}
            <button
              onClick={() => CONTEXTS[0] && pickContext(CONTEXTS[0])}
              style={{
                position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 13,
                background: `linear-gradient(100deg, ${ACCENT} 0%, ${ACCENT_2} 100%)`,
                border: "none", borderRadius: 18, padding: "15px 15px", cursor: "pointer", textAlign: "left",
                boxShadow: `0 16px 32px -12px ${ACCENT}88`,
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: BG, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ArrowRight size={18} color={ACCENT} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: BG }}>Iniciar evolução</div>
                <div style={{ fontSize: 11.5, color: "#04231A", opacity: 0.8, marginTop: 1 }}>Comece agora e ganhe tempo na documentação</div>
              </div>
              <svg width="34" height="22" viewBox="0 0 34 24" style={{ flexShrink: 0, opacity: 0.55 }}>
                <path d="M0 12 H10 L14 4 L18 20 L22 12 H34" fill="none" stroke={BG} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Dica */}
            <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "flex-start", gap: 9, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 13px" }}>
              <Lightbulb size={16} color={ACCENT} style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12, color: "#C9D8D2", lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700, color: TEXT }}>Dica: </span>
                tenha em mãos os dados do paciente para <span style={{ color: ACCENT, fontWeight: 600 }}>respostas mais precisas e evoluções ainda mais rápidas</span>.
              </div>
            </div>
          </div>
        )}

        {/* Navegação inferior — "Início" e "Evoluções" funcionam de verdade
            aqui; os demais itens vivem no app principal do Kronia Nurse. */}
        {screen === "home" && (
          <div style={{
            position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
            width: "100%", maxWidth: 480, display: "flex", alignItems: "center", justifyContent: "space-around",
            background: BG, borderTop: `1px solid ${BORDER}`, padding: "8px 8px calc(8px + env(safe-area-inset-bottom))",
            boxShadow: `0 -8px 24px -8px rgba(0,0,0,0.6)`, zIndex: 2,
          }}>
            <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: 3 }}>
              <Home size={19} color={ACCENT} />
              <span style={{ fontSize: 9.5, fontWeight: 700, color: ACCENT }}>Início</span>
            </button>
            <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: 3 }}>
              <Users size={19} color={DIM} />
              <span style={{ fontSize: 9.5, fontWeight: 600, color: DIM }}>Pacientes</span>
            </button>
            <button
              onClick={() => CONTEXTS[0] && pickContext(CONTEXTS[0])}
              style={{ width: 52, height: 52, borderRadius: "50%", background: ACCENT, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 22px -6px ${ACCENT}AA`, marginTop: -18 }}
            >
              <Plus size={24} color={BG} strokeWidth={2.5} />
            </button>
            <button onClick={abrirHistorico} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: 3 }}>
              <ClipboardList size={19} color={DIM} />
              <span style={{ fontSize: 9.5, fontWeight: 600, color: DIM }}>Evoluções</span>
              {historicoCarregado && historico.length > 0 && (
                <span style={{ position: "absolute", top: -3, right: 4, minWidth: 15, height: 15, borderRadius: 999, background: ACCENT, color: BG, fontSize: 9, fontWeight: 800, lineHeight: "15px", textAlign: "center" }}>
                  {historico.length}
                </span>
              )}
            </button>
            <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: 3 }}>
              <User size={19} color={DIM} />
              <span style={{ fontSize: 9.5, fontWeight: 600, color: DIM }}>Perfil</span>
            </button>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* IDENTIFICAÇÃO — leito e iniciais, antes das perguntas              */}
        {/* ---------------------------------------------------------------- */}
        {screen === "identificacao" && context && (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: ACCENT, textTransform: "uppercase" }}>{context.nome}</div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 5, letterSpacing: -0.4 }}>Identificação do paciente</div>
            <div style={{ color: MUTED, fontSize: 14, marginTop: 3 }}>
              Leito e iniciais ficam registrados no histórico do plantão — nunca o nome completo.
            </div>

            <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: MUTED, marginBottom: 8 }}>Leito</div>
                <input
                  className="kn-input"
                  type="text"
                  value={leito}
                  onChange={(e) => setLeito(e.target.value)}
                  placeholder="Ex: 12A"
                  style={{ width: "100%", boxSizing: "border-box", background: SURFACE, border: `1.5px solid ${leito ? ACCENT : BORDER}`, borderRadius: 12, padding: "16px", color: TEXT, fontSize: 20, fontWeight: 700, fontFamily: "inherit", outline: "none", boxShadow: leito ? `0 0 0 1px ${ACCENT}40, 0 8px 20px -10px ${ACCENT}66` : "none", transition: "box-shadow 0.15s ease, border-color 0.15s ease" }}
                />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: MUTED, marginBottom: 8 }}>Iniciais do paciente</div>
                <input
                  className="kn-input"
                  type="text"
                  value={iniciais}
                  onChange={(e) => setIniciais(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="Ex: M.A.S."
                  style={{ width: "100%", boxSizing: "border-box", background: SURFACE, border: `1.5px solid ${iniciais ? ACCENT : BORDER}`, borderRadius: 12, padding: "16px", color: TEXT, fontSize: 20, fontWeight: 700, fontFamily: "inherit", outline: "none", textTransform: "uppercase", boxShadow: iniciais ? `0 0 0 1px ${ACCENT}40, 0 8px 20px -10px ${ACCENT}66` : "none", transition: "box-shadow 0.15s ease, border-color 0.15s ease" }}
                />
              </div>
            </div>

            <div style={{ flex: 1 }} />

            <div style={{ display: "flex", gap: 12, padding: "18px 0" }}>
              <button onClick={backToHome} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "none", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px", color: TEXT, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                <ArrowLeft size={17} /> Voltar
              </button>
              <button onClick={iniciarPerguntas} disabled={!identificacaoValida} style={{ flex: 1.4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: !identificacaoValida ? SURFACE : ACCENT, border: "none", borderRadius: 12, padding: "14px", color: !identificacaoValida ? DIM : BG, fontSize: 16, fontWeight: 800, cursor: !identificacaoValida ? "default" : "pointer", boxShadow: !identificacaoValida ? "none" : `0 10px 26px -8px ${ACCENT}99`, transition: "box-shadow 0.15s ease" }}>
                Iniciar perguntas <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* HISTÓRICO DO PLANTÃO                                              */}
        {/* ---------------------------------------------------------------- */}
        {screen === "historico" && (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>Histórico do plantão</div>
              <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={20} color={MUTED} />
              </button>
            </div>
            <div style={{ color: MUTED, fontSize: 14, marginBottom: 8 }}>
              {historico.length === 0 ? "Nenhuma evolução registrada ainda neste plantão." : `${historico.length} evolução(ões) registrada(s).`}
            </div>
            {historico.map((h) => (
              <div key={h.id} style={{ background: `linear-gradient(165deg, ${SURFACE} 0%, ${BG} 100%)`, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, boxShadow: "0 12px 28px -16px rgba(0,0,0,0.5)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>Leito {h.leito} · {h.iniciais}</div>
                  <button onClick={() => navigator.clipboard?.writeText(h.texto)} style={{ display: "flex", alignItems: "center", gap: 6, background: `${ACCENT}1A`, border: `1px solid ${ACCENT}33`, borderRadius: 8, padding: "5px 10px", color: ACCENT, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    <Copy size={12} /> Copiar
                  </button>
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                  {h.contextoNome} · {new Date(h.dataHora).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </div>
                <div style={{ fontSize: 13, color: "#C9D8D2", marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{h.texto}</div>
              </div>
            ))}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* QUIZ                                                              */}
        {/* ---------------------------------------------------------------- */}
        {screen === "quiz" && !showResult && current && (
          <div style={{ padding: "20px 20px 0", display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: ACCENT, textTransform: "uppercase" }}>Evolução de enfermagem</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{context.nome}</div>
            <div style={{ color: MUTED, fontSize: 14, marginTop: 2 }}>
              {context.subtitulo} · Leito {leito} · {iniciais}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
              <div style={{ flex: 1, height: 6, background: BORDER, borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: ACCENT, borderRadius: 999, boxShadow: `0 0 10px ${ACCENT}99`, transition: "width 0.25s ease" }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT, border: `1px solid ${ACCENT}55`, borderRadius: 999, padding: "4px 12px", whiteSpace: "nowrap" }}>
                {safeStep + 1} de {total}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 20 }}>
              <Target size={16} color={ACCENT} style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: ACCENT }}>Contexto adaptativo</div>
                <div style={{ fontSize: 13, color: MUTED }}>
                  {current.layer === "condicional" ? "Pergunta aberta pela sua resposta anterior." : "Responda para que a evolução se adapte ao paciente."}
                </div>
              </div>
            </div>

            <div style={{
              position: "relative", marginTop: 18, background: `linear-gradient(165deg, ${SURFACE} 0%, ${BG} 100%)`,
              border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20, flex: 1,
              boxShadow: `0 20px 48px -20px rgba(0,0,0,0.65), 0 0 0 1px ${ACCENT}0D`,
            }}>
              <div style={{ position: "absolute", top: 0, left: 20, right: 20, height: 2, borderRadius: 2, background: `linear-gradient(90deg, ${ACCENT}00, ${ACCENT}CC, ${ACCENT}00)` }} />
              <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: ACCENT, background: `${ACCENT}1A`, border: `1px solid ${ACCENT}33`, borderRadius: 999, padding: "5px 12px", textTransform: "uppercase" }}>
                Pergunta atual
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 14, lineHeight: 1.3 }}>{current.titulo}</div>

              {current.type === "numeric" && (
                <NumericField question={current} value={answers[current.id]} onChange={(v) => selectValue(current.id, v)} answers={answers} />
              )}

              {current.type === "numeric_pair" && (
                <BPField question={current} value={answers[current.id]} onChange={(v) => selectValue(current.id, v)} answers={answers} />
              )}

              {current.type === "texto_livre" && (
                <TextField question={current} value={answers[current.id]} onChange={(v) => selectValue(current.id, v)} />
              )}

              {current.type === "select" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
                  {getOptions(current, answers).map((opt) => {
                    const checked = answers[current.id] === opt.value;
                    return (
                      <button key={opt.value} onClick={() => selectValue(current.id, opt.value)} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left", padding: "16px 16px", borderRadius: 12, border: `1.5px solid ${checked ? ACCENT : BORDER}`, background: checked ? `${ACCENT}14` : BG, color: "inherit", cursor: "pointer", fontSize: 15, fontWeight: 500, boxShadow: checked ? `0 0 0 1px ${ACCENT}55, 0 8px 20px -8px ${ACCENT}66` : "none", transition: "box-shadow 0.15s ease, border-color 0.15s ease" }}>
                        <Radio checked={checked} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {current.type === "multi_select" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
                  {getOptions(current, answers).map((opt) => {
                    const checked = (answers[current.id] || []).includes(opt.value);
                    return (
                      <button key={opt.value} onClick={() => toggleMulti(current.id, opt.value)} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left", padding: "16px 16px", borderRadius: 12, border: `1.5px solid ${checked ? ACCENT : BORDER}`, background: checked ? `${ACCENT}14` : BG, color: "inherit", cursor: "pointer", fontSize: 15, fontWeight: 500, boxShadow: checked ? `0 0 0 1px ${ACCENT}55, 0 8px 20px -8px ${ACCENT}66` : "none", transition: "box-shadow 0.15s ease, border-color 0.15s ease" }}>
                        <CheckBox checked={checked} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, padding: "18px 0" }}>
              <button onClick={back} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "none", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px", color: TEXT, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                <ArrowLeft size={17} /> Voltar
              </button>
              <button onClick={next} disabled={!isAnswered(current, answers)} style={{ flex: 1.4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: !isAnswered(current, answers) ? SURFACE : ACCENT, border: "none", borderRadius: 12, padding: "14px", color: !isAnswered(current, answers) ? DIM : BG, fontSize: 16, fontWeight: 800, cursor: !isAnswered(current, answers) ? "default" : "pointer", boxShadow: !isAnswered(current, answers) ? "none" : `0 10px 26px -8px ${ACCENT}99`, transition: "box-shadow 0.15s ease" }}>
                Continuar <ArrowRight size={17} />
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: DIM, fontSize: 12, paddingBottom: 20 }}>
              <CheckCircle2 size={14} /> Evolução estruturada conforme COFEN e boas práticas
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* RESULTADO                                                         */}
        {/* ---------------------------------------------------------------- */}
        {context && showResult && (
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{context.nome}</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: ACCENT, fontSize: 12, fontWeight: 700, marginTop: 5, background: `${ACCENT}1A`, border: `1px solid ${ACCENT}40`, borderRadius: 999, padding: "3px 10px" }}>
                  <CheckCircle2 size={13} /> Salvo
                </div>
              </div>
              <button onClick={backToHome} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={20} color={MUTED} />
              </button>
            </div>

            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.4 }}>Evolução pronta</div>
              <div style={{ color: MUTED, fontSize: 14, marginTop: 3 }}>
                {sequence.length} perguntas nesta árvore — copie o texto e cole no prontuário eletrônico.
              </div>
            </div>

            <div style={{
              position: "relative", marginTop: 18, background: `linear-gradient(165deg, ${SURFACE} 0%, ${BG} 100%)`,
              border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden",
              boxShadow: `0 24px 56px -24px rgba(0,0,0,0.7), 0 0 0 1px ${ACCENT}0D`,
            }}>
              <div style={{ position: "absolute", top: 0, left: 20, right: 20, height: 2, borderRadius: 2, background: `linear-gradient(90deg, ${ACCENT}00, ${ACCENT}CC, ${ACCENT}00)` }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 14px", borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Evolução gerada</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <IconButton icon={<RotateCcw size={15} color={ACCENT} />} onClick={() => pickContext(context)} />
                  <button onClick={() => navigator.clipboard?.writeText(gerarTexto(context, answers, sequence))} style={{ display: "flex", alignItems: "center", gap: 6, background: ACCENT, border: "none", borderRadius: 8, padding: "7px 14px", color: BG, fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: `0 6px 16px -6px ${ACCENT}99` }}>
                    <Copy size={13} /> Copiar
                  </button>
                </div>
              </div>
              <div style={{ padding: 18, fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "#E4EDE9" }}>
                {gerarTexto(context, answers, sequence)}
              </div>
            </div>

            <button onClick={backToHome} style={{ width: "100%", marginTop: 18, background: "none", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px", color: TEXT, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
              Voltar às evoluções
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
