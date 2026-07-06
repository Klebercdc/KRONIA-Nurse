---
target: mockups/biblioteca/v5_filtro_real.html
total_score: 21
p0_count: 1
p1_count: 4
timestamp: 2026-07-06T00-42-59Z
slug: mockups-biblioteca-v5-filtro-real-html
---
Method: dual-agent (A: sub-agente isolado, leitura sem contexto prévio · B: `detect.mjs` + renderização real via Chromium headless para evidência visual/contraste)

## Design Health Score — 21/40 (Aceitável, no limite inferior — mesma faixa da v3)

| # | Heurística | Nota | Problema-chave |
|---|---|---|---|
| 1 | Visibilidade do status | 2 | Contagens (1.200/1.198/24/23) parecem confiáveis mas não reconciliam quando o card "Mais acessado" entra na conta do segmento Guias |
| 2 | Mundo real | 3 | Placeholder de busca ("procedimentos, protocolos") não bate com os rótulos reais do segmentado ("Guias"/"Protocolos") |
| 3 | Controle e liberdade | 2 | Sem "limpar filtros"; ícone de filtro na busca sem rótulo nem estado visível |
| 4 | Consistência | 2 | Card em destaque só existe na aba Guias (Protocolos não tem); mesma categoria aparece como "Sinais V" numa aba e "Sinais Vitais" na outra |
| 5 | Prevenção de erros | 2 | Tela de baixo risco, nada a prevenir — mas também nada demonstrado; nota neutra |
| 6 | Reconhecimento vs. memorização | 3 | Favoritos e Ordenar têm rótulo; ícone de filtro na busca quebra esse padrão ao não ter nenhum |
| 7 | Flexibilidade/eficiência | 2 | "Carregar mais" revela poucos itens por vez contra um total de 1.200+; sem atalho de navegação rápida além de busca/chips |
| 8 | Estética minimalista | 2 | Visual geral limpo, mas 4 exibições numéricas redundantes da escala do catálogo + card promocional desproporcional quebram o ritmo |
| 9 | Recuperação de erros | 1 | Nenhum estado de erro/vazio demonstrado (o próprio texto da v5 admite essa limitação do mockup estático) |
| 10 | Ajuda e documentação | 1 | Nenhuma affordance de ajuda; nada explica a diferença entre "Guia" e "Protocolo" |

## Anti-Patterns Verdict

**LLM (Assessment A)**: Não é "óbvio que IA fez" no sentido genérico (gradiente, emoji) — paleta contida, tipografia consistente, convenções de app real. Mas dois pontos fariam um usuário fluente em ferramentas boas (Linear/Notion) hesitar: (1) o card "Mais acessado esta semana" é um módulo de merchandising de app de conteúdo/e-commerce transplantado pra um índice que deveria ser neutro — o mesmo instinto do "recomendado pra você" que a v3 já reprovou, só que rebatizado de popularidade; (2) a tela **performa** precisão (contagens exatas) sem **ser** precisa — o card quebra a conta que a própria v5 diz ter corrigido.

**Detector determinístico (Assessment B)**: `detect.mjs --json` contra o arquivo real retornou `[]` (exit 0) — limpo. Ressalva importante: para um caminho de arquivo local, o detector roteia pro engine **HTML estático**, não pro engine de navegador/Puppeteer que faz o check completo de contraste. Ou seja, o "limpo" aqui é uma **lacuna de cobertura**, não evidência de qualidade — B renderizou o arquivo de verdade num Chromium headless e, calculando à mão a partir dos hex do `:root`, encontrou falhas reais de contraste que o scanner estático não pega (detalhes abaixo). Nenhum falso positivo a invalidar, já que não houve achado algum do CLI.

## Overall Impression

A v5 corrigiu de verdade o P0 mais grave da v3 (segmentado decorativo) — as duas colunas renderizadas mostram estados coerentes e a aritmética bate para a aba Protocolos. Mas a correção não se sustenta sob um teste mais rigoroso: assim que o card de destaque entra na conta da aba Guias, a mesma "matemática que prova que o filtro é real" para de fechar — 1.200 − 1.198 = 2 (os 2 itens da lista), mas o card em destaque também é um Guia e não está sendo contado. É o mesmo tipo de falha reaparecendo em outra camada, não um problema novo. Fora isso, dois achados sobrevivem quase intactos da v3: a "foto de stock" (agora sem duplicata literal, mas com imagens que não retratam o procedimento certo) e o "Ver mais 1.219 itens" (agora "1.198 itens restantes", mesma ansiedade de escala reformulada). E dois achados novos e sérios não tinham aparecido antes: zero estados de foco e zero rótulos ARIA no arquivo inteiro (bloqueio total pra usuário de teclado/leitor de tela), e a mesma categoria clínica escrita de duas formas diferentes entre as abas — achado que as duas avaliações encontraram de forma independente.

## What's Working

- **Badges de status carregam cor E texto** (NOVO/REVISADO/ATUALIZADO), não só cor — correção real e verificável do gap de daltonismo que a crítica v3 apontou (o dot azul/violeta virou rótulo de texto puro).
- **A aritmética do segmentado fecha para o caso simples**: Guias (1.200) + Protocolos (24) = 1.224 do cabeçalho; na aba Protocolos, 24 − 1 exibido = 23 restantes, exato. É filtro demonstrável, não decorativo — pelo menos quando não há card de destaque na conta.
- **"Favoritos" ganhou rótulo de texto** ao lado do ícone, corrigindo uma affordance icon-only que teria falhado para um usuário iniciante ou dependente de leitor de tela.

## Priority Issues

**[P0] Zero estado de foco e zero rótulo ARIA no arquivo inteiro**
- Why it matters: busca no `<style>` inteiro não encontra nenhuma regra `:focus`; busca no HTML inteiro não encontra nenhum atributo `aria-*` ou `role`. Pra quem navega só por teclado ou leitor de tela — cenário real de acessibilidade que o PRODUCT.md exige como piso (WCAG AA) — isso não é uma limitação menor, é bloqueio total da tarefa principal: não há indicação visual de onde o foco está, e o ícone de filtro e o FAB "+" são SVGs sem nome algum para um leitor de tela anunciar.
- Fix: adicionar `:focus-visible` com contorno visível em todo elemento interativo; adicionar `aria-label` em todo ícone sem texto (filtro de busca, FAB, chevrons); garantir que o segmentado e os chips comuniquem `aria-pressed`/`aria-selected`.
- Suggested command: `$impeccable harden`

**[P1] O card em destaque quebra a mesma matemática que a v5 diz ter corrigido**
- Why it matters: "1.200 resultados" e "1.198 itens restantes" só fecham se apenas os 2 itens da lista simples contarem — mas o card "Mais acessado" também é um Guia e está sendo exibido acima deles. Se ele conta para os 1.200, o restante correto é 1.197, não 1.198. É o mesmo gênero de bug que motivou toda esta rodada de revisão (contagem que não reflete o que está na tela), só que reapareceu numa camada que a v5 não testou.
- Fix: decidir um modelo e ser consistente com ele — ou o card conta como um dos 1.200 e o "restantes" reflete isso, ou ele é explicitamente destacado/fixado fora da lista contada (e isso fica dito na UI).
- Suggested command: `$impeccable harden`

**[P1] "Mais acessado esta semana" reintroduz o anti-padrão que o próprio PRODUCT.md já nomeou**
- Why it matters: PRODUCT.md cita explicitamente "recomendado pra você" (achado da v3) como personalização disfarçada de curadoria a evitar numa tela de índice neutro. "Mais acessado" é o mesmo instinto — editorializar um catálogo — com outro rótulo. Numa ferramenta de referência clínica, "mais acessado" não é "mais correto para este paciente agora"; destacá-lo por popularidade arrisca empurrar a enfermeira pro procedimento familiar em vez do relevante ao caso real, exatamente onde precisão deveria pesar mais que engajamento.
- Fix: remover o enquadramento de "trending" algorítmico do índice neutro. Se um item fixado/destacado é útil de verdade, torná-lo controlado pela usuária (ligado ao mecanismo de Favoritos que ela já possui), não decidido pelo sistema.
- Suggested command: `$impeccable audit`

**[P1] Falhas reais de contraste WCAG AA em rótulos de categoria, ordenação e nos 3 badges de status**
- Why it matters: medido a partir dos hex literais do `:root` contra um render real (Chromium headless): `--ink-faint` (#7d8aa0) sobre branco = 3.50:1; sobre o fundo = 3.09:1; "Recentes" em negrito 12px = 4.01:1; badge `novo` = 3.64:1; `revisado` = 3.24:1; `atualizado` = **2.98:1** (o pior — visivelmente lavado no screenshot). Todos abaixo do piso de 4,5:1 que o próprio PRODUCT.md define, e justamente no cenário que ele nomeia explicitamente (plantão noturno, corredor com luz ruim). O detector estático não pegou nada disso porque roteia para o engine sem verificação de contraste em arquivo local — achado que só apareceu com renderização real.
- Fix: escurecer `--ink-faint` para algo como #5A5F66 (mesma sugestão já feita na crítica v3, ainda não aplicada); aumentar peso/tamanho ou escurecer `--accent` no rótulo de ordenação; escurecer as cores de texto dos 3 badges de status mantendo os tons de fundo suaves.
- Suggested command: `$impeccable audit`

**[P2] Mesma categoria clínica escrita de duas formas diferentes entre as abas**
- Why it matters: a aba Guias mostra o chip "Sinais V"; a aba Protocolos mostra a mesma categoria por extenso, "Sinais Vitais". As duas avaliações (A e B) chegaram a este achado de forma independente — sinal forte de que é um defeito real, não ruído. Sob pressão de tempo, uma abreviação ambígua força meio segundo de "o que significa esse V", exatamente o tipo de fricção que os Princípios de Design do produto pedem para eliminar.
- Fix: usar "Sinais Vitais" por extenso nas duas abas. Se o problema é largura do chip, resolver com menos chips visíveis + affordance explícita "+N mais", não truncando terminologia clínica silenciosamente.
- Suggested command: `$impeccable clarify`

**[P2] Alvos de toque abaixo de 44px em quase todos os controles**
- Why it matters: as duas avaliações mediram de forma independente e convergente — chips (~26-29px), segmentado (~33px), favtoggle (~26-27px), carregar-mais (~37px), itens de navegação (~33px) — todos abaixo do mínimo de 44×44pt que o próprio PRODUCT.md pede considerando "uso apressado, possivelmente com luvas". Só o FAB circular (42×42) chega perto.
- Fix: aumentar padding vertical dos chips e do segmentado para atingir 44px de área de toque, mesmo mantendo a altura visual atual via padding invisível maior.
- Suggested command: `$impeccable adapt`

## Persona Red Flags

**Sam (Acessibilidade)**: zero estilos de `:focus` em toda a folha de estilo e zero atributos `aria-*`/`role` no HTML inteiro — bloqueio total, não parcial, pra navegação só-teclado ou leitor de tela. Badges de status em 9,3px com fundo pastel (`--novo-soft #e3f2e9`, `--atualizado-soft #faecd7`) e texto que mede de 2,98:1 a 4,01:1 de contraste — falha WCAG AA real e verificada, não hipotética, justamente no cenário de plantão noturno que o PRODUCT.md nomeia.

**Casey (Móvel distraído)**: controles críticos (busca, segmentado, ordenar, favoritos) ocupam o terço superior de uma tela de 360px — alcance de polegar ruim em uso de uma mão só; a zona inferior alcançável tem só a navbar. Alvos de toque de ~26-29px ficam bem abaixo do recomendado. Paginação é por toque ("Carregar mais") sem persistência de posição de rolagem visível — se Casey for interrompida e voltar, não há indicação do que já viu.

**Jordan (Iniciante)**: o ícone de filtro na busca não tem rótulo nem estado visível — Jordan não sabe o que ele faz de diferente dos chips de categoria logo abaixo (duas UIs de filtro sem relação explicada). "Mais acessado esta semana" não indica proveniência — é escolha editorial, histórico pessoal, ou contagem literal de cliques? Nada na tela diz. A separação Guias/Protocolos não vem com nenhuma explicação do que de fato diferencia os dois tipos de conteúdo.

## Minor Observations

- **Fotos de item ainda não retratam o procedimento certo** (residual da v3): a duplicata literal de foto foi corrigida (as 3 imagens de lista são agora distintas por hash), mas "Curativo com Cobertura Estéril" mostra uma mão enluvada escrevendo com caneta — não um curativo; "Avaliação de Sinais Vitais" mostra um torniquete/faixa, não um manguito ou termômetro. Fixar a duplicata sem fixar a relevância troca um problema de confiança ("essa foto é repetida") por outro ("essa foto não é disso") — mesmo risco de credibilidade da curadoria clínica que a v3 já apontava.
- **"Carregar mais" ainda expõe o total restante** (residual da v3, P1 não endereçado): "1.199 itens restantes" da v3 virou "1.198 itens restantes" na v5 — mesma reformulação de ansiedade de escala, sugestão de remover o número ainda não aplicada.
- Placeholder de busca ("Buscar procedimentos, protocolos…") usa vocabulário que não bate com os rótulos reais do segmentado.
- Azul de acento carrega três papéis diferentes na mesma tela (destino ativo na navbar, ação primária do FAB, gatilho do "Ordenar") — cada papel deveria ter um único significado por tela, por princípio do próprio PRODUCT.md.
- FAB "+" é o único item da navbar sem rótulo de texto, quebrando a consistência ícone+texto dos outros quatro destinos.

## Questions to Consider

- Se a rodada toda foi motivada por provar que o filtro é "demonstrável, não decorativo", por que o card de destaque — que também é um Guia — ficou de fora da própria conta que prova isso?
- O que essa tela pareceria se o princípio "neutralidade em telas de índice" fosse levado ao pé da letra — sem card de destaque, sem "mais acessado", só lista, busca e filtros? Alguma coisa real se perderia?
- Já existe "Favoritos" controlado pela própria enfermeira — há algum argumento real pra uma segunda camada de curadoria decidida pelo sistema ("mais acessado") na mesma tela, ou uma é suficiente?
- Se corrigir a duplicata literal de foto foi tratado como "resolvido" na v4, o que isso revela sobre como o processo está definindo "corrigido" — pelo sintoma exato apontado, ou pelo problema de fundo (credibilidade da imagem clínica)?
