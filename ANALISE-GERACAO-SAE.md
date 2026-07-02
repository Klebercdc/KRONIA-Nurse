# ANÁLISE — Pipeline de Geração de Evoluções (SAE) e Passagem de Plantão

> Auditoria READ-ONLY realizada em 2026-07-02. Todas as afirmações citam `arquivo:linha` com trecho literal. Itens não encontrados estão marcados como **NÃO ENCONTRADO**.

## 1. Sumário executivo

_(preenchido ao final — ver seção 1 consolidada abaixo)_

## 2. Mapa do pipeline atual

_(em elaboração — aguardando consolidação dos domínios 1 e 5)_

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

### Domínio 1 — Arquitetura de geração

_(em elaboração — aguardando subagente)_

### Domínio 3 — Formatação e normalização

_(em elaboração — aguardando subagente)_

### Domínio 4 — Rastreabilidade do conteúdo

_(em elaboração — aguardando subagente)_

### Domínio 5 — Superfície do problema

_(em elaboração — aguardando subagente)_

## 4. Causa-raiz da fabricação de diagnóstico

_(consolidação ao final)_

## 5. Veredito técnico: patch de prompt vs refactor

_(consolidação ao final)_

## 6. Estimativa de esforço

_(consolidação ao final)_
