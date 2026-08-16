# KRONIA-Nurse

App de evolução de enfermagem por **perguntas adaptativas**. O profissional
responde uma árvore de perguntas que se reescreve a cada resposta, e o app
devolve a evolução em texto corrido, pronta para revisar e colar no
prontuário.

## Como rodar

```bash
npm install
npm run dev      # http://localhost:3000
```

Sem variável de ambiente, sem banco, sem chave de API. O app abre e funciona.

## Como funciona

Tudo é **determinístico**. Não há IA em nenhum ponto do fluxo — nenhuma
chamada de rede, nenhum custo de inferência, nenhuma alucinação possível.
O texto sai de três mecanismos, todos em `components/KroniaNurseApp.jsx`:

| Mecanismo | O que faz |
| --- | --- |
| `showIf` | decide se uma pergunta entra na sequência, a partir das respostas já dadas. `buildSequence()` recalcula a árvore inteira a cada passo. |
| `classify()` | traduz valor numérico em achado clínico, com faixa que muda por idade (RN, lactente, criança, adulto, idoso). |
| `validacoesCruzadas` | acusa combinações fisicamente incompatíveis (ex.: dieta oral com paciente em ventilação mecânica invasiva). |

Hoje são **122 perguntas** no schema — a home mostra esse número lido direto
do código, não digitado à mão.

### Duas regras que o motor não quebra

- **Nada de inventar.** Nenhuma condição é assumida por causa de outra.
  Quando a resposta correta exigiria uma subárvore clínica sem fonte segura,
  o app marca `(CONFERIR — …)` e devolve a decisão ao profissional.
- **Não avaliado ≠ normal.** Pergunta não respondida nunca vira "sem
  alterações" por omissão: vira pendência explícita no fim do texto.

## Estrutura

```
pages/index.tsx ............... renderiza o app
components/KroniaNurseApp.jsx . schema clínico + motor + todas as telas
styles/globals.css ............ reset mínimo (a paleta é inline, no componente)
docs/LAYOUT.md ................ especificação de layout, tela a tela
```

Dados do plantão ficam em `localStorage`, no aparelho. Nada sai do
dispositivo. Em tela só entram **leito e iniciais** — nunca o nome completo
do paciente.

## Status

🚧 Em desenvolvimento. Login é visual: não há autenticação, conta ou sessão.
