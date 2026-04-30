# Zeus Financeiro — Fase 1, Semana 1
## Implementação: Multi-Tenancy + Auth + RLS

**Status**: ✅ Concluído
**Data**: 5 de Janeiro de 2025
**Próxima Fase**: Semana 2 (Parsers de importação)

---

## 📋 O que foi entregue

### 1. **RLS Policies Completas** (`supabase/migrations/20250105000000_rls_policies.sql`)

Criamos **políticas de Row Level Security (RLS)** para garantir que cada tenant acesse apenas seus próprios dados.

**Estratégia de segurança**:
- Função central: `get_current_tenant_id()` — resolve o `tenant_id` do usuário autenticado via seu profile
- Cada tabela tem policies de SELECT, INSERT, UPDATE, DELETE
- Dados imutáveis (ledger): bloqueia UPDATE/DELETE (ex: `stock_movements`, `transactions`, `cmv_snapshots`)
- Admin-only: INSERT/UPDATE/DELETE restritos a `is_tenant_admin()` (owner ou manager)

**Cobertura**:
- ✅ tenants
- ✅ profiles
- ✅ suppliers
- ✅ ingredients
- ✅ supplier_price_history
- ✅ recipes
- ✅ recipe_items
- ✅ stock_movements
- ✅ transactions
- ✅ cmv_snapshots
- ✅ ai_analysis_logs
- ✅ import_jobs

**Como usar**:
1. Vá para [Supabase Dashboard](https://app.supabase.com) → seu projeto
2. SQL Editor → crie nova query
3. Copie o conteúdo de `supabase/migrations/20250105000000_rls_policies.sql`
4. Execute
5. Verifique o resultado: "RLS policy successfully created for table X" para cada tabela

---

### 2. **TenantProvider + Context** (`apps/web/src/lib/context/tenant-context.tsx`)

Criamos um **React Context** para compartilhar o `tenant_id` em toda a aplicação.

```tsx
// Exemplo de uso:
import { useCurrentTenant } from '@/lib/context/tenant-context';

export function MyComponent() {
  const { tenantId, loading } = useCurrentTenant();

  if (loading) return <Skeleton />;
  if (!tenantId) return <p>Usuário não autenticado</p>;

  return <Dashboard tenantId={tenantId} />;
}
```

**Fluxo**:
1. Usuário faz login via Supabase Auth
2. `middleware.ts` valida a sessão
3. `TenantProvider` lê `auth.uid()` e busca seu profile
4. Extrai `tenant_id` e compartilha via Context
5. Componentes usam `useCurrentTenant()` para acessar

**Como integrar**:
1. Na raiz da app (`app/layout.tsx` ou `app.tsx`), wrape com TenantProvider:

```tsx
import { TenantProvider } from '@/lib/context/tenant-context';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <TenantProvider>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}
```

---

### 3. **Hooks para Dados do Tenant** (`apps/web/src/lib/hooks/use-tenant-data.ts`)

Dois hooks prontos para buscar dados:

```tsx
// Hook 1: Dados do tenant (nome, plano, settings)
const { data: tenant, isLoading } = useTenantData();

// Hook 2: Dados do profile do usuário (full_name, role, etc)
const { data: profile, isLoading } = useProfileData();
```

Integram com React Query para cache automático.

---

### 4. **Seed Script para Testes** (`supabase/seed.sql`)

Cria um tenant de demo com:
- ✅ 1 restaurante ("Restaurante Demo - Zeus")
- ✅ 1 user profile (owner)
- ✅ 3 fornecedores (carnes, frutas, laticínios)
- ✅ 10 ingredientes (com preços e estoque)
- ✅ 4 fichas técnicas (pratos do cardápio)
- ✅ 5 transações financeiras (contas a pagar/receber)

**Como usar**:
1. Na Supabase dashboard, vá para **Authentication → Users**
2. Crie um novo usuário: `demo@zeusfood.local` / `Demo123!@`
3. Copie o UUID do novo usuário
4. No SQL Editor, abra `supabase/seed.sql`
5. Na linha `\set DEMO_USER_ID '...'`, substitua pelo UUID do usuário
6. Execute o script
7. ✅ Agora você tem dados para testar!

**Testes de RLS** (após seed):
```sql
-- Como o usuário de demo, execute estas queries:
SELECT * FROM tenants;           -- Vê apenas seu restaurante
SELECT * FROM suppliers;         -- Vê seus 3 fornecedores
SELECT * FROM ingredients;       -- Vê seus 10 ingredientes
SELECT * FROM recipes;          -- Vê suas 4 fichas técnicas
SELECT * FROM transactions;     -- Vê suas 5 transações
```

---

## 🏗️ Arquitetura da Multi-Tenancy

```
┌─────────────────────────────────────────┐
│     Supabase Auth (auth.users)          │
│     (Usuários e Sessões)                │
└──────────────┬──────────────────────────┘
               │
               │ auth.uid() = uuid
               ↓
┌─────────────────────────────────────────┐
│     profiles (profiles.id = auth.uid())  │
│     - full_name                         │
│     - role (owner, manager, staff)      │
│     - tenant_id ← KEY IMPORTANTE!       │
└──────────────┬──────────────────────────┘
               │
               │ get_current_tenant_id()
               ↓
┌─────────────────────────────────────────┐
│     RLS Policies                        │
│     - Cada tabela só acessa dados       │
│       onde tenant_id = auth user's      │
│       tenant_id (via get_current...)    │
└─────────────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│     Dados isolados por tenant:          │
│     - tenants                           │
│     - suppliers                         │
│     - ingredients                       │
│     - recipes                           │
│     - transactions                      │
│     - etc...                            │
└─────────────────────────────────────────┘
```

---

## 🛠️ Como Continuar para a Semana 2

### Parsers de Importação

A próxima semana focará em criar os **parsers para importar dados de PDV**:

1. **Parser XML NFCe** — lê notas fiscais (XML modelo 65) do PDV
   - Extrai: data, itens (prato + quantidade), valor total
   - Insere como `transactions` (receita) no banco

2. **Parser CSV Universal** — aceita planilha de qualquer PDV
   - Mapeamento de colunas customizável
   - Templates pré-configurados para Saipos, GrandChef, etc.

3. **Endpoint de Upload** — API para enviar arquivo
   - Salva em Supabase Storage
   - Enfileira job em Trigger.dev
   - Retorna `import_job_id` para tracking

---

## 📝 Próximos Passos

### Imediato (antes de Semana 2):
1. **Execute as RLS policies** no Supabase (copiar/colar no SQL Editor)
2. **Crie um usuário de demo** na Auth
3. **Execute o seed script** com o UUID do demo user
4. **Integre TenantProvider** na raiz da app (`layout.tsx`)
5. **Teste RLS**: faça login como demo user e veja se consegue acessar só seus dados

### Semana 2:
1. Criar parser XML NFCe
2. Criar parser CSV
3. Endpoint de upload + Trigger.dev

### Perguntas frequentes

**P: Onde fica o tenant_id do JWT?**
R: Não fica no JWT — está na tabela `profiles`. O RLS usa `get_current_tenant_id()` que busca via `auth.uid() → profiles.tenant_id`. Assim, o JWT não precisa conhecer tenant_id (mais seguro).

**P: E se um usuário trocar de tenant?**
R: Atualizar seu `profile.tenant_id` é suficiente. Na próxima requisição, `get_current_tenant_id()` retorna o novo valor. O frontend deve refrescar a página ou recarregar o `TenantProvider`.

**P: Posso ter um usuário em múltiplos tenants?**
R: Hoje não — um profile tem um `tenant_id`. Para suportar múltiplos, seria necessário:
1. Criar tabela `profile_tenants` (many-to-many)
2. Adicionar `tenant_id` no JWT via custom claims
3. Ajustar RLS para usar JWT claim ao invés de profile lookup
Deixamos para fase futura se necessário.

**P: Como testo se RLS está funcionando?**
R: No SQL Editor da Supabase, há opção "Impersonate as user" → escolha um usuário → execute query. Verá apenas dados do tenant desse usuário.

---

## 🚀 Status de Conclusão

| Tarefa | Status | Link |
|--------|--------|------|
| RLS Policies | ✅ Pronto | `supabase/migrations/20250105000000_rls_policies.sql` |
| TenantProvider | ✅ Pronto | `apps/web/src/lib/context/tenant-context.tsx` |
| use-tenant-data hooks | ✅ Pronto | `apps/web/src/lib/hooks/use-tenant-data.ts` |
| Seed script | ✅ Pronto | `supabase/seed.sql` |
| **Semana 1: COMPLETA** | ✅ | Próxima: Semana 2 |

---

## 📚 Referências

- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Middleware + Supabase](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [React Context + Query](https://react-query.tanstack.com/)
- [Supabase Auth Flow](https://supabase.com/docs/guides/auth/auth-flow)
