# Checklist de não-regressão
### Revisar antes de qualquer nova feature

- [ ] Continua sem persistir paciente além do turno (storage.ts é a única fonte, e é local)?
- [ ] Continua sem multi-tenant / login compartilhado / conta de equipe?
- [ ] Toda nova função de IA continua citando fonte `[HH:MM]`?
- [ ] Nenhuma escala/alerta foi calculada sem dado explícito (cálculo em código, não pela IA)?
- [ ] O texto de responsabilidade do usuário continua visível no onboarding?
- [ ] GROQ_API_KEY só é referenciada em código que roda em `pages/api/**`?

Se a resposta for "não" a qualquer um destes, a feature pertence à Camada B
(ver `KRONIA_NURSE_CADERNO_INTELIGENTE.md`) — documentar no roadmap, não
implementar agora.
