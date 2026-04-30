# CLAUDE.md — Guia para o Claude trabalhar neste repositório

> Este arquivo é carregado automaticamente em toda sessão. Mantém o agente produtivo desde o primeiro turno: stack, comandos, env vars, gotchas e convenções vivas. **Atualize aqui qualquer regra ou armadilha que economize tempo numa próxima sessão.**

---

## 1. Visão de Produto

**Zeus Financeiro** — SaaS multi-tenant de gestão financeira para restaurantes (DRE, CMV, fluxo de caixa, estoque, fichas técnicas). Agente Financeiro IA é o diferencial estratégico.

- **Cliente atual em produção:** Cantina do Angelo (`tenant_id=fb753549-7ac6-4588-922f-7320eefbd3d3`)
- **Super admin do sistema:** `ten.angelo@gmail.com` (`a4384d9b-0cbe-4f5a-84b3-c15cafd0f5c4`)

---

## 2. Stack & Arquitetura

```
monorepo pnpm (Turborepo-style, sem turbo ainda)
├── apps/web         Next.js 14 App Router (Vercel)
├── apps/api         NestJS + Fastify (Railway)
├── packages/database  Tipos Supabase auto-gerados
├── packages/shared    Validators, helpers, formatters
└── supabase/        Migrations versionadas
```

- **DB:** Supabase Postgres + RLS multi-tenant + Storage para anexos
- **Auth:** Supabase Auth (JWT). Middleware `apps/web/src/middleware.ts` protege rotas e diferencia `/login` (cliente) de `/admin/login` (super admin).
- **API:** Prefixo global `/api/v1` (configurado em `apps/api/src/main.ts`)
- **Pagamentos:** **Asaas** (planejado). Código atual ainda usa Stripe — ver §6.

---

## 3. URLs de Produção

| Serviço | URL |
|---|---|
| Frontend (Vercel) | `https://zeus-financeiro-web.vercel.app` |
| API (Railway) | `https://zeusapi-production-b66c.up.railway.app/api/v1` |
| Web alt (Railway) | `https://zeusweb-production.up.railway.app` *(legacy, não usar)* |
| Supabase | `https://mqayqkwcuxhovunmwgpy.supabase.co` |
| GitHub | `https://github.com/tenangelo/Zeus-Financeiro` |

---

## 4. Comandos Essenciais

### Desenvolvimento

```bash
pnpm install                                # instala tudo (raiz)
pnpm --filter @zeus/api dev                 # API em :3001
pnpm --filter @zeus/web dev                 # Web em :3000
```

### Verificação rápida (rode antes de commitar)

```bash
cd apps/api && npx tsc --noEmit             # type-check API
cd apps/web && npx tsc --noEmit             # type-check Web
cd apps/api && npx nest build               # build NestJS
```

### Banco

```bash
# Regenerar tipos do Supabase após qualquer migration
# (requer Supabase CLI instalado globalmente)
supabase gen types typescript --project-id mqayqkwcuxhovunmwgpy \
  > packages/database/src/types/supabase.ts
```

### Acesso direto ao DB via curl (PostgREST + service_role)

```bash
SRK="<SUPABASE_SERVICE_ROLE_KEY>"
curl "https://mqayqkwcuxhovunmwgpy.supabase.co/rest/v1/<tabela>?select=*" \
  -H "apikey: $SRK" -H "Authorization: Bearer $SRK"
```

> Service role bypassa RLS — use só pra diagnóstico.

---

## 5. Variáveis de Ambiente

### `apps/web/.env.local` (dev)
```
NEXT_PUBLIC_SUPABASE_URL=https://mqayqkwcuxhovunmwgpy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### `apps/api/.env` (dev)
```
NODE_ENV=development
PORT=3001
SUPABASE_URL=https://mqayqkwcuxhovunmwgpy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
JWT_SECRET=<secret>
JWT_AUDIENCE=authenticated
JWT_ISSUER=https://mqayqkwcuxhovunmwgpy.supabase.co/auth/v1
ALLOWED_ORIGINS=http://localhost:3000
```

### Vercel (produção)
Mesmas vars do `.env.local` mas com `NEXT_PUBLIC_API_URL=https://zeusapi-production-b66c.up.railway.app/api/v1`.

### Railway (produção)
Mesmas do `.env` da API, com `NODE_ENV=production` e `ALLOWED_ORIGINS=https://zeus-financeiro-web.vercel.app`.

> **Stripe vars (`STRIPE_SECRET_KEY`, etc) NÃO precisam estar setadas** — `StripeService` é lazy-init e só falha se um endpoint Stripe for invocado. Quando migrar pra Asaas, remova essa pendência.

---

## 6. Gotchas Conhecidas (LEIA antes de mexer)

### 6.1. Stripe → Asaas (migração pendente)
O gateway de pagamento do projeto é **Asaas**, não Stripe. O código atual em `apps/api/src/stripe/` foi escrito como Stripe e precisa ser substituído. `StripeService` está com init lazy (`apps/api/src/stripe/stripe.service.ts:18`) pra não derrubar o boot — sem `STRIPE_SECRET_KEY`, a API sobe normal e só os endpoints de billing falham se chamados.

### 6.2. Tipos Supabase desatualizados
`packages/database/src/types/supabase.ts` **não inclui** as tabelas `plans`, `subscriptions`, `payment_events` (criadas pela migration `20260427000000_admin_plans_subscriptions.sql`). Por isso há casts `as any` em:
- `apps/api/src/tenants/tenants.service.ts` (`createWithOwner` → trial subscription)
- `apps/api/src/stripe/stripe.service.ts` (várias chamadas)

**Quando regenerar os tipos, remova esses casts.**

### 6.3. Railway watch paths
O serviço `@zeus/api` no Railway usa watch paths para evitar rebuilds desnecessários. Commits que tocam **só** em `*.md`, `docs/`, ou `apps/web/` ficam **SKIPPED** com mensagem "No changes to watched files". Para forçar rebuild da API: toque em qualquer arquivo dentro de `apps/api/`.

### 6.4. Plano Railway: Pro
Em planos Hobby/Trial os deploys ficaram **pausados durante incidentes**. Conta migrou pra Pro em 2026-04-29 — destrava deploys imediatos.

### 6.5. `experimental.typedRoutes` (Next.js)
`apps/web/next.config.ts` tem `typedRoutes: true`. Rotas dinâmicas e qualquer string que não esteja no manifesto causam erro `RouteImpl<...>`. Se for inevitável (ex: redirecionamento programático para `/admin/login`), use cast: `router.push("/admin/login" as any)`.

### 6.6. `pnpm --frozen-lockfile` no Vercel/Railway
CI roda `--frozen-lockfile`. Adicionar dependência manualmente em `package.json` sem rodar `pnpm install` quebra o build. **Sempre rode `pnpm install` e commite o `pnpm-lock.yaml`.**

### 6.7. LucideProps não aceita `title`
Ícones de `lucide-react` não suportam prop `title`. Use `aria-label` no elemento pai ou um `<span class="sr-only">` adjacente.

### 6.8. Particionamento do Postgres
`stock_movements` e `transactions` são particionadas por mês. Partições foram pré-criadas até 2027 inteiro. Ao se aproximar do fim do range, criar novas para o ano seguinte (ver migration de partições).

---

## 7. Convenções

### Commits
Padrão Conventional Commits em **português** quando descreve produto, em inglês quando puramente técnico.
```
feat(api): adiciona endpoint de relatório CMV
fix(web): corrige redirect do /admin/login
chore: atualiza pnpm-lock
docs: consolida documentação em docs/
```

### Branches
- `main` → produção (auto-deploy)
- `feature/<nome>` → trabalho ativo
- Não há staging — PRs são revisados e mergeados direto

### Estrutura de arquivos
- Server components no App Router por padrão; `"use client"` só quando precisar de hooks/interatividade
- Tailwind + Shadcn UI; cores `brand-*` no painel cliente, `slate-*`/`violet-*` no painel admin
- `cents` em `int` no DB; conversão pra `Decimal.js` (financeiro) ou `Number/100` (display)

### Estilo de código
- Sem comentários explicando o "o quê"; só o "porquê" não-óbvio
- Sem error handling especulativo; só validar em fronteiras (input do usuário, APIs externas)
- Sem features/abstrações que o código atual não exija

---

## 8. Como diagnosticar produção rapidamente

```bash
# 1. API saudável?
curl https://zeusapi-production-b66c.up.railway.app/api/v1/health

# 2. Rota existe? (401 = sim, 404 = não)
curl -o /dev/null -w "%{http_code}\n" \
  https://zeusapi-production-b66c.up.railway.app/api/v1/admin/metrics

# 3. CORS OK?
curl -i -X OPTIONS https://zeusapi-production-b66c.up.railway.app/api/v1/admin/metrics \
  -H "Origin: https://zeus-financeiro-web.vercel.app" \
  -H "Access-Control-Request-Method: GET"

# 4. Bundle do Vercel está chamando a API certa?
curl https://zeus-financeiro-web.vercel.app/admin/login \
  | grep -oE '/_next/static/chunks/app/admin/[^"]*\.js' \
  | xargs -I{} curl -s https://zeus-financeiro-web.vercel.app{} \
  | grep -oE 'https://[^"]*railway[^"]*' | head -1
```

---

## 9. Painel Super Admin

- **Acesso:** `/admin` (redireciona para `/admin/login` se sem sessão)
- **Login admin:** `/admin/login` — tema dark, valida `is_super_admin=true` via `GET /admin/metrics` após auth, faz signOut se não autorizado
- **Layout:** `apps/web/src/app/admin/layout.tsx` — bypass do guard quando `pathname === "/admin/login"`; sidebar exibe avatar/nome/email/UUID do admin logado
- **Guard backend:** `apps/api/src/admin/admin.guard.ts` — usa `ADMIN_SUPABASE_CLIENT` (service_role) para ler `profiles.is_super_admin`
- **Como tornar alguém super admin:**
  ```sql
  UPDATE profiles SET is_super_admin = true WHERE id = '<uuid>';
  ```

---

## 10. Documentação relacionada

- [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) — Vercel + Railway + GitHub Actions
- [`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md) — setup local detalhado
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — fases entregues e próximas
- [`docs/history/`](./docs/history/) — docs antigos preservados (referência histórica)

---

## 11. Skills externos clonados (não ativos por padrão)

Três repos foram clonados na **raiz do projeto** como referência (estão no `.gitignore`, não são versionados):

| Pasta | Repo | O que oferece |
|---|---|---|
| `claude-mem/` | [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) | Memória persistente entre sessões via hooks + worker service (port 37777) + SQLite + vector search |
| `superpowers/` | (private) | Metodologia de dev com comandos `/brainstorm`, `/write-plan`, `/execute-plan` e agente `code-reviewer` |
| `ui-ux-pro-max-skill/` | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 67 UI styles, 161 color palettes, 57 font pairings, 99 UX guidelines, 25 chart types |

### Como ativar

Para o Claude Code reconhecer e expor essas skills/comandos:

```bash
# Opção 1 — instalar como plugin (claude-mem oferece installer próprio)
cd claude-mem && npm install && npm run install-plugin

# Opção 2 — copiar arquivos para ~/.claude/skills (skills simples)
cp -r superpowers/commands/* ~/.claude/commands/
cp -r superpowers/agents/* ~/.claude/agents/
cp -r ui-ux-pro-max-skill ~/.claude/skills/

# Após qualquer instalação, reinicie a sessão do Claude Code
```

> **Antes de instalar**, leia o README e `CLAUDE.md` de cada repo. `claude-mem` em particular roda um worker em background e cria DB em `~/.claude-mem/`.

Quando você quiser que a IA use uma skill específica nesta sessão *sem* instalá-la, peça: "leia `<pasta>/SKILL.md` e siga as orientações" — a IA vai consumir o conteúdo via `Read`.

---

**Última atualização:** 2026-04-30 (após estabilização do painel admin em produção)
