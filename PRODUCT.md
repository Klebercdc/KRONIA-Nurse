# Product

## Register

product

## Users

Enfermeiros e equipe de enfermagem em contexto assistencial real: plantão, corredor, à beira-leito. Uso apressado, muitas vezes sob pressão de tempo ou em ambiente com luz ruim (plantão noturno). A tarefa recorrente é consultar procedimentos e protocolos padronizados durante o cuidado, ou documentar/estruturar dados clínicos com apoio de IA.

## Product Purpose

KRONIA-Nurse é uma Plataforma de Conhecimento Clínico, não uma biblioteca de documentos. O produto padroniza a coleta de dados clínicos, gera documentação assistencial e apoia a tomada de decisão via IA (RAG sobre PDFs oficiais ANVISA/COFEN/COREN/Ministério da Saúde), mas a experiência nunca deve expor essa origem documental ao usuário: o que ele navega é conhecimento estruturado (objetos de conhecimento com resumo, indicações, passo a passo, alertas, evidências e relações entre si), nunca arquivos ou PDFs. Sucesso é reduzir o número de toques e o tempo até encontrar o conhecimento certo durante o plantão, e produzir documentação clínica confiável e consistente. Ver `docs/knowledge-center-architecture.md` para a especificação completa da mentalidade Knowledge Center (objetos de conhecimento, categorias, relacionamentos, métricas da home).

## Brand Personality

Acolhedor e humano — tom mais caloroso apesar do contexto clínico, para reduzir a ansiedade de quem usa a ferramenta sob pressão, sem abrir mão de precisão e credibilidade clínica.

## Anti-references

Prontuário eletrônico (EHR) burocrático genérico — telas densas, formulários cinzas, sem hierarquia visual, "software de hospital dos anos 2000". Evitar também padrões de app de e-commerce/consumo aplicados sem adaptação ao contexto clínico (chips de categoria estilo loja, personalização explícita tipo "recomendado pra você" em telas que deveriam ser índices neutros — achado já identificado na crítica da Biblioteca v3). Zero aparência de biblioteca digital, leitor de PDFs ou repositório acadêmico de arquivos — nunca usar linguagem ou IA de "Guias/PDFs/Arquivos/Downloads/Documentos" como estrutura de navegação (ver `docs/knowledge-center-architecture.md`).

## Design Principles

- Velocidade sob pressão: cada tela deve minimizar toques até a informação clínica relevante, assumindo plantão e pressa.
- Confiança clínica antes de estética: rastreabilidade (datas, status de revisão), badges e fontes de conteúdo pesam mais que polimento visual.
- Calor sem infantilizar: tom acolhedor no texto e nas transições, mas sem elementos lúdicos ou de gamificação típicos de apps de consumo.
- Neutralidade em telas de índice: listas e bibliotecas são catálogos neutros — sem personalização disfarçada de curadoria (ex.: "recomendado pra você").
- Cor com significado único: cada cor carrega um só significado por tela (seleção, tipo de conteúdo ou status, nunca os três ao mesmo tempo).
- Conhecimento, não documento: na dúvida entre mostrar um documento/PDF ou mostrar conhecimento estruturado, sempre escolher conhecimento. A navegação principal reflete como um enfermeiro pensa (procedimentos, protocolos, medicamentos, exames, áreas clínicas), nunca como os arquivos estão organizados no backend.

## Accessibility & Inclusion

WCAG AA como piso, com contraste testado para uso em plantão noturno e corredores com luz ruim (não confiar no cinza-claro "elegante" padrão). Alvos de toque generosos (uso apressado, possivelmente com luvas). Não codificar status ou tipo de conteúdo somente por cor — considerar daltonismo (protanopia/deuteranopia), ponto já levantado na crítica da Biblioteca v3 quanto ao dot azul/violeta de Guia vs. Protocolo.
