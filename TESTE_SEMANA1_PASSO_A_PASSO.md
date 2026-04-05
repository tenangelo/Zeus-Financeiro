# Zeus Financeiro — Guia de Teste da Semana 1
## Passo a Passo para Validar Multi-Tenancy + RLS

**Objetivo**: Validar que RLS, Auth e TenantProvider funcionam corretamente.

---

## 📋 Pré-Requisitos

- [ ] Projeto Zeus Financeiro clonado localmente
- [ ] Conta Supabase criada (free tier funciona)
- [ ] Variáveis `.env.local` configuradas:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
  ```

---

## 🚀 Teste 1: Executar RLS Policies

### Passo 1.1: Abrir SQL Editor do Supabase

1. Vá para [app.supabase.com](https://app.supabase.com)
2. Selecione seu projeto Zeus
3. No menu lateral, vá para **SQL Editor**
4. Clique em **New query**

### Passo 1.2: Copiar e Executar RLS Policies

1. Abra o arquivo: `supabase/migrations/20250105000000_rls_policies.sql`
2. Copie **TODO O CONTEÚDO** (Ctrl+A → Ctrl+C)
3. Cole no SQL Editor do Supabase (Ctrl+V)
4. Clique em **Run** (ou Ctrl+Enter)

**Resultado esperado**:
```
✓ RLS policy successfully created for table tenants
✓ RLS policy successfully created for table profiles
✓ RLS policy successfully created for table suppliers
✓ RLS policy successfully created for table ingredients
✓ RLS policy successfully created for table supplier_price_history
✓ RLS policy successfully created for table recipes
✓ RLS policy successfully created for table recipe_items
✓ RLS policy successfully created for table stock_movements
✓ RLS policy successfully created for table transactions
✓ RLS policy successfully created for table cmv_snapshots
✓ RLS policy successfully created for table ai_analysis_logs
✓ RLS policy successfully created for table import_jobs
```

Se vir algum erro como `policy already exists`, significa que já rodou antes (é seguro).

✅ **Teste 1 Completo!**

---

## 👤 Teste 2: Criar Usuário de Demo

### Passo 2.1: Ir para Authentication

1. No Supabase Dashboard, vá para **Authentication** (menu lateral)
2. Clique em **Users**

### Passo 2.2: Criar Novo Usuário

1. Clique em **Create new user**
2. Preencha:
   - **Email**: `demo@zeusfood.local`
   - **Password**: `Demo123!@` (ou outra que quiser)
3. Clique em **Create user**

### Passo 2.3: Copiar UUID

1. O novo usuário aparece na lista
2. **Clique no usuário** para abrir detalhes
3. Copie o **UUID** (ao lado de "ID") — ele tem este formato:
   ```
   550e8400-e29b-41d4-a716-446655440000
   ```
4. **Guarde este UUID** — vai usar no próximo passo

✅ **Teste 2 Completo!**

---

## 🌱 Teste 3: Executar Seed Script

### Passo 3.1: Preparar Seed Script

1. Abra `supabase/seed.sql`
2. Procure por esta linha (perto do topo):
   ```sql
   \set DEMO_USER_ID '00000000-0000-0000-0000-000000000000'
   ```
3. **Substitua** o UUID placeholder pelo UUID que copiou em **Teste 2**
   Exemplo:
   ```sql
   \set DEMO_USER_ID '550e8400-e29b-41d4-a716-446655440000'
   ```

### Passo 3.2: Executar no Supabase

1. No SQL Editor do Supabase, crie uma **New query**
2. Copie o conteúdo inteiro de `supabase/seed.sql` (com o UUID já substituído)
3. Cole no SQL Editor
4. Clique em **Run**

**Resultado esperado**:
```
✓ Tenant criado com ID: (algum UUID)
✓ Profile criado para usuário: (seu UUID)
✓ Seed completo!
```

Depois disso, você terá:
- ✅ 1 Tenant (Restaurante Demo)
- ✅ 1 Profile (seu usuário como owner)
- ✅ 3 Fornecedores
- ✅ 10 Ingredientes
- ✅ 4 Fichas Técnicas
- ✅ 5 Transações

✅ **Teste 3 Completo!**

---

## 🔐 Teste 4: Validar RLS (Isolamento de Dados)

### Passo 4.1: Impersonar como Demo User

1. No SQL Editor do Supabase, procure por um botão que diz **"Run as..." ou "Impersonate"**
2. Selecione seu usuário de demo (`demo@zeusfood.local`)
3. Execute esta query:

```sql
SELECT id, name, slug FROM tenants;
```

**Resultado esperado**:
```
id                                   | name                        | slug
550e8400-e29b-41d4-a716-446655440001 | Restaurante Demo - Zeus     | restaurant-demo
```

Você vê **apenas 1 tenant** (o seu). RLS está funcionando! ✅

### Passo 4.2: Testar Acesso a Fornecedores

```sql
SELECT id, name FROM suppliers;
```

**Resultado esperado**:
```
Distribuidora ABC - Carnes
Frutas e Hortaliças Brasil
Laticínios Paraná
```

Você vê **apenas 3 fornecedores** (os do seu tenant). ✅

### Passo 4.3: Testar Acesso a Ingredientes

```sql
SELECT id, name, unit_cost FROM ingredients;
```

**Resultado esperado**:
```
Carne Bovina (Alcatra)     | 45.50
Frango Peito (Congelado)   | 22.00
Queijo Muzzarela           | 38.00
...
```

Você vê **apenas 10 ingredientes** (os do seu tenant). ✅

### Passo 4.4: Testar Acesso a Transações

```sql
SELECT id, category, description, amount FROM transactions;
```

**Resultado esperado**:
```
category      | description                            | amount
fornecedores  | Compra de carne bovina - NF 001       | 850.00
fornecedores  | Compra de frutas e hortaliças - NF 002| 320.50
aluguel       | Aluguel do restaurante - Maio         | 3500.00
...
```

Você vê **apenas 5 transações** (as do seu tenant). ✅

### Passo 4.5: Tentar Inserir Dados Sem Ser Admin

```sql
INSERT INTO suppliers (tenant_id, name, document)
VALUES (gen_random_uuid(), 'Novo Fornecedor', '12345678000190');
```

**Resultado esperado**:
```
ERROR: new row violates row-level security policy "suppliers_insert"
```

RLS bloqueou porque você não é admin! ✅

✅ **Teste 4 Completo! RLS está 100% seguro.**

---

## 💻 Teste 5: Integrar TenantProvider no Next.js

### Passo 5.1: Abrir o Layout Principal

Abra `apps/web/src/app/layout.tsx` (ou `pages/_app.tsx` se usar Pages Router).

### Passo 5.2: Adicionar TenantProvider

Procure pela estrutura do layout (deve ter algo como):

```tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
      </body>
    </html>
  );
}
```

**Modifique para**:

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

### Passo 5.3: Testar em um Componente

Crie um novo componente de teste (ex: `apps/web/src/components/test-tenant.tsx`):

```tsx
'use client';

import { useCurrentTenant } from '@/lib/context/tenant-context';

export function TestTenant() {
  const { tenantId, loading, error } = useCurrentTenant();

  if (loading) return <p>Carregando...</p>;
  if (error) return <p>Erro: {error}</p>;
  if (!tenantId) return <p>Não autenticado</p>;

  return (
    <div>
      <p>✅ Seu Tenant ID: <code>{tenantId}</code></p>
    </div>
  );
}
```

### Passo 5.4: Adicionar ao Dashboard

Vá para `apps/web/src/app/dashboard/page.tsx` (ou a página principal).

No topo, adicione:

```tsx
import { TestTenant } from '@/components/test-tenant';

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <TestTenant />
      {/* resto do dashboard */}
    </div>
  );
}
```

### Passo 5.5: Testar no Navegador

1. Abra seu terminal na raiz do projeto
2. Execute:
   ```bash
   cd apps/web
   npm install  # se não fez ainda
   npm run dev
   ```
3. Vá para `http://localhost:3000`
4. Faça login com:
   - Email: `demo@zeusfood.local`
   - Senha: `Demo123!@`
5. Vá para `/dashboard`
6. **Você deve ver**:
   ```
   ✅ Seu Tenant ID: 550e8400-e29b-41d4-a716-446655440001
   ```

Se vir isto, o TenantProvider está funcionando! ✅

### Passo 5.6: Testar Hooks de Dados

Crie outro componente de teste (`apps/web/src/components/test-tenant-data.tsx`):

```tsx
'use client';

import { useTenantData, useProfileData } from '@/lib/hooks/use-tenant-data';

export function TestTenantData() {
  const { data: tenant, isLoading: tenantLoading } = useTenantData();
  const { data: profile, isLoading: profileLoading } = useProfileData();

  if (tenantLoading || profileLoading) return <p>Carregando dados...</p>;

  return (
    <div>
      <h2>Dados do Tenant</h2>
      <p>Nome: {tenant?.name}</p>
      <p>Plano: {tenant?.plan_tier}</p>

      <h2>Dados do Profile</h2>
      <p>Usuário: {profile?.full_name}</p>
      <p>Role: {profile?.role}</p>
    </div>
  );
}
```

Adicione ao dashboard:

```tsx
import { TestTenantData } from '@/components/test-tenant-data';

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <TestTenant />
      <TestTenantData />
    </div>
  );
}
```

**Resultado esperado**:
```
Dados do Tenant
Nome: Restaurante Demo - Zeus
Plano: pro

Dados do Profile
Usuário: Gerente Demo
Role: owner
```

✅ **Teste 5 Completo! TenantProvider + Hooks funcionando!**

---

## ✅ Checklist Final

- [ ] RLS Policies executadas no Supabase
- [ ] Usuário de demo criado em Authentication
- [ ] Seed script executado com sucesso
- [ ] RLS testado (queries retornam apenas dados do tenant)
- [ ] TenantProvider integrado no layout
- [ ] Componente de teste mostra tenant_id corretamente
- [ ] Hooks de dados retornam informações do tenant e profile

---

## 🎉 Se Tudo Passou

Parabéns! Você tem agora um **sistema multi-tenant 100% funcional e seguro**.

Está pronto para a **Semana 2: Parsers de Importação** (NFCe + CSV).

---

## 🐛 Troubleshooting

### "Erro: Supabase não configurado"
Verifique `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` = URL do seu projeto
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Chave anon do Supabase

### "useCurrentTenant deve ser usado dentro de TenantProvider"
Verifique se envolveu o componente com `<TenantProvider>` em `layout.tsx`.

### "RLS policy rejeita a query"
Confirme que você está logado como o usuário correto. Clique em seu avatar → Profile → copie o UUID do usuário.

### "Seed script falhou"
Verifique se:
1. RLS policies foram executadas antes
2. UUID do usuário está correto (sem aspas extras)
3. Não há conflitos de IDs duplicados (execute seed apenas 1 vez)

---

Se algo não funcionar, **avise que fase está dando erro** e vamos debugar juntos! 🚀
