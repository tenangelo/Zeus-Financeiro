# Deploy — Zeus Financeiro

Guia operacional de produção. Inclui o estado atual, como rodar deploys, as variáveis necessárias e os incidentes recorrentes que vale a pena ter na ponta da língua.

---

## 1. Estado atual (2026-04-30)

| Camada | Provedor | URL | Status |
|---|---|---|---|
| Frontend | Vercel | https://zeus-financeiro-web.vercel.app | 🟢 Online |
| API | Railway | https://zeusapi-production-b66c.up.railway.app/api/v1 | 🟢 Online |
| DB | Supabase | https://mqayqkwcuxhovunmwgpy.supabase.co | 🟢 Online |
| Painel Admin | Vercel | `/admin/login` | 🟢 Live (super admin: `ten.angelo@gmail.com`) |

**Plano Railway:** Pro (saiu do Hobby em 2026-04-29 para destravar deploys imediatos).

**Auto-deploy:** push em `main` no GitHub → Vercel deploya frontend, Railway deploya API. Sem staging.

---

## 2. Variáveis de ambiente

### Vercel (Frontend)

| Var | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://mqayqkwcuxhovunmwgpy.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (anon key do Supabase) |
| `NEXT_PUBLIC_API_URL` | `https://zeusapi-production-b66c.up.railway.app/api/v1` |

### Railway — serviço `@zeus/api`

| Var | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `SUPABASE_URL` | `https://mqayqkwcuxhovunmwgpy.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | (service role key — secreto) |
| `JWT_SECRET` | (HS256 secret) |
| `JWT_AUDIENCE` | `authenticated` |
| `JWT_ISSUER` | `https://mqayqkwcuxhovunmwgpy.supabase.co/auth/v1` |
| `ALLOWED_ORIGINS` | `https://zeus-financeiro-web.vercel.app` |
| `STRIPE_SECRET_KEY` | (opcional — só se for usar Stripe; quando migrar pra Asaas, remover) |
| `STRIPE_WEBHOOK_SECRET` | (opcional, idem) |

> Stripe é lazy-init: API sobe sem essas vars; só endpoints de billing falham se invocados.

---

## 3. Como deployar

### Caminho normal (recomendado)
```bash
git push origin main
```
Webhook do Vercel + Railway disparam build automático em poucos segundos.

### Forçar redeploy do Railway sem novo código
- Painel Railway → serviço → menu `...` → **Deploy latest commit**
- *Não use* "Redeploy" no item ACTIVE: isso só republica a imagem antiga, não rebuilda.

### Forçar redeploy via commit
Watch paths do Railway estão configurados para ignorar mudanças que não tocam `apps/api/`. Para forçar build de API, edite qualquer arquivo dentro de `apps/api/` (commit vazio NÃO funciona).

### Verificar saúde pós-deploy
```bash
# 1. Healthcheck
curl https://zeusapi-production-b66c.up.railway.app/api/v1/health

# 2. Rotas críticas (esperar 401 = rota existe, 404 = módulo faltando)
for r in admin/metrics admin/users plans transactions/cash-flow ingredients; do
  printf "%s → %s\n" "$r" "$(curl -s -o /dev/null -w '%{http_code}' \
    https://zeusapi-production-b66c.up.railway.app/api/v1/$r)"
done

# 3. Frontend bundle aponta pra API certa?
curl -s https://zeus-financeiro-web.vercel.app/admin/login \
  | grep -oE '/_next/static/chunks/app/admin/[^"]*\.js' | head -1 \
  | xargs -I{} curl -s https://zeus-financeiro-web.vercel.app{} \
  | grep -oE 'https://[^"]*railway[^"]*' | head -1
```

---

## 4. Setup inicial (caso precise reconstruir)

### 4.1. Vercel
1. Importar repo `tenangelo/Zeus-Financeiro`
2. **Root Directory:** `apps/web`
3. **Framework:** Next.js
4. **Install Command:** `pnpm install --frozen-lockfile`
5. **Build Command:** `pnpm run build`
6. Adicionar variáveis de ambiente (§2)
7. Deploy

### 4.2. Railway — serviço API
1. Novo projeto → "Deploy from GitHub repo" → `Zeus-Financeiro`
2. **Service name:** `@zeus/api`
3. **Root Directory:** `apps/api`
4. **Watch Paths:** `apps/api/**`
5. **Start Command:** `node dist/main.js`
6. Adicionar variáveis (§2)
7. Domínio público gerado: `zeusapi-production-b66c.up.railway.app`

### 4.3. Supabase
- Projeto já criado: `mqayqkwcuxhovunmwgpy`
- Aplicar migrations em `supabase/migrations/` em ordem
- Após qualquer migration, **regenerar tipos**:
  ```bash
  supabase gen types typescript --project-id mqayqkwcuxhovunmwgpy \
    > packages/database/src/types/supabase.ts
  ```

---

## 5. Troubleshooting

### Vercel build falhou
- **Erro `RouteImpl<...>`:** rota não existe no manifesto e `typedRoutes: true` está ativo. Adicionar `as any` na chamada `router.push(...)` ou criar a rota.
- **Erro `pnpm-lockfile is not up-to-date`:** rodou `package.json` manual sem `pnpm install`. Rode `pnpm install`, commite o lock.

### Railway build FAILED
- **TS2769 em `tenants.service.ts`:** tipos `plans`/`subscriptions` não estão em `packages/database/src/types/supabase.ts`. Regenerar tipos OU adicionar `as any` no acesso (tem precedente, ver `apps/api/src/tenants/tenants.service.ts:130`).
- **Container crashando após build OK (502/000):** alguma var obrigatória ausente OU dependência tentando inicializar sem env. Ver logs no painel Railway.

### Railway commit veio como SKIPPED
"No changes to watched files" → o commit não tocou em `apps/api/`. Watch paths fazem o serviço API ignorar mudanças de docs/web. Edite algum arquivo em `apps/api/` para forçar.

### Frontend mostra "Failed to fetch"
- `NEXT_PUBLIC_API_URL` no Vercel está correto? Tem que terminar em `/api/v1`.
- API alive? `curl .../health`
- CORS OK? Use o curl OPTIONS em §3.

### Login admin nega acesso mesmo com `is_super_admin=true`
- API tem `AdminModule` rodando? `curl .../admin/metrics` retornar 401 = sim, 404 = módulo faltando, redeployar.

---

## 6. Endpoints da API (referência rápida)

```
GET    /api/v1/health
GET    /api/v1/admin/metrics                    [super-admin]
GET    /api/v1/admin/users                      [super-admin]
GET    /api/v1/admin/tenants                    [super-admin]
GET    /api/v1/admin/subscriptions              [super-admin]
PATCH  /api/v1/admin/users/:id/super-admin      [super-admin]

GET    /api/v1/plans                            [público]
GET    /api/v1/transactions                     [tenant]
GET    /api/v1/transactions/cash-flow           [tenant]
GET    /api/v1/cmv/snapshots                    [tenant]
GET    /api/v1/ingredients                      [tenant]
```

Headers obrigatórios em rotas autenticadas:
```
Authorization: Bearer <JWT do Supabase>
```

---

**Mantenha este arquivo curto e atualizado.** Se algum passo aqui ficar errado em produção, atualize no commit que corrige.
