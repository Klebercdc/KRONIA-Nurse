# KRONIA NURSE — Caderno de Plantão Inteligente
### Blueprint enxuto de produto (substitui o KRONIA_NURSE_IMPLANTACAO.md para o MVP)

> **Em uma frase:** um caderno de anotações de plantão que se apaga no fim do turno, com IA que organiza o que o enfermeiro escreveu em evolução e passagem de plantão prontas para copiar no prontuário oficial.

Este documento existe porque o blueprint original (`KRONIA_NURSE_IMPLANTACAO.md`, camadas A1–A10, multi-tenant, FHIR, RBAC, Voice Engine próprio) é uma arquitetura **enterprise**, pensada para uma equipe com investimento — não para um desenvolvedor solo validando o primeiro produto. Nada do blueprint original foi descartado: ele continua sendo o roadmap de longo prazo (Camada B, seção 6). Este documento define **o que construir primeiro** (Camada A) para chegar a um produto real, sustentável e que cabe em uma pessoa só.

---

## 1. Princípio inviolável

> **A IA estrutura o que o enfermeiro disse. O enfermeiro revisa e assina (COREN). Nada vai ao prontuário sem essa revisão.**

Toda decisão de arquitetura abaixo existe para proteger este princípio — e para manter o produto na categoria "ferramenta de documentação pessoal", não na categoria "sistema de saúde regulado" (que exige certificação ANVISA/SaMD, infraestrutura HIPAA-like, e recursos que um dev solo não tem).

## 2. Fronteira do produto — o que é e o que NÃO é

**É:**
- Um caderno de notas de plantão com IA.
- Memória que dura **um turno**: criada quando o plantão começa, viva enquanto ele está aberto, apagada quando ele se encerra.
- Um gerador de Evolução (formato SAE/COFEN nº 358/2009) e de Relatório Final de Passagem de Plantão, a partir do que o enfermeiro registrou.
- Calculadora de escalas publicadas (NEWS2, Braden, Morse, qSOFA) sobre valores que o próprio enfermeiro informou.

**NÃO é, e nunca deve virar sem decisão consciente (cada item abaixo, se cruzado, herda peso de produto regulado):**
- Não guarda paciente entre turnos. Não existe "histórico do paciente X".
- Não compartilha dado entre membros de equipe. Não tem "conta do hospital" ou login coletivo.
- Não decide conduta clínica. Nunca apresenta um "diagnóstico de risco" livre (ex.: "risco de sepse") sem ser a contagem de um critério publicado, citável, sobre dado explícito.
- Não escreve direto no prontuário oficial — o enfermeiro copia e cola.
- Não identifica paciente por nome, CPF ou qualquer dado que permita identificação fora do contexto do leito/turno.

## 3. Arquitetura: memória de turno, local e efêmera

```
[Início do plantão]
        │
        ▼
Captura por voz/texto ──► Armazenamento LOCAL no aparelho
   (leito + evento)          (IndexedDB / localStorage do PWA)
        │                           │
        │   (acumula durante        │  sobrevive a: app fechar,
        │    todo o turno)          │  tela travar, sem internet
        ▼                           ▼
   [Encerramento do plantão]
        │
        ├─► Envia o necessário à IA (Groq) ──► Evolução / SBAR / Relatório Final
        │        (único momento em que o dado sai do aparelho)
        ▼
   Enfermeiro revisa, copia para o prontuário oficial, assina (COREN)
        │
        ▼
   Memória local é apagada — turno seguinte começa vazio
```

**Por que isso resolve a maior parte dos gargalos identificados:**
- **LGPD**: o app nunca é o "controlador" de dado de paciente — o dado não fica retido em servidor seu. Você nunca acumula um banco de pacientes que precisaria proteger.
- **ANVISA/SaMD**: sem persistência, sem decisão autônoma, posicionado como documentação — fica fora da fronteira de dispositivo médico que se aplicaria a um sistema de decisão clínica contínuo.
- **Custo de infraestrutura**: quase zero. Não há banco de pacientes para hospedar, replicar ou proteger.
- **Robustez**: mesmo se a internet cair no meio do plantão, a captura continua funcionando (é local); só a geração final precisa de rede.

## 4. Dados — o que entra, o que nunca entra

| Campo | Entra | Nunca entra |
|---|---|---|
| Identificador do paciente | Leito, iniciais (ex: "Leito 5, JM") | Nome completo, CPF, prontuário |
| Conteúdo clínico | Sinais vitais, eventos, dispositivos, condutas já realizadas | — |
| Diagnóstico | Citado apenas se o enfermeiro disse explicitamente (pode receber CID-10 de referência) | Nunca inferido pela IA |
| Escalas (NEWS2/Braden/Morse/qSOFA) | Calculadas só sobre valor explícito informado | Nunca estimadas |

Aviso fixo na tela de captura: *"Use apenas leito ou identificador interno. Não digite nome, CPF ou dado que identifique o paciente."*

## 5. Privacidade e responsabilidade — modelo de mercado (NurseMagic), adaptado

O NurseMagic (líder do segmento, capital aberto, Nasdaq: AMST) resolve "posso usar isso no meu trabalho?" transferindo a responsabilidade contratual ao usuário: ele declara ter as autorizações necessárias para os dados que insere. Adotamos a mesma postura, com uma vantagem estrutural que eles não têm — **o app não retém o dado**, então o risco residual do produto é menor que o do líder de mercado.

Texto de responsabilidade (a incluir no onboarding e nos Termos):
> "Este aplicativo é uma ferramenta de apoio à organização e redação de anotações de enfermagem. Você é responsável por verificar a política da sua instituição antes de usar qualquer ferramenta digital durante o plantão, e por nunca inserir dados que identifiquem o paciente. A responsabilidade clínica e a assinatura de qualquer documento permanecem inteiramente suas (COREN)."

**Nota pessoal, fora do produto:** antes de usar isso no hospital novo, verificar política interna / cláusula de propriedade intelectual do contrato — isso não se resolve com arquitetura, é decisão sua com RH/advogado.

## 6. O que fica fora do MVP (Camada B — roadmap congelado, não descartado)

Tudo que está em `KRONIA_NURSE_IMPLANTACAO.md` permanece válido como direção de longo prazo, **condicionado a ter assinantes pagantes na Camada A primeiro**:

- Multi-tenant / RBAC / Tenant (E2/E4)
- Integração FHIR / EHR (E1) — ReadEHRStateSkill, EventToFHIR
- Persistência de paciente entre turnos
- Biblioteca clínica própria pesquisável (NANDA/NIC/NOC catalogados) — A5 completo
- Analytics / MetricPoint (A8)
- Plano Enterprise / venda institucional

Nenhuma decisão de hoje impede migrar para isso depois — a lógica de eventos → estruturação → documento é a mesma; só a camada de persistência e tenancy muda.

## 7. Modelo de negócio

- **Gratuito**: caderno de captura (voz/texto, leito automático, linha do tempo do turno). Sem limite de uso.
- **R$ 19,90/mês**: desbloqueia a geração por IA (Evolução, SBAR, Relatório Final, calculadoras automáticas). Sem planos intermediários ou Enterprise por agora.
- **Validação antes de escalar**: o teste que importa não é "tenho mercado" — é **conseguir 10 assinantes pagantes reais, mantidos por 3 meses**, antes de investir em alcançar os próximos mil.

### Estimativa de custo por assinante (preços Groq, jun/2026)
- Whisper (voz): ~US$0,04/hora de áudio → irrelevante no volume de um plantão.
- Llama 3.3 70B (geração de texto): ~US$0,59/M tokens entrada, ~US$0,79/M saída.
- **Custo estimado por plantão completo processado: ~R$0,20–0,25.**
- **Custo mensal por assinante ativo (uso pesado, 20 plantões): ~R$4–5.**
- Margem bruta estimada sobre R$19,90: **75–80%**, antes de taxa de gateway de pagamento (~5-7%) e Supabase.
- Em 1.000 assinantes: receita ~R$19.900; custos (IA + gateway + infra) estimados em **R$2.000–4.000/mês**; margem líquida estimada **R$16.000–18.000/mês** — não garantida, depende de uso real medido, não só estimado.

## 8. Fluxo do produto (telas mínimas)

1. **Plantão** — resumo do turno: pacientes, alertas (NEWS2/qSOFA calculados só com dado explícito), últimos registros.
2. **Pacientes** — lista de leitos identificados no turno; cadastro manual opcional.
3. **Registrar** (botão central, sempre acessível) — captura por voz (microfone do teclado nativo) ou texto; detecta o leito pelo contexto, mesmo com erro de transcrição.
4. **KRONOS** — calculadoras de escala publicada, manuais, nunca automáticas sem dado explícito.
5. **Encerramento** — gera Evolução por paciente e Relatório Final consolidado (formato SAE/COFEN 358/2009, com citação `[HH:MM]` de cada fato clínico); ao confirmar encerramento, apaga toda a memória do turno.

## 9. Regras de geração por IA (não negociáveis)

1. Usar somente o que foi explicitamente registrado — nunca inventar sinal vital, evento, dispositivo, medicação ou diagnóstico.
2. Pode traduzir linguagem informal para termo técnico (mesmo fato clínico) — nunca inferir achado novo de descrição vaga.
3. Toda frase com fato clínico cita o horário de origem `[HH:MM]`, verificável contra os registros brutos.
4. Escalas (NEWS2/Braden/Morse/qSOFA): calculadas só com valor explícito; sem dado suficiente, declarar isso, nunca estimar.
5. CID-10: só quando o enfermeiro já nomeou o diagnóstico; nunca atribuído por inferência da IA.
6. Toda geração termina com: *"Documento estruturado a partir dos registros do enfermeiro — revisar e assinar (COREN) antes de inserir no prontuário oficial."*

## 10. Voz — realidade técnica

- **No MVP**: microfone nativo do teclado do celular (iOS/Android) — já funciona, zero engenharia extra.
- **Gravação contínua com transcrição ao vivo dentro do app**: tecnicamente possível num PWA real (fora de ambiente de sandbox), usando Groq Whisper — já disponível na sua stack atual do KRONIA. Não é bloqueador, é melhoria de fase 2, não pré-requisito de lançamento.

---

## Checklist de não-regressão (revisar antes de qualquer nova feature)

- [ ] Continua sem persistir paciente além do turno?
- [ ] Continua sem multi-tenant / login compartilhado?
- [ ] Toda nova função de IA continua citando fonte `[HH:MM]`?
- [ ] Nenhuma escala/alerta foi calculada sem dado explícito?
- [ ] O texto de responsabilidade do usuário continua visível no onboarding?

Se a resposta for "não" a qualquer um destes, a feature pertence à Camada B — documentar no roadmap, não implementar agora.
