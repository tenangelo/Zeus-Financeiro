# Roadmap — Zeus Financeiro

Status real do projeto, fases entregues e prioridades. Atualizar a cada marco relevante (não a cada commit).

**Última atualização:** 2026-04-30

---

## Visão geral

Zeus Financeiro é um SaaS multi-tenant para gestão financeira de restaurantes, com diferencial estratégico em **insights por IA** (categorização, recomendações, análise de DRE/CMV via Claude API). Hoje em produção com 1 tenant ativo (Cantina do Angelo).

---

## ✅ Entregue

### Fundação (até 2026-04-27)
- Monorepo pnpm com `apps/web` (Next.js 14), `apps/api` (NestJS) e `packages/{database,shared}`
- Schema multi-tenant no Supabase com RLS por `tenant_id`
- Particionamento mensal de `transactions` e `stock_movements` (partições criadas até dez/2027)
- Auth via Supabase JWT, middleware Next.js para rotas protegidas
- CI/CD: push em `main` → auto-deploy Vercel + Railway
- Endpoint `/health` na API
- CORS multi-origin configurado

### Funcionalidades financeiras core
- Cadastro e edição (somente pendentes) de transações
- Cálculo de DRE
- Cálculo de CMV a partir do estoque
- Fluxo de caixa do mês com saldo, faturamento, despesas, contas a pagar
- Anexo de comprovantes via Supabase Storage
- Audit log imutável de transações

### Estoque e fichas técnicas
- CRUD de ingredientes e fornecedores
- Fichas técnicas (recipes) com itens
- Movimentações: compra, consumo, perda, ajuste, devolução

### Onboarding e tenancy (Fase 2)
- Página `/onboarding` com verificação de tenant existente (redireciona para dashboard se já tem)
- `TenantsService.createWithOwner` cria tenant + profile + subscription Trial automaticamente
- Página `/login` separada de `/admin/login` com fluxos distintos

### UX e tratamento de erros (Fase 3)
- `sonner` para toasts globais
- Interceptador HTTP que faz signOut + redirect em 401
- Skeleton loaders e empty states no dashboard
- Tema dark consistente no painel admin

### Painel Super Admin (Fase 4 — completa em 2026-04-30)
- Rota `/admin` com guard backend (`AdminGuard` + `is_super_admin`)
- Login `/admin/login` separado, tema dark, valida privilégio pós-auth e desloga não-admins
- Sidebar mostra identidade do admin logado (nome, email, UUID, badge)
- Páginas: `/admin`, `/admin/users`, `/admin/tenants`, `/admin/plans`, `/admin/subscriptions`, `/admin/settings`
- Endpoints REST: `GET /admin/metrics`, `/admin/users`, `/admin/tenants`, `/admin/subscriptions`, etc.
- Tabela `plans` populada com 4 tiers (Trial, Starter R$97, Pro R$197, Enterprise R$497)

### Estabilização de produção (2026-04-29 → 30)
- Upgrade Railway Hobby → Pro (destrava deploys imediatos)
- Build do Railway destravado (`tenants.service.ts` casts + Stripe lazy-init)
- Painel admin acessível e funcional em produção

---

## 🔥 Prioridades imediatas (próximos 7 dias)

1. **Migrar Stripe → Asaas**
   - Remover `apps/api/src/stripe/` e dependência `stripe@17.7.0`
   - Criar `apps/api/src/asaas/` com `AsaasModule`/`AsaasService` (subscription, customer, webhook)
   - Atualizar `apps/web/src/app/admin/settings/page.tsx` para mostrar config Asaas
   - Atualizar campos no DB: `stripe_customer_id` → `asaas_customer_id`, etc. (migration nova)

2. **Regenerar tipos do Supabase**
   - Rodar `supabase gen types typescript --project-id mqayqkwcuxhovunmwgpy > packages/database/src/types/supabase.ts`
   - Remover casts `as any` em `tenants.service.ts` e `stripe.service.ts`

3. **Backfill e validação de subscriptions**
   - Garantir que todo tenant tenha row em `subscriptions` (já feito para Cantina do Angelo)
   - Hook na criação de tenant para sempre criar subscription Trial

---

## 🎯 Próximo trimestre (maio–julho 2026)

### Agente de IA Financeiro (P0)
Diferencial estratégico do produto. Integração com Claude API.

- Análise automática de DRE com insights ("Suas despesas variáveis subiram 18% em abril")
- Recomendações de economia baseadas em histórico
- Categorização automática de transações via Claude
- Chatbot financeiro no dashboard
- Histórico de análises por tenant

### KPIs avançados no dashboard (P1)
- CMV%, ticket médio, prime cost, EBITDA%
- Comparativo MoM e YoY
- Alertas configuráveis (CMV > X%, queda de receita > Y%)

### Integração WhatsApp (P1)
- Bot recebe lançamentos via mensagem (NLU para extrair valor/categoria)
- Notificações de contas a vencer (3 dias antes)
- Envio diário do resumo do dia

### Importação avançada (P2)
- Extratos bancários (OFX, CSV)
- Notas fiscais (XML SEFAZ)
- POS comuns (iFood, Goomer, etc)

---

## 🔮 Backlog estratégico (Q3+)

- **Multi-currency** (para franquias internacionais)
- **Mobile / PWA** instalável
- **Open Banking** (consulta de saldo direto)
- **ERP integrations** (Omie, Bling, ContaAzul)
- **Marketplace de fornecedores** com cotação
- **Relatórios fiscais automáticos** (DAS Simples, DASN-MEI)

---

## 🛠️ Dívida técnica priorizada

| Item | Prioridade | Esforço |
|---|---|---|
| Regenerar tipos Supabase + remover `as any` | 🔥 P0 | 30min |
| Migrar Stripe → Asaas | 🔥 P0 | 1d |
| Testes unitários nos serviços críticos (jest) | P1 | 3d |
| E2E nos fluxos principais (Playwright) | P1 | 3d |
| Rate limiting (`@nestjs/throttler`) | P1 | 2h |
| Helmet + sanitização DTOs | P1 | 4h |
| Sentry para error tracking | P2 | 2h |
| Cache de queries (Redis) | P2 | 1d |
| Migrar para Turborepo (cache CI) | P3 | 1d |
| Bundle analysis + code splitting | P3 | 1d |

---

## 🚦 Decisões pendentes

- **Stripe vs Asaas:** decidido — **Asaas**. Migração é P0.
- **Plano Railway:** decidido — **Pro** (upgrado em 29/04).
- **Frontend host:** decidido — **Vercel** (Railway @zeus/web é legacy, será desligado).
- **Observabilidade:** indefinido. Candidatos: Sentry (free) + Better Stack (logs) + UptimeRobot. Decidir até maio.
- **CI/CD:** Railway nativo já cobre. GitHub Actions atual é só info — **considerar remover** ou usar para tests/lint.
- **Monorepo:** pnpm workspaces hoje. **Avaliar Turborepo** quando build começar a doer (ainda <30s).

---

## 📊 Métricas de sucesso

- **MRR Q3 2026:** R$ 5.000 (objetivo: 25 tenants no Starter)
- **CMV % médio dos tenants:** abaixo do limite de alerta (5% acima do teórico)
- **Adoção do agente IA:** ≥70% dos tenants ativos consultam pelo menos 1× por semana
- **Uptime:** ≥99.5% (atual: indeterminado, sem monitoring formal)

---

> **Princípio guia:** entregar valor visível para o restaurateur a cada sprint, mantendo a infra simples enquanto não houver volume.
