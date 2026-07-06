---
target: pages/encerramento.tsx
total_score: 22
p0_count: 1
p1_count: 2
timestamp: 2026-07-06T02-00-06Z
slug: pages-encerramento-tsx
---
⚠️ DEGRADED: single-context (sem sessão Supabase real para renderização ao vivo; análise via leitura de código-fonte)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Log de progresso e spinner são bons; "✓ Copiado!" sem `aria-live` |
| 2 | Match Between System & Real World | 3 | Vocabulário alinhado; "Reclassificando leitos por contexto..." vaza linguagem de backend |
| 3 | User Control and Freedom | 2 | Nenhum cancelar/escape durante processamento |
| 4 | Consistency and Standards | 2 | Padrão de "card" reimplementado de 3 formas diferentes |
| 5 | Error Prevention | 1 | Confirm-dialog previne clique acidental, mas não o risco real: apagar sem ter copiado |
| 6 | Recognition Rather Than Recall | 3 | Tudo relevante visível na tela |
| 7 | Flexibility and Efficiency of Use | 2 | Fluxo único e linear |
| 8 | Aesthetic and Minimalist Design | 3 | Layout limpo, mas dois avisos âmbar quase idênticos empilhados |
| 9 | Error Recovery | 2 | Erro cru da API sem garantia de linguagem amigável |
| 10 | Help and Documentation | 1 | Nenhuma ajuda contextual |
| **Total** | | **22/40** | **Acceptable** |

## Anti-Patterns Verdict

Não tem cheiro de slop — estrutura pensada para o fluxo clínico real. O que traz sabor de scaffold rápido: blocos `style={{...}}` duplicando o que `.card` já resolve, e dois avisos âmbar quase idênticos empilhados.

## Overall Impression

Entende bem o problema de negócio, reduzindo carga cognitiva na maior parte do fluxo. O problema real não é estético — é de segurança do dado: o botão que apaga tudo permanentemente não verifica, em nenhum momento, que o enfermeiro salvou/copiou o texto antes de destruí-lo.

## What's Working

1. Máquina de estados por fase (inicial/processando/pronto/encerrado) — foco único.
2. Confirmação inline de duas etapas para a ação destrutiva.
3. Linguagem de domínio genuína (evolução, leito, fonte mono no documento).

## Priority Issues

**[P0] Encerramento apaga o único registro do documento gerado sem garantir que foi salvo**
- Why it matters: `documentoCompleto` só existe em useState; "Copiar tudo" é opcional. Um enfermeiro apressado pode encerrar e apagar a evolução SAE/COFEN sem nunca tê-la salvo, sem nenhum aviso.
- Fix: bloquear/avisar fortemente o encerramento se `copiado` nunca foi true; idealmente persistir uma cópia server-side antes de permitir apagar.
- Suggested command: `$impeccable harden`

**[P1] Nenhum escape durante o processamento multi-etapas**
- Fix: botão "Cancelar" + AbortController durante `fase === 'processando'`.
- Suggested command: `$impeccable harden`

**[P1] Mensagens de erro podem vazar texto técnico cru**
- Fix: normalizar/mapear erros conhecidos antes de exibir.
- Suggested command: `$impeccable clarify`

**[P2] Textarea do documento sem rótulo acessível; confirmação de cópia não é anunciada**
- Fix: `aria-labelledby` + `aria-live="polite"` no feedback de cópia.
- Suggested command: `$impeccable audit`

**[P2] Padrão de "card" reimplementado de 3 formas diferentes**
- Suggested command: `$impeccable distill`

## Persona Red Flags

**Riley**: F5 durante fase 'pronto' apaga o documento gerado sem aviso.
**Casey**: interrupção (chamada, troca de app) entre gerar e copiar pode perder o documento.
**Sam**: foco visual no textarea depende só de troca de cor de borda, sem rótulo acessível.

## Minor Observations

- "✓ Copiado!" poderia ser toast/snackbar mais visível.
- Estado vazio não oferece próximo passo (link para /registrar).
- Documento gerado não carrega timestamp de geração.

## Questions to Consider

- Encerrar deveria exigir confirmação explícita de que o documento foi copiado/salvo?
- Uma cópia server-side (mesmo temporária) não seria mais segura que depender só do clipboard?
- "Copiar" e "encerrar" deveriam ser uma única ação guardada, eliminando o passo esquecível?
