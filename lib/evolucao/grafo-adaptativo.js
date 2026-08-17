/**
 * Grafo clínico adaptativo — motor determinístico da evolução de enfermagem.
 *
 * ORIGEM: extraído sem uma única alteração de lógica de
 * mockups/kronia-nurse-motor-adaptativo.jsx (linhas 113–1730), o protótipo
 * funcional testado em sessão de arquitetura. As funções abaixo são as
 * mesmas, byte a byte — a extração foi feita por recorte de arquivo, não
 * por reescrita, justamente para não reintroduzir os bugs sutis que já
 * foram encontrados e corrigidos ali.
 *
 * O QUE ESTE ARQUIVO NÃO TEM, DE PROPÓSITO: nenhuma chamada de IA/LLM.
 * gerarTexto(), buildSequence() e matchesShowIf() são funções JS puras.
 * Ver nota de ponto de extensão no fim do arquivo.
 *
 * INVARIANTES QUE NÃO PODEM SER ENFRAQUECIDOS (ver PROMPT MASTER e
 * CHECKLIST_NAO_REGRESSAO.md):
 *   1. Pergunta não respondida SEMPRE vira "(CONFERIR — ... não respondido)".
 *      Nunca é omitida em silêncio, nunca vira "normal" por omissão.
 *   2. Opção com `frase: null` + `needsReview: true` também gera (CONFERIR).
 *   3. validacoesCruzadas acusam combinações fisicamente impossíveis.
 *   4. Nenhum threshold clínico sem fonte citada em comentário.
 *
 * ORDEM DAS PERGUNTAS: buildSequence() é um filtro simples por ordem de
 * array — a ordem no schema JÁ é a ordem narrativa correta. NÃO trocar por
 * versão recursiva: a antiga tinha bug de ordenação (sinais vitais caíam no
 * fim da sequência). Pergunta nova entra na posição certa do array, não no
 * fim, e precisa de entrada em CATEGORIA_POR_ID e SUBGRUPO_POR_ID.
 */

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

// Abertura de cada parágrafo. Onde é texto fixo, vale sempre; onde é função,
// recebe o conjunto de subgrupos que o parágrafo realmente tem e decide.
//
// A forma de função existe porque abertura fixa mentia: "Em suporte
// respiratório e sedação," saía mesmo sem sedação nenhuma — inclusive no
// caminho neonatal, que não tem sequer pergunta de sedação no schema. A
// abertura passa a descrever só o que está no parágrafo.
const ABERTURA_PARAGRAFO = {
  geral: "Paciente",
  exame_fisico: "Ao exame físico,",
  abdome: null,
  suporte: (subgrupos) =>
    subgrupos.has("sedacao") ? "Em suporte respiratório e sedação," : "Em suporte respiratório,",
  dispositivos: (subgrupos) =>
    // Balanço hídrico e glicemia não são dispositivo nem terapia: quando o
    // parágrafo só tem isso, ele começa direto pelo achado.
    subgrupos.has("acessos") || subgrupos.has("drogas") || subgrupos.has("fototerapia_neo")
      ? "Em uso de dispositivos e terapias,"
      : null,
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
  function montarParagrafo(itens, aberturaBruta) {
    // Abertura pode depender do que o parágrafo tem de fato.
    const subgrupos = new Set(itens.map((i) => i.subgrupo));
    const abertura = typeof aberturaBruta === "function" ? aberturaBruta(subgrupos) : aberturaBruta;
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

// TODO — ponto de extensão futuro, NÃO implementar agora: revisão de fluidez
// do texto final por LLM entraria aqui, recebendo o retorno de gerarTexto()
// e devolvendo texto revisado. Nada acima precisa mudar de forma para isso
// acontecer: gerarTexto() já é uma função pura de (context, answers,
// sequence) para string. A decisão de usar ou não IA é do produto, não deste
// módulo.

export {
  faixaVitalPorIdade,
  getOptions,
  matchesShowIf,
  buildSequence,
  isAnswered,
  obterFrase,
  gerarTexto,
  CONTEXTS,
  ORDEM_PARAGRAFOS,
  ABERTURA_PARAGRAFO,
  SUBGRUPO_POR_ID,
  CATEGORIA_POR_ID,
};
