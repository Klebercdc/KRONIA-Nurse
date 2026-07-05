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
| `GROQ_MAX_TOKENS` | não | Limite de tokens de saída por chamada. Default: 4096. Atenção: no tier on_demand da Groq, prompt + max_tokens acima do TPM do modelo (8000 no gpt-oss-120b) é rejeitado com 413. |
| `GROQ_TIMEOUT_MS` | não | Timeout por tentativa de chamada à Groq. Default: 60000. Abaixo dos ~100s do 524 do Cloudflare da Groq, para permitir retry dentro da mesma requisição. Erros 429/502/503/504/524 são retentados com backoff. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | sim | Cliente Supabase server-side (só em `pages/api/**`). |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sim | Cliente Supabase do browser (sessão de autenticação). |
| `COHERE_API_KEY` | sim | Geração de embeddings (só no servidor). |

## Pipeline RAG de documentos oficiais

O script `scripts/rag-pipeline.js` indexa PDFs oficiais (ANVISA, COFEN, COREN, Ministério da Saúde) na base de conhecimento documental:

1. Baixa os PDFs da pasta `kronia-nurse-pdfs` do Google Drive (opcional — exige `credentials.json` OAuth na raiz; sem ele, usa os PDFs já presentes em `public/pdfs-conhecimento/`).
2. Extrai o texto, divide em fragmentos (~500 caracteres, quebrando por sentença).
3. Gera embeddings com Cohere `embed-multilingual-v3.0` (o mesmo modelo de `lib/embeddings.ts` — indexação e consulta precisam compartilhar o espaço vetorial).
4. Grava em `conhecimento_documentos` / `conhecimento_fragmentos` (migration `20260703_conhecimento_rag.sql`), com deduplicação por hash SHA-256 do conteúdo.

Execução (local, nunca na Vercel — exige `.env.local`):

```bash
npm run rag:pipeline
```

A busca semântica sobre os fragmentos é exposta em `POST /api/conhecimento/buscar-rag` (body: `{ "consulta": "...", "match_count": 5 }`), que usa a função RPC `buscar_fragmentos_conhecimento`.

## Status

🚧 Projeto em desenvolvimento.
