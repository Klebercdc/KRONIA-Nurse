# KRONIA NURSE — Constituição de Extração de Conhecimento

> Ditada pelo usuário em 2026-07-10. Substitui a heurística anterior de
> "genre-matching" (só usar um documento se ele tiver capítulos
> Material/Técnica/Cuidados batendo com a Spec). A partir daqui, todo
> enriquecimento manual de `knowledge_specs` segue este documento.

## Princípio fundamental

Nunca comparar a estrutura editorial do documento com a estrutura da
Spec. A Spec é uma **ontologia canônica**. O documento é apenas uma
**fonte de conhecimento**. São conceitos diferentes. A missão é extrair
conhecimento factual, não procurar capítulos idênticos.

## Regras

1. Nunca descartar um documento por não ter capítulos como Material,
   Técnica, Cuidados ou Procedimento. Isso não é critério de descarte.
2. Todo documento é analisado como conjunto de fragmentos:
   Documento → Capítulos → Seções → Parágrafos → Sentenças → Conhecimento.
   Nunca "Documento → Spec" direto.
3. Cada fragmento responde só a uma pergunta: "este trecho contém
   conhecimento clínico reutilizável?" Se sim, extrair. Se não, ignorar
   só aquele trecho — nunca o documento inteiro.
4. Todo conhecimento extraído recebe classificação semântica (Definição,
   Objetivo, Indicação, Contraindicação, Material, Equipamento, EPI,
   Preparação, Execução, Cuidados, Monitorização, Alerta, Complicação,
   Conduta, Registro, Fundamentação científica, Anatomia, Fisiologia,
   Fisiopatologia, Farmacologia, Biossegurança, Comunicação, Avaliação
   clínica, Observação). O documento não precisa ter esses títulos — a
   classificação é responsabilidade de quem extrai.
5. Um trecho pode alimentar vários procedimentos (ex.: "técnica
   asséptica" enriquece Curativo, Punção Venosa, CVC, Punção de FAV,
   Sonda Vesical, Traqueostomia). Não duplicar conhecimento — relacionar.
6. Livro organizado por doença não é descartável — pode enriquecer
   cuidados, complicações, contraindicações, monitorização, avaliação
   clínica, sinais/sintomas, condutas, fundamentação, mesmo sem capítulo
   "Procedimento".
7. Guideline não precisa ensinar a técnica completa — recomendação,
   evidência, contraindicação, alerta, cuidado ou complicação já é
   conhecimento reutilizável.
8. Revisão de literatura não é descartável — fornece fundamentação
   científica, fatores de risco, evidências, complicações, recomendações.
9. Diretriz administrativa não é descartável — fornece equipamentos,
   materiais, requisitos, critérios, normas.
10. Uma Spec não precisa vir de uma única fonte — é construída por
    múltiplas fontes coexistindo (ex.: Definição de A, Materiais de B,
    Execução de C, Complicações de D, Fundamentação de E).
11. Proibido inferir. Também proibido desperdiçar conhecimento factual
    verdadeiro — se não existe campo adequado, marcar como pendente de
    classificação futura em vez de descartar.
12. Toda extração mantém rastreabilidade: documento, capítulo, página,
    trecho, categoria semântica, Spec relacionada, nível de confiança.
13. Área Clínica (categoria/taxonomia) não é conteúdo — é só rótulo.
    Nefrologia não implica Cuidados/Complicações/Execução automáticos;
    são eixos independentes.
14. O objetivo não é preencher campos — é construir a base de
    conhecimento clínico. As Specs são só uma projeção dessa base.

## Constituição de Aproveitamento de Fontes (2026-07-10, addendum)

É proibido descartar uma fonte apenas por não conter um procedimento
passo a passo. Toda fonte responde primeiro "que tipo de conhecimento
ela fornece?", nunca "ela possui Material → Técnica → Cuidados?".

Classificação das fontes:

- **Tipo A — Procedimento Operacional** (POP, manual de procedimentos,
  manual técnico): `materiais`, `equipamentos`, `preparacao`,
  `execucao_passos`, `cuidados`, `registro`.
- **Tipo B — Diretriz Clínica** (KDIGO, AHA, ESC, IDSA, WHO, Ministério
  da Saúde): `indicacoes`, `contraindicacoes`, critérios clínicos,
  classificação, monitorização, fatores de risco, `complicacoes`,
  `condutas`, recomendações, níveis de evidência — mesmo sem ensinar o
  passo a passo.
- **Tipo C — Livro de Doença** (Brunner, Harrison, tratados):
  fisiopatologia, `complicacoes`, sinais, sintomas, monitorização,
  raciocínio clínico.
- **Tipo D — Revisão Científica**: evidências, comparação entre
  técnicas, benefícios, riscos, limitações → `fundamentacao_cientifica`.
- **Tipo E — Norma**: requisitos, biossegurança, legislação,
  responsabilidades → `epis`, `materiais`/`equipamentos`, `alertas`.

Regra absoluta: nenhuma fonte é descartada por não ter técnica
operacional — ela só pertence a outro tipo documental. Cada tipo
enriquece partes diferentes da base, não as mesmas.

## Regra de licença (2026-07-11, addendum)

Toda fonte precisa ter a licença checada ANTES de virar conteúdo em
`knowledge_specs`/`knowledge_base` — não depois. KRONIA Nurse ainda não
é comercial, mas vai virar; conteúdo entra no banco e continua lá
depois da virada, então "não é comercial ainda" não é motivo pra usar
fonte `NC` (NonCommercial). Regra prática:

- **CC BY** (ou domínio público): livre pra usar.
- **CC BY-NC / CC BY-NC-SA**: NÃO usar, mesmo em fase não-comercial —
  o conteúdo sobrevive à virada e teria que ser identificado e
  removido depois, o que é retrabalho e risco de esquecer alguma linha.
- Rascunho não publicado (ver caso KDIGO 2026 acima) é categoria
  separada — não é problema de licença, é uso fora do escopo que o
  próprio autor autorizou; mesmo tratamento: reportar antes de usar.
- Quando duas edições da mesma obra têm licença diferente (ex.:
  OpenStax Anatomy and Physiology 1ª ed. é CC BY; a 2ª ed. é
  CC BY-NC-SA), preferir a edição com licença mais permissiva mesmo
  que mais antiga.

## Regra mestra

Nunca perguntar "este livro tem um capítulo igual à minha Spec?".
Sempre perguntar "quais conhecimentos clínicos factuais este documento
contém?" e depois "em quais Specs esses conhecimentos podem enriquecer
algum campo?".

## Aplicação prática nesta sessão

Ver `docs/knowledge-base-reconstrucao-status.md` § "Enriquecimento por
fragmento (Constituição de Extração)" para o registro de cada
aplicação: fonte, trecho usado, Spec(s) enriquecida(s), campos tocados.
