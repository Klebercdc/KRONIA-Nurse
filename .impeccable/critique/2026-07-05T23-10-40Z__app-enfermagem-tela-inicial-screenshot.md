---
target: tela inicial (screenshot) - app de enfermagem
total_score: 24
p0_count: 0
p1_count: 2
timestamp: 2026-07-05T23-10-40Z
slug: app-enfermagem-tela-inicial-screenshot
---
Method: ⚠️ DEGRADED: single-context for Assessment B (no markup/URL target exists — the target is an external screenshot of a shipped native app, not code in this repo). Assessment A ran as an isolated sub-agent with no visibility into any prior analysis in this conversation.

## Design Health Score

| # | Heurística | Nota | Problema-chave |
|---|-----------|-------|-----------|
| 1 | Visibilidade do status do sistema | 3 | Sem indicador de conexão/sincronização offline |
| 2 | Correspondência com o mundo real | 3 | "Confiabilidade 98%" é métrica abstrata sem referente |
| 3 | Controle e liberdade do usuário | 2 | Chip "Medicaçã..." cortado sem affordance clara de scroll |
| 4 | Consistência e padrões | 2 | Dot de categoria muda de cor para o mesmo rótulo (GUIA) |
| 5 | Prevenção de erros | 3 | Menus "⋮" sem preview do conteúdo |
| 6 | Reconhecimento em vez de memorização | 3 | Ícones + labels + busca reduzem carga de memória |
| 7 | Flexibilidade e eficiência de uso | 2 | Sem atalho para favoritos/protocolos usados com frequência |
| 8 | Estética e design minimalista | 3 | Estatísticas competem por atenção com busca/CTA |
| 9 | Ajudar a reconhecer/diagnosticar/recuperar de erros | 2 | Nenhum estado vazio/erro visível nesta tela |
| 10 | Ajuda e documentação | 1 | Nenhum acesso a ajuda/fonte da curadoria clínica |
| **Total** | | **24/40** | **Aceitável — melhorias significativas necessárias** |

## Anti-Patterns Verdict

**Avaliação (Assessment A)**: leitura predominante de *template genérico bem executado, não produto com voz própria*. O card de 4 estatísticas logo abaixo da saudação é o padrão mais reciclado de dashboards genéricos (finanças, fitness, produtividade) aplicado sem adaptação ao contexto clínico. "Confiabilidade 98%" é métrica de preenchimento sem referente real. O padrão "Olá, Nome + pergunta motivacional" é clichê de app de bem-estar/consumo, não de ferramenta profissional usada sob pressão em corredor hospitalar. Execução é limpa e o vocabulário clínico é correto — competência de montagem, não desenho deliberado a partir do contexto real de uso.

**Varredura determinística**: `detect.mjs --json` não retornou achados (`[]`) porque não há markup/CSS neste repositório representando essa tela — o alvo é uma fotografia de um app nativo já publicado, não código deste projeto. Nenhum falso positivo a reportar; a varredura simplesmente não se aplica a este tipo de alvo.

**Overlays visuais**: não aplicável — não há página ao vivo para injetar o detector via navegador; o alvo é uma imagem estática.

## Overall Impression

A tela é competente e limpa, mas fala a língua de um app de consumo genérico (saudação motivacional, cartão de métricas de vaidade) em vez da língua de uma ferramenta clínica usada sob pressão de tempo. O maior ponto de alavancagem: cortar tudo que não acelera "achar a técnica certa em segundos" e devolver aquele espaço para busca/conteúdo acionável.

## What's Working

- **Fotografia real de procedimento** no card de destaque em vez de ilustração genérica — comunica contexto tátil e ajuda reconhecimento visual rápido.
- **Badges de status de conteúdo** (NOVO/REVISADO/ATUALIZADO) — ideia forte para escanear rapidamente o que mudou desde a última consulta.
- **FAB central "Registrar"** na tab bar prioriza corretamente a ação mais provável de ser a mais frequente do fluxo.

## Priority Issues

**[P1] Dot de categoria muda de cor para o mesmo rótulo**
- Why it matters: o usuário aprende (errado) que a cor do dot indica categoria, mas ela parece herdar a cor do badge de status — quebra o código visual e força releitura do texto toda vez.
- Fix: fixar cor por tipo de conteúdo (ex. azul=GUIA, roxo=PROTOCOLO sempre); manter a cor de status isolada só no badge superior.
- Suggested command: `$impeccable colorize`

**[P1] "Confiabilidade 98%" sem fonte nem explicação**
- Why it matters: em ferramenta usada para decisões de cuidado, um número não-verificável gera desconfiança/risco de responsabilidade em vez de reforçar credibilidade.
- Fix: tornar clicável levando à metodologia de curadoria, ou substituir por algo auditável ("Revisado por [entidade] em [data]").
- Suggested command: `$impeccable clarify`

**[P2] Chip "Medicaçã..." cortado abruptamente** *(também identificado de forma independente na leitura manual anterior desta conversa — achado corroborado por duas análises separadas)*
- Why it matters: lê como bug de layout, não como affordance de scroll; usuário pode não perceber que há mais categorias.
- Fix: fade de borda de ~24px na lista de chips e/ou indicador explícito tipo "+3".
- Suggested command: `$impeccable layout`

**[P2] Sobrecarga de informação acima da tarefa principal**
- Why it matters: para uma ferramenta de consulta rápida usada sob pressão de plantão, cada elemento decorativo atrasa o acesso à busca/ação real.
- Fix: comprimir as estatísticas numa linha compacta ou mover para o perfil; priorizar busca + destaque logo abaixo da saudação.
- Suggested command: `$impeccable distill`

**[P3] Menu "⋮" nos cards de atualização sem preview de ação**
- Why it matters: gera hesitação em usuários cautelosos que não sabem se a ação é reversível — relevante em contexto clínico.
- Fix: ícone mais específico (salvar/compartilhar) ou label visível, evitando overflow genérico.
- Suggested command: `$impeccable clarify`

## Persona Red Flags

**Jordan (Iniciante)**: não há explicação da diferença semântica entre "Guias" e "Protocolos" nem do que significa "Confiabilidade 98%". O ícone de "sliders" ao lado da busca não tem rótulo. Menus "⋮" sem preview podem fazer um iniciante evitar tocar por medo de alterar algo.

**Sam (Acessibilidade)**: badges de status dependem só de cor (verde/roxo/laranja) sem ícone ou textura — problemático para daltonismo. Dots de categoria muito pequenos (~6-8px) como único diferenciador em certos momentos. Texto secundário (datas, tags) aparenta contraste cinza médio sobre branco, risco de não atingir WCAG AA.

**Casey (Móvel distraído)**: o card de estatísticas exige parar e processar números que não ajudam a tarefa imediata. Encontrar a categoria certa exige scroll horizontal com chip cortado — atrito extra para uso com uma mão. O FAB "Registrar" fica visualmente muito próximo da área de toque de "Início", aumentando risco de toque acidental em uso apressado.

## Minor Observations

- Ícone de filtro (sliders) não mostra estado ativo.
- Foto de "Administração de Medicamentos" é menos direta que as outras duas.
- Carrossel de destaque não tem setas de navegação visíveis, só dots.
- Espaçamento entre "Últimas atualizações" e o card de destaque é levemente menor que os demais, gerando pequeno desequilíbrio rítmico.
- Avatar "K" não tem badge de notificação, perdendo chance de sinalizar novidades.

## Questions to Consider

- Se um enfermeiro abre este app no meio de um plantão corrido, quantos toques/segundos até ele chegar à técnica que precisa — e as 4 estatísticas globais ajudam essa tarefa ou só "parecem um dashboard"?
- Se removêssemos completamente o card de estatísticas, o que se perderia de fato?
- O que muda na tela se ela for desenhada a partir de "alguém em pé, com uma mão livre, sob pressão de tempo" em vez do template padrão de app de conteúdo?
