---
target: pages/registrar.tsx
total_score: 21
p0_count: 2
p1_count: 2
timestamp: 2026-07-06T02-00-05Z
slug: pages-registrar-tsx
---
⚠️ DEGRADED: single-context (sem sessão Supabase real para renderização ao vivo; análise via leitura de código-fonte)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Ponto pulsante, preview de detecção de leito são bons; preview pode prometer atribuição que o save não cumpre |
| 2 | Match Between System & Real World | 3 | Linguagem de domínio correta; "(CONFERIR ...)" cru no corpo do texto é rugoso |
| 3 | User Control and Freedom | 1 | **Excluir é instantâneo e irreversível** — sem confirmação, sem undo |
| 4 | Consistency and Standards | 2 | `var(--cinza-400)` usado 3x e indefinido em todo o codebase |
| 5 | Error Prevention | 0 | Preview do "contexto" pode misrepresentar o que realmente acontece ao salvar; sem confirmação de exclusão |
| 6 | Recognition Rather Than Recall | 4 | Contexto de leito sempre visível; preview ao vivo remove necessidade de lembrar |
| 7 | Flexibility and Efficiency of Use | 3 | Atalho Ctrl/Cmd+Enter; auto-detecção reduz passos |
| 8 | Aesthetic and Minimalist Design | 3 | Layout limpo, foco único |
| 9 | Error Recovery | 1 | Sem undo em exclusão; falhas de auto-organização são permanentemente silenciosas |
| 10 | Help and Documentation | 1 | Nenhuma explicação da auto-detecção ou do marcador "(CONFERIR)" |
| **Total** | | **21/40** | **Acceptable — mas duas deduções são de segurança, não estéticas** |

## Anti-Patterns Verdict

Não é slop visual — segue tokens reais consistentemente. O padrão preocupante é uma promessa de UI que a lógica não cumpre: o preview do "contexto" diz uma coisa, o save faz outra (ver P0 abaixo) — um gap de wiring entre o que a interface diz e o que o hook de estado realmente faz.

## Overall Impression

Esta é a tela mais crítica do fluxo (maior frequência, maior pressão), e a maior parte do design de interação honra essa confiança: preview de detecção ao vivo, garantia "edição humana vence máquina" no organizador assíncrono. Mas tem um defeito grave o suficiente para minar tudo isso: a interface pode dizer que uma nota será anexada a um leito específico, e depois arquivá-la silenciosamente como não anexada. Combinado com exclusão sem confirmação, os dois maiores riscos desta tela são sobre perder ou arquivar mal documentação clínica silenciosamente.

## What's Working

1. Preview de detecção de leito em tempo real, específico e de baixo atrito.
2. Garantia "edição humana vence máquina" no nível de código (`aplicarTextoOrganizado`).
3. Ação primária thumb-friendly ("Adicionar" + atalho Ctrl/Cmd+Enter).

## Priority Issues

**[P0] O preview de "contexto" promete uma atribuição que a captura real nunca cumpre**
- Why it matters: quando há `pacienteContexto` ativo e o texto não tem "leito X" detectável, o preview mostra `→ contexto: {leito}`. Mas `capturar()` no hook determina `patientId` só re-rodando `detectarLeito()` no texto cru — nunca recebe `contextoId`. A nota prometida para "Leito 5" é salva com `patientId: null` e aparece como "sem leito" — mismatch silencioso e confirmado.
- Fix: passar `contextoId` como fallback de patient id em `capturar()` quando `detectarLeito()` não encontra nada no texto.
- Suggested command: `$impeccable harden`

**[P0] Excluir um registro é instantâneo, silencioso, sem undo**
- Why it matters: `excluirEvento` remove imediatamente, sem confirmação nem undo. Mesma zona de alcance do ícone "Editar", sem diferenciação de tamanho/espaçamento — um mis-tap destrói permanentemente documentação clínica.
- Fix: confirmação leve (double-tap ou "Removido — Desfazer" por ~5s).
- Suggested command: `$impeccable harden`

**[P1] `var(--cinza-400)` usado 3x e definido em lugar nenhum**
- Fix: substituir por `var(--color-ink-faint)`.
- Suggested command: `$impeccable harden`

**[P1] Falhas de auto-organização são permanentemente invisíveis por design**
- Fix: adicionar marcador visível distinguindo "não organizado" de "organizado", sem bloquear a captura.
- Suggested command: `$impeccable clarify`

**[P2] Marcador "(CONFERIR ...)" fica cravado no texto salvo, sem ação dedicada de resolver**
- Fix: affordance de um toque "confirmar" que remove o marcador sem exigir edição livre completa.
- Suggested command: `$impeccable clarify`

## Persona Red Flags

**Casey**: uso de uma mão, distraída — perfil mais propenso a mis-tap no ícone de lixeira em vez do lápis.
**Riley**: selecionar contexto e ditar nota sem número de leito revela que salva silenciosamente "sem leito".
**Sam**: `captura-textarea` sem aria-label/label associado, ao contrário de `contexto-select` que já faz certo.

## Minor Observations

- `.contexto-select` com `max-width: 120px` sem `text-overflow: ellipsis`.
- `--cinza-400` único a esta tela — resíduo de iteração anterior.
- Sem guarda de submit duplo além de `!texto.trim()`.

## Questions to Consider

- Como seria um padrão de soft-delete/undo para `excluirEvento`?
- O seletor de "contexto" deveria de fato ser fiado em `capturar()`, ou o preview deveria parar de prometer isso?
- Deveria haver marcador visível distinguindo entrada organizada de não-organizada?
