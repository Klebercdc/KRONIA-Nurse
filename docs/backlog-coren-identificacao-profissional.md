# Backlog — Identificação profissional (nome completo + COREN) no registro

**Status:** aberto, não implementado.
**Natureza:** compliance, não cosmético.
**Origem:** PASSO 4 do brief da tela "Evoluir"; separado do escopo daquela tela.

---

## Problema

O texto gerado precisa identificar quem registrou. Hoje o sistema **não tem o
dado**: o COREN não é coletado, não é armazenado e não é exibido em lugar
nenhum do projeto.

| Onde | Situação atual |
|---|---|
| `contexts/AuthContext.tsx:52` | `user_metadata` = `{ nome, perfil }` — sem COREN |
| `pages/cadastro.tsx` | não pede COREN |
| `pages/perfil.tsx` | linha "Dados pessoais" existe, valor fixo **"Em breve"** |
| `supabase/migrations/` | 16 migrations, nenhuma tabela de perfil |

## Por que é compliance

Corpus KRONOS, COFEN — *Registros de Enfermagem no Exercício da Profissão*,
p.59, sobre o que o enfermeiro deve registrar no prontuário:

> "A data, a hora, o tempo de internação, o diagnóstico de enfermagem, **a
> assinatura e carimbo contendo a categoria do profissional e o número do
> Coren de sua jurisdição**"

E, por procedimento (§9.21, cuidado com estomas):

> "Nome completo e Coren do responsável pelo procedimento."

A mesma fonte (p.14) registra as siglas de categoria previstas: `ENF`
(enfermeiro), `OBST` (obstetriz), `TE` (técnico), `AE` (auxiliar), `PAR`
(parteira) — o campo de categoria deve usar essa lista, não texto livre.

## Escopo quando for priorizado

1. **Coleta** — campo COREN em `pages/cadastro.tsx` (número + UF de
   jurisdição + categoria profissional).
2. **Persistência** — `user_metadata` ou tabela `perfis` dedicada. Definir
   qual: `user_metadata` é mais barato; tabela permite RLS e auditoria.
3. **Exibição** — substituir o "Em breve" da linha "Dados pessoais" em
   `pages/perfil.tsx`; permitir edição.
4. **Injeção no documento** — passar nome completo, categoria e COREN para os
   dois motores de geração.

## Cuidado ao injetar no prompt

Os dois motores hoje usam **marcador**, não dado real, e isso é proposital:

- `lib/prompts.ts:22` — "Documento estruturado a partir dos registros do
  enfermeiro — revisar e assinar (COREN) antes de inserir no prontuário
  oficial."
- `lib/evolucao/generate-evolucao.ts` — assinatura
  `"Enfermeiro(a) Responsável — [data/hora]"`, com regra explícita de
  **nunca inventar data ou horário**.

Ao injetar o dado real, ele deve entrar **montado em código**, concatenado ao
texto que a IA devolve — **nunca como instrução para a IA preencher**. Se o
COREN virar texto no prompt, o modelo pode reproduzi-lo errado, truncado ou
alucinado, e o dado é de identificação profissional legal.

Data e hora seguem a mesma regra: vêm do cliente, não do modelo.

## Não muda com esta feature

O Kronia Nurse **não** é prontuário eletrônico. Mesmo com nome e COREN no
texto, o documento continua sendo apoio à redação — o usuário copia para o
prontuário oficial da instituição e assina lá. Nenhuma copy pode passar a
sugerir "documento assinado" ou "registro oficial salvo".
