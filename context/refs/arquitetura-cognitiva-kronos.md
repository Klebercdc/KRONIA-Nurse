# Referência — Arquitetura Cognitiva do KRONIA Nurse (fonte original)

> Material-fonte bruto (`context/refs/`, convenção Cavekit). Não editar o
> conteúdo abaixo — é a especificação como o usuário a escreveu. As versões
> processadas/estruturadas ficam em:
> - `context/kits/kronos-arquitetura-cognitiva.md` (os 9 engines)
> - `context/kits/knowledge-engine-tipos-objeto.md` (detalhamento do Knowledge Engine)

---

## Princípio Fundamental

O KRONOS não é uma IA que "conhece enfermagem".

O KRONOS é um Sistema Operacional Cognitivo para Enfermagem.

Seu papel é orquestrar conhecimento estruturado, validar informações, executar fluxos e apresentar respostas fundamentadas.

Nenhuma camada da arquitetura deve gerar conhecimento clínico por conta própria.

Todo conhecimento clínico deve existir previamente na Base de Conhecimento.

## Princípio da Responsabilidade Única

Cada componente da arquitetura possui apenas uma responsabilidade.

Não existe sobreposição entre componentes.

Cada camada deve executar apenas sua função específica.

## Arquitetura Geral

```
KRONOS
├── Context Engine
├── Retrieval Engine
├── Knowledge Engine
├── Workflow Engine
├── Agent Engine
├── Skill Engine
├── Transformer Engine
├── Validation Engine
└── Response Engine
```

## Context Engine

Responsável por construir o contexto da solicitação.

Pode utilizar:
- Perfil do usuário
- Especialidade
- Ambiente assistencial
- Histórico da conversa
- Configurações do sistema
- Preferências do usuário

O Context Engine não consulta documentos. O Context Engine apenas organiza contexto.

## Retrieval Engine

Responsável por localizar conhecimento.

Pode utilizar simultaneamente:
- Busca vetorial
- Busca textual
- Busca híbrida
- Busca por metadados
- Busca por categoria
- Busca por especialidade

Seu único objetivo é recuperar Objetos de Conhecimento. Nunca responde perguntas. Nunca interpreta documentos.

## Knowledge Engine

É o núcleo do sistema. Todo conhecimento clínico deve existir aqui. Todos os conteúdos seguem exatamente a mesma estrutura.

Exemplos:
- Procedimentos
- Diagnósticos de Enfermagem
- Intervenções (NIC)
- Resultados (NOC)
- NANDA-I
- CIPE
- Medicamentos
- Protocolos
- Diretrizes
- RDC
- COFEN
- COREN
- ANVISA
- Ministério da Saúde
- Escalas Clínicas
- Cálculos
- POPs
- Checklists
- Fluxos Assistenciais
- Educação Permanente

Tudo deve ser tratado como Objetos de Conhecimento. Nunca como documentos isolados.

## Workflow Engine

Coordena processos completos.

Exemplo:

```
Admissão
↓
Avaliação
↓
Diagnóstico
↓
Planejamento
↓
Intervenção
↓
Registro
↓
Alta
```

Os Workflows apenas organizam etapas. Nunca criam conhecimento.

## Agent Engine

Os Agentes possuem apenas uma missão. Eles não armazenam conhecimento. Eles não interpretam documentos. Eles apenas coordenam tarefas.

Exemplos:
- Agente de Documentação
- Agente Educador
- Agente de Procedimentos
- Agente de Protocolos
- Agente de Segurança do Paciente
- Agente de Evolução

Sempre que precisarem de conhecimento deverão consultar o Retrieval Engine.

### Subagentes

Cada Agente pode possuir Subagentes especializados.

Exemplo:

```
Agente Procedimentos
↓
Subagente Busca
↓
Subagente Evidência
↓
Subagente Registro
↓
Subagente Segurança
```

Cada Subagente executa apenas uma função.

## Skill Engine

As Skills são operações reutilizáveis. Nunca possuem conhecimento próprio. Nunca respondem utilizando memória do modelo.

Exemplos:
- Skill Recuperar Conhecimento
- Skill Gerar Checklist
- Skill Montar Registro SOAP
- Skill Gerar Evolução
- Skill Calcular IMC
- Skill Calcular Glasgow
- Skill Calcular Escalas
- Skill Converter Unidades
- Skill Comparar Protocolos
- Skill Gerar Timeline
- Skill Exportar Documento

Toda Skill recebe dados. Processa. Retorna dados.

## Transformer Engine

Responsável apenas por transformar formatos. Nunca altera significado. Nunca cria informação.

Exemplos de saída:
- JSON
- Markdown
- HTML
- PDF
- DOCX
- Tela
- Checklist
- Flashcard
- Timeline
- Resumo Estruturado
- Prontuário

O conteúdo permanece exatamente o mesmo. Muda apenas sua representação.

## Validation Engine

Toda resposta deve passar obrigatoriamente pela validação.

Validar:
- Existe fonte?
- Existe referência?
- Existe página?
- Existe trecho correspondente?
- Existe conflito entre documentos?
- O documento está vigente?
- A informação pertence ao contexto solicitado?

Caso qualquer validação falhe: não responder. Informar que não foi encontrada evidência suficiente. Nunca preencher lacunas utilizando conhecimento do modelo.

## Response Engine

É a última camada. Recebe:
- Contexto
- Objetos recuperados
- Resultado dos Agentes
- Resultado das Skills
- Resultado dos Workflows
- Resultado da Validação

Sua única responsabilidade é montar a resposta final. Não interpreta. Não cria conhecimento. Não altera evidências.

## Filosofia da Plataforma

Toda informação clínica deve seguir o fluxo:

```
Contexto
↓
Recuperação do Conhecimento
↓
Validação
↓
Execução de Skills
↓
Execução de Workflows
↓
Transformação do formato
↓
Resposta Final
```

Em nenhum momento qualquer componente da arquitetura poderá inventar, completar, resumir ou interpretar conteúdo clínico sem respaldo explícito na Base de Conhecimento.

A Base de Conhecimento é a única fonte autorizada de verdade clínica dentro do KRONIA Nurse.

Todos os demais componentes existem exclusivamente para localizar, validar, organizar, transformar e apresentar esse conhecimento de forma segura, consistente, auditável e rastreável.
