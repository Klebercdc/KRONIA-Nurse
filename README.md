# KRONIA-Nurse

App de evolução de enfermagem por **perguntas adaptativas**. O profissional
responde uma árvore que se reescreve a cada resposta, e o app devolve a
evolução nos blocos do Processo de Enfermagem, pronta para revisar e colar
no prontuário.

## Como rodar

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 273 testes
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

São **133 perguntas** no schema — a home mostra esse número lido do código,
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
  código para um valor virar rótulo clínico. O diagnóstico é registrado no
  sistema próprio de cada hospital, em documento à parte.
- **Sinal vital vai pelo valor aferido.** Nada de "normocárdico" ou
  "afebril": o COREN-SP manda registrar o número exato, e é o número que
  entra no prontuário. O rótulo de normalidade sobrevive só como texto de
  apoio na tela. Achado alterado continua nomeado — é sinal clínico
  observado, não juízo de normalidade.

### Formato de saída

Resolução COFEN nº 736/2024, montado por
`lib/evolucao/processo-enfermagem.js`: **Dados** (o que foi observado),
**Intervenção** (o que foi feito — condutas e medicação) e **Resultado** (a
resposta do paciente). Todos os blocos sempre presentes; o que faltar vira
"Sem registro para esta seção", nunca suposição.

Não há bloco de **Diagnóstico**: cada hospital tem sistema próprio para ele,
em documento à parte. O Art. 8º da Res. 736/2024 exige o registro de todas as
etapas no *prontuário* — o prontuário, não necessariamente este documento.

A redação segue o COREN-SP, "Anotação de Enfermagem" (2022): valor exato do
sinal vital sem rótulo de normalidade, escore junto quando há escala, nenhum
termo de conotação de valor ("bem", "muito", "adequado"), e condição do sítio
de inserção de cada dispositivo.

## Estrutura

```
pages/index.tsx ......................... renderiza o app
components/KroniaNurseApp.jsx ........... só as telas; importa o motor
lib/evolucao/grafo-adaptativo.js ........ schema clínico + motor
lib/evolucao/processo-enfermagem.js ..... encaixe nos blocos do documento
lib/__tests__/grafo-adaptativo.test.ts .. 6 cenários clínicos + invariantes
lib/__tests__/processo-enfermagem.test.ts  estrutura, travas e pendências
docs/LAYOUT.md .......................... layout, tela a tela
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
