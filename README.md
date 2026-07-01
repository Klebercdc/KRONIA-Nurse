# KRONIA-Nurse

## Visão Geral

KRONIA-Nurse é um sistema de apoio à enfermagem focado na padronização da coleta de dados clínicos, geração de documentação assistencial e apoio à tomada de decisão por meio de IA.

## Objetivos

- Estruturar o processo de acolhimento.
- Padronizar relatórios clínicos.
- Automatizar documentação de enfermagem.
- Utilizar agentes especializados para análise clínica.
- Facilitar evolução futura do sistema.

## Arquitetura (planejada)

- Agente Orquestrador
- Agentes Especialistas
- Skills
- Pipeline de validação
- Base de conhecimento clínica

## Configuração (variáveis de ambiente)

Segredos ficam apenas em `.env.local` (local) e nas variáveis de ambiente da Vercel — nunca no repositório.

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `GROQ_API_KEY` | sim | Chave da Groq API (só no servidor). |
| `GROQ_MODEL` | não | ID do modelo Groq usado em toda geração (plantão, pipeline, KRONOS). Default: `openai/gpt-oss-120b` — substituto indicado pela Groq para o `llama-3.3-70b-versatile`, descontinuado em 16/08/2026. Alternativa sugerida pela Groq: o Qwen 3.x vigente (conferir ID exato em console.groq.com/docs/models). |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | sim | Cliente Supabase server-side (só em `pages/api/**`). |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sim | Cliente Supabase do browser (sessão de autenticação). |
| `COHERE_API_KEY` | sim | Geração de embeddings (só no servidor). |

## Status

🚧 Projeto em desenvolvimento.
