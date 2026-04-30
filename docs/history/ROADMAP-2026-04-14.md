# 🎯 Zeus Financeiro - Roadmap de Correções e Melhorias

**Data:** 2026-04-14
**Status:** Deploy em produção com problemas críticos

---

## 📊 Diagnóstico Atual

### ✅ O que está funcionando
- Frontend (Next.js) carrega e renderiza corretamente
- Login via Supabase Auth funciona
- Dashboard acessível em https://zeusweb-production.up.railway.app/dashboard
- Database (Supabase) operacional
- Railway está rodando os 2 serviços (@zeus/web e @zeus/api)

### ❌ Problemas Críticos
1. **API retorna 404 em todos endpoints públicos**
   - Causa: Prefixo global `/api/v1` não está sendo considerado no frontend
   - Endpoint correto: `/api/v1/auth/login` (não `/auth/login`)

2. **CORS mal configurado**
   - `FRONTEND_URL` não estava sendo passada no railway.json (corrigido)
   - Precisa validar origins múltiplas (Vercel + Railway)

3. **GitHub Actions CI/CD falhando constantemente**
   - 6+ tentativas falharam em `setup-node@v4` e `pnpm install`
   - Atualmente desabilitado (workflow info-only)

4. **Dashboard mostra "API offline"**
   - Frontend não consegue se comunicar com a API
   - Erro propaga como "Failed to fetch"

5. **Variáveis de ambiente inconsistentes**
   - `NEXT_PUBLIC_API_URL` foi apontada para URL interna (privada)
   - Depois para URL pública mas com path errado
   - Falta: `FRONTEND_URL`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

6. **Sem healthcheck nem monitoramento**
   - Sem endpoint `/health` na API
   - Sem logs centralizados
   - Sem alertas de downtime

---

## 🗓️ Cronograma de Execução

### 📌 FASE 1 — Correções Críticas (Dia 1 — HOJE)
**Objetivo:** Colocar o sistema 100% funcional end-to-end

#### 1.1 — Corrigir API Base URL no Frontend (30 min)
- [ ] Atualizar `NEXT_PUBLIC_API_URL` para incluir `/api/v1`
  - Valor: `https://zeusapi-production-b66c.up.railway.app/api/v1`
- [ ] OU: Configurar axios/fetch baseURL com `/api/v1` no código
- [ ] Redeploy Vercel
- [ ] Validar login end-to-end

#### 1.2 — Criar Endpoint `/health` na API (20 min)
- [ ] Adicionar `HealthController` no NestJS
- [ ] Retornar: `{ status: "ok", timestamp, version, uptime }`
- [ ] Testar via curl
- [ ] Atualizar railway.json com healthcheck real

#### 1.3 — Configurar CORS Adequadamente (20 min)
- [ ] Aceitar múltiplas origins (array):
  - `https://zeusweb-production.up.railway.app`
  - `https://zeus-financeiro-*.vercel.app`
  - `http://localhost:3000` (dev)
- [ ] Commit e push → redeploy automático
- [ ] Validar no browser sem erros CORS

#### 1.4 — Sincronizar Variáveis de Ambiente (30 min)
- [ ] **Railway @zeus/api:**
  - `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `JWT_SECRET`, `FRONTEND_URL`, `PORT=3001`, `NODE_ENV=production`
- [ ] **Railway @zeus/web:**
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_API_URL`, `NODE_ENV=production`
- [ ] **Vercel:** sync com Railway @zeus/web
- [ ] Criar `.env.example` atualizado no repo

#### 1.5 — Teste Integração Completo (30 min)
- [ ] Login → Dashboard
- [ ] Criar Lançamento Financeiro
- [ ] Calcular DRE
- [ ] Calcular CMV
- [ ] Verificar dados no Supabase

**⏰ Total Fase 1:** ~2h 10min

---

### 📌 FASE 2 — Estabilização (Dias 2-3)
**Objetivo:** Infraestrutura confiável e pipeline CI/CD funcional

#### 2.1 — Reestruturar GitHub Actions (2h)
- [ ] Remover workflow complexo atual
- [ ] Criar workflow minimalista que:
  - Lint + Type Check
  - Build de cada workspace
  - Testes unitários (quando existirem)
- [ ] Separar em 2 workflows:
  - `ci.yml` — para PRs (validação)
  - `deploy.yml` — para main (deploy automático)
- [ ] Usar `pnpm/action-setup@v4` (versão estável)
- [ ] Fixar `packageManager` no `package.json` raiz
- [ ] Gerar novo `pnpm-lock.yaml` limpo

#### 2.2 — Configurar Preview Deployments (1h)
- [ ] Vercel Preview para cada PR
- [ ] Railway Preview environments (se plano permitir)
- [ ] URL única por PR para validação

#### 2.3 — Logs e Monitoramento (2h)
- [ ] Integrar Logtail/Axiom/Better Stack (free tier)
- [ ] Enviar logs da API e Web
- [ ] Dashboard de métricas básicas
- [ ] Alertas por email para:
  - API down
  - Erros 5xx > threshold
  - Response time > 2s

#### 2.4 — Banco de Dados — Migrações Automatizadas (1h 30min)
- [ ] Script para rodar migrations Supabase em deploy
- [ ] Backup automático antes de migrations
- [ ] Rollback automático em caso de falha

#### 2.5 — Documentação Swagger em Produção (30min)
- [ ] Habilitar Swagger em produção (rota protegida)
- [ ] `https://zeusapi.../api/docs` com Basic Auth
- [ ] Exportar OpenAPI spec para o time

**⏰ Total Fase 2:** ~7h (distribuído em 2 dias)

---

### 📌 FASE 3 — Melhorias e Otimizações (Dias 4-7)
**Objetivo:** Performance, segurança e UX

#### 3.1 — Segurança (3h)
- [ ] Rate limiting na API (`@nestjs/throttler`)
- [ ] Helmet.js headers de segurança
- [ ] Sanitização de inputs em todos os DTOs
- [ ] Rotação de JWT secrets
- [ ] Audit log de ações sensíveis
- [ ] RLS (Row Level Security) validado no Supabase

#### 3.2 — Performance (3h)
- [ ] Cache de queries frequentes (Redis no Railway)
- [ ] Paginação server-side em listagens
- [ ] Compressão gzip/brotli no Fastify
- [ ] Imagens otimizadas no Next.js (`next/image`)
- [ ] Bundle analysis e code splitting
- [ ] Prefetch de rotas críticas

#### 3.3 — UX/UI (4h)
- [ ] Estados de loading em todas chamadas
- [ ] Mensagens de erro amigáveis (não "Failed to fetch")
- [ ] Toast notifications consistentes
- [ ] Skeleton loaders no dashboard
- [ ] Empty states bem desenhados
- [ ] Mobile responsivo validado
- [ ] Modo escuro (opcional)

#### 3.4 — Testes Automatizados (6h)
- [ ] Testes unitários — serviços críticos (Jest)
- [ ] Testes E2E — fluxo de login e transações (Playwright)
- [ ] Cobertura mínima: 60%
- [ ] CI roda testes em cada PR

#### 3.5 — Observabilidade Avançada (2h)
- [ ] Sentry para error tracking (free tier)
- [ ] Métricas customizadas (transações/dia, usuários ativos)
- [ ] Dashboard Grafana ou similar

**⏰ Total Fase 3:** ~18h (distribuído em 4 dias)

---

### 📌 FASE 4 — Reformulação Arquitetural (Semanas 2-3)
**Objetivo:** Preparar para escalar e multi-tenancy robusto

#### 4.1 — Revisão Multi-Tenant (6h)
- [ ] Validar isolamento de dados por `tenant_id`
- [ ] RLS policies revisadas e testadas
- [ ] Middleware de contexto de tenant
- [ ] Testes de isolamento (tenant A não vê dados de B)

#### 4.2 — Feature: Agente de IA (12h)
- [ ] Integração OpenAI/Anthropic
- [ ] Análise de DRE com insights
- [ ] Recomendações de economia
- [ ] Chatbot financeiro
- [ ] Histórico de análises

#### 4.3 — Integrações Externas (8h)
- [ ] Nota Fiscal (SEFAZ)
- [ ] Open Banking (se aplicável)
- [ ] Importação de extratos bancários
- [ ] Sincronização com ERPs (Omie, Bling)

#### 4.4 — Mobile App / PWA (10h)
- [ ] Next.js configurado como PWA
- [ ] Instalável no celular
- [ ] Notificações push
- [ ] Modo offline básico

#### 4.5 — Billing e Planos (8h)
- [ ] Integração Stripe
- [ ] Planos: Free, Pro, Enterprise
- [ ] Limites por plano (transações/mês)
- [ ] Checkout e upgrade flow

**⏰ Total Fase 4:** ~44h (2-3 semanas)

---

## 🎯 Priorização (MoSCoW)

### Must Have (Imediato — Fase 1)
- API funcional com `/api/v1`
- CORS configurado
- Login → Dashboard → CRUD básico

### Should Have (Semana 1 — Fase 2)
- CI/CD estável
- Logs e monitoramento
- Migrations automatizadas

### Could Have (Semana 2 — Fase 3)
- Rate limiting e segurança avançada
- Testes automatizados
- Performance tuning

### Won't Have (Futuro — Fase 4)
- IA avançada
- Integrações externas
- Mobile PWA
- Billing

---

## 📋 Checklist de Decisões Técnicas

Precisamos decidir:

- [ ] **Manter Railway ou migrar para Fly.io/Render?**
  - Railway: simples mas caro em escala
  - Fly.io: mais barato, mais controle
  - Render: meio termo

- [ ] **GitHub Actions ou Railway nativo?**
  - Railway já faz deploy automático via Git
  - GitHub Actions pode ser removido completamente

- [ ] **Monorepo pnpm ou Turborepo?**
  - Turborepo tem cache distribuído (remote)
  - Melhor para CI/CD

- [ ] **Frontend: Vercel ou Railway?**
  - Vercel: melhor para Next.js, free tier generoso
  - Railway: centraliza tudo em um lugar
  - **Recomendação:** Vercel para web, Railway só API

- [ ] **Observabilidade: qual stack?**
  - Sentry + Better Stack (logs) + UptimeRobot
  - OU Datadog (caro)
  - OU self-hosted (Grafana + Loki + Prometheus)

---

## 🚨 Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Railway preços aumentarem | Média | Alto | Ter plano B (Fly.io) |
| Supabase down | Baixa | Crítico | Backups diários + read replica |
| Vazamento de dados (multi-tenant) | Média | Crítico | RLS + testes de isolamento |
| pnpm/monorepo issues no CI | Alta | Médio | Migrar para Turborepo |
| Cold starts no Railway | Alta | Médio | Health checks + keep-alive |

---

## 📞 Próximos Passos Imediatos

1. **AGORA:** Executar Fase 1.1 — corrigir `NEXT_PUBLIC_API_URL` com `/api/v1`
2. **AGORA:** Executar Fase 1.2 — criar `/health` endpoint
3. **HOJE:** Completar Fase 1 e validar end-to-end
4. **AMANHÃ:** Iniciar Fase 2 (CI/CD e monitoramento)
5. **Semana 1:** Terminar Fase 2, iniciar Fase 3

---

**Atualizado em:** 2026-04-14
**Responsável:** Ten Angelo + Claude (Assistente)
