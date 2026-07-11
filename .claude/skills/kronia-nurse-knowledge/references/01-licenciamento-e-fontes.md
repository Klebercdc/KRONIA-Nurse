# Filtro de Licenciamento e Hierarquia de Fontes

## Fonte única de verdade — não duplicar

A regra de licença em si (o quê pode/não pode ser usado, e por quê) vive
em **`docs/constituicao-extracao-conhecimento.md` § Regra de licença** —
leia ela, não esta seção. O achado por-fonte (qual PDF específico já foi
checado, aprovado ou bloqueado, com a evidência da licença) vive em
**`.claude/skills/kronia-nurse-document-ingestion/SKILL.md`** (Step 2d a
2g, e a tabela do Step 3) — consulte ali antes de processar um PDF novo
ou de decidir se uma fonte já indexada pode ser citada.

Esta skill (`kronia-nurse-knowledge`) manteve uma cópia própria dessa
lista até 2026-07-11. Foi removida de propósito: duas listas do mesmo
fato divergem cedo ou tarde — foi exatamente assim que os 2 guias da
Atena Editora (CC BY-NC-ND) ficaram sem a flag `excluido_licenca` por
uma rodada inteira, citados por 2 specs já publicadas, até alguém
comparar as duas listas e notar a inconsistência. Uma fonte só, referenciada
duas vezes, não pode divergir dela mesma.

## Backstop mecânico (não é só prosa)

Desde a migration `20260712_licenca_conhecimento_documentos`,
`conhecimento_documentos.licenca` tem um CHECK constraint em formato
allowlist — só aceita `'CC BY 4.0'`, `'CC BY-SA 4.0'`, `'CC0 1.0'`,
`'Domínio Público'`, `'Governamental sem restrição'` ou
`'Institucional sem restrição'` (ou `NULL`, pra fonte ainda não
classificada). Qualquer tentativa de gravar uma licença fora dessa
lista — incluindo qualquer variante `CC BY-NC*` — é **rejeitada pelo
banco**, não só desencorajada por uma instrução. Testado nesta sessão:
`INSERT ... licenca = 'CC BY-NC-ND 4.0'` falha com `check_violation`.

`NULL` não significa "aprovado" — significa "ninguém classificou ainda".
Documentos já indexados antes desta coluna existir continuam `NULL` de
propósito (não foi feito backfill em massa sem checar cada um
individualmente — isso seria inventar fato, o mesmo erro que esta regra
existe pra evitar). `d.ativo = true` (ver `02-busca-e-triangulacao.md`)
continua sendo o filtro operacional pra busca; `licenca` é o registro
formal de por quê uma fonte pode ou não ser usada, com peso de banco.

`scripts/rag-pipeline.js`: a flag `excluido_licenca: true` em
`PDF_METADATA` agora é **de fato respeitada** em `processPDF()` — antes
existia só como comentário/documentação e não impedia nada no código
(esse era exatamente o bug que deixou os 2 guias da Atena passarem).

## Hierarquia de fontes (contexto pra triangulação nesta skill)

- **Camada 1** = COFEN / COREN / ANVISA / Ministério da Saúde, e
  sociedades médicas/de enfermagem oficiais (KDIGO, AHA, IDSA, SBC/SBN/
  SBH, SBOC) → pode virar conteúdo ingerível direto, uma fonte Camada 1
  sozinha basta pra triangulação (ver `02-busca-e-triangulacao.md`).
- **Camada 2** = manuais institucionais recentes (universidades,
  secretarias de saúde, corpos de bombeiros, conselhos regionais) →
  referência forte, mas precisa de uma segunda fonte concordando.
- **Camada 3** = manuais acadêmicos comerciais/antigos → só
  triangulação manual, nunca fonte única, nunca ingerido em
  `conhecimento_fragmentos`.

Esta camada é conceito específico de como `knowledge_specs` triangula
afirmações — não confundir com `licenca` (que é sobre se o texto pode
ser reproduzido, não sobre quão autoritativa a fonte é; uma fonte Camada
1 com licença NC continua bloqueada, licença não é negociável por
autoridade da instituição).

## Checagem de sobreposição (antes de criar um documento novo)

```sql
-- Duplicata exata por hash (mesmo arquivo re-subido)
select id, nome_arquivo from conhecimento_documentos
where hash_conteudo = '<hash_sha256_do_novo_arquivo>';
```

Se o novo documento tratar do mesmo tema que um já ingerido (mesma
diretriz, versão mais antiga etc.), prefira desativar a versão antiga
(`ativo = false`) em vez de manter as duas — duas cópias do mesmo texto
infla falsamente a triangulação (parece que 2 fontes concordam, mas é a
mesma fonte duas vezes).
