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
