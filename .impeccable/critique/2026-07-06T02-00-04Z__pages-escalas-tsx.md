---
target: pages/escalas.tsx
total_score: 18
p0_count: 1
p1_count: 2
timestamp: 2026-07-06T02-00-04Z
slug: pages-escalas-tsx
---
⚠️ DEGRADED: single-context (sem sessão Supabase real para renderização ao vivo; análise via leitura de código-fonte)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Live partial-score preview é bom |
| 2 | Match Between System & Real World | 3 | Terminologia clínica correta (NEWS2/Braden/Morse/qSOFA) |
| 3 | User Control and Freedom | 2 | Voltar descarta escala parcial/completa sem aviso |
| 4 | Consistency and Standards | 2 | "Referência de risco" só existe para NEWS2; estilo inline ad hoc |
| 5 | Error Prevention | 0 | **Crítico**: `riscoStyle()` colore errado o pior resultado de 2 das 4 escalas |
| 6 | Recognition Rather Than Recall | 3 | Descrições inline, pontos por opção visíveis |
| 7 | Flexibility and Efficiency of Use | 1 | Nenhum caminho de teclado para selecionar escala |
| 8 | Aesthetic and Minimalist Design | 2 | Contradição de cor (P0) mina o princípio "cor com significado único" |
| 9 | Error Recovery | 1 | Nenhuma forma de saber que um badge está mal colorido |
| 10 | Help and Documentation | 1 | Nenhuma explicação do que cada faixa de risco significa clinicamente |
| **Total** | | **18/40** | **Poor — reforma maior necessária** |

## Anti-Patterns Verdict

Não é slop genérico — usa tokens reais (`.badge-risco-*`, `.alerta-*`). O tell de geração apressada está na lógica, não na superfície: `riscoStyle()` faz match de substring em vez de usar um nível de risco estável, causando o P0 abaixo — um bug funcional mascarado de detalhe de estilo.

## Overall Impression

Os formulários de escala (radio com pontos visíveis, score parcial ao vivo) são um bom padrão para "velocidade sob pressão". Mas esta tela tem um bug de cor confirmado que inverte o sinal de risco para 2 das 4 escalas, exatamente no momento em que "confiança clínica antes de estética" mais importa.

## What's Working

1. "A IA nunca estima" declarado explicitamente na tela.
2. Live partial-score feedback antes de terminar todos os campos.
3. Pontuação por opção transparente (nunca uma caixa-preta).

## Priority Issues

**[P0] Badges de risco mostram a cor errada para o pior resultado de 2 das 4 escalas**
- Why it matters: `riscoStyle()` faz `.includes('Alto')` (case-sensitive); `calcularBraden()` retorna `'Muito alto'` (minúsculo) — não bate, cai no fallback verde/baixo-risco. `calcularQsofa()` retorna `'Atenção — considerar avaliação de sepse'`, que também não contém nenhuma das substrings buscadas, e também cai em verde. Os piores resultados de Braden e qSOFA ficam visualmente idênticos aos melhores.
- Fix: cada `calcularX()` deve retornar um nível de risco estável (enum), nunca depender de substring-match do texto traduzido.
- Suggested command: `$impeccable harden`

**[P1] Cards seletores de escala não são acessíveis por teclado/leitor de tela**
- Fix: `<button>` real ou role="button"+tabIndex+onKeyDown.
- Suggested command: `$impeccable harden`

**[P1] "Referência de risco" só existe para NEWS2, nenhuma das outras 3 escalas**
- Fix: remover do índice, ou tornar específico por escala.
- Suggested command: `$impeccable clarify`

**[P2] Sem guarda contra duplo envio de "Salvar escala"**
- Fix: desabilitar botão imediatamente no clique.
- Suggested command: `$impeccable harden`

**[P3] Estilo de tipografia duplicado como objetos inline em vez de classe compartilhada**
- Suggested command: `$impeccable distill`

## Persona Red Flags

**Sam**: não alcança os cards de escala via teclado; badges mal coloridos contradizem o rótulo textual.
**Riley**: testar Braden ≤9 ou qSOFA 2+ revela o bug de cor imediatamente; duplo-tap gera entradas duplicadas.
**Alex**: nenhum atalho de teclado em lugar nenhum da tela.

## Minor Observations

- `.includes('Médio')` checado duas vezes na mesma cadeia `||`.
- String longa do qSOFA dentro de badge pequeno uppercase — checar overflow.
- Voltar de um resultado calculado perde o resultado silenciosamente.

## Questions to Consider

- Cada `calcularX()` deveria retornar um enum de nível de risco estável junto do rótulo de exibição?
- Cada escala precisa do próprio card de referência, ou isso deveria aparecer só após seleção?
- Uma escala parcialmente preenchida deveria persistir localmente, como `turno` já faz?
