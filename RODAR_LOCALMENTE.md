# Zeus Financeiro — Rodar Localmente no Seu PC

O projeto precisa ser rodado no seu computador para testar corretamente. Este guia mostra exatamente como fazer.

---

## 📋 Pré-Requisitos

Instale em seu PC (Windows, Mac ou Linux):

1. **Node.js 20+** — [https://nodejs.org](https://nodejs.org)
   - Verifique: `node --version` (deve ser v20 ou maior)

2. **pnpm 10+** — gestor de pacotes (mais rápido que npm)
   ```bash
   npm install -g pnpm@10.0.0
   ```

3. **Git** — [https://git-scm.com](https://git-scm.com)

4. **Uma conta Supabase** — [https://supabase.com](https://supabase.com)
   - Projeto já criado (você deve ter as credenciais no `.env`)

---

## 🚀 Passo 1: Clonar o Projeto

```bash
# Abra seu terminal e navegue até onde quer clonar
cd ~/projetos  # ou seu diretório de projetos

# Clone o repositório
git clone <URL-DO-SEU-REPO> zeus-financeiro
cd zeus-financeiro

# Verifique se está no branch correto
git log --oneline | head -3
```

---

## 📦 Passo 2: Instalar Dependências

```bash
# Instale todas as dependências (monorepo)
pnpm install

# Espere (pode levar 2-3 minutos na primeira vez)
# Verá: "✔ resolved X packages"
```

---

## 🔧 Passo 3: Configurar Variáveis de Ambiente

O arquivo `.env` já deve estar configurado no projeto. Verifique:

```bash
# Abra o arquivo .env
cat .env

# Deve ter (substitua pelos seus valores reais):
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Se não tiver, copie `.env.example` para `.env` e preencha:

```bash
cp .env.example .env
# Abra em seu editor e preencha as URLs do Supabase
```

---

## 🗄️ Passo 4: Aplicar Migrations (RLS Policies)

Agora vamos aplicar o RLS no Supabase (segurança multi-tenant):

### Opção A: Via Supabase Dashboard (Mais Fácil)

1. Vá para [app.supabase.com](https://app.supabase.com)
2. Selecione seu projeto Zeus
3. Clique em **SQL Editor** (menu lateral esquerdo)
4. Clique em **New query**
5. Abra o arquivo `supabase/migrations/20250105000000_rls_policies.sql` em seu editor
6. Copie **TODO O CONTEÚDO** (Ctrl+A → Ctrl+C)
7. Cole no SQL Editor do Supabase (Ctrl+V)
8. Clique em **Run** (ou Ctrl+Enter)

**Resultado esperado**: Vê mensagens "successfully created for table..." em verde.

### Opção B: Via CLI (Para Avançados)

Se tiver Supabase CLI instalado (`supabase --version`):

```bash
supabase db push
```

---

## 👤 Passo 5: Criar Usuário de Demo + Seed Data

### 5.1 Criar Usuário

1. No Supabase Dashboard, vá para **Authentication → Users**
2. Clique em **Create new user**
3. Preencha:
   - Email: `demo@zeusfood.local`
   - Password: `Demo123!@`
4. Clique em **Create user**
5. **Copie o UUID** (aparece ao lado de "ID") — tem este formato:
   ```
   550e8400-e29b-41d4-a716-446655440000
   ```

### 5.2 Executar Seed Script

1. Abra `supabase/seed.sql` em seu editor
2. Procure por esta linha (perto do topo):
   ```sql
   \set DEMO_USER_ID '00000000-0000-0000-0000-000000000000'
   ```
3. **Substitua** pelo UUID real que copiou:
   ```sql
   \set DEMO_USER_ID '550e8400-e29b-41d4-a716-446655440000'
   ```
4. Copie **TODO O CONTEÚDO** de `seed.sql` (com o UUID já substituído)
5. No SQL Editor do Supabase, crie uma **New query**
6. Cole e clique em **Run**

**Resultado esperado**:
```
✓ Tenant criado com ID: (algum UUID)
✓ Profile criado para usuário: (seu UUID)
✓ Seed completo!
```

---

## 💻 Passo 6: Rodar o Frontend (Next.js)

```bash
# Abra um terminal novo (deixe um aberto para o backend)
cd apps/web

# Inicie o servidor Next.js
pnpm run dev

# Verá:
# ▲ Next.js 15.1.3
# - Local:        http://localhost:3000
# - Environments: .env.local
```

Abra no navegador: **http://localhost:3000**

---

## 🔌 Passo 7: Rodar o Backend (NestJS) — Opcional

Se quiser testar a API também:

```bash
# Abra outro terminal
cd apps/api

# Inicie o servidor NestJS
pnpm run dev

# Verá:
# [Nest] X  - 04/05/2026, 10:00:00 AM     LOG [NestFactory] Nest application successfully started
# [Nest] X  - 04/05/2026, 10:00:00 AM     LOG [NestApplication] Listening on port 3001 +1ms
```

API estará em: **http://localhost:3001**

---

## 🧪 Passo 8: Testar Multi-Tenancy + RLS

### Teste 1: Fazer Login

1. Vá para **http://localhost:3000**
2. Clique em "Login" ou "Sign In"
3. Faça login com:
   - Email: `demo@zeusfood.local`
   - Senha: `Demo123!@`

### Teste 2: Ver Tenant ID

Após login, você deve ser redirecionado para o dashboard.

Procure por um texto que diz (você criou um componente de teste):
```
✅ Seu Tenant ID: 550e8400-e29b-41d4-a716-446655440001
```

Se vir isto, **TenantProvider está funcionando!** ✅

### Teste 3: Verificar Dados

O dashboard deve mostrar:
```
Dados do Tenant
Nome: Restaurante Demo - Zeus
Plano: pro

Dados do Profile
Usuário: Gerente Demo
Role: owner
```

Se vir isto, **Multi-tenancy está 100% funcional!** ✅

### Teste 4: Validar RLS

Abra a console do navegador (F12 → Console) e execute:

```javascript
// Verifique se consegue acessar dados do Supabase
const { data, error } = await supabase
  .from('suppliers')
  .select('*');

console.log('Fornecedores:', data);
// Deve mostrar 3 fornecedores (os do seu tenant)
```

Se vir 3 fornecedores, **RLS está funcionando!** ✅

---

## 🎯 Checklist de Sucesso

- [ ] `npm -v` retorna 20+
- [ ] `pnpm -v` retorna 10+
- [ ] `pnpm install` finalizou sem erros
- [ ] RLS policies aplicadas no Supabase
- [ ] Usuário de demo criado
- [ ] Seed script executado
- [ ] `pnpm run dev` funciona em `apps/web`
- [ ] Login funciona em http://localhost:3000
- [ ] Vê "Seu Tenant ID" no dashboard
- [ ] Vê dados do tenant e profile

Se todos estão marcados ✅, você está pronto para a **Semana 2**!

---

## 🐛 Troubleshooting

### "ENOENT: no such file or directory"
```bash
# Limpe cache e reinstale
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### "Cannot find module '@zeus/database'"
```bash
# Gere tipos do Supabase
pnpm db:generate-types
```

### "Erro 401 no Supabase"
Verifique `.env`:
- `NEXT_PUBLIC_SUPABASE_URL` está correto?
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` está correto?

Copie novamente das Project Settings do Supabase.

### "RLS rejeitou a query"
Verifique:
1. RLS policies foram aplicadas?
2. Você está logado como o usuário de demo?
3. Os dados existem (seed foi executado)?

---

## 📚 Próximas Passos

Após validar tudo:

1. **Comite a Semana 1** (com tudo funcionando):
   ```bash
   git add .
   git commit -m "Semana 1: Multi-tenancy + RLS + TenantProvider"
   git push
   ```

2. **Comece a Semana 2** (Parsers de importação)
   - Parser XML NFCe
   - Parser CSV
   - Endpoint de upload

---

## ⚡ Dicas Úteis

### Modo Debug

Para ver logs detalhados:

```bash
# Terminal do Next.js
DEBUG=* pnpm run dev
```

### Live Reload

O Next.js faz reload automático ao salvar arquivos. Para o NestJS:

```bash
# Terminal do NestJS
pnpm run dev  # já tem --watch
```

### Limpar Dados de Teste

Para resetar e testar de novo:

```bash
# No SQL Editor do Supabase:
DELETE FROM transactions;
DELETE FROM recipes;
DELETE FROM ingredients;
DELETE FROM suppliers;
DELETE FROM profiles WHERE id = 'seu-uuid-aqui';
DELETE FROM tenants;
```

Depois rode o seed novamente.

---

## 🚀 Está Pronto!

Agora você tem um **ambiente local 100% funcional** com:
- ✅ Frontend (Next.js) + Backend (NestJS)
- ✅ Multi-tenancy com RLS
- ✅ Auth integrado com Supabase
- ✅ Dados de demo para brincar

**Vamos para a Semana 2!** 💪
