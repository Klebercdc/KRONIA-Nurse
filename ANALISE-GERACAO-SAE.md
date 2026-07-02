# ANÁLISE — Pipeline de Geração de Evoluções (SAE) e Passagem de Plantão

> Auditoria READ-ONLY realizada em 2026-07-02. Todas as afirmações citam `arquivo:linha` com trecho literal. Itens não encontrados estão marcados como **NÃO ENCONTRADO**.

## 1. Sumário executivo

O pipeline é **prosa-para-prosa em passada única por documento**: texto ditado (voz→texto do teclado nativo, sem transcrição no app) vira blob de texto, vai ao Groq (`openai/gpt-oss-120b`, temp 0.2) com prompt de redação, e a resposta é renderizada **sem parsing, sem validação e sem normalização** (`gerar-documento.ts:29-30` → `encerramento.tsx:105`). Toda garantia anti-fabricação vive em texto de prompt — admitido em `lib/prompts.ts:2-4`. A seção "Diagnóstico de Enfermagem" é a única definida por critério **inferencial** ("apenas se houver evidência explícita", `lib/prompts.ts:35`) em vez de extrativo — por isso ela é fabricada enquanto Planejamento/Avaliação ficam corretamente vazias. O decimal inconsistente é ruído de N chamadas LLM independentes sem formatador em código; "Leito sete" é regex literal sem conversão por extenso (`leito-parser.ts:19-22`). O histórico git mostra duas rodadas anteriores de patch de prompt contra fabricação (`238ddcb`, `d80f7e5`) com o bug reaparecendo em outra seção, e mostra também que o padrão extração-LLM + cálculo-em-código já existe e funciona no repo (`PROMPT_ALERTAS`/`lib/scales.ts`). **Veredito: patch de prompt é mitigação; só o refactor extração→validação→montagem determinística elimina a fabricação** (seções 5–6).

## 2. Mapa do pipeline atual

Fluxo do plantão por voz (caminho A — onde o bug de produção ocorreu):

```
[1] Ditado por voz
    → teclado nativo do celular (voz→texto pelo SO; NÃO há transcrição no app)
    → pages/registrar.tsx:107-122 (textarea; placeholder 'Dite ou escreva: "leito 5, PA 130x80..."')
    Responsabilidade: capturar texto já transcrito pelo SO. NÃO ENCONTRADO Web Speech API/Whisper/MediaRecorder no código.

[2] Captura do registro
    → pages/registrar.tsx:27 handleCapturar() → components/useTurno.ts:47 capturar()
    → detecção de leito por regex: lib/leito-parser.ts (via components/useTurno.ts:51)
    → evento salvo em localStorage (components/useTurno.ts:30 salvarTurno / 66-69)
    Responsabilidade: registrar EventoTurno com timestamp e leito. Nenhuma IA, nada vai ao servidor.

[3] Encerramento do plantão
    → pages/encerramento.tsx:28 processarPlantao()
    → montagem de dados como TEXTO plano: components/useTurno.ts:111 montarDadosPaciente,
      :127 montarDadosRelatorioFinal, :145 montarListaParaReclassificacao

[4] Chamadas Groq em sequência (1 + N + 1):
    4a. Reclassificação de leitos ..... pages/encerramento.tsx:42 → pages/api/plantao/reclassificar.ts:34
        prompt PROMPT_RECLASSIFICACAO (lib/prompts.ts:81), modo JSON
    4b. Evolução SAE por paciente ..... pages/encerramento.tsx:68-71 (loop) → pages/api/plantao/gerar-documento.ts:29
        prompt promptDocumento('evolucao') (lib/prompts.ts:24-59), texto puro
    4c. Relatório final consolidado ... pages/encerramento.tsx:84 → pages/api/plantao/relatorio-final.ts:28
        prompt promptRelatorioFinal() (lib/prompts.ts:83-105), texto puro
    Todas via lib/groq-client.ts:27 chamarGroq — modelo único openai/gpt-oss-120b (default,
    lib/groq-client.ts:15), temperature 0.2 (lib/groq-client.ts:50), max_tokens 4096.

[5] Consolidação e renderização
    → pages/encerramento.tsx:93-105 (concatenação partes.join('\n') → setDocumentoCompleto)
    → pages/encerramento.tsx:281-287 (<textarea editável> + botão "Copiar tudo" :276)
    Responsabilidade: NENHUM parsing estruturado, NENHUMA validação — o texto do LLM vai direto à tela.
```

Fluxo paralelo (caminho B — evolução avulsa por formulário):

```
pages/evolucao-avulsa/[tipo]/index.tsx (formulário por schema)
  → pages/api/evolucao/generate.ts:28
  → lib/evolucao/generate-evolucao.ts:51 chamarGroq(system inline :31-41, user :43-49, texto puro)
  → renderização em pages/evolucao-avulsa/[tipo]/index.tsx:84,:153 e preview.tsx
```

## 3. Achados por domínio

### Domínio 2 — Prompt(s) enviados ao LLM ✅

Existem **dois caminhos independentes de geração**, com prompts distintos e níveis de proteção diferentes:

- **Caminho A (plantão por voz)** — `pages/api/plantao/gerar-documento.ts:29` chama `chamarGroq(promptDocumento(formato), dados, { json: false })`. O prompt vem de `lib/prompts.ts:24-79` (`promptDocumento`).
- **Caminho B (evolução avulsa por formulário)** — `pages/api/evolucao/generate.ts:28` chama `generateEvolucao(tipoId, campos)`, que monta prompt próprio inline em `lib/evolucao/generate-evolucao.ts:31-49` — **não usa `lib/prompts.ts`**.

#### 2.1 Prompt da Evolução SAE (caminho A) — transcrição integral

`lib/prompts.ts:26-59` (`promptDocumento('evolucao')`):

```
Você é um assistente de redação clínica para enfermagem brasileira. Reescreva os dados fornecidos como uma Evolução de Enfermagem segundo a SAE (Resolução COFEN nº 358/2009).

CLASSIFICAÇÃO OBRIGATÓRIA DAS SEÇÕES — siga rigorosamente:

Histórico/Coleta de Dados
  Inclui: sinais vitais observados, queixas do paciente, achados de avaliação física, dados clínicos coletados (ex: "PA 90x60 mmHg", "paciente refere dor 8/10", "ausculta pulmonar com roncos").
  NÃO inclui: intervenções realizadas, medicamentos administrados, procedimentos executados.

Diagnóstico de Enfermagem
  Apenas se houver evidência explícita nos dados. Omita a seção se não houver — nunca crie diagnóstico sem sustentação.

Planejamento/Implementação
  Inclui: TUDO que foi feito pelo enfermeiro — medicamentos administrados (ex: "noradrenalina iniciada", "dipirona administrada"), procedimentos realizados, curativos, posicionamentos, orientações dadas, ajustes de dispositivos, qualquer intervenção executada no turno.
  ATENÇÃO: medicações e condutas vão SEMPRE aqui, nunca em Histórico/Coleta de Dados.

Avaliação
  Inclui: resposta do paciente observada após as intervenções (ex: "paciente evoluiu com melhora da dor após analgesia", "manteve hipotensão refratária").
  NÃO inclui: novas intervenções.

Use EXATAMENTE este modelo de estrutura (texto puro, sem markdown):

Histórico/Coleta de Dados
[dados coletados e achados observados]

Diagnóstico de Enfermagem
[apenas se sustentado pelos dados — omitir seção inteira se não houver]

Planejamento/Implementação
[intervenções, medicamentos administrados, procedimentos realizados]

Avaliação
[resposta do paciente observada]

${REGRAS_COMUNS}
```

`REGRAS_COMUNS` (`lib/prompts.ts:9-20`), anexado a todos os documentos do caminho A:

```
REGRAS OBRIGATÓRIAS, sem exceção:
1. Use SOMENTE as informações fornecidas abaixo. Nunca invente sinal vital, evento, procedimento, medicação ou intercorrência que não esteja nos dados.
2. Você PODE traduzir linguagem informal para terminologia técnica de enfermagem (ex: "falta de ar" -> "dispneia"), desde que seja o mesmo fato clínico, sem grau de certeza maior. Você NÃO PODE inferir um achado clínico novo a partir de uma descrição vaga (ex: "paciente quieto" não pode virar "letargia" — isso é conclusão, não tradução).
3. Não sugira conduta médica, prescrição ou recomendação clínica nova além do que já foi registrado pelo enfermeiro.
4. Se faltar dado para alguma seção, escreva "Sem registro para esta seção neste turno" — nunca preencha com suposição.
5. RASTREABILIDADE OBRIGATÓRIA: após cada frase ou trecho que descreva um fato clínico, adicione entre colchetes o horário exato do evento de origem, no formato [HH:MM], usando apenas horários que aparecem nos dados fornecidos. Se uma frase combinar dados de mais de um evento, cite todos os horários, ex: [14:32, 14:50]. Frases estruturais (títulos de seção, frase final) não precisam de citação.
6. DISPOSITIVOS: se o texto mencionar sonda, cateter, dreno, acesso venoso, tubo ou outro dispositivo, destaque-o em linha própria, citando tipo, lado/localização (se mencionado) e horário. Não invente lado ou tipo se não foi dito.
7. CID-10: se o enfermeiro mencionar um diagnóstico ou condição já nomeada por ele, você pode incluir o código CID-10 correspondente entre parênteses. Nunca atribua CID a uma condição que não foi dita explicitamente.
8. Tom técnico, objetivo, terceira pessoa, como redigido em prontuário.
9. FORMATO TEXTO PURO OBRIGATÓRIO — É ABSOLUTAMENTE PROIBIDO usar qualquer símbolo de markdown. [...]
10. Responda apenas com o texto do documento. Nenhum comentário, explicação, saudação ou texto antes ou depois do documento.
11. Termine sempre com a linha: "Documento estruturado a partir dos registros do enfermeiro — revisar e assinar (COREN) antes de inserir no prontuário oficial."
```

#### 2.2 Prompt SBAR (passagem de plantão individual, caminho A)

`lib/prompts.ts:62-78` (`promptDocumento('sbar')`):

```
Você é um assistente de redação clínica para enfermagem brasileira. Reescreva os dados fornecidos no formato SBAR para passagem de plantão.

Use EXATAMENTE este modelo de estrutura (texto puro, sem markdown):

Situação
[descrição objetiva da situação atual do paciente]

Histórico/Background
[contexto clínico relevante do turno]

Avaliação
[avaliação de enfermagem baseada nos dados]

Recomendação
[apenas o que o enfermeiro explicitamente registrou como pendência ou recomendação, com citação [HH:MM]; se não houver, escrever "Sem registro para esta seção neste turno"]

${REGRAS_COMUNS}
```

#### 2.3 Prompt do Relatório Final de Passagem de Plantão

`lib/prompts.ts:83-105` (`promptRelatorioFinal()`), usado por `pages/api/plantao/relatorio-final.ts:28`:

```
Você é um assistente de redação clínica para enfermagem brasileira. Monte o RELATÓRIO FINAL DE PASSAGEM DE PLANTÃO consolidando todos os pacientes.

REGRA CRÍTICA PARA A SEÇÃO "Recomendação para o próximo turno":
Esta seção deve conter APENAS recomendações, orientações ou pendências que o enfermeiro registrou EXPLICITAMENTE no texto fornecido, com citação obrigatória de [HH:MM] de cada item — igual a qualquer outra seção do documento.
PROIBIÇÕES ABSOLUTAS nesta seção (sem exceção):
- É PROIBIDO inferir, sugerir ou criar recomendações clínicas a partir da situação do paciente (ex: se PA estava baixa, NÃO escreva "atenção para hipotensão" ou "ajustar droga vasoativa" — isso é conduta não registrada).
- A regra geral de tradução de terminologia (regra 2) NÃO se aplica aqui. Valores numéricos como temperatura 34,8°C NÃO podem virar "hipotermia"; PA 82 NÃO pode virar "hipotensão grave" nesta seção. Somente o que o enfermeiro escreveu em palavras.
- Qualquer texto gerado nesta seção que não seja cópia literal do que o enfermeiro registrou é uma fabricação clínica. Prefira sempre "Sem registro para esta seção neste turno".
Se o enfermeiro não registrou nenhuma recomendação explícita com [HH:MM], escreva exatamente: "Sem registro para esta seção neste turno".

Use EXATAMENTE este modelo de estrutura para cada paciente (texto puro, sem markdown — É PROIBIDO usar #, ##, ###, ** ou qualquer símbolo de markdown):

LEITO X
Situação: [descrição objetiva da situação atual, com [HH:MM]]
Pendências/Intercorrências: [o que ocorreu ou ficou pendente neste turno, com [HH:MM]; ou "Sem registro para esta seção neste turno"]
Recomendação para o próximo turno: [SOMENTE o que o enfermeiro registrou explicitamente, com [HH:MM]; ou "Sem registro para esta seção neste turno"]

Separe cada paciente com uma linha em branco. Não adicione nenhum símbolo decorativo entre pacientes.

${REGRAS_COMUNS}
12. Organize um paciente por seção, identificado pelo leito, em ordem de complexidade (mais complexo primeiro). Se houver um bloco "NOTAS GERAIS (sem leito identificado)" nos dados, inclua-o como seção final com o cabeçalho "NOTAS GERAIS", sem tentar adivinhar a quem pertence.
```

#### 2.4 Prompt da Evolução Avulsa (caminho B) — transcrição integral

`lib/evolucao/generate-evolucao.ts:31-41` (system) e `:43-49` (user):

```
Você é um assistente especializado em documentação clínica de enfermagem hospitalar brasileira.
Sua função é redigir documentos de enfermagem profissionais, claros e objetivos, em português do Brasil.

Regras absolutas:
1. NUNCA inclua nomes reais de pacientes, CPF, endereços ou quaisquer dados pessoais identificáveis.
2. Use apenas os dados fornecidos nos campos — NÃO invente informações clínicas.
3. Escreva em linguagem técnica de enfermagem, conforme padrões COFEN.
4. O documento deve ser pronto para copiar e colar no prontuário.
5. Não inclua títulos como "Documento:", "Resposta:", apenas o texto do documento.
6. Use parágrafos separados para cada sistema/seção avaliada.
7. Sempre conclua com a assinatura no formato: "Enfermeiro(a) Responsável — [data/hora]".
```

```
Tipo de documento: ${tipo.nome}
Contexto: ${tipo.contexto}

Dados fornecidos:
${tabelaCampos}

Redija o documento de enfermagem completo e profissional baseado exclusivamente nos dados acima.
```

Para o tipo `sae_sistematizacao`, o `tipo.contexto` interpolado é (`lib/evolucao/document-types.ts:243`):

> `'Sistematização da Assistência de Enfermagem (SAE) conforme COFEN com diagnóstico, planejamento e avaliação.'`

Ou seja: no caminho B o próprio contexto do documento **instrui o modelo a produzir "diagnóstico, planejamento e avaliação"** independentemente de terem sido ditados, e o prompt do caminho B **não contém** a regra "omita a seção se não houver", nem a regra 4 ("Sem registro para esta seção"), nem proibição de inferência clínica além do genérico "NÃO invente informações clínicas" (`lib/evolucao/generate-evolucao.ts:36`).

Observação: `generateEvolucao` busca o schema de campos (`lib/evolucao/generate-evolucao.ts:22`, `const schema = getFieldSchema(tipoId);`) mas **a variável nunca é usada** — não há validação de campos contra o schema.

#### 2.5 O trecho exato que permite a fabricação do diagnóstico (caminho A)

`lib/prompts.ts:34-35`:

> `Diagnóstico de Enfermagem`
> `  Apenas se houver evidência explícita nos dados. Omita a seção se não houver — nunca crie diagnóstico sem sustentação.`

e o template em `lib/prompts.ts:50-51`:

> `Diagnóstico de Enfermagem`
> `[apenas se sustentado pelos dados — omitir seção inteira se não houver]`

O critério da seção é **"evidência explícita"/"sustentado pelos dados"** — um critério de *julgamento clínico*, não de *presença literal*. "Temperatura 38,7°C" É evidência explícita de hipertermia; logo, pelo texto do prompt, o modelo está **autorizado** a criar um diagnóstico "sustentado" por ela. Um rótulo NANDA nunca é ditado como fato — é sempre uma conclusão — então qualquer preenchimento desta seção é, por construção, conteúdo gerado, não ditado. O prompt delega ao LLM exatamente a decisão que a constraint arquitetural do produto proíbe (decisão clínica).

Agrava a situação a regra 2 de `REGRAS_COMUNS` (`lib/prompts.ts:11`), que autoriza "traduzir linguagem informal para terminologia técnica" — o passo "38,7°C → hipertermia" é enquadrável como tradução pelo modelo. O prompt do relatório final reconhece esse buraco e o fecha **apenas para a seção "Recomendação"** (`lib/prompts.ts:90`: "Valores numéricos como temperatura 34,8°C NÃO podem virar 'hipotermia'; [...] A regra geral de tradução de terminologia (regra 2) NÃO se aplica aqui") — **não existe carve-out equivalente para a seção "Diagnóstico de Enfermagem" da evolução**.

#### 2.6 Por que Planejamento/Avaliação ficam corretamente vazios (assimetria)

As outras seções são definidas por **extração de fatos registrados**, não por julgamento:

- Planejamento/Implementação: "TUDO que foi **feito** pelo enfermeiro" (`lib/prompts.ts:38`) — nada foi ditado como feito → regra 4 (`lib/prompts.ts:13`) manda escrever "Sem registro para esta seção neste turno".
- Avaliação: "resposta do paciente **observada após as intervenções**" (`lib/prompts.ts:42`) — sem intervenção ditada, não há o que preencher.
- Diagnóstico: único critério **inferencial** ("se houver evidência… sustentado pelos dados", `lib/prompts.ts:35,51`). A assimetria não é acidente de exemplo few-shot (não há few-shot); é a **definição da própria seção** que pede classificação em vez de extração.

Há ainda um conflito interno: o template manda "Use EXATAMENTE este modelo de estrutura" (`lib/prompts.ts:45`) listando as 4 seções, enquanto a instrução da seção manda "omitir seção inteira se não houver" (`lib/prompts.ts:51`) e a regra 4 manda preencher com "Sem registro..." em vez de omitir — três instruções mutuamente inconsistentes sobre o que fazer com seção sem dado.

#### 2.7 Existe instrução proibindo inferência clínica?

- Caminho A: **existe parcialmente** — `lib/prompts.ts:11` (proíbe inferir "achado clínico novo a partir de descrição vaga", mas autoriza "tradução"), `lib/prompts.ts:12` (proíbe conduta médica/prescrição), `lib/prompts.ts:89-91` (proíbe inferência, mas só na seção Recomendação do relatório final). **NÃO ENCONTRADA** proibição de criar diagnóstico de enfermagem/NANDA; ao contrário, `lib/prompts.ts:35` autoriza condicionalmente.
- Caminho B: apenas o genérico `lib/evolucao/generate-evolucao.ts:36` ("Use apenas os dados fornecidos nos campos — NÃO invente informações clínicas"). Proibição específica de diagnóstico/inferência: **NÃO ENCONTRADA**.

### Domínio 1 — Arquitetura de geração ✅

**Não há transcrição de áudio no app.** NÃO ENCONTRADO uso de Web Speech API, Whisper ou `MediaRecorder` no código. O voz→texto é feito pelo teclado nativo do celular (`components/README.md:21`: "Campo de texto (com microfone do teclado nativo — sem gravação customizada"; `KRONIA_NURSE_CADERNO_INTELIGENTE.md:126-127` descreve Groq Whisper como "melhoria de fase 2"). O app recebe texto já transcrito em `pages/registrar.tsx:107-122`.

**Todas as chamadas ao Groq passam por um único cliente**: `lib/groq-client.ts:27` (`chamarGroq`). Parâmetros fixos e idênticos para todas as rotas: modelo `openai/gpt-oss-120b` por default (`lib/groq-client.ts:15`, `const MODELO = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'`), `temperature: 0.2` (`lib/groq-client.ts:50`), `max_tokens` 4096 (`lib/groq-client.ts:20`), JSON mode por default e desligado por rota (`lib/groq-client.ts:35,52`).

**O encerramento do plantão encadeia 1 + N + 1 chamadas Groq** (N = pacientes com eventos), orquestradas no cliente por `pages/encerramento.tsx:28` (`processarPlantao`):

1. Reclassificação de leitos — `pages/encerramento.tsx:42` → `pages/api/plantao/reclassificar.ts:34`, modo JSON.
2. Uma evolução SAE por paciente — loop `for (const p of pacientesComEventos)` em `pages/encerramento.tsx:68`, chamada em `:71` (`body: JSON.stringify({ formato: 'evolucao', dados })`) → `pages/api/plantao/gerar-documento.ts:29`, texto puro.
3. Relatório final — `pages/encerramento.tsx:84` → `pages/api/plantao/relatorio-final.ts:28`, texto puro.

**Cada documento individual é uma passada única do LLM**: um prompt system + um blob de texto de eventos → um blob de texto de saída. Não existe etapa de extração ou classificação separada da redação. O input de cada evolução é texto plano montado por `components/useTurno.ts:111-123` (`montarDadosPaciente`: `Leito: ...` / `[HH:MM] (Nota) texto cru do ditado`), e a saída é concatenada sem parsing em `pages/encerramento.tsx:93-105` (`partes.join('\n')`) e exibida num `<textarea>` editável (`pages/encerramento.tsx:281-287`). Nenhum dado de paciente é persistido no servidor (`pages/api/plantao/gerar-documento.ts:7-8`: "Nenhum dado de paciente é persistido aqui").

### Domínio 3 — Formatação e normalização ✅

**Não existe camada determinística de normalização numérica.** Grep por `toFixed`, `replace('.', ',')`, `Intl.NumberFormat` no código de produto: NÃO ENCONTRADO. As únicas ocorrências de `parseFloat`/`replace` são alheias a sinais vitais: `lib/groq-client.ts:85` (parseia tempo de espera do erro 429), `lib/groq-client.ts:91` (remove cercas ```json), `lib/leito-parser.ts:24` (remove pontuação inicial).

**O valor sai cru do LLM em todos os documentos**, sem pós-processamento:
- `lib/evolucao/generate-evolucao.ts:51-53` — `const texto = await chamarGroq(...)` → `return { documento: texto };`
- `pages/api/plantao/gerar-documento.ts:29-30` — `const texto = await chamarGroq(...)` → `res.status(200).json({ texto });`
- `pages/api/plantao/relatorio-final.ts:28-29` — idem.

E chega cru ao LLM: o texto ditado é repassado literal (`components/useTurno.ts:121` — `linhas.push(\`[${e.hora}] (${e.tipo}) ${e.texto}\`)`; `:135` no relatório final).

**Por que "38,7" na evolução e "38.7" na passagem:** nenhum dos dois prompts fixa o separador decimal. O prompt da evolução (`lib/prompts.ts:26-59`) não tem nenhum exemplo de temperatura decimal (os exemplos são "PA 90x60 mmHg", "dor 8/10" — `lib/prompts.ts:31`). O único exemplo com decimal em todo o sistema de prompts é "temperatura 34,8°C" com vírgula, dentro de uma regra de proibição (não de formato) e apenas no prompt do relatório final (`lib/prompts.ts:90`). Como não há formatação em código (acima) e a geração roda com `temperature: 0.2` (baixa, não zero — `lib/groq-client.ts:50`), o separador de cada documento é ruído não-determinístico do modelo em chamadas independentes. O código permite qualquer separador em qualquer documento; a consistência entre documentos não é garantida por nada.

**"Leito sete" não normalizado:** a detecção de leito é regex literal — `lib/leito-parser.ts:19` (`/\b(?:e?leito)\s+([^\s,;:.]+)/i`) e `:22` (`const leito = \`Leito ${match[1]}\`;`) — que concatena o token cru: "leito sete" → "Leito sete". Conversão de número por extenso: NÃO ENCONTRADA em código nem em prompt (o `PROMPT_RECLASSIFICACAO`, `lib/prompts.ts:81`, corrige a qual paciente o evento pertence, não o formato do rótulo). A comparação de leitos é por string case-insensitive (`components/useTurno.ts:58`), então "Leito sete" e "Leito 7" seriam dois pacientes distintos.

### Domínio 4 — Rastreabilidade do conteúdo ✅

**O output não preserva vínculo estruturado com o ditado.** O resultado é uma string única: `lib/evolucao/generate-evolucao.ts:11-13` (`interface GenerateResult { documento: string; }`); rotas de plantão retornam `{ texto }` (`gerar-documento.ts:30`, `relatorio-final.ts:29`). Não há campo `source`, offset ou ID de segmento. Texto ditado e texto gerado são indistinguíveis no documento final — um blob renderizado com `whiteSpace: 'pre-wrap'` (`pages/evolucao-avulsa/[tipo]/preview.tsx:158-161`) ou `<textarea>` (`pages/encerramento.tsx:281-287`).

A única rastreabilidade é "soft", por instrução de prompt: a regra 5 de `REGRAS_COMUNS` exige `[HH:MM]` embutido na prosa (`lib/prompts.ts:14`). Vale para os documentos de plantão; **não existe no caminho B** (o prompt de `generate-evolucao.ts:31-49` não menciona `[HH:MM]`). Nada em código valida que os horários citados existem nos dados.

**Validação pós-LLM antes de renderizar: NÃO ENCONTRADA.** Grep por `zod|safeParse|z.object`: zero ocorrências. Os documentos em texto puro não passam por nenhuma checagem (nem de seções, nem de conteúdo não-ditado, nem de diagnóstico inventado). A única "validação" existente é nas rotas JSON auxiliares e é um cast sem checagem de shape: `lib/groq-client.ts:90-93` (`extrairJson` = strip de cercas + `JSON.parse(limpo) as T`), consumido com fallback tolerante em `reclassificar.ts:37-38` e `calcular-alertas.ts:64-65`. Toda garantia contra fabricação vive exclusivamente em texto de prompt — o próprio arquivo admite isso: `lib/prompts.ts:2-4`: "Toda garantia de segurança do produto (não inventar, citar fonte, nunca diagnosticar) vive em texto aqui, não em código."

**Persistência:** nenhum dado clínico vai ao Supabase — as migrations criam apenas tabelas de base de conhecimento (`supabase/migrations/20260630_schema_completo.sql:36,69,82,105,181`: `knowledge_base`, `knowledge_versions`, `knowledge_audit`, `knowledge_specs`, `knowledge_spec_audit`). Turno/eventos vivem em `localStorage` (`lib/storage.ts:19-29`) e o documento avulso em `sessionStorage` (`preview.tsx:18,39`). Não existe, portanto, nem o lugar onde um vínculo ditado→gerado pudesse ser persistido.

### Domínio 5 — Superfície do problema ✅

Todas as chamadas Groq do repositório (todas via `chamarGroq`, mesmo modelo/temperatura):

| # | Chamada | Prompt | Modo | Gera | Documento clínico visível? |
|---|---|---|---|---|---|
| 1 | `pages/api/plantao/gerar-documento.ts:29` | `promptDocumento(formato)` — `lib/prompts.ts:24` (central) | texto | Evolução SAE ou SBAR de 1 paciente | **SIM** |
| 2 | `pages/api/plantao/relatorio-final.ts:28` | `promptRelatorioFinal()` — `lib/prompts.ts:83` (central) | texto | Relatório final de passagem | **SIM** |
| 3 | `pages/api/evolucao/generate.ts:28` → `lib/evolucao/generate-evolucao.ts:51` | prompt **inline duplicado** — `generate-evolucao.ts:31-49` | texto | Evolução avulsa (33 tipos de documento) | **SIM** |
| 4 | `pages/api/plantao/reclassificar.ts:34` | `PROMPT_RECLASSIFICACAO` — `lib/prompts.ts:81` (central) | JSON | Mapeamento evento→leito | Auxiliar |
| 5 | `pages/api/plantao/sugerir-complexidade.ts:39` | `promptSugestaoComplexidade()` — `lib/prompts.ts:107` (central) | JSON | Sugestão de complexidade | Auxiliar — **sem caller no frontend (rota órfã)** |
| 6 | `pages/api/plantao/calcular-alertas.ts:61` | `PROMPT_ALERTAS` — `lib/prompts.ts:125` (central) | JSON | Extração de valores brutos (NEWS2/qSOFA somados em código, `lib/scales.ts`) | Auxiliar — **sem caller no frontend (rota órfã)** |
| 7 | `pages/api/kronos/professor.ts:99` | prompt inline na rota (`:80-95`) | texto | Resposta educacional (RAG) | Conteúdo educacional (não clínico de paciente) |
| 8–14 | `lib/knowledge-pipeline.ts:75,142,231,266,296,327,377` | 7 prompts inline no módulo | JSON | Pipeline da biblioteca técnica (pesquisa, redação, 5 auditores) | Não (publicação exige aprovação humana, `pages/api/kronos/biblioteca/processar.ts:9-12`) |

**Duplicação relevante:** existem **dois geradores de "evolução de enfermagem" com prompts divergentes** — o de plantão (`lib/prompts.ts:26`, com `REGRAS_COMUNS`, estrutura SAE e regra de omissão de seção) e o avulso (`lib/evolucao/generate-evolucao.ts:31`, sem nenhuma dessas proteções). Qualquer correção feita só em `lib/prompts.ts` não alcança o caminho B.

**Precedente arquitetural relevante:** a rota `calcular-alertas` já implementa o padrão extração→cálculo determinístico: o prompt declara "O cálculo da pontuação final (NEWS2 e qSOFA) é feito inteiramente por código a partir destes valores — você só extrai valores brutos, nunca soma, nunca classifica risco" (`lib/prompts.ts:142`), com a soma em `lib/scales.ts`. Ou seja, o padrão proposto no refactor já existe no repositório para alertas — só não é aplicado aos documentos.

**Rotas órfãs:** `sugerir-complexidade` e `calcular-alertas` não têm nenhum `fetch` no frontend (busca por seus nomes fora das próprias rotas só encontra comentário em `lib/scales.ts:21` e documentação em `components/README.md`).

## 4. Causa-raiz da fabricação de diagnóstico

A fabricação de "Risco de desequilíbrio térmico relacionado à hipertermia" a partir de "temperatura 38,7°C leito 7" é o resultado da composição de quatro fatores, todos evidenciados no código:

1. **O critério da seção Diagnóstico é inferencial, não extrativo.** `lib/prompts.ts:35`: "Apenas se houver evidência explícita nos dados" e `:51`: "[apenas se sustentado pelos dados...]". "Temperatura 38,7°C" *é* evidência explícita — pelo texto do prompt, o modelo está autorizado a criar um diagnóstico "sustentado" por ela. Um rótulo NANDA nunca é ditado como fato; é sempre conclusão. Logo, a seção só pode ser preenchida com conteúdo gerado. As demais seções são extrativas ("TUDO que foi **feito**", `lib/prompts.ts:38`; "resposta **observada após as intervenções**", `:42`) — sem fato ditado, não há o que extrair, e a regra 4 (`:13`) as manda declarar vazias. Essa é a causa da assimetria Diagnóstico-preenchido vs Planejamento/Avaliação-vazios.
2. **A regra de "tradução" abre a porta.** `lib/prompts.ts:11` autoriza traduzir informal→técnico; "38,7°C → hipertermia" é enquadrável como tradução. O time já reconheceu esse buraco e o fechou, mas **só para a seção Recomendação do relatório final** (`lib/prompts.ts:90`: "Valores numéricos como temperatura 34,8°C NÃO podem virar 'hipotermia'"). Não há carve-out equivalente para Diagnóstico de Enfermagem.
3. **Instruções mutuamente conflitantes sobre seção vazia.** "Use EXATAMENTE este modelo de estrutura" com as 4 seções (`lib/prompts.ts:45-57`) vs "omitir seção inteira se não houver" (`:51`) vs regra 4 "escreva 'Sem registro...'" (`:13`). Diante do conflito, preencher a seção é uma resolução tão plausível quanto omiti-la.
4. **Nenhuma barreira em código.** Não há validação pós-LLM, parsing de seções, ou guard contra conteúdo não-ditado (Domínio 4). O que o modelo emitir vai direto ao `<textarea>` (`pages/encerramento.tsx:105,281-287`). A arquitetura declara isso explicitamente: `lib/prompts.ts:2-4` — "Toda garantia de segurança do produto (...) vive em texto aqui, não em código."

**Evidência histórica de que instrução não basta:** desde o primeiro commit (`bddddb3`, `git show bddddb3:lib/prompts.ts`), o prompt já dizia "Diagnóstico de Enfermagem (somente se sustentado pelos dados — não crie diagnóstico sem evidência)" e a regra 1 já dizia "Nunca invente sinal vital, evento...". O bug de produção ocorreu com uma proibição textual já vigente. Além disso, o repositório registra duas rodadas anteriores de endurecimento de prompt contra fabricação (`238ddcb` "fix(prompts): bloquear inferência clínica em Recomendação"; `d80f7e5` "fix(qsofa+recomendacao): calcular qSOFA em código e bloquear fabricação na Recomendação") — e a fabricação reapareceu em outra seção (Diagnóstico). Nota: `d80f7e5` resolveu o problema do qSOFA justamente **movendo a decisão do prompt para código** — o mesmo movimento que este relatório avalia para os documentos.

## 5. Veredito técnico: patch de prompt vs refactor

**Veredito: patch de prompt NÃO resolve estruturalmente. A eliminação da fabricação exige o refactor extração→classificação→montagem determinística.** Fundamentos no código real:

1. **O patch já foi tentado (duas vezes) e a classe do bug persiste.** Histórico acima: `238ddcb` e `d80f7e5` endureceram prompts contra fabricação na Recomendação; a fabricação migrou para o Diagnóstico. A proibição "não crie diagnóstico sem evidência" existe desde `bddddb3` e não impediu o incidente. Um terceiro patch (carve-out da regra 2 para Diagnóstico, à la `lib/prompts.ts:90`) reduziria a frequência, mas manteria a decisão "há ou não diagnóstico ditado?" dentro do LLM — exatamente a decisão clínica que a constraint do produto proíbe delegar.
2. **Não existe ponto de interceptação em código.** Com saída em texto puro não-parseado (`gerar-documento.ts:29-30` → `encerramento.tsx:105`), nenhuma verificação programática pode ser acoplada a um patch de prompt: se o modelo fabricar, nada detecta. Qualquer garantia verificável exige saída estruturada (JSON por seção/fato) — que já é o refactor, não o patch.
3. **O padrão do refactor já existe e funciona no próprio repositório.** `PROMPT_ALERTAS` (`lib/prompts.ts:125-142`) restringe o LLM a extração de valores brutos e move o cálculo para código (`lib/scales.ts`), com a justificativa registrada no commit `d80f7e5`. Aplicar aos documentos é estender um padrão validado, não inventar arquitetura nova.
4. **Os sintomas secundários são insolúveis por prompt.** Decimal "38,7" vs "38.7" decorre de N chamadas independentes sem normalização em código (Domínio 3) — prompt não garante determinismo de formato; um normalizador determinístico só tem onde existir se houver etapa de montagem em código. "Leito sete" é bug do `leito-parser.ts:19-22` (regex literal, sem conversão por extenso) — não tem relação com prompt algum.
5. **A rastreabilidade exigida (`[HH:MM]`) só é auditável com pipeline estruturado.** Hoje é prosa não validada (`lib/prompts.ts:14`, Domínio 4). Com extração JSON contendo `fonte` (ID/hora do evento), a montagem determinística pode rejeitar qualquer fato sem origem — a fabricação se torna estruturalmente impossível na seção montada, porque a seção Diagnóstico só é renderizada se existir um fato extraído do tipo "diagnóstico nomeado pelo enfermeiro", verificável por comparação com o texto ditado.

Forma mínima do refactor sugerida pela própria topologia do código: (a) 1ª chamada Groq em JSON mode extrai fatos tipados `{tipo, valor, fonte}` do texto ditado (mesmo contrato de `PROMPT_ALERTAS`); (b) código valida cada fato contra o input (fonte existe, valor é substring/normalizável); (c) código monta as seções SAE por template determinístico — seção sem fatos sai como "Sem registro para esta seção neste turno" por construção, números formatados por um único formatador (vírgula decimal), leito normalizado; (d) opcionalmente uma 2ª chamada apenas parafraseia frase a frase o conteúdo já aprovado, sem poder adicionar seções ou fatos. O contrato das rotas (`{ texto }`) pode ser mantido, isolando o frontend da mudança.

**Onde o patch de prompt ainda é útil:** como mitigação imediata e barata enquanto o refactor não sai (carve-out da regra 2 para Diagnóstico + remoção do conflito estrutura-fixa vs omissão + fixar separador decimal por instrução), e no caminho B (`generate-evolucao.ts`), cujo prompt não tem nenhuma das proteções. Mas deve ser tratado como mitigação, não como correção.

## 6. Estimativa de esforço

### Caminho 1 — Patch de prompt (mitigação)

| Item | Detalhe |
|---|---|
| Arquivos afetados | 3: `lib/prompts.ts` (carve-out para Diagnóstico; resolver conflito das linhas 13/45/51; instrução de decimal), `lib/evolucao/generate-evolucao.ts:31-49` (importar regras/proibições), `lib/evolucao/document-types.ts:243` (contexto do `sae_sistematizacao` induz "diagnóstico, planejamento e avaliação") |
| Código novo | Zero (só texto de prompt) |
| Risco de regressão | Comportamental e não testável automaticamente — a validação é o checklist manual (`CHECKLIST_NAO_REGRESSAO.md`, referenciado em `lib/prompts.ts:6`). Mudança de prompt altera todos os documentos gerados de forma não determinística |
| O que NÃO resolve | Fabricação (reduz probabilidade, não elimina — evidência histórica seção 4); decimal inconsistente (sem garantia); "Leito sete" (fora do escopo de prompt); ausência de rastreabilidade verificável |
| Esforço | Horas |

### Caminho 2 — Refactor extração→classificação→montagem determinística

| Item | Detalhe |
|---|---|
| Arquivos afetados | ~7: `lib/prompts.ts` (novo prompt de extração JSON, contrato tipo `PROMPT_ALERTAS`), novo `lib/documento/extrator.ts` (validação fato↔fonte), novo `lib/documento/montador.ts` (templates SAE/SBAR/relatório + formatador numérico único), `pages/api/plantao/gerar-documento.ts` e `relatorio-final.ts` (orquestrar extração→validação→montagem; contrato `{ texto }` mantido), `lib/leito-parser.ts` (mapa de números por extenso, ~10 linhas), `lib/evolucao/generate-evolucao.ts` (migrar para o mesmo pipeline ou, no mínimo, herdar as regras) |
| Não afetados | `pages/encerramento.tsx` e demais frontend (contrato de rota preservado), `lib/groq-client.ts` (já suporta JSON mode), rotas auxiliares |
| Risco de regressão | Médio, porém **testável**: extração/validação/montagem são funções puras unit-testáveis (o repo já tem `jest.config.js`); o formato do documento muda de "prosa livre do LLM" para "template + frases extraídas", o que altera o estilo percebido — exigirá ajuste do template com usuários. Fallback simples: feature flag por rota mantendo o caminho antigo |
| O que resolve | Fabricação (estruturalmente: seção só existe se houver fato com fonte validada), decimal (formatador único em código), "Leito sete" (normalização determinística), assimetria (todas as seções passam a ser extrativas), rastreabilidade (fato carrega `fonte` verificada) |
| Esforço | Dias (estimo 2–4 dias de dev + rodada do checklist), reutilizando o padrão já validado de `PROMPT_ALERTAS`/`lib/scales.ts` |
