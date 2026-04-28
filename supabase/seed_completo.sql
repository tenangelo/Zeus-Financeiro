-- =============================================================================
-- ZEUS FINANCEIRO — Seed Completo (Dados Fictícios para Teste)
-- =============================================================================
-- INSTRUÇÕES:
-- 1. Acesse Supabase Dashboard → Authentication → Users
-- 2. Encontre seu usuário pelo email
-- 3. Copie o UUID e substitua 'COLOQUE_SEU_UUID_AQUI' abaixo
-- 4. Execute no SQL Editor do Supabase
-- =============================================================================

DO $$
DECLARE
  -- ============================================================
  -- !! SUBSTITUA PELO SEU UUID (Authentication → Users) !!
  -- ============================================================
  v_user_id      UUID := 'a4384d9b-0cbe-4f5a-84b3-c15cafd0f5c4';

  -- Variáveis internas (não editar)
  v_tenant_id    UUID;
  v_sup_carnes   UUID;
  v_sup_horti    UUID;
  v_sup_latic    UUID;

  v_ing_alcatra  UUID;
  v_ing_contra   UUID;
  v_ing_frango_i UUID;
  v_ing_frango_p UUID;
  v_ing_muzz     UUID;
  v_ing_qprato   UUID;
  v_ing_leite    UUID;
  v_ing_mantq    UUID;
  v_ing_tomate   UUID;
  v_ing_batata   UUID;
  v_ing_alface   UUID;
  v_ing_cebola   UUID;
  v_ing_alho     UUID;
  v_ing_azeite   UUID;
  v_ing_farinha  UUID;

  v_rec_parm     UUID;
  v_rec_frango   UUID;
  v_rec_contra   UUID;
  v_rec_caesar   UUID;
  v_rec_batata   UUID;
  v_rec_molho    UUID;

BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Iniciando seed do Zeus Financeiro...';
  RAISE NOTICE '========================================';

  -- ============================================================
  -- VERIFICAÇÃO: usuário deve existir em auth.users
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Usuário % não encontrado em auth.users. Verifique o UUID.', v_user_id;
  END IF;

  -- ============================================================
  -- LIMPEZA: remove dados anteriores do usuário (se existirem)
  -- ============================================================
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id) THEN
    DECLARE
      v_old_tenant UUID;
    BEGIN
      SELECT tenant_id INTO v_old_tenant FROM profiles WHERE id = v_user_id;
      DELETE FROM cmv_snapshots     WHERE tenant_id = v_old_tenant;
      DELETE FROM stock_movements   WHERE tenant_id = v_old_tenant;
      DELETE FROM transactions      WHERE tenant_id = v_old_tenant;
      DELETE FROM recipe_items      WHERE tenant_id = v_old_tenant;
      DELETE FROM recipes           WHERE tenant_id = v_old_tenant;
      DELETE FROM ingredients       WHERE tenant_id = v_old_tenant;
      DELETE FROM suppliers         WHERE tenant_id = v_old_tenant;
      DELETE FROM profiles          WHERE tenant_id = v_old_tenant;
      DELETE FROM tenants           WHERE id = v_old_tenant;
      RAISE NOTICE 'Dados anteriores removidos para limpeza.';
    END;
  END IF;

  -- ============================================================
  -- 1. TENANT
  -- ============================================================
  INSERT INTO tenants (name, slug, whatsapp_number, plan_tier, is_active, settings, trial_ends_at)
  VALUES (
    'Cantina do Angelo',
    'cantina-do-angelo',
    '+5511999887766',
    'pro',
    true,
    jsonb_build_object(
      'cmv_alert_threshold_pct', 35,
      'waste_alert_threshold_pct', 5,
      'notification_hour', '09:00',
      'timezone', 'America/Sao_Paulo',
      'currency', 'BRL'
    ),
    now() + INTERVAL '1 year'
  )
  RETURNING id INTO v_tenant_id;

  RAISE NOTICE 'Tenant criado: %', v_tenant_id;

  -- ============================================================
  -- 2. PROFILE DO USUÁRIO (owner)
  -- ============================================================
  INSERT INTO profiles (id, tenant_id, full_name, role, is_active)
  VALUES (v_user_id, v_tenant_id, 'Angelo Ten', 'owner', true);

  RAISE NOTICE 'Profile criado para o usuário owner.';

  -- ============================================================
  -- 3. FORNECEDORES
  -- ============================================================
  INSERT INTO suppliers (tenant_id, name, document, contact_name, contact_phone, payment_terms, avg_delivery_days)
  VALUES (v_tenant_id, 'Frigorífico São Paulo', '11222333000144', 'Roberto Carneiro', '+5511988001122', '30 dias', 2)
  RETURNING id INTO v_sup_carnes;

  INSERT INTO suppliers (tenant_id, name, document, contact_name, contact_phone, payment_terms, avg_delivery_days)
  VALUES (v_tenant_id, 'Hortifruti Central CEASA', '55666777000188', 'Ana Horta', '+5511977334455', '7 dias à vista', 1)
  RETURNING id INTO v_sup_horti;

  INSERT INTO suppliers (tenant_id, name, document, contact_name, contact_phone, payment_terms, avg_delivery_days)
  VALUES (v_tenant_id, 'Laticínios Mineiros Ltda', '99000111000155', 'Carlos Queijo', '+5531966778899', '15 dias', 1)
  RETURNING id INTO v_sup_latic;

  RAISE NOTICE 'Fornecedores criados: %, %, %', v_sup_carnes, v_sup_horti, v_sup_latic;

  -- ============================================================
  -- 4. INGREDIENTES
  -- ============================================================
  INSERT INTO ingredients (tenant_id, name, category, unit, unit_cost, stock_quantity, min_stock_alert, preferred_supplier_id)
  VALUES (v_tenant_id, 'Alcatra Bovina', 'carnes', 'kg', 52.00, 25.0, 8.0, v_sup_carnes)
  RETURNING id INTO v_ing_alcatra;

  INSERT INTO ingredients (tenant_id, name, category, unit, unit_cost, stock_quantity, min_stock_alert, preferred_supplier_id)
  VALUES (v_tenant_id, 'Contrafilé Bovino', 'carnes', 'kg', 48.00, 18.0, 6.0, v_sup_carnes)
  RETURNING id INTO v_ing_contra;

  INSERT INTO ingredients (tenant_id, name, category, unit, unit_cost, stock_quantity, min_stock_alert, preferred_supplier_id)
  VALUES (v_tenant_id, 'Frango Inteiro', 'carnes', 'kg', 18.50, 30.0, 10.0, v_sup_carnes)
  RETURNING id INTO v_ing_frango_i;

  INSERT INTO ingredients (tenant_id, name, category, unit, unit_cost, stock_quantity, min_stock_alert, preferred_supplier_id)
  VALUES (v_tenant_id, 'Peito de Frango', 'carnes', 'kg', 24.00, 20.0, 8.0, v_sup_carnes)
  RETURNING id INTO v_ing_frango_p;

  INSERT INTO ingredients (tenant_id, name, category, unit, unit_cost, stock_quantity, min_stock_alert, preferred_supplier_id)
  VALUES (v_tenant_id, 'Queijo Muzzarela', 'laticínios', 'kg', 42.00, 10.0, 3.0, v_sup_latic)
  RETURNING id INTO v_ing_muzz;

  INSERT INTO ingredients (tenant_id, name, category, unit, unit_cost, stock_quantity, min_stock_alert, preferred_supplier_id)
  VALUES (v_tenant_id, 'Queijo Prato', 'laticínios', 'kg', 36.00, 8.0, 3.0, v_sup_latic)
  RETURNING id INTO v_ing_qprato;

  INSERT INTO ingredients (tenant_id, name, category, unit, unit_cost, stock_quantity, min_stock_alert, preferred_supplier_id)
  VALUES (v_tenant_id, 'Leite Integral', 'laticínios', 'l', 4.80, 40.0, 15.0, v_sup_latic)
  RETURNING id INTO v_ing_leite;

  INSERT INTO ingredients (tenant_id, name, category, unit, unit_cost, stock_quantity, min_stock_alert, preferred_supplier_id)
  VALUES (v_tenant_id, 'Manteiga', 'laticínios', 'kg', 32.00, 5.0, 2.0, v_sup_latic)
  RETURNING id INTO v_ing_mantq;

  INSERT INTO ingredients (tenant_id, name, category, unit, unit_cost, stock_quantity, min_stock_alert, preferred_supplier_id)
  VALUES (v_tenant_id, 'Tomate Italiano', 'hortaliças', 'kg', 6.50, 12.0, 4.0, v_sup_horti)
  RETURNING id INTO v_ing_tomate;

  INSERT INTO ingredients (tenant_id, name, category, unit, unit_cost, stock_quantity, min_stock_alert, preferred_supplier_id)
  VALUES (v_tenant_id, 'Batata Inglesa', 'hortaliças', 'kg', 5.00, 20.0, 8.0, v_sup_horti)
  RETURNING id INTO v_ing_batata;

  INSERT INTO ingredients (tenant_id, name, category, unit, unit_cost, stock_quantity, min_stock_alert, preferred_supplier_id)
  VALUES (v_tenant_id, 'Alface Americana', 'hortaliças', 'kg', 4.50, 8.0, 3.0, v_sup_horti)
  RETURNING id INTO v_ing_alface;

  INSERT INTO ingredients (tenant_id, name, category, unit, unit_cost, stock_quantity, min_stock_alert, preferred_supplier_id)
  VALUES (v_tenant_id, 'Cebola Branca', 'hortaliças', 'kg', 3.80, 15.0, 5.0, v_sup_horti)
  RETURNING id INTO v_ing_cebola;

  INSERT INTO ingredients (tenant_id, name, category, unit, unit_cost, stock_quantity, min_stock_alert, preferred_supplier_id)
  VALUES (v_tenant_id, 'Alho Pré-Cozido', 'temperos', 'kg', 28.00, 3.0, 1.0, v_sup_horti)
  RETURNING id INTO v_ing_alho;

  INSERT INTO ingredients (tenant_id, name, category, unit, unit_cost, stock_quantity, min_stock_alert)
  VALUES (v_tenant_id, 'Azeite Extra Virgem', 'óleos', 'l', 42.00, 6.0, 2.0)
  RETURNING id INTO v_ing_azeite;

  INSERT INTO ingredients (tenant_id, name, category, unit, unit_cost, stock_quantity, min_stock_alert)
  VALUES (v_tenant_id, 'Farinha de Trigo', 'mercearia', 'kg', 4.20, 25.0, 10.0)
  RETURNING id INTO v_ing_farinha;

  RAISE NOTICE '15 ingredientes criados.';

  -- ============================================================
  -- 5. FICHAS TÉCNICAS (RECIPES)
  -- ============================================================
  INSERT INTO recipes (tenant_id, name, category, description, sale_price, serving_size, preparation_time_min)
  VALUES (v_tenant_id, 'Filé à Parmegiana', 'pratos principais',
    'Alcatra grelhada com muzzarela derretida e molho de tomate artesanal', 98.00, 400, 25)
  RETURNING id INTO v_rec_parm;

  INSERT INTO recipes (tenant_id, name, category, description, sale_price, serving_size, preparation_time_min)
  VALUES (v_tenant_id, 'Frango Grelhado com Legumes', 'pratos principais',
    'Peito de frango grelhado acompanhado de batata e tomate assado', 58.00, 450, 20)
  RETURNING id INTO v_rec_frango;

  INSERT INTO recipes (tenant_id, name, category, description, sale_price, serving_size, preparation_time_min)
  VALUES (v_tenant_id, 'Contrafilé ao Alho e Óleo', 'pratos principais',
    'Contrafilé grelhado na chapa com azeite e alho dourado', 92.00, 380, 18)
  RETURNING id INTO v_rec_contra;

  INSERT INTO recipes (tenant_id, name, category, description, sale_price, serving_size, preparation_time_min)
  VALUES (v_tenant_id, 'Salada Caesar Premium', 'entradas',
    'Alface americana com queijo prato, tomate cereja e molho caesar da casa', 36.00, 200, 10)
  RETURNING id INTO v_rec_caesar;

  INSERT INTO recipes (tenant_id, name, category, description, sale_price, serving_size, preparation_time_min)
  VALUES (v_tenant_id, 'Batata Frita Especial', 'acompanhamentos',
    'Batata palha crocante frita em azeite com tempero da casa', 24.00, 300, 12)
  RETURNING id INTO v_rec_batata;

  INSERT INTO recipes (tenant_id, name, category, description, sale_price, serving_size, preparation_time_min)
  VALUES (v_tenant_id, 'Frango ao Molho Branco', 'pratos principais',
    'Peito de frango em molho branco cremoso com ervas finas', 68.00, 420, 22)
  RETURNING id INTO v_rec_molho;

  RAISE NOTICE '6 fichas técnicas criadas.';

  -- ============================================================
  -- 6. ITENS DAS FICHAS TÉCNICAS (RECIPE_ITEMS)
  -- ============================================================
  -- Filé à Parmegiana
  INSERT INTO recipe_items (tenant_id, recipe_id, ingredient_id, quantity, unit_cost_snapshot, waste_factor_pct)
  VALUES
    (v_tenant_id, v_rec_parm, v_ing_alcatra, 0.220, 52.00, 12.0),
    (v_tenant_id, v_rec_parm, v_ing_muzz,    0.060, 42.00, 0.0),
    (v_tenant_id, v_rec_parm, v_ing_tomate,  0.100, 6.50,  5.0),
    (v_tenant_id, v_rec_parm, v_ing_cebola,  0.050, 3.80,  5.0),
    (v_tenant_id, v_rec_parm, v_ing_azeite,  0.015, 42.00, 0.0);

  -- Frango Grelhado
  INSERT INTO recipe_items (tenant_id, recipe_id, ingredient_id, quantity, unit_cost_snapshot, waste_factor_pct)
  VALUES
    (v_tenant_id, v_rec_frango, v_ing_frango_p, 0.250, 24.00, 8.0),
    (v_tenant_id, v_rec_frango, v_ing_batata,   0.200, 5.00,  10.0),
    (v_tenant_id, v_rec_frango, v_ing_tomate,   0.080, 6.50,  5.0),
    (v_tenant_id, v_rec_frango, v_ing_azeite,   0.010, 42.00, 0.0);

  -- Contrafilé ao Alho e Óleo
  INSERT INTO recipe_items (tenant_id, recipe_id, ingredient_id, quantity, unit_cost_snapshot, waste_factor_pct)
  VALUES
    (v_tenant_id, v_rec_contra, v_ing_contra,  0.250, 48.00, 10.0),
    (v_tenant_id, v_rec_contra, v_ing_alho,    0.020, 28.00, 0.0),
    (v_tenant_id, v_rec_contra, v_ing_azeite,  0.025, 42.00, 0.0);

  -- Salada Caesar
  INSERT INTO recipe_items (tenant_id, recipe_id, ingredient_id, quantity, unit_cost_snapshot, waste_factor_pct)
  VALUES
    (v_tenant_id, v_rec_caesar, v_ing_alface,  0.150, 4.50,  8.0),
    (v_tenant_id, v_rec_caesar, v_ing_qprato,  0.040, 36.00, 0.0),
    (v_tenant_id, v_rec_caesar, v_ing_tomate,  0.050, 6.50,  5.0);

  -- Batata Frita
  INSERT INTO recipe_items (tenant_id, recipe_id, ingredient_id, quantity, unit_cost_snapshot, waste_factor_pct)
  VALUES
    (v_tenant_id, v_rec_batata, v_ing_batata,  0.350, 5.00,  15.0),
    (v_tenant_id, v_rec_batata, v_ing_azeite,  0.020, 42.00, 0.0);

  -- Frango ao Molho Branco
  INSERT INTO recipe_items (tenant_id, recipe_id, ingredient_id, quantity, unit_cost_snapshot, waste_factor_pct)
  VALUES
    (v_tenant_id, v_rec_molho, v_ing_frango_p, 0.250, 24.00, 8.0),
    (v_tenant_id, v_rec_molho, v_ing_mantq,    0.030, 32.00, 0.0),
    (v_tenant_id, v_rec_molho, v_ing_leite,    0.100, 4.80,  0.0),
    (v_tenant_id, v_rec_molho, v_ing_farinha,  0.020, 4.20,  0.0);

  RAISE NOTICE 'Itens de receita criados.';

  -- ============================================================
  -- 7. TRANSAÇÕES — 4 MESES (Janeiro a Abril 2026)
  -- ============================================================
  -- ---- JANEIRO 2026 ----
  -- Receitas (faturamento semanal confirmado)
  INSERT INTO transactions (tenant_id, type, category, description, amount, transaction_date, due_date, status, paid_at)
  VALUES
    (v_tenant_id, 'revenue', 'vendas', 'Faturamento Semana 1 - Jan', 9250.00, '2026-01-07', '2026-01-07', 'confirmed', '2026-01-07 20:00:00'),
    (v_tenant_id, 'revenue', 'vendas', 'Faturamento Semana 2 - Jan', 10180.00, '2026-01-14', '2026-01-14', 'confirmed', '2026-01-14 20:00:00'),
    (v_tenant_id, 'revenue', 'vendas', 'Faturamento Semana 3 - Jan', 9870.00, '2026-01-21', '2026-01-21', 'confirmed', '2026-01-21 20:00:00'),
    (v_tenant_id, 'revenue', 'vendas', 'Faturamento Semana 4 - Jan', 9200.00, '2026-01-28', '2026-01-28', 'confirmed', '2026-01-28 20:00:00');

  -- Despesas fixas Janeiro (confirmadas)
  INSERT INTO transactions (tenant_id, type, category, description, amount, transaction_date, due_date, status, paid_at)
  VALUES
    (v_tenant_id, 'expense', 'aluguel',      'Aluguel Jan 2026',             4800.00, '2026-01-05', '2026-01-10', 'confirmed', '2026-01-08 10:00:00'),
    (v_tenant_id, 'expense', 'utilidades',   'Energia Elétrica Jan',         2340.00, '2026-01-08', '2026-01-15', 'confirmed', '2026-01-12 10:00:00'),
    (v_tenant_id, 'expense', 'utilidades',   'Água e Esgoto Jan',            420.00,  '2026-01-08', '2026-01-15', 'confirmed', '2026-01-12 10:00:00'),
    (v_tenant_id, 'expense', 'utilidades',   'Gás GLP Jan',                  880.00,  '2026-01-10', '2026-01-17', 'confirmed', '2026-01-14 10:00:00'),
    (v_tenant_id, 'expense', 'serviços',     'Internet + Telefone Jan',      380.00,  '2026-01-05', '2026-01-10', 'confirmed', '2026-01-07 10:00:00'),
    (v_tenant_id, 'expense', 'serviços',     'Contabilidade Jan',            650.00,  '2026-01-15', '2026-01-20', 'confirmed', '2026-01-18 10:00:00'),
    (v_tenant_id, 'expense', 'pessoal',      'Folha de Pagamento Jan',       13200.00,'2026-01-28', '2026-01-31', 'confirmed', '2026-01-30 10:00:00');

  -- Fornecedores Janeiro
  INSERT INTO transactions (tenant_id, type, category, description, amount, transaction_date, due_date, status, paid_at, supplier_id)
  VALUES
    (v_tenant_id, 'expense', 'fornecedores', 'Carnes NF-001 Jan',  1850.00, '2026-01-03', '2026-02-02', 'confirmed', '2026-01-31 10:00:00', v_sup_carnes),
    (v_tenant_id, 'expense', 'fornecedores', 'Carnes NF-002 Jan',  1920.00, '2026-01-10', '2026-02-09', 'confirmed', '2026-02-07 10:00:00', v_sup_carnes),
    (v_tenant_id, 'expense', 'fornecedores', 'Carnes NF-003 Jan',  1780.00, '2026-01-17', '2026-02-16', 'confirmed', '2026-02-14 10:00:00', v_sup_carnes),
    (v_tenant_id, 'expense', 'fornecedores', 'Carnes NF-004 Jan',  1980.00, '2026-01-24', '2026-02-23', 'confirmed', '2026-02-21 10:00:00', v_sup_carnes),
    (v_tenant_id, 'expense', 'fornecedores', 'Hortifruti NF-001 Jan', 520.00, '2026-01-04', '2026-01-11', 'confirmed', '2026-01-09 10:00:00', v_sup_horti),
    (v_tenant_id, 'expense', 'fornecedores', 'Hortifruti NF-002 Jan', 490.00, '2026-01-11', '2026-01-18', 'confirmed', '2026-01-16 10:00:00', v_sup_horti),
    (v_tenant_id, 'expense', 'fornecedores', 'Hortifruti NF-003 Jan', 540.00, '2026-01-18', '2026-01-25', 'confirmed', '2026-01-23 10:00:00', v_sup_horti),
    (v_tenant_id, 'expense', 'fornecedores', 'Hortifruti NF-004 Jan', 505.00, '2026-01-25', '2026-02-01', 'confirmed', '2026-01-30 10:00:00', v_sup_horti),
    (v_tenant_id, 'expense', 'fornecedores', 'Laticínios NF-001 Jan', 720.00, '2026-01-06', '2026-01-21', 'confirmed', '2026-01-19 10:00:00', v_sup_latic),
    (v_tenant_id, 'expense', 'fornecedores', 'Laticínios NF-002 Jan', 690.00, '2026-01-20', '2026-02-04', 'confirmed', '2026-02-02 10:00:00', v_sup_latic);

  -- ---- FEVEREIRO 2026 ----
  INSERT INTO transactions (tenant_id, type, category, description, amount, transaction_date, due_date, status, paid_at)
  VALUES
    (v_tenant_id, 'revenue', 'vendas', 'Faturamento Semana 1 - Fev', 10400.00, '2026-02-07', '2026-02-07', 'confirmed', '2026-02-07 20:00:00'),
    (v_tenant_id, 'revenue', 'vendas', 'Faturamento Semana 2 - Fev', 11200.00, '2026-02-14', '2026-02-14', 'confirmed', '2026-02-14 20:00:00'),
    (v_tenant_id, 'revenue', 'vendas', 'Faturamento Semana 3 - Fev', 10850.00, '2026-02-21', '2026-02-21', 'confirmed', '2026-02-21 20:00:00'),
    (v_tenant_id, 'revenue', 'vendas', 'Faturamento Semana 4 - Fev', 9550.00,  '2026-02-28', '2026-02-28', 'confirmed', '2026-02-28 20:00:00');

  INSERT INTO transactions (tenant_id, type, category, description, amount, transaction_date, due_date, status, paid_at)
  VALUES
    (v_tenant_id, 'expense', 'aluguel',    'Aluguel Fev 2026',          4800.00, '2026-02-05', '2026-02-10', 'confirmed', '2026-02-08 10:00:00'),
    (v_tenant_id, 'expense', 'utilidades', 'Energia Elétrica Fev',      2580.00, '2026-02-08', '2026-02-15', 'confirmed', '2026-02-12 10:00:00'),
    (v_tenant_id, 'expense', 'utilidades', 'Água e Esgoto Fev',         435.00,  '2026-02-08', '2026-02-15', 'confirmed', '2026-02-12 10:00:00'),
    (v_tenant_id, 'expense', 'utilidades', 'Gás GLP Fev',               920.00,  '2026-02-10', '2026-02-17', 'confirmed', '2026-02-14 10:00:00'),
    (v_tenant_id, 'expense', 'serviços',   'Internet + Telefone Fev',   380.00,  '2026-02-05', '2026-02-10', 'confirmed', '2026-02-07 10:00:00'),
    (v_tenant_id, 'expense', 'serviços',   'Contabilidade Fev',         650.00,  '2026-02-15', '2026-02-20', 'confirmed', '2026-02-18 10:00:00'),
    (v_tenant_id, 'expense', 'pessoal',    'Folha de Pagamento Fev',    13200.00,'2026-02-26', '2026-02-28', 'confirmed', '2026-02-27 10:00:00');

  INSERT INTO transactions (tenant_id, type, category, description, amount, transaction_date, due_date, status, paid_at, supplier_id)
  VALUES
    (v_tenant_id, 'expense', 'fornecedores', 'Carnes NF-001 Fev',     2100.00, '2026-02-02', '2026-03-04', 'confirmed', '2026-03-02 10:00:00', v_sup_carnes),
    (v_tenant_id, 'expense', 'fornecedores', 'Carnes NF-002 Fev',     1980.00, '2026-02-09', '2026-03-11', 'confirmed', '2026-03-09 10:00:00', v_sup_carnes),
    (v_tenant_id, 'expense', 'fornecedores', 'Carnes NF-003 Fev',     2050.00, '2026-02-16', '2026-03-18', 'confirmed', '2026-03-16 10:00:00', v_sup_carnes),
    (v_tenant_id, 'expense', 'fornecedores', 'Carnes NF-004 Fev',     2150.00, '2026-02-23', '2026-03-25', 'confirmed', '2026-03-23 10:00:00', v_sup_carnes),
    (v_tenant_id, 'expense', 'fornecedores', 'Hortifruti NF-001 Fev',  555.00, '2026-02-03', '2026-02-10', 'confirmed', '2026-02-08 10:00:00', v_sup_horti),
    (v_tenant_id, 'expense', 'fornecedores', 'Hortifruti NF-002 Fev',  580.00, '2026-02-10', '2026-02-17', 'confirmed', '2026-02-15 10:00:00', v_sup_horti),
    (v_tenant_id, 'expense', 'fornecedores', 'Hortifruti NF-003 Fev',  520.00, '2026-02-17', '2026-02-24', 'confirmed', '2026-02-22 10:00:00', v_sup_horti),
    (v_tenant_id, 'expense', 'fornecedores', 'Hortifruti NF-004 Fev',  565.00, '2026-02-24', '2026-03-03', 'confirmed', '2026-03-01 10:00:00', v_sup_horti),
    (v_tenant_id, 'expense', 'fornecedores', 'Laticínios NF-001 Fev',  760.00, '2026-02-05', '2026-02-20', 'confirmed', '2026-02-18 10:00:00', v_sup_latic),
    (v_tenant_id, 'expense', 'fornecedores', 'Laticínios NF-002 Fev',  740.00, '2026-02-19', '2026-03-06', 'confirmed', '2026-03-04 10:00:00', v_sup_latic);

  -- ---- MARÇO 2026 ----
  INSERT INTO transactions (tenant_id, type, category, description, amount, transaction_date, due_date, status, paid_at)
  VALUES
    (v_tenant_id, 'revenue', 'vendas', 'Faturamento Semana 1 - Mar', 11500.00, '2026-03-07', '2026-03-07', 'confirmed', '2026-03-07 20:00:00'),
    (v_tenant_id, 'revenue', 'vendas', 'Faturamento Semana 2 - Mar', 12200.00, '2026-03-14', '2026-03-14', 'confirmed', '2026-03-14 20:00:00'),
    (v_tenant_id, 'revenue', 'vendas', 'Faturamento Semana 3 - Mar', 11800.00, '2026-03-21', '2026-03-21', 'confirmed', '2026-03-21 20:00:00'),
    (v_tenant_id, 'revenue', 'vendas', 'Faturamento Semana 4 - Mar', 10500.00, '2026-03-28', '2026-03-28', 'confirmed', '2026-03-28 20:00:00');

  INSERT INTO transactions (tenant_id, type, category, description, amount, transaction_date, due_date, status, paid_at)
  VALUES
    (v_tenant_id, 'expense', 'aluguel',    'Aluguel Mar 2026',          4800.00, '2026-03-05', '2026-03-10', 'confirmed', '2026-03-08 10:00:00'),
    (v_tenant_id, 'expense', 'utilidades', 'Energia Elétrica Mar',      2450.00, '2026-03-08', '2026-03-15', 'confirmed', '2026-03-12 10:00:00'),
    (v_tenant_id, 'expense', 'utilidades', 'Água e Esgoto Mar',         440.00,  '2026-03-08', '2026-03-15', 'confirmed', '2026-03-12 10:00:00'),
    (v_tenant_id, 'expense', 'utilidades', 'Gás GLP Mar',               960.00,  '2026-03-10', '2026-03-17', 'confirmed', '2026-03-14 10:00:00'),
    (v_tenant_id, 'expense', 'serviços',   'Internet + Telefone Mar',   380.00,  '2026-03-05', '2026-03-10', 'confirmed', '2026-03-07 10:00:00'),
    (v_tenant_id, 'expense', 'serviços',   'Contabilidade Mar',         650.00,  '2026-03-15', '2026-03-20', 'confirmed', '2026-03-18 10:00:00'),
    (v_tenant_id, 'expense', 'pessoal',    'Folha de Pagamento Mar',    13500.00,'2026-03-27', '2026-03-31', 'confirmed', '2026-03-30 10:00:00'),
    (v_tenant_id, 'expense', 'manutenção', 'Reparo Geladeira Industrial',1850.00,'2026-03-12', '2026-03-19', 'confirmed', '2026-03-17 10:00:00');

  INSERT INTO transactions (tenant_id, type, category, description, amount, transaction_date, due_date, status, paid_at, supplier_id)
  VALUES
    (v_tenant_id, 'expense', 'fornecedores', 'Carnes NF-001 Mar',     2200.00, '2026-03-02', '2026-04-01', 'confirmed', '2026-03-30 10:00:00', v_sup_carnes),
    (v_tenant_id, 'expense', 'fornecedores', 'Carnes NF-002 Mar',     2080.00, '2026-03-09', '2026-04-08', 'confirmed', '2026-04-06 10:00:00', v_sup_carnes),
    (v_tenant_id, 'expense', 'fornecedores', 'Carnes NF-003 Mar',     2320.00, '2026-03-16', '2026-04-15', 'confirmed', '2026-04-13 10:00:00', v_sup_carnes),
    (v_tenant_id, 'expense', 'fornecedores', 'Carnes NF-004 Mar',     2150.00, '2026-03-23', '2026-04-22', 'pending',   NULL,                  v_sup_carnes),
    (v_tenant_id, 'expense', 'fornecedores', 'Hortifruti NF-001 Mar',  600.00, '2026-03-03', '2026-03-10', 'confirmed', '2026-03-08 10:00:00', v_sup_horti),
    (v_tenant_id, 'expense', 'fornecedores', 'Hortifruti NF-002 Mar',  620.00, '2026-03-10', '2026-03-17', 'confirmed', '2026-03-15 10:00:00', v_sup_horti),
    (v_tenant_id, 'expense', 'fornecedores', 'Hortifruti NF-003 Mar',  580.00, '2026-03-17', '2026-03-24', 'confirmed', '2026-03-22 10:00:00', v_sup_horti),
    (v_tenant_id, 'expense', 'fornecedores', 'Hortifruti NF-004 Mar',  610.00, '2026-03-24', '2026-03-31', 'confirmed', '2026-03-29 10:00:00', v_sup_horti),
    (v_tenant_id, 'expense', 'fornecedores', 'Laticínios NF-001 Mar',  810.00, '2026-03-05', '2026-03-20', 'confirmed', '2026-03-18 10:00:00', v_sup_latic),
    (v_tenant_id, 'expense', 'fornecedores', 'Laticínios NF-002 Mar',  780.00, '2026-03-19', '2026-04-03', 'confirmed', '2026-04-01 10:00:00', v_sup_latic);

  -- ---- ABRIL 2026 (mês atual — parcial) ----
  INSERT INTO transactions (tenant_id, type, category, description, amount, transaction_date, due_date, status, paid_at)
  VALUES
    (v_tenant_id, 'revenue', 'vendas', 'Faturamento Semana 1 - Abr', 10800.00, '2026-04-07', '2026-04-07', 'confirmed', '2026-04-07 20:00:00'),
    (v_tenant_id, 'revenue', 'vendas', 'Faturamento Semana 2 - Abr', 11400.00, '2026-04-14', '2026-04-14', 'confirmed', '2026-04-14 20:00:00'),
    (v_tenant_id, 'revenue', 'vendas', 'Faturamento Semana 3 - Abr', 11200.00, '2026-04-21', '2026-04-21', 'confirmed', '2026-04-21 20:00:00');

  INSERT INTO transactions (tenant_id, type, category, description, amount, transaction_date, due_date, status, paid_at)
  VALUES
    (v_tenant_id, 'expense', 'aluguel',    'Aluguel Abr 2026',          4800.00, '2026-04-05', '2026-04-10', 'confirmed', '2026-04-08 10:00:00'),
    (v_tenant_id, 'expense', 'utilidades', 'Energia Elétrica Abr',      2280.00, '2026-04-08', '2026-04-15', 'pending',   NULL),
    (v_tenant_id, 'expense', 'utilidades', 'Água e Esgoto Abr',         440.00,  '2026-04-08', '2026-04-15', 'pending',   NULL),
    (v_tenant_id, 'expense', 'utilidades', 'Gás GLP Abr',               950.00,  '2026-04-10', '2026-04-17', 'pending',   NULL),
    (v_tenant_id, 'expense', 'serviços',   'Internet + Telefone Abr',   380.00,  '2026-04-05', '2026-04-10', 'confirmed', '2026-04-07 10:00:00'),
    (v_tenant_id, 'expense', 'serviços',   'Contabilidade Abr',         650.00,  '2026-04-15', '2026-04-20', 'pending',   NULL),
    (v_tenant_id, 'expense', 'pessoal',    'Folha de Pagamento Abr',    13500.00,'2026-04-27', '2026-04-30', 'pending',   NULL);

  INSERT INTO transactions (tenant_id, type, category, description, amount, transaction_date, due_date, status, paid_at, supplier_id)
  VALUES
    (v_tenant_id, 'expense', 'fornecedores', 'Carnes NF-001 Abr',     2300.00, '2026-04-01', '2026-04-30', 'confirmed', '2026-04-28 10:00:00', v_sup_carnes),
    (v_tenant_id, 'expense', 'fornecedores', 'Carnes NF-002 Abr',     2180.00, '2026-04-07', '2026-05-07', 'pending',   NULL,                  v_sup_carnes),
    (v_tenant_id, 'expense', 'fornecedores', 'Carnes NF-003 Abr',     2250.00, '2026-04-14', '2026-05-14', 'pending',   NULL,                  v_sup_carnes),
    (v_tenant_id, 'expense', 'fornecedores', 'Hortifruti NF-001 Abr',  580.00, '2026-04-02', '2026-04-09', 'confirmed', '2026-04-07 10:00:00', v_sup_horti),
    (v_tenant_id, 'expense', 'fornecedores', 'Hortifruti NF-002 Abr',  610.00, '2026-04-09', '2026-04-16', 'confirmed', '2026-04-14 10:00:00', v_sup_horti),
    (v_tenant_id, 'expense', 'fornecedores', 'Hortifruti NF-003 Abr',  595.00, '2026-04-16', '2026-04-23', 'pending',   NULL,                  v_sup_horti),
    (v_tenant_id, 'expense', 'fornecedores', 'Laticínios NF-001 Abr',  820.00, '2026-04-04', '2026-04-19', 'confirmed', '2026-04-17 10:00:00', v_sup_latic),
    (v_tenant_id, 'expense', 'fornecedores', 'Laticínios NF-002 Abr',  790.00, '2026-04-18', '2026-05-03', 'pending',   NULL,                  v_sup_latic);

  RAISE NOTICE 'Transações criadas (Jan/Fev/Mar/Abr 2026).';

  -- ============================================================
  -- 8. CMV SNAPSHOTS (3 meses encerrados)
  -- ============================================================
  INSERT INTO cmv_snapshots (tenant_id, period_start, period_end, revenue, theoretical_cmv, real_cmv, breakdown_by_category, calculated_by)
  VALUES
    (
      v_tenant_id, '2026-01-01', '2026-01-31',
      38500.00, 12100.00, 12950.00,
      '{"carnes": {"theoretical": 7500, "real": 8100}, "laticínios": {"theoretical": 2200, "real": 2380}, "hortaliças": {"theoretical": 2400, "real": 2470}}'::jsonb,
      'backend_service'
    ),
    (
      v_tenant_id, '2026-02-01', '2026-02-28',
      42000.00, 13400.00, 14100.00,
      '{"carnes": {"theoretical": 8300, "real": 8850}, "laticínios": {"theoretical": 2600, "real": 2750}, "hortaliças": {"theoretical": 2500, "real": 2500}}'::jsonb,
      'backend_service'
    ),
    (
      v_tenant_id, '2026-03-01', '2026-03-31',
      46000.00, 14600.00, 15200.00,
      '{"carnes": {"theoretical": 9100, "real": 9600}, "laticínios": {"theoretical": 2800, "real": 2900}, "hortaliças": {"theoretical": 2700, "real": 2700}}'::jsonb,
      'backend_service'
    );

  RAISE NOTICE 'CMV Snapshots criados (Jan/Fev/Mar).';

  -- ============================================================
  -- 9. MOVIMENTAÇÕES DE ESTOQUE (entradas de compra)
  -- ============================================================
  INSERT INTO stock_movements (tenant_id, ingredient_id, movement_type, quantity, unit_cost, supplier_id, notes, created_at)
  VALUES
    -- Janeiro: compras de carne
    (v_tenant_id, v_ing_alcatra,  'purchase', 40.0, 52.00, v_sup_carnes, 'Compra mensal alcatra Jan', '2026-01-03 09:00:00'),
    (v_tenant_id, v_ing_contra,   'purchase', 30.0, 48.00, v_sup_carnes, 'Compra mensal contrafilé Jan', '2026-01-03 09:00:00'),
    (v_tenant_id, v_ing_frango_p, 'purchase', 50.0, 24.00, v_sup_carnes, 'Compra peito frango Jan', '2026-01-10 09:00:00'),
    -- Janeiro: hortifruti
    (v_tenant_id, v_ing_tomate,   'purchase', 30.0, 6.50,  v_sup_horti,  'Hortifruti semanal Jan-1', '2026-01-04 08:00:00'),
    (v_tenant_id, v_ing_batata,   'purchase', 50.0, 5.00,  v_sup_horti,  'Hortifruti semanal Jan-1', '2026-01-04 08:00:00'),
    (v_tenant_id, v_ing_alface,   'purchase', 20.0, 4.50,  v_sup_horti,  'Hortifruti semanal Jan-2', '2026-01-11 08:00:00'),
    (v_tenant_id, v_ing_cebola,   'purchase', 40.0, 3.80,  v_sup_horti,  'Hortifruti semanal Jan-2', '2026-01-11 08:00:00'),
    -- Janeiro: laticínios
    (v_tenant_id, v_ing_muzz,    'purchase', 20.0, 42.00, v_sup_latic,  'Laticínios Jan-1', '2026-01-06 08:00:00'),
    (v_tenant_id, v_ing_qprato,  'purchase', 15.0, 36.00, v_sup_latic,  'Laticínios Jan-1', '2026-01-06 08:00:00'),
    (v_tenant_id, v_ing_leite,   'purchase', 80.0, 4.80,  v_sup_latic,  'Laticínios Jan-2', '2026-01-20 08:00:00'),
    (v_tenant_id, v_ing_mantq,   'purchase', 10.0, 32.00, v_sup_latic,  'Laticínios Jan-2', '2026-01-20 08:00:00'),
    -- Consumos estimados Janeiro
    (v_tenant_id, v_ing_alcatra,  'consumption', 35.0, 52.00, NULL, 'Consumo produção Jan', '2026-01-31 23:00:00'),
    (v_tenant_id, v_ing_frango_p, 'consumption', 42.0, 24.00, NULL, 'Consumo produção Jan', '2026-01-31 23:00:00'),
    (v_tenant_id, v_ing_tomate,   'consumption', 25.0, 6.50,  NULL, 'Consumo produção Jan', '2026-01-31 23:00:00'),
    -- Fevereiro: compras
    (v_tenant_id, v_ing_alcatra,  'purchase', 45.0, 52.00, v_sup_carnes, 'Compra mensal alcatra Fev', '2026-02-02 09:00:00'),
    (v_tenant_id, v_ing_contra,   'purchase', 32.0, 48.00, v_sup_carnes, 'Compra mensal contrafilé Fev', '2026-02-02 09:00:00'),
    (v_tenant_id, v_ing_frango_p, 'purchase', 55.0, 24.00, v_sup_carnes, 'Compra peito frango Fev', '2026-02-09 09:00:00'),
    (v_tenant_id, v_ing_muzz,    'purchase', 22.0, 42.00, v_sup_latic,  'Laticínios Fev-1', '2026-02-05 08:00:00'),
    (v_tenant_id, v_ing_batata,   'purchase', 60.0, 5.00,  v_sup_horti,  'Hortifruti Fev', '2026-02-03 08:00:00'),
    -- Março: compras
    (v_tenant_id, v_ing_alcatra,  'purchase', 48.0, 54.00, v_sup_carnes, 'Compra alcatra Mar (reajuste)', '2026-03-02 09:00:00'),
    (v_tenant_id, v_ing_frango_p, 'purchase', 58.0, 25.00, v_sup_carnes, 'Compra frango Mar', '2026-03-09 09:00:00'),
    (v_tenant_id, v_ing_muzz,    'purchase', 25.0, 44.00, v_sup_latic,  'Laticínios Mar', '2026-03-05 08:00:00'),
    -- Abril: compras
    (v_tenant_id, v_ing_alcatra,  'purchase', 50.0, 55.00, v_sup_carnes, 'Compra alcatra Abr', '2026-04-01 09:00:00'),
    (v_tenant_id, v_ing_frango_p, 'purchase', 52.0, 25.00, v_sup_carnes, 'Compra frango Abr', '2026-04-07 09:00:00'),
    (v_tenant_id, v_ing_tomate,   'purchase', 35.0, 7.00,  v_sup_horti,  'Hortifruti Abr', '2026-04-02 08:00:00'),
    (v_tenant_id, v_ing_batata,   'purchase', 55.0, 5.20,  v_sup_horti,  'Hortifruti Abr', '2026-04-02 08:00:00'),
    (v_tenant_id, v_ing_muzz,    'purchase', 24.0, 44.00, v_sup_latic,  'Laticínios Abr', '2026-04-04 08:00:00');

  RAISE NOTICE 'Movimentações de estoque criadas.';

  -- ============================================================
  -- RESUMO FINAL
  -- ============================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SEED CONCLUÍDO COM SUCESSO!';
  RAISE NOTICE 'Tenant ID: %', v_tenant_id;
  RAISE NOTICE 'Restaurante: Cantina do Angelo';
  RAISE NOTICE 'Plano: PRO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Dados criados:';
  RAISE NOTICE '  - 1 Tenant + 1 Profile (owner)';
  RAISE NOTICE '  - 3 Fornecedores';
  RAISE NOTICE '  - 15 Ingredientes';
  RAISE NOTICE '  - 6 Fichas Técnicas (com itens)';
  RAISE NOTICE '  - ~80 Transações (Jan/Fev/Mar/Abr 2026)';
  RAISE NOTICE '  - 3 CMV Snapshots (Jan/Fev/Mar)';
  RAISE NOTICE '  - 28 Movimentações de Estoque';
  RAISE NOTICE '========================================';

END $$;
