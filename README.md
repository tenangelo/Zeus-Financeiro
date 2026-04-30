# Zeus Financeiro

> SaaS multi-tenant de gestão financeira para restaurantes — DRE, CMV, fluxo de caixa, estoque e fichas técnicas, com agente de IA financeiro.

![Status](https://img.shields.io/badge/status-em%20produção-brightgreen)
![Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20NestJS%20%7C%20Supabase-blue)

---

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind + Shadcn UI — deploy Vercel
- **Backend:** NestJS + Fastify + TypeScript + Decimal.js — deploy Railway
- **Database:** Supabase (Postgres com RLS multi-tenant) + Storage para anexos
- **Auth:** Supabase Auth (JWT)
- **Pagamentos:** Asaas (em migração — código legado em Stripe)

Monorepo `pnpm` com workspaces em `apps/*` e `packages/*`.

---

## Documentação

Para saber qualquer coisa sobre o projeto, comece por aqui:

| Para... | Leia |
|---|---|
| **Trabalhar com IA neste repo** (Claude Code) | [`CLAUDE.md`](./CLAUDE.md) |
| Subir o ambiente local em 5min | [`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md) |
| Entender deploy, URLs de produção e troubleshooting | [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) |
| Ver fases entregues e o que vem a seguir | [`docs/ROADMAP.md`](./docs/ROADMAP.md) |
| Consultar arquitetura/decisões antigas | [`docs/history/`](./docs/history/) |

---

## Quick start

```bash
git clone https://github.com/tenangelo/Zeus-Financeiro.git
cd Zeus-Financeiro
pnpm install

# Configure apps/web/.env.local e apps/api/.env (ver docs/DEVELOPMENT.md §3)

# Em terminais separados:
pnpm --filter @zeus/api dev   # API → :3001
pnpm --filter @zeus/web dev   # Web → :3000
```

App em http://localhost:3000 · API em http://localhost:3001/api/v1/health

---

## Funcionalidades

### Financeiro
- Lançamentos (receita/despesa) com edição de pendentes e parcelamento
- DRE (Demonstrativo de Resultado) gerado automaticamente
- CMV calculado a partir do estoque
- Fluxo de caixa do mês com saldo, vencimentos próximos e overdues
- Anexos de comprovantes via Supabase Storage
- Audit log imutável

### Estoque
- Cadastro de ingredientes, fornecedores e fichas técnicas
- Movimentações: compra, consumo, perda, ajuste, devolução
- Alertas de estoque baixo

### Multi-tenant
- Isolamento por `tenant_id` com Row Level Security
- Onboarding automático com plano Trial vinculado
- Painel super-admin separado (`/admin`) com gestão de usuários, tenants, planos e assinaturas

### Em desenvolvimento
- Agente de IA Financeiro (categorização + insights via Claude)
- Bot WhatsApp para lançamentos por mensagem
- Importação de extratos e notas fiscais

Ver roadmap completo em [`docs/ROADMAP.md`](./docs/ROADMAP.md).

---

## Convenções

- **Commits:** Conventional Commits em PT-BR (`feat:`, `fix:`, `chore:`, `docs:`)
- **Branch:** `feature/<nome>` → PR para `main`
- **Type-check antes de commitar:** `cd apps/{api,web} && npx tsc --noEmit`
- **Sem comentários óbvios** — só explique o "porquê" não-trivial

---

## Suporte

- Bugs e melhorias: criar issue no [GitHub](https://github.com/tenangelo/Zeus-Financeiro/issues)
- Documentação técnica: [`docs/`](./docs/)
- Para IA: [`CLAUDE.md`](./CLAUDE.md) é carregado automaticamente em sessões do Claude Code

---

## Licença

Proprietário — todos os direitos reservados.
