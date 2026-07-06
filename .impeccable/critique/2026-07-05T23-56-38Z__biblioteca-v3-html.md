---
target: biblioteca v3 (mockup HTML)
total_score: 20
p0_count: 2
p1_count: 2
timestamp: 2026-07-05T23-56-38Z
slug: biblioteca-v3-html
---
Method: dual-agent (A: sub-agente isolado, leitura sem contexto prévio · B: `detect.mjs` rodou contra o HTML real do mockup, não degradado desta vez).

## Design Health Score — 20/40 (Aceitável, no limite inferior)

| # | Heurística | Nota | Problema-chave |
|---|---|---|---|
| 1 | Visibilidade do status | 3 | Chips Favoritos/Recentes/Atualizados sem estado ativo visível |
| 2 | Mundo real | 3 | Ícone de "refresh" pro filtro "Atualizados" conflita com pull-to-refresh |
| 3 | Controle e liberdade | 2 | Sem "limpar filtros"; ícone de hambúrguer sem rótulo |
| 4 | Consistência | 2 | Dois estilos de "selecionado" na mesma tela (pill escuro vs. pill azul) |
| 5 | Prevenção de erros | 3 | Tela de baixo risco, n/a parcial |
| 6 | Reconhecimento vs. memorização | 3 | "Ordenar: Recentes" esconde as demais opções sem prévia |
| 7 | Flexibilidade/eficiência | 2 | Sem combinação visível de filtros, sem atalhos p/ usuário avançado |
| 8 | Estética minimalista | 1 | 4 fileiras de controle antes do primeiro card de conteúdo |
| 9 | Recuperação de erros | n/a | Nenhum estado de erro/vazio no mockup |
| 10 | Ajuda e documentação | 1 | Nenhuma affordance de ajuda em tela densa de filtros |

## Anti-Patterns Verdict

**LLM**: esqueleto pensado (segmentação, badges de status com data, agrupamento por categoria), mas execução escorrega pro genérico — foto de stock repetida entre itens da mesma categoria lê como "placeholder esquecido", banner "Recomendado" é template de app de saúde qualquer, quick-chips são "chip row" copiado de e-commerce sem adaptação ao contexto clínico.

**Detector determinístico**: `detect.mjs --json` contra o HTML real do mockup retornou `[]` — nenhum anti-padrão estrutural (gradiente em texto, glassmorphism, grid decorativo etc.). Isso é esperado: os problemas reais desta tela são semânticos (cor sobrecarregada, imagem duplicada, redundância de IA), fora do escopo do que o scanner estático detecta. Nenhum falso positivo; a divergência entre A e B aqui é o próprio achado — heurísticas de conteúdo/semântica precisam do olhar humano, não só do scanner.

## Overall Impression

A base estrutural da v2/v3 (busca, segmentação Guias/Protocolos, lista agrupada) é sólida, mas a tela empilhou controles de mais nas primeiras fileiras e reintroduziu, sem perceber, o mesmo problema que motivou a remoção da saudação pessoal: o banner "Recomendado pra você" é personalização explícita logo no topo do conteúdo de uma tela que foi desenhada pra ser um índice neutro.

## What's Working

- Badges de status com data (NOVO/REVISADO/ATUALIZADO + data) — rastreabilidade clínica é decisão de conteúdo certa e específica do domínio.
- Segmented control com contagem embutida ("Guias 1.200") — contexto de escala sem navegação extra.
- Agrupamento por categoria em blocos pequenos e escaneáveis (Curativos, Sinais Vitais, Medicação).

## Priority Issues

**[P0] Três fileiras de filtro empilhadas antes do conteúdo, com sobreposição funcional**
- Why it matters: "Recentes" existe como chip de acesso rápido E como opção de ordenação — o usuário não sabe qual controle realmente filtra o que está vendo.
- Fix: fundir Recentes/Atualizados dentro do controle "Ordenar"; deixar só Favoritos como toggle isolado. Reduz de 4 pra 2 fileiras.
- Suggested command: `$impeccable distill`

**[P0] Foto de stock repetida entre itens da mesma categoria**
- Why it matters: "Curativo com Cobertura Estéril" e "Troca de Curativo em Ferida Cirúrgica" usam a mesma imagem — em conteúdo clínico isso sinaliza "duplicata" e corrói confiança na curadoria do catálogo inteiro.
- Fix: banco de imagem distinto por item, ou ilustração vetorial específica do procedimento (mais barato de escalar que fotografar 1.224 itens únicos).
- Suggested command: `$impeccable craft`

**[P1] "Ver mais 1.219 itens" é paginação ruim**
- Why it matters: expor o total restante desmotiva rolagem e não informa o tamanho do próximo lote; risco de travar a lista se carregar tudo de uma vez.
- Fix: "Carregar mais" sem o total, scroll incremental (~20 por vez) com skeleton loading; reforçar busca como caminho primário para esse volume.
- Suggested command: `$impeccable optimize`

**[P1] Azul sobrecarregado semanticamente**
- Why it matters: a mesma cor significa "chip selecionado", "tipo Guia" e "status Revisado" na mesma tela — cor deixa de funcionar como atalho cognitivo.
- Fix: reservar azul só para seleção/ação; dot de tipo de conteúdo em tom neutro ou só texto.
- Suggested command: `$impeccable colorize`

**[P2] Contraste de headers de seção e datas**
- Why it matters: cinza claro sobre branco em texto pequeno tem risco real de não bater WCAG AA — relevante numa ferramenta usada em plantão noturno/corredor.
- Fix: escurecer para um cinza testado (~#5A5F66) e validar com verificador de contraste.
- Suggested command: `$impeccable audit`

## Persona Red Flags

**Jordan (Iniciante)**: 4 fileiras de controle antes do primeiro resultado; não sabe se "Favoritos" é lista pessoal (vazia, sendo novo) ou filtro de popularidade; ícone de hambúrguer sem rótulo é mais um ponto cego.

**Sam (Acessibilidade)**: headers de seção e datas com contraste duvidoso; distinção Guia/Protocolo depende de um dot de 6-8px — para deuteranopia/protanopia, azul e violeta nessa saturação tendem a se confundir.

**Casey (Móvel distraído)**: segmented control e chip de categoria competem visualmente como "controle escuro/azul no topo"; quick-chips parecem abaixo dos 44pt de alvo de toque recomendados.

## Minor Observations

- "1.224 resultados" repete a soma que o segmented control já mostra (1.200+24) — redundância informacional.
- Chevron "›" em cada linha é redundante com a linha inteira já sendo clicável.
- Ícone de refresh para "Atualizados" conflita semanticamente com pull-to-refresh, padrão comum em listas iOS.

## Questions to Consider

- Se a personalização foi removida do topo por essa ser "uma biblioteca, não uma home", por que "Recomendado pra você" — a forma mais explícita de personalização — está logo no topo do conteúdo?
- Os 3 chips de categoria mostrados são de quantos totais? Se o catálogo tem mais de 5-6 categorias reais, essa fileira precisa ser testada rolando, não só com os exemplos que couberam.
- Quantos toques um enfermeiro dá, partindo desta tela, até achar "aferição de pressão arterial" num plantão real — e esse número é compatível com a urgência do contexto, ou o design está otimizado pra parecer completo, não pra ser rápido?
