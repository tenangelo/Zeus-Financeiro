# Como Aplicar o Schema no Supabase

## Passo 1 — Acessar o SQL Editor
https://supabase.com/dashboard/project/mqayqkwcuxhovunmwgpy/sql/new

## Passo 2 — Executar em ordem (3 partes para evitar timeout)

### PARTE 1: Extensões + ENUMs + Tabelas base
Cole e execute: supabase/migrations/20250101000000_initial_schema.sql
(linhas 1 até o fim da Seção 2 — tabelas)

### Passo 3 — Verificar se as tabelas foram criadas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

Deve retornar:
- ai_analysis_logs
- cmv_snapshots
- import_jobs
- ingredients
- profiles
- recipe_items
- recipes
- stock_movements
- supplier_price_history
- suppliers
- tenants
- transactions

### Passo 4 — Testar isolamento RLS (criar 2 usuários de teste)
-- Executar após aplicar o schema completo
-- Criar via Supabase Dashboard > Authentication > Users > Add User

Usuário A: clienteA@zeus.test / senha: Test@1234
Usuário B: clienteB@zeus.test / senha: Test@1234

### Passo 5 — Criar tenants de teste via função
SELECT create_tenant_with_owner(
  '<uuid-do-usuario-A>',
  'Restaurante A',
  'restaurante-a',
  'Dono A',
  '+5511999990001'
);

SELECT create_tenant_with_owner(
  '<uuid-do-usuario-B>',
  'Restaurante B',
  'restaurante-b',
  'Dono B',
  '+5511999990002'
);

### Passo 6 — Validar RLS (CRÍTICO)
-- Simulando como clienteA — DEVE retornar apenas dados do Restaurante A
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub": "<uuid-do-usuario-A>"}';

SELECT * FROM transactions;
-- ✅ ESPERADO: retorna vazio (sem transações ainda) mas SEM erro de acesso
-- ❌ FALHA: retornar dados do Restaurante B = policy com bug
