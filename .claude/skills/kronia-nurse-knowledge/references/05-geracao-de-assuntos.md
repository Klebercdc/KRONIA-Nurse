# Geração de Assuntos por Área da Taxonomia

Esta skill não espera só o usuário mandar um assunto de cada vez — ela pode
gerar o backlog de assuntos a cobrir, área por área, dentro das 36
categorias cadastradas.

## Passo 1 — Ver o que já existe (nunca sugerir do zero sem checar)

```sql
select categoria, count(*) as total,
       count(*) filter (where status = 'aprovado') as aprovados,
       count(*) filter (where status = 'rascunho') as rascunhos
from knowledge_specs
group by categoria
order by total asc; -- áreas com menos registros aparecem primeiro
```

Áreas com `total = 0` ou muito baixo são as lacunas prioritárias — não faz
sentido sugerir o 5º assunto de "Hemodiálise" enquanto "Trauma" está vazio,
a menos que o usuário peça especificamente para aprofundar uma área.

## Passo 2 — Gerar candidatos por área

Para a área escolhida, gere de 5 a 10 assuntos candidatos cruzando três
critérios (não invente um assunto sem apoiar em pelo menos um destes):

1. **Escopo normativo da categoria** — o que COFEN/COREN/ANVISA definem
   como prática dentro dessa área (ex.: para "Acesso Vascular": punção de
   FAV, cateter venoso central, PICC, cateter de duplo lúmen).
2. **Cobertura das fontes já aprovadas** (`01-licenciamento-e-fontes.md`) —
   rode uma busca ampla (`ilike` pelo nome da categoria e sinônimos) nos
   fragmentos já ingeridos e veja quais temas aparecem com mais fragmentos
   disponíveis — isso indica que dá para triangular sem esbarrar em fonte
   única. Não presuma que uma categoria "não tem fonte" sem rodar essa
   busca — nomes de arquivo/categoria enganam.
3. **Trio NANDA/NIC/NOC quando aplicável** — para "Diagnósticos de
   Enfermagem", "Intervenções de Enfermagem" e "Resultados de Enfermagem",
   prefira gerar o trio junto para o mesmo problema clínico (ex.: "Volume
   de Líquidos Excessivo" → diagnóstico + intervenção "Controle Hídrico" +
   resultado "Equilíbrio Hídrico"), porque os três se validam mutuamente.

## Passo 3 — Formato do backlog

Apresente como tabela, não como lista corrida — mais fácil do usuário
aprovar em lote:

| Categoria | Assunto candidato | Fontes já disponíveis? | Prioridade |
|---|---|---|---|
| Acesso Vascular | Punção de FAV — técnica de botoeira | Sim (COREN-BA, J Bras Nefrol) | Alta — já em revisão |
| Trauma | Avaliação primária (ABCDE) no trauma | A confirmar | Alta — área sem nenhum registro |
| Hemodiálise | Cateter de duplo lúmen — cuidados de curativo | A confirmar | Média |

"Fontes já disponíveis?" vem do Passo 2 — se nenhuma fonte aprovada cobre o
tema, sinalize antes de gastar uma rodada inteira da skill sem triangulação
possível.

## Passo 4 — Confirmar com o usuário antes de rodar em lote

Gerar o backlog é rápido; rodar a skill inteira (busca → triangulação →
verificação → gravação) para cada assunto do backlog é o trabalho pesado.
Sempre mostre o backlog primeiro e espere o usuário escolher quais
assuntos processar nesta rodada — não rode as 36 áreas de uma vez sem
confirmação, mesmo que pareça mais eficiente.
