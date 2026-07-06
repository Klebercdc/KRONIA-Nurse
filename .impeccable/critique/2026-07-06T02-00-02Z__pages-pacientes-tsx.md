---
target: pages/pacientes.tsx
total_score: 19
p0_count: 1
p1_count: 2
timestamp: 2026-07-06T02-00-02Z
slug: pages-pacientes-tsx
---
⚠️ DEGRADED: single-context (sem sessão Supabase real para renderização ao vivo; análise via leitura de código-fonte)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Pills de filtro recebem estado `.ativo`, mas `pacientesFiltrados = turno.pacientes` sempre — a lista nunca muda |
| 2 | Match System / Real World | 3 | Form oferece 5 níveis de complexidade; card só exibe 3 tags colapsadas — vocabulário de entrada e saída não batem |
| 3 | User Control and Freedom | 2 | Form tem "Cancelar"; exclusão tem confirmação inline, mas sem undo |
| 4 | Consistency and Standards | 3 | Uso consistente de `.card`/`.badge`/`.btn`/`.pill`, mas empty-state reimplementa manualmente o que `.card` já dá |
| 5 | Error Prevention | 1 | `removerPaciente` apaga em cascata todos os eventos vinculados, sem aviso |
| 6 | Recognition Rather Than Recall | 3 | Badges e labels sempre visíveis |
| 7 | Flexibility and Efficiency | 1 | Sem edição de paciente, sem ação em lote, filtro decorativo |
| 8 | Aesthetic and Minimalist Design | 3 | Hierarquia do card clara e sem ruído |
| 9 | Error Recovery | 0 | Sem undo, toast, ou qualquer caminho de recuperação após excluir |
| 10 | Help and Documentation | 1 | Nenhuma explicação dos níveis de complexidade ou do que "Remover" apaga |
| **Total** | | **19/40** | **Poor — reformas maiores necessárias** |

## Anti-Patterns Verdict

Não tem cara de slop genérico esteticamente — tokens de design mostram sistema pensado. O anti-pattern real é estrutural: controles que parecem funcionais mas são decorativos. O próprio código comenta "*Filtering is UI-only*". Se o filtro é fake, o que mais é fake?

## Overall Impression

Visualmente sólida, mas esconde dois problemas sérios: o filtro de pills é ilusório, e excluir um paciente apaga silenciosamente todo o histórico clínico vinculado, sem aviso e sem volta — o oposto do objetivo de "produzir documentação clínica confiável".

## What's Working

1. Hierarquia do card de paciente (leito → badge → dx → contagem).
2. Aviso de privacidade proativo sobre uso de leito/identificador interno.
3. Progressive disclosure no formulário (substituição, não modal empilhado).

## Priority Issues

**[P0] Exclusão de paciente apaga registros clínicos em cascata, sem aviso**
- Why it matters: `removerPaciente` filtra pacientes E eventos pelo mesmo id. Nada indica que N registros somem junto — perda de dado clínico documentado, potencialmente com peso legal/COFEN.
- Fix: confirmação deve mostrar "Isso também apagará N registros"; considerar arquivar em vez de apagar, ou undo com janela curta.
- Suggested command: `$impeccable harden`

**[P1] Pills de filtro são decorativos — não filtram nada**
- Fix: implementar filtragem real (exige campo de unidade/setor) ou remover os pills.
- Suggested command: `$impeccable audit`

**[P1] Não existe edição de paciente — só criar ou apagar**
- Fix: adicionar caminho de edição (ícone de lápis abrindo o formulário pré-preenchido).
- Suggested command: `$impeccable shape`

**[P2] Taxonomia de complexidade inconsistente entre formulário (5 níveis) e card (3 badges)**
- Fix: exibir rótulo granular no badge, ou unificar sistemas.
- Suggested command: `$impeccable clarify`

## Persona Red Flags

**Riley**: nota que os pills não fazem nada real; descobre que apagar paciente apaga registros associados sem aviso.
**Sam**: `.card` inteiro tem cursor pointer mas onClick só na div interna; botão de cancelar "✕" sem aria-label.
**"Bia" (plantão noturno)**: confia no filtro pra reduzir a lista e perde tempo; pode apagar silenciosamente notas de um leito ocupado.

## Minor Observations

- Banner de privacidade permanente, sem opção de dispensar.
- Botão de cancelar da confirmação usa "✕" sem aria-label.
- Sem validação contra leito duplicado.
- Default do select de complexidade é "Intermediários" sem indicação visual de default.

## Questions to Consider

- Os pills deveriam existir nesta v1, ou o modelo de dado precisa primeiro de um campo de setor?
- Faz sentido editar sem exigir exclusão+recriação, dado que isso apaga o histórico?
- A confirmação de exclusão deveria dizer quantos registros serão apagados junto?
