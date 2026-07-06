---
target: pages/kronos.tsx
total_score: 23
p0_count: 0
p1_count: 3
timestamp: 2026-07-06T02-00-07Z
slug: pages-kronos-tsx
---
⚠️ DEGRADED: single-context (sem sessão Supabase real para renderização ao vivo; análise via leitura de código-fonte)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Spinner com texto contextual bom; respostas sem fonte não são distinguidas visualmente |
| 2 | Match Between System & Real World | 3 | Acesso rápido envia uma palavra-chave crua como se fosse pergunta real |
| 3 | User Control and Freedom | 2 | Histórico não persiste; sem cancelar pergunta em andamento |
| 4 | Consistency and Standards | 2 | Disclaimer estilizado diferente do equivalente em Encerramento; `<li>` fora de `<ul>` |
| 5 | Error Prevention | 2 | Nada orienta o escopo de pergunta antes de o usuário digitar fora do escopo |
| 6 | Recognition Rather Than Recall | 3 | Grid de acesso rápido reduz necessidade de lembrar |
| 7 | Flexibility and Efficiency of Use | 2 | Enter para enviar; sem copiar/regenerar/histórico entre sessões |
| 8 | Aesthetic and Minimalist Design | 3 | Layout de chat limpo |
| 9 | Error Recovery | 2 | Erro mostra texto mas sem ação de retry |
| 10 | Help and Documentation | 1 | Só uma frase de disclaimer |
| **Total** | | **23/40** | **Acceptable** |

## Anti-Patterns Verdict

Composição de chat competente, não genérica. O sinal mais concreto de geração rápida: parser de markdown manual com bug estrutural real (`<li>` fora de `<ul>`), e o grid de "acesso rápido" injeta uma palavra solta como pergunta em vez de rotear para uma view curada.

## Overall Impression

Estrutura de chat sólida, tom adequado. O maior risco não é visual — é de confiança e continuidade: histórico não sobrevive a um recarregamento, num produto cujo próprio usuário está descrito como "em uso apressado, plantão noturno" (interrupções são a regra).

## What's Working

1. Input sempre acessível (`position: sticky`).
2. Diferenciação clara de turno de fala (bolhas usuário vs. IA com fonte citada).
3. Texto de loading específico ("Consultando base de conhecimento...").

## Priority Issues

**[P1] Acesso rápido envia palavra-chave crua como se fosse a pergunta do usuário**
- Fix: enviar perguntas bem formadas, ou rotear para view de categoria curada.
- Suggested command: `$impeccable clarify`

**[P1] Histórico de conversa não persiste; interrupção = perda silenciosa**
- Fix: persistir conversa (localStorage, como `useTurno` já faz para o turno).
- Suggested command: `$impeccable harden`

**[P1/P2] Botão de enviar sem nome acessível; lista markdown fora de `<ul>`**
- Fix: `aria-label` no botão; agrupar linhas de lista em `<ul>` real.
- Suggested command: `$impeccable audit`

**[P2] Disclaimer de escopo com baixa saliência visual, inconsistente com Encerramento**
- Fix: usar `.texto-responsabilidade` (âmbar) também aqui.
- Suggested command: `$impeccable polish`

**[P2/P3] Sem retry em erro nem copiar resposta**
- Suggested command: `$impeccable optimize`

## Persona Red Flags

**Casey**: interrupção + recarregamento apaga a thread inteira silenciosamente.
**Sam**: botão de enviar só-ícone sem aria-label; lista markdown quebra semântica de lista.
**Jordan**: primeira "pergunta" no acesso rápido é a palavra solta "protocolo"; disclaimer de baixa saliência.

## Minor Observations

- Estado vazio redundante ao lado do grid de acesso rápido.
- Bolha de erro sem palavra "Erro:" explícita.
- Mensagens sem timestamp individual.

## Questions to Consider

- Os atalhos deveriam rotear para view curada em vez de simular pergunta de chat?
- O histórico poderia persistir por plantão, como `useTurno`?
- Respostas sem fonte deveriam ser sinalizadas visualmente como tal?
