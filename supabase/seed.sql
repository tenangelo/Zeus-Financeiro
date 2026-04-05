-- =============================================================================
-- ZEUS FINANCEIRO — Script de Seed (Demo Data)
-- Cria um tenant de demonstração com dados para testes.
-- Executar no Supabase SQL Editor APÓS as migrations.
-- =============================================================================

-- AVISO: Este script assume que você já criou um usuário de demo via Auth.
-- Para criar manualmente:
-- 1. Vá para Authentication → Users no Supabase Dashboard
-- 2. Clique em "Create new user"
-- 3. Email: demo@zeusfood.local, Password: Demo123!@
-- 4. Copie o UUID do novo usuário e substitua abaixo

-- Configuração
-- SUBSTITUA ESTE UUID POR UM USUÁRIO REAL:
\set DEMO_USER_ID '00000000-0000-0000-0000-000000000000'

-- =============================================================================
-- 1. CRIAR TENANT DE DEMO
-- =============================================================================

INSERT INTO tenants (id, name, slug, plan_tier, settings)
VALUES (
  gen_random_uuid(),
  'Restaurante Demo - Zeus',
  'restaurant-demo',
  'pro',
  jsonb_build_object(
    'cmv_alert_threshold_pct', '35',
    'waste_alert_threshold_pct', '5',
    'notification_hour', '09:00',
    'timezone', 'America/Sao_Paulo',
    'currency', 'BRL'
  )
)
RETURNING id AS tenant_id \gset

-- Confirmação
SELECT 'Tenant criado com ID: ' || :'tenant_id' AS resultado;

-- =============================================================================
-- 2. CRIAR PROFILE PARA O USUÁRIO DE DEMO
-- =============================================================================

INSERT INTO profiles (id, tenant_id, full_name, role, is_active)
VALUES (
  :'DEMO_USER_ID',
  :'tenant_id'::uuid,
  'Gerente Demo',
  'owner',
  true
);

SELECT 'Profile criado para usuário: ' || :'DEMO_USER_ID' AS resultado;

-- =============================================================================
-- 3. CRIAR FORNECEDORES DE DEMO
-- =============================================================================

INSERT INTO suppliers (tenant_id, name, document, contact_name, contact_phone, payment_terms, avg_delivery_days)
VALUES
  (
    :'tenant_id'::uuid,
    'Distribuidora ABC - Carnes',
    '12345678000190',
    'João Silva',
    '+5511987654321',
    '30 dias',
    2
  ),
  (
    :'tenant_id'::uuid,
    'Frutas e Hortaliças Brasil',
    '98765432000101',
    'Maria Santos',
    '+5511912345678',
    '7 dias à vista',
    1
  ),
  (
    :'tenant_id'::uuid,
    'Laticínios Paraná',
    '45678901000123',
    'Carlos Mendes',
    '+5541988776655',
    '15 dias',
    1
  );

-- =============================================================================
-- 4. CRIAR INGREDIENTES DE DEMO
-- =============================================================================

INSERT INTO ingredients (tenant_id, name, category, unit, unit_cost, stock_quantity, min_stock_alert)
VALUES
  (:'tenant_id'::uuid, 'Carne Bovina (Alcatra)', 'carnes', 'kg', 45.50, 20.0, 5.0),
  (:'tenant_id'::uuid, 'Frango Peito (Congelado)', 'carnes', 'kg', 22.00, 35.0, 10.0),
  (:'tenant_id'::uuid, 'Queijo Muzzarela', 'laticínios', 'kg', 38.00, 8.0, 3.0),
  (:'tenant_id'::uuid, 'Leite Integral (1L)', 'laticínios', 'l', 4.50, 50.0, 20.0),
  (:'tenant_id'::uuid, 'Tomate Caqui', 'hortaliças', 'kg', 5.50, 15.0, 5.0),
  (:'tenant_id'::uuid, 'Alface Crespa', 'hortaliças', 'kg', 4.00, 10.0, 3.0),
  (:'tenant_id'::uuid, 'Pão Francês', 'padaria', 'kg', 12.50, 25.0, 10.0),
  (:'tenant_id'::uuid, 'Azeite Extra Virgem (1L)', 'óleos', 'l', 35.00, 5.0, 2.0),
  (:'tenant_id'::uuid, 'Sal Fino (1kg)', 'temperos', 'kg', 3.50, 10.0, 5.0),
  (:'tenant_id'::uuid, 'Alho (1kg)', 'temperos', 'kg', 22.00, 3.0, 1.0);

-- =============================================================================
-- 5. CRIAR FICHAS TÉCNICAS (RECIPES)
-- =============================================================================

INSERT INTO recipes (tenant_id, name, category, description, sale_price)
VALUES
  (
    :'tenant_id'::uuid,
    'Filé à Parmegiana',
    'pratos principais',
    'Filé de carne bovina com queijo muzzarela e molho de tomate',
    95.00
  ),
  (
    :'tenant_id'::uuid,
    'Peito de Frango Grelhado',
    'pratos principais',
    'Peito de frango grelhado com legumes',
    52.00
  ),
  (
    :'tenant_id'::uuid,
    'Salada Verde Premium',
    'entradas',
    'Alface crespa com molho casa',
    28.00
  ),
  (
    :'tenant_id'::uuid,
    'Pão de Queijo (6 un)',
    'acompanhamentos',
    'Pão de queijo caseiro quente',
    18.00
  );

-- =============================================================================
-- 6. CRIAR ITENS DE RECEITA (RECIPE_ITEMS)
-- Associa ingredientes às fichas técnicas
-- =============================================================================

-- Filé à Parmegiana: 200g carne + 50g queijo + 80g tomate + sal
INSERT INTO recipe_items (tenant_id, recipe_id, ingredient_id, quantity, unit_cost_snapshot, waste_factor_pct)
SELECT
  :'tenant_id'::uuid,
  recipes.id,
  ingredients.id,
  CASE
    WHEN ingredients.name = 'Carne Bovina (Alcatra)' THEN 0.20
    WHEN ingredients.name = 'Queijo Muzzarela' THEN 0.05
    WHEN ingredients.name = 'Tomate Caqui' THEN 0.08
    WHEN ingredients.name = 'Sal Fino (1kg)' THEN 0.01
  END,
  ingredients.unit_cost,
  CASE
    WHEN ingredients.name = 'Carne Bovina (Alcatra)' THEN 10
    ELSE 0
  END
FROM recipes
CROSS JOIN ingredients
WHERE recipes.tenant_id = :'tenant_id'::uuid
  AND recipes.name = 'Filé à Parmegiana'
  AND ingredients.tenant_id = :'tenant_id'::uuid
  AND ingredients.name IN ('Carne Bovina (Alcatra)', 'Queijo Muzzarela', 'Tomate Caqui', 'Sal Fino (1kg)');

-- Peito de Frango Grelhado: 200g frango + sal
INSERT INTO recipe_items (tenant_id, recipe_id, ingredient_id, quantity, unit_cost_snapshot, waste_factor_pct)
SELECT
  :'tenant_id'::uuid,
  recipes.id,
  ingredients.id,
  CASE
    WHEN ingredients.name = 'Frango Peito (Congelado)' THEN 0.20
    WHEN ingredients.name = 'Sal Fino (1kg)' THEN 0.01
  END,
  ingredients.unit_cost,
  CASE
    WHEN ingredients.name = 'Frango Peito (Congelado)' THEN 5
    ELSE 0
  END
FROM recipes
CROSS JOIN ingredients
WHERE recipes.tenant_id = :'tenant_id'::uuid
  AND recipes.name = 'Peito de Frango Grelhado'
  AND ingredients.tenant_id = :'tenant_id'::uuid
  AND ingredients.name IN ('Frango Peito (Congelado)', 'Sal Fino (1kg)');

-- =============================================================================
-- 7. CRIAR ALGUMAS TRANSAÇÕES (CONTAS A PAGAR) DE DEMO
-- =============================================================================

INSERT INTO transactions (tenant_id, type, category, description, amount, transaction_date, due_date, status, supplier_id)
SELECT
  :'tenant_id'::uuid,
  'expense',
  'fornecedores',
  'Compra de carne bovina - NF 001',
  850.00,
  CURRENT_DATE - INTERVAL '3 days',
  CURRENT_DATE + INTERVAL '10 days',
  'pending',
  suppliers.id
FROM suppliers
WHERE suppliers.tenant_id = :'tenant_id'::uuid
  AND suppliers.name = 'Distribuidora ABC - Carnes'
LIMIT 1;

INSERT INTO transactions (tenant_id, type, category, description, amount, transaction_date, due_date, status, supplier_id)
SELECT
  :'tenant_id'::uuid,
  'expense',
  'fornecedores',
  'Compra de frutas e hortaliças - NF 002',
  320.50,
  CURRENT_DATE - INTERVAL '1 days',
  CURRENT_DATE + INTERVAL '5 days',
  'pending',
  suppliers.id
FROM suppliers
WHERE suppliers.tenant_id = :'tenant_id'::uuid
  AND suppliers.name = 'Frutas e Hortaliças Brasil'
LIMIT 1;

INSERT INTO transactions (tenant_id, type, category, description, amount, transaction_date, due_date, status)
VALUES
  (:'tenant_id'::uuid, 'expense', 'aluguel', 'Aluguel do restaurante - Maio', 3500.00, CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '8 days', 'confirmed'),
  (:'tenant_id'::uuid, 'expense', 'utilidades', 'Energia elétrica', 2150.00, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '5 days', 'pending'),
  (:'tenant_id'::uuid, 'revenue', 'vendas', 'Faturamento - 04 Abr', 8420.50, CURRENT_DATE - INTERVAL '1 days', CURRENT_DATE, 'confirmed');

-- =============================================================================
-- RESUMO FINAL
-- =============================================================================

SELECT
  '✓ Seed completo!' AS resultado,
  :'tenant_id'::uuid AS tenant_id,
  :'DEMO_USER_ID' AS user_id;

-- Testes de RLS (execute como o usuário de demo):
-- SELECT * FROM tenants; -- Deve ver apenas o tenant_id criado
-- SELECT * FROM suppliers; -- Deve ver os 3 fornecedores
-- SELECT * FROM ingredients; -- Deve ver os 10 ingredientes
-- SELECT * FROM transactions; -- Deve ver as 5 transações
