# Auditoria de Consistência

Diferente das outras referências desta skill (que cobrem a criação de UM
`knowledge_spec` novo), esta é uma auditoria de integridade que roda
contra a tabela inteira — vale rodar periodicamente, não só na criação de
um registro.

## A query

```sql
select id, titulo, categoria, tipo, status, pipeline_classificacao,
       'tipo!=procedimento sem campos_especificos.definicao' as violacao
from knowledge_specs
where tipo <> 'procedimento' and (campos_especificos is null or campos_especificos->>'definicao' is null)

union all

select id, titulo, categoria, tipo, status, pipeline_classificacao,
       'status=aprovado sem aprovado_por/knowledge_base_id' as violacao
from knowledge_specs
where status = 'aprovado' and (aprovado_por is null or knowledge_base_id is null)

union all

select id, titulo, categoria, tipo, status, pipeline_classificacao,
       'pipeline_classificacao=verde sem nenhuma referencia' as violacao
from knowledge_specs
where pipeline_classificacao = 'verde' and (referencias_oficiais is null or jsonb_array_length(referencias_oficiais) = 0)

union all

select ks.id, ks.titulo, ks.categoria, ks.tipo, ks.status, ks.pipeline_classificacao,
       'referencia cita fragmento_id que nao existe em conhecimento_fragmentos' as violacao
from knowledge_specs ks
cross join lateral jsonb_array_elements(coalesce(ks.referencias_oficiais,'[]'::jsonb)) r
where r->>'fragmento_id' is not null
  and not exists (select 1 from conhecimento_fragmentos f where f.id = (r->>'fragmento_id')::uuid)

union all

select id, titulo, categoria, tipo, status, pipeline_classificacao,
       'categoria diagnostico/resultado com tipo desalinhado' as violacao
from knowledge_specs
where (categoria = 'Diagnósticos de Enfermagem' and tipo <> 'diagnostico_enfermagem')
   or (categoria = 'Resultados de Enfermagem' and tipo <> 'resultado_enfermagem');
```

Rode filtrado por `id` pra auditar só a spec recém-criada (Passo 5 desta
skill), ou sem filtro pra auditar a base inteira periodicamente.

## O que cada regra pega

| Regra | O que significa uma linha aparecer |
|---|---|
| `tipo!=procedimento sem campos_especificos.definicao` | Spec de diagnóstico/resultado sem os campos próprios do tipo — provavelmente foi gravada usando o template errado |
| `status=aprovado sem aprovado_por/knowledge_base_id` | Marcada aprovada sem rastro de quem aprovou, ou sem nunca ter sido de fato publicada — ver achado abaixo |
| `pipeline_classificacao=verde sem nenhuma referencia` | Classificação otimista demais — verde exige pelo menos uma referência real |
| `referencia cita fragmento_id que nao existe` | Alucinação que passou pela verificação de citação (Passo 4) ou foi editada manualmente depois — nunca deveria acontecer se o Passo 4 rodou de verdade |
| `categoria diagnostico/resultado com tipo desalinhado` | Categoria e tipo contam histórias diferentes sobre o que a spec é |

## Achado registrado em 2026-07-11 (não resolvido — decisão do usuário)

Rodando esta query pela primeira vez contra a base inteira: **98/98**
specs `status='aprovado'` têm `knowledge_base_id IS NULL` na própria
linha de `knowledge_specs` (apesar de `knowledge_base.spec_id` apontar de
volta corretamente — o vínculo existe, só não está espelhado nos dois
sentidos), e **86/98** têm `aprovado_por IS NULL`. As 12 que têm
`aprovado_por` preenchido compartilham o **mesmo timestamp exato**
(`2026-07-10 14:21:10.577348+00`) — assinatura de um `UPDATE` em lote,
não de 12 aprovações humanas individuais clicadas em momentos diferentes.

Isso não prova irregularidade — é plausível que os 98 specs originais
sejam conteúdo semente aprovado por um processo anterior à existência
desta skill/pipeline de auditoria (fora do Claude Code). Mas também não
foi confirmado que é isso. **Não tentei corrigir isso** — é uma decisão
de escala e responsabilidade que cabe ao usuário, não a esta skill:
envolve saber a história real dos 98 registros, algo que só quem
gerenciou o produto antes desta sessão consegue confirmar. Reportado,
não resolvido.

## Sobre o script `verificar_citacoes.py`

Esta query complementa, não substitui, `scripts/verificar_citacoes.py`
dentro desta skill (ver `03-anti-alucinacao.md`): o script confere se
UMA citação específica bate com o fragmento real no momento da criação;
esta query confere, depois, se a base inteira continua consistente —
pega problemas que aconteceram fora do fluxo desta skill (edição manual,
migration mal feita, dado legado).
