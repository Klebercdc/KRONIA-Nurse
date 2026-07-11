# Gravação em knowledge_specs

## Regras de status

- `status = 'rascunho'` sempre, ao final desta skill.
- **Nunca** `'aprovado'` — mesmo se o usuário pedir explicitamente. Aprovação
  é sempre uma ação humana separada, feita por um enfermeiro validando
  contra a fonte oficial, através de `pages/api/knowledge-spec/aprovar.ts`
  (ver limite explícito no SKILL.md principal).
- `pipeline_classificacao`:
  - `'verde'` só se triangulação completa (Camada 1 sozinha, ou 2+ fontes
    Camada 2/3 concordando) e verificação de citação 100% aprovada.
  - `'amarelo'` se houve conflito entre fontes, triangulação parcial, ou a
    verificação de citação reprovou parte (mas não todas) as referências.
  - `'vermelho'` se a verificação de citação reprovou a única base de uma
    afirmação central, ou se não há nenhuma fonte Camada 1/2 confiável.

## Categoria (36 áreas cadastradas — usar exatamente estes valores)

Fundamentos de Enfermagem · Administração de Medicamentos · Acesso Vascular
· Terapia Intravenosa · Feridas e Curativos · Sondas e Drenos ·
Oxigenoterapia · Ventilação Mecânica · Hemodinâmica · Centro Cirúrgico · CME
· UTI Adulto · Pediatria · Neonatologia · Obstetrícia · Emergência · Trauma
· Oncologia · Saúde Mental · Cuidados Paliativos · Infectologia · Controle
de Infecção · Hemoterapia · Hemodiálise · Exames Laboratoriais ·
Monitorização · Equipamentos · Escalas Clínicas · Diagnósticos de
Enfermagem · Intervenções de Enfermagem · Resultados de Enfermagem ·
Protocolos Institucionais · POPs · Diretrizes Clínicas · Legislação ·
Educação Permanente

Use exatamente um destes valores em `categoria` — a constraint
`categoria_taxonomia_v2` rejeita qualquer outro texto.

**Educação Permanente**: mesmo constando na constraint do banco, esta
categoria foi explicitamente removida do escopo do produto em
`context/kits/knowledge-engine-tipos-objeto.md` (item 14). Não crie spec
nessa categoria sem confirmar com o usuário se essa decisão mudou.

## Campo `tipo`

`knowledge_specs.tipo` aceita três valores desde a migration
`20260712_resultado_enfermagem_tipo`: `'procedimento'`,
`'diagnostico_enfermagem'` (NANDA-I) e `'resultado_enfermagem'` (NOC). Use
o valor correto — não force tudo em `'procedimento'`. Campos próprios de
`diagnostico_enfermagem`/`resultado_enfermagem` vão em `campos_especificos`
(jsonb) — ver `CamposEspecificosDiagnostico`/`CamposEspecificosResultado`
em `lib/knowledge-spec.ts`. Intervenções (NIC) ainda não têm tipo próprio —
ficam como `'procedimento'` até essa extensão de schema ser feita (ver
`context/kits/knowledge-engine-tipos-objeto.md` item 5).

## Campos obrigatórios de saída

`pipeline_resultado` (jsonb) deve resumir o que a verificação de citação fez:
quantas referências passaram, quantas foram descartadas e por quê — isso é
o que permite auditar o registro sem reler o rascunho inteiro.

## Saída esperada da skill ao final de uma rodada

1. Quantos fragmentos únicos foram usados na busca.
2. Quantas citações passaram na verificação mecânica vs. quantas foram
   descartadas.
3. `pipeline_classificacao` final e a justificativa.
4. Lista de `pontos_criticos` pendentes de validação humana.
5. Confirmação via SQL direto no Supabase de que o registro gravado bate
   com o que foi reportado — não confiar só na memória da sessão.
