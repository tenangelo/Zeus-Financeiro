# Desenvolvimento Local — Zeus Financeiro

Guia para subir o ambiente local em ~5 min e os comandos do dia a dia.

---

## 1. Pré-requisitos

- **Node.js 20+** (recomendado: instalar via [Volta](https://volta.sh) ou nvm)
- **pnpm 9+** — `npm install -g pnpm`
- **Git** + acesso ao repo `tenangelo/Zeus-Financeiro`
- **Editor:** VS Code recomendado (extensões úteis: ESLint, Tailwind CSS IntelliSense, Prisma, GitLens)

Opcional:
- **Supabase CLI** — só necessário pra regenerar tipos após migrations
- **PostgreSQL client** (DBeaver, TablePlus) — para inspecionar o banco

---

## 2. Clone e instalação

```bash
git clone https://github.com/tenangelo/Zeus-Financeiro.git
cd Zeus-Financeiro
pnpm install
```

`pnpm install` na raiz instala todos os workspaces (`apps/*`, `packages/*`).

---

## 3. Configurar variáveis de ambiente

### Frontend — `apps/web/.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://mqayqkwcuxhovunmwgpy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<peça pro Angelo ou pegue em Supabase → Settings → API>
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### Backend — `apps/api/.env`
```env
NODE_ENV=development
PORT=3001
SUPABASE_URL=https://mqayqkwcuxhovunmwgpy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
JWT_SECRET=<qualquer-string-longa-pra-dev>
JWT_AUDIENCE=authenticated
JWT_ISSUER=https://mqayqkwcuxhovunmwgpy.supabase.co/auth/v1
ALLOWED_ORIGINS=http://localhost:3000
```

> Variáveis Stripe (`STRIPE_SECRET_KEY` etc) **não são obrigatórias** — `StripeService` é lazy-init, a API sobe sem.

---

## 4. Rodar

### Em terminais separados

```bash
# Terminal 1 — API em :3001
pnpm --filter @zeus/api dev

# Terminal 2 — Web em :3000
pnpm --filter @zeus/web dev
```

### Acessar
- App cliente: http://localhost:3000 (login + dashboard)
- Painel admin: http://localhost:3000/admin (redireciona para `/admin/login`)
- API: http://localhost:3001/api/v1/health

---

## 5. Comandos úteis

### Type-check (rode antes de commitar!)
```bash
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
```

### Build de produção (verificar antes de pushar)
```bash
cd apps/api && npx nest build
cd apps/web && npx next build
```

### Regenerar tipos do Supabase (após migration nova)
```bash
supabase gen types typescript --project-id mqayqkwcuxhovunmwgpy \
  > packages/database/src/types/supabase.ts
```
Após regenerar, remover casts `as any` que não são mais necessários (procurar por comentários `// Note: cast to any while @zeus/database types`).

### Acesso direto ao banco (diagnóstico)
```bash
SRK="<service_role_key>"
# Ler uma tabela
curl "https://mqayqkwcuxhovunmwgpy.supabase.co/rest/v1/profiles?id=eq.<uuid>" \
  -H "apikey: $SRK" -H "Authorization: Bearer $SRK"
# Inserir
curl -X POST "https://mqayqkwcuxhovunmwgpy.supabase.co/rest/v1/<tabela>" \
  -H "apikey: $SRK" -H "Authorization: Bearer $SRK" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"campo": "valor"}'
```

---

## 6. Estrutura do projeto

```
.
├── apps/
│   ├── api/            NestJS + Fastify (backend)
│   │   └── src/
│   │       ├── auth/         JWT guards, login/refresh
│   │       ├── tenants/      Multi-tenancy
│   │       ├── admin/        Painel super-admin (guard + endpoints)
│   │       ├── plans/        Tiers de assinatura
│   │       ├── stripe/       Gateway de pagamento (a migrar pra Asaas)
│   │       ├── transactions/ DRE, fluxo de caixa
│   │       ├── stock/        Movimentações
│   │       ├── ingredients/  Insumos + fichas técnicas
│   │       └── cmv/          Custo de mercadoria vendida
│   │
│   └── web/            Next.js 14 (App Router)
│       └── src/
│           ├── app/
│           │   ├── login/         App cliente
│           │   ├── admin/         Painel super-admin (dark theme)
│           │   ├── dashboard/     Visão financeira do tenant
│           │   ├── onboarding/    Primeira configuração
│           │   └── ...
│           ├── components/   UI compartilhada (Shadcn)
│           ├── lib/          api.ts, supabase client, utils
│           └── middleware.ts Auth + redirect /admin/login
│
├── packages/
│   ├── database/       Tipos auto-gerados (DO NOT EDIT MANUALLY)
│   └── shared/         Validators, formatters, helpers
│
├── supabase/
│   └── migrations/     SQL versionado
│
├── docs/               Documentação viva
│   ├── DEPLOYMENT.md
│   ├── DEVELOPMENT.md  (este arquivo)
│   ├── ROADMAP.md
│   └── history/        Docs antigos
│
└── CLAUDE.md           Guia para a IA (e humanos novos)
```

---

## 7. Workflow de desenvolvimento

1. **Atualize a base:** `git pull origin main`
2. **Crie branch:** `git checkout -b feature/<nome-curto>`
3. **Code:** edite, rode dev, teste manualmente
4. **Verifique:** `npx tsc --noEmit` em `apps/api` e `apps/web`
5. **Commit:** padrão Conventional Commits em PT-BR
   ```
   feat(api): adiciona endpoint de relatório CMV mensal
   fix(web): corrige redirect do /admin/login
   chore: atualiza pnpm-lock
   docs: ajusta DEPLOYMENT.md
   ```
6. **Push + PR** OU push direto em `main` (sem staging)
7. **Acompanhe deploy:** Vercel/Railway atualizam em <2min

---

## 8. Tornar uma conta super admin

```sql
-- No Supabase SQL Editor:
UPDATE profiles SET is_super_admin = true
WHERE id = '<uuid-do-usuario>';
```
Depois acesse `https://<host>/admin/login`.

---

## 9. Troubleshooting comum

**"Cannot find module '@zeus/database'"** → Você editou em `packages/database` mas não rodou `pnpm install`. Rode na raiz.

**TypeScript reclamando que `plans`/`subscriptions` não existem como tabela** → Os tipos não foram regenerados após a migration `20260427000000`. Rode `supabase gen types ...` (§5) ou use cast `as any` temporário.

**Login admin redirecionando em loop** → Cache do middleware com cookie velho. Limpe cookies de `localhost:3000` e tente de novo.

**API retorna `403 Forbidden` no `/admin/metrics` mesmo logado** → `is_super_admin=false` no seu profile. Rode o SQL de §8.

**`SUPABASE_SERVICE_ROLE_KEY` ausente quebra startup da API** → Confira o `.env` da API. ANON key (pública) **não substitui** a service role.

---

## 10. Recursos

- [CLAUDE.md](../CLAUDE.md) — guia operacional para IA + gotchas
- [docs/DEPLOYMENT.md](./DEPLOYMENT.md) — produção
- [docs/ROADMAP.md](./ROADMAP.md) — fases e prioridades
- [Supabase Dashboard](https://supabase.com/dashboard/project/mqayqkwcuxhovunmwgpy)
- [Vercel Dashboard](https://vercel.com/angelo-goncalves-projects/zeus-financeiro-web)
- [Railway Dashboard](https://railway.app/project/financeiro-zeus)
