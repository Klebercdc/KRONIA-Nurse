# Filtro de Licenciamento e Hierarquia de Fontes

## Hierarquia de fontes (não negociável)

- **Camada 1** = COFEN / COREN / ANVISA, e sociedades médicas/de enfermagem
  oficiais (KDIGO, AHA, IDSA, SBC/SBN/SBH, SBOC) → pode virar conteúdo
  ingerível direto.
- **Camada 2** = manuais institucionais recentes (universidades, secretarias
  de saúde, corpos de bombeiros, ministérios) → referência forte, ingerível
  se a licença permitir (ver regra de licença abaixo — "institucional" não
  dispensa a checagem).
- **Camada 3** = manuais acadêmicos comerciais/antigos → só triangulação
  manual, nunca fonte única, **nunca ingerido em `conhecimento_fragmentos`**.

## Regra de licença — sem exceção "uso interno"

**CC BY-NC, CC BY-NC-ND e CC BY-NC-SA são sempre bloqueadas, mesmo para uso
interno não comercial.** KRONIA Nurse ainda não é comercial, mas vai ser —
e o conteúdo ingerido hoje persiste depois dessa transição. Checar a
licença ANTES de usar a fonte, nunca depois. Não existe meio-termo de "pode
citar a estrutura mas não o texto": se a licença é NC, a fonte inteira fica
de fora de `conhecimento_fragmentos` — vira, no máximo, uma referência
Camada 3 pra triangulação manual, nunca texto ingerido/citado literalmente.

Esta regra já custou retrabalho real neste projeto: o Manual de Cuidados
de Enfermagem em Intensivismo (UFCSPA) foi usado por várias specs antes de
alguém notar que era CC BY-NC-ND — teve que ser removido e substituído por
fontes compatíveis (ver "Trigésima quarta rodada" em
`docs/knowledge-base-reconstrucao-status.md`). Checar a licença é sempre o
primeiro passo, não uma reação a um problema encontrado depois.

## Filtro de licenciamento — rodar antes de processar qualquer arquivo novo

**PODE ingerir (texto completo em `conhecimento_fragmentos`):**
- Publicação de sociedade médica/de enfermagem oficial, desde que o próprio
  arquivo não tenha aviso de "rascunho, não compartilhar" ou equivalente.
- Documento de órgão público/governo sem restrição de uso comercial
  explícita.
- Publicação com licença **CC BY** ou **CC BY-SA** explícita (sem a cláusula
  NC). Qualquer licença com "NC" no nome — bloqueada, sem exceção (ver regra
  acima).

**NUNCA ingerir (só consulta manual, tratar como Camada 3):**
- Qualquer licença **CC BY-NC, CC BY-NC-ND ou CC BY-NC-SA** — mesmo de
  instituição Camada 1/2, mesmo achando que "é só uso interno".
- Arquivo com nome/metadado indicando origem pirata (`z-library`, `1lib`,
  `libgen`, "adquirido de revendedor" etc.).
- Livro comercial "todos os direitos reservados" sem CC explícito (Elsevier,
  Wolters Kluwer, Guanabara Koogan/GEN, editoras comerciais em geral) —
  mesmo comprado legitimamente. Comprar dá direito de leitura pessoal, não
  de reprodução em base de dados de produto.
- Documento com aviso explícito de "draft"/"não compartilhar"/"uso restrito
  à revisão" no próprio texto, mesmo que a instituição seja Camada 1.

Se o filtro reprovar um arquivo: **pare**. Não gere fragmentos, não calcule
embedding. Registre em `pontos_criticos` que o arquivo existe e pode ser
usado por um humano para triangulação manual — nunca automatize esse uso.

## Checagem de sobreposição (antes de criar um documento novo)

```sql
-- Duplicata exata por hash (mesmo arquivo re-subido)
select id, nome_arquivo from conhecimento_documentos
where hash_conteudo = '<hash_sha256_do_novo_arquivo>';
```

Se o novo documento tratar do mesmo tema que um já ingerido (mesma diretriz,
versão mais antiga etc.), prefira desativar a versão antiga (`ativo =
false`) em vez de manter as duas — duas cópias do mesmo texto infla
falsamente a triangulação (parece que 2 fontes concordam, mas é a mesma
fonte duas vezes).

## Lista já auditada (sessão de 11/07/2026 — Google Drive do Kleber)

**Aprovados:**
KDIGO-2026-Anemia-in-CKD-Guideline.pdf (KDIGO) · wigginton-et-al-2025
cardiopulmonary (AHA) · JN1580 PTBR Highlights 2025 ECC (AHA) · ciae403.pdf
(IDSA) · Diretriz Hipertensão 2025 (SBC/SBN/SBH) · Manual APH CBMDF ·
Manual Aluno APH Tático (Ministério da Justiça) · Protocolo Cuidados
Paliativos (Atena, **CC BY 4.0** — confirmar a licença exata do arquivo
específico antes de reusar, "Atena" publica com licenças variadas por
título) · Guia Cuidados Paliativos 2025 (SBOC) · Guia Rápido Cuidados
Paliativos (SMS-Rio) · adult_oi.pdf (CDC/NIH/HIVMA).

**Bloqueados — nunca ingerir:**
NIC - Classificação das Intervenções de Enfermagem (z-library) · SAE
Sistematização da Assistência de Enfermagem (z-library) · Enfermagem em
ginecologia e obstetrícia (z-library) · Mosby.pdf (Elsevier) · Manual de
Diálise 5ª Ed. (GEN, cópia de revendedor) · wong.pdf (Elsevier) · Rezende
Obstetrícia Fundamental (GEN) · Brunner & Suddarth 2016 (Wolters Kluwer) ·
Fundamentos de Enfermagem POTTER 9ª Ed. (Elsevier) · opat_epub_finalv3.pdf
(IDSA/CRG, "all rights reserved" explícito) · KDIGO-2026-AKI-AKD-Guideline-
Public-Review-Draft (rascunho, aviso explícito de não compartilhar) ·
**Manual de Cuidados de Enfermagem em Intensivismo (UFCSPA) — CC BY-NC-ND,
removido e substituído numa rodada anterior, ver nota acima** · **Guia
Breve Estomaterapia (Atena) — CC BY-NC-ND** · **Temas em Estomaterapia
(Atena) — CC BY-NC-ND**.

Ao encontrar uma fonte nova que não está nesta lista, classifique-a com o
filtro acima e adicione à lista (aprovada ou bloqueada) para a próxima
sessão não precisar reavaliar do zero. Ao adicionar, **confirme a licença
exata do arquivo** (não do editor em geral — a mesma editora pode publicar
títulos com licenças diferentes).
