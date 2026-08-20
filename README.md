# KRONIA-Nurse

App de evolução de enfermagem por **perguntas adaptativas**. O profissional
responde uma árvore que se reescreve a cada resposta, e o app devolve a
**Evolução de Enfermagem** pronta para revisar e colar no prontuário.

## Como rodar

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 268 testes
npm run typecheck
```

Sem variável de ambiente, sem banco, sem chave de API. O app abre e funciona.

## Como funciona

O fluxo em uso é **100% determinístico**. Não há chamada de IA em ponto
nenhum dele — nenhuma requisição de rede, nenhum custo de inferência, nenhuma
alucinação possível. O texto sai de três mecanismos, todos em
`lib/evolucao/grafo-adaptativo.js`:

| Mecanismo | O que faz |
| --- | --- |
| `showIf` | decide se uma pergunta entra na sequência, a partir das respostas já dadas. `buildSequence()` recalcula a árvore a cada passo — ela começa em 6 perguntas e cresce. |
| `classify()` | traduz valor numérico em achado clínico, com faixa que muda por idade (RN, lactente, criança, adulto, idoso). |
| `validacoesCruzadas` | acusa combinações fisicamente impossíveis (ex.: dieta oral com paciente em ventilação mecânica invasiva). |

São **134 perguntas** no schema — a home mostra esse número lido do código,
não digitado à mão.

### Três regras que o motor não quebra

- **Nada de inventar.** Nenhuma condição é assumida por causa de outra.
  Quando a resposta certa exigiria uma subárvore clínica sem fonte segura, o
  app marca `(CONFERIR — …)` e devolve a decisão ao profissional.
- **Não avaliado ≠ normal.** Pergunta não respondida nunca vira "sem
  alterações" por omissão: vira pendência explícita no fim do documento.
  Número fora da faixa conta como não respondido.
- **Diagnóstico nunca é inferido.** Não existe pergunta de diagnóstico
  nomeado no schema nem bloco para ele na saída, logo não existe caminho no
  código para um valor virar rótulo clínico.
- **Sinal vital vai pelo valor aferido.** Nada de "normocárdico" ou
  "afebril": o COREN-SP manda registrar o número exato, e é o número que
  entra no prontuário. O rótulo de normalidade sobrevive só como texto de
  apoio na tela. Achado alterado continua nomeado — é sinal clínico
  observado, não juízo de normalidade.

### Formato de saída

A evolução é a **foto do paciente no momento da avaliação** — e isso não é
detalhe de nomenclatura, é o que define o formato:

```
Paciente de 45 anos, alerta e orientado, estado geral preservado.
Deambulando sem auxílio. Apresenta-se corado, hidratado, febril.
Em ar ambiente.

Sinais vitais: PA 120x80 mmHg, FC 78 bpm, FR 16 irpm, SpO₂ 97%, T 38,4°C.

Ao exame físico:
- Neurológico: ...
- Cabeça e pescoço: ...
- Respiratório: ...
- Cardiovascular: ...
- Gastrointestinal: ...
- Geniturinário: ...
- Pele e tegumento: ...
- Membros: ...
- Dispositivos: ...

Aceitando dieta por via oral. Com balanço hídrico neutro nas últimas 24h...

Realizados cuidados de enfermagem: administrado antitérmico...

Paciente apresentou: cedeu a febre.

Mantido em acompanhamento pela equipe de enfermagem...

Enfermeiro(a) Responsável — [data/hora]
```

Sistema sem achado não vira bullet vazio — o recém-nascido não tem "Cabeça e
pescoço" porque o caminho neonatal não faz exame céfalo-podal.

### Evolução não é o Processo de Enfermagem

Vale escrever porque a confusão já custou uma refatoração aqui.

O Processo de Enfermagem tem **cinco etapas** (Res. COFEN 736/2024, Art. 4º):
Avaliação, Diagnóstico, Planejamento, Implementação e Evolução. A **Evolução
é uma delas**, não o invólucro das outras — o § 5º a define como "a avaliação
dos resultados alcançados (…) permite a análise e a revisão de todo o
Processo de Enfermagem".

Diagnóstico e Planejamento (a prescrição de enfermagem, o que a SAE antiga
chamava assim) são registros **próprios e separados**. A Res. 358/2009 já os
listava assim: "privativo do enfermeiro o registro dos diagnósticos de
enfermagem, da prescrição de enfermagem e da evolução ou avaliação de
enfermagem" — três coisas, não uma com três seções. Cada hospital os registra
no sistema próprio.

Por isso não há aqui seção de diagnóstico nem de planejamento, e a ausência
**não é lacuna a fechar**: eles nunca pertenceram a este documento. Está
travado por teste.

### Redação

Segue o COREN-SP, "Anotação de Enfermagem" (2022): valor exato do sinal vital
sem rótulo de normalidade, escore junto quando há escala, nenhum termo de
conotação de valor ("bem", "muito", "adequado"), medida e localização de
lesão, e condição do sítio de inserção de cada dispositivo.

O descritor do sinal vital **alterado** aparece na abertura ("febril",
"taquicárdico"); o **valor** aparece uma vez só, na linha de sinais vitais. O
que está dentro da faixa não ganha descritor — é exatamente o "normocárdico"
que o COREN proíbe, e o número já está logo abaixo.

## Atualização: o que muda aqui chega no telefone

Duas metades, porque uma sem a outra não entrega nada.

### 1. Publicar — `.github/workflows/`

| Workflow | Quando | O que faz |
|---|---|---|
| `ci.yml` | todo push e todo PR | `npm test`, `typecheck`, `build` |
| `publicar.yml` | push no `main`, **depois do CI passar** | build estático e deploy no GitHub Pages |

O CI é portão, não enfeite: os testes do motor são a trava clínica (faixa
vital, `(CONFERIR)`, validações cruzadas, regras do COREN-SP, forma da
evolução). Falhou ali, não publica.

O build de publicação roda com `KRONIA_ESTATICO=1`, que liga `output: export`
em `next.config.js`. O app é 100% cliente — motor determinístico, zero chamada
de rede, dados em `localStorage` — então site estático é o formato dele. As
rotas de `pages/api`, que estão paradas, saem do caminho só durante a
publicação; o repositório não muda.

**Sem passo manual.** O `publicar.yml` liga o Pages sozinho
(`configure-pages` com `enablement: true`).

Aqui houve um buraco que vale registrar, porque ele deixou a atualização
automática parada desde o primeiro dia: a versão original pedia um
*Settings -> Pages -> Source: GitHub Actions* feito na mão. Ninguém fez, e as
oito execuções do workflow falharam todas no mesmo passo — build passando,
site nunca subindo. As duas metades desta seção estavam certas o tempo todo;
o que faltava era o site existir.

### 2. Chegar no telefone — service worker

Publicar não basta: o app instalado serviria o cache velho. O service worker
resolve isso, e de quebra faz a evolução abrir sem sinal — plantão em subsolo
de hospital é o caso real.

```
scripts/sw-template.js ....... fonte do worker
scripts/gerar-sw.js .......... roda no prebuild; injeta a versão do commit
public/sw.js ................. GERADO, não versionado — não edite
components/useAtualizacao.ts . registra e recarrega quando troca a versão
```

A versão do build fica embutida no `sw.js`. O navegador só reconhece um worker
novo se os **bytes** do arquivo mudarem — com a versão lá dentro, todo deploy
produz um `sw.js` diferente e a troca é detectada sem depender de cabeçalho de
cache do servidor.

Estratégia de rede: navegação vai **à rede primeiro** (é o que faz a versão
nova chegar assim que existe, com o cache entrando só quando não há sinal);
`/_next/static/` vai ao cache primeiro (nunca muda sob o mesmo nome); o resto
serve do cache e revalida atrás.

#### Sem botão: o app se atualiza sozinho

O worker novo assume assim que instala (`skipWaiting`) e a página recarrega em
seguida. Não há aviso, não há "Atualizar", não há decisão a tomar.

**O que torna isso seguro é o rascunho.** A evolução em andamento é salva no
aparelho a cada resposta (`rascunho_evolucao`), e ao abrir o app ela é
retomada no mesmo ponto — mesma pergunta, mesmas respostas, mesmo leito. Sem
o rascunho, uma atualização no meio do questionário apagaria o trabalho do
plantão, porque as respostas vivem em estado de React.

O rascunho vale por 12 horas — um plantão. Passou disso, é descartado: retomar
uma evolução de ontem não é retomada, é confusão. Ele também é apagado ao
fechar a evolução ou começar outra.

Um detalhe que custou um bug: a primeira tomada de controle do worker também
dispara `controllerchange`, e recarregar ali seria um reload gratuito em toda
primeira visita. A bandeira que guarda isso precisa ser **mutável** — uma foto
tirada no início deixa a página sem atualizar para sempre, porque no primeiro
carregamento nunca há controlador.

Verificado contando carregamentos reais do documento:

| Cenário | Cargas | |
|---|---|---|
| primeira visita | 1 | não recarrega à toa |
| recarga manual, sem deploy | 2 | não recarrega de novo |
| depois de um deploy | 3 | recarregou sozinho |

E com uma evolução aberta: reload automático no meio do questionário devolve
o enfermeiro na mesma pergunta, com as respostas intactas.

Procura versão nova ao abrir, toda vez que o app volta ao primeiro plano, e a
cada 30 minutos para a aba que fica aberta o turno inteiro.

## Estrutura

```
pages/index.tsx ......................... renderiza o app
components/KroniaNurseApp.jsx ........... só as telas; importa o motor
lib/evolucao/grafo-adaptativo.js ........ schema clínico + motor
lib/evolucao/evolucao.js ................ monta a evolução: abertura, vitais,
                                          exame por sistema, cuidados, fecho
lib/__tests__/grafo-adaptativo.test.ts .. 6 cenários clínicos + invariantes
lib/__tests__/evolucao.test.ts .......... forma do documento e travas
docs/LAYOUT.md .......................... layout, tela a tela
scripts/sw-template.js .................. service worker (fonte)
scripts/gerar-sw.js ..................... injeta a versão no prebuild
components/useAtualizacao.ts ............ atualização automática
.github/workflows/ ...................... CI e publicação
```

Dados do plantão ficam em `localStorage`, no aparelho. Nada sai do
dispositivo. Em tela só entram **leito e iniciais** — nunca o nome completo
do paciente.

## IA: parada, não removida

Continua no repositório e compila, mas **nenhuma tela chama**: todo o
`pages/api` (KRONOS, conhecimento, geração), `lib/groq-client`,
`lib/prompts`, `lib/knowledge-*`, `lib/kronos-*`, o fluxo antigo de
setor/tipo de documento, as migrations do Supabase e o
`scripts/rag-pipeline.js`. Fica à espera da decisão de usar ou não IA.

`gerarTexto()` é função pura de `(context, answers, sequence)` para string, e
há um ponto de extensão comentado no motor: plugar uma revisão de fluidez por
LLM depois não exige reestruturar nada.

Enquanto o pipeline RAG estiver parado, as variáveis de ambiente que ele
exigia (`GROQ_API_KEY`, `SUPABASE_*`, `COHERE_API_KEY`) não são necessárias
para rodar o app.

## Status

🚧 Em desenvolvimento. Login é visual: não há autenticação, conta ou sessão.
