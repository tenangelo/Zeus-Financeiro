-- =============================================================================
-- ZEUS FINANCEIRO — RLS (Row Level Security) Policies
-- Versão: 1.0.0
-- Data: 2025-01-05
--
-- Segurança multi-tenant: cada usuário só acessa dados de seu próprio tenant.
-- Política: get_current_tenant_id() resolve o tenant_id via profiles.
-- =============================================================================


-- =============================================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =============================================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cmv_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- TABELA: TENANTS
-- Apenas o dono (profile) do tenant pode ler/atualizar.
-- =============================================================================

-- Política de leitura: usuário só vê seu próprio tenant
CREATE POLICY "tenants_select_own" ON tenants
  FOR SELECT
  USING (
    id = get_current_tenant_id()
  );

-- Política de atualização: apenas owner e manager podem atualizar
-- (policy garante acesso ao tenant; is_tenant_admin() confirma role)
CREATE POLICY "tenants_update_own" ON tenants
  FOR UPDATE
  USING (
    id = get_current_tenant_id() AND is_tenant_admin()
  );

-- Inserção proibida via RLS (apenas admin cria tenants, via API/backend)
CREATE POLICY "tenants_insert_deny" ON tenants
  FOR INSERT
  WITH CHECK (false);

-- Deleção proibida via RLS
CREATE POLICY "tenants_delete_deny" ON tenants
  FOR DELETE
  USING (false);


-- =============================================================================
-- TABELA: PROFILES
-- Cada perfil pode ver a si mesmo e, se admin, ver outros do mesmo tenant.
-- =============================================================================

-- Leitura: ver a si mesmo ou, se admin, todos do tenant
CREATE POLICY "profiles_select_own_or_admin" ON profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR (
      get_current_tenant_id() IS NOT NULL
      AND tenant_id = get_current_tenant_id()
      AND is_tenant_admin()
    )
  );

-- Atualização: apenas o próprio perfil ou admin pode atualizar
CREATE POLICY "profiles_update_own_or_admin" ON profiles
  FOR UPDATE
  USING (
    id = auth.uid()
    OR (
      get_current_tenant_id() IS NOT NULL
      AND tenant_id = get_current_tenant_id()
      AND is_tenant_admin()
    )
  );

-- Inserção: apenas via backend/trigger (RLS nega)
CREATE POLICY "profiles_insert_deny" ON profiles
  FOR INSERT
  WITH CHECK (false);

-- Deleção: apenas admin pode deletar outros (não a si mesmo via RLS)
CREATE POLICY "profiles_delete_admin_only" ON profiles
  FOR DELETE
  USING (
    id != auth.uid()
    AND tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );


-- =============================================================================
-- TABELA: SUPPLIERS
-- Usuário acessa suppliers apenas de seu tenant.
-- Managers e acima podem CRUD; staff apenas lê.
-- =============================================================================

-- Leitura: qualquer usuário ativo do tenant
CREATE POLICY "suppliers_select" ON suppliers
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
  );

-- Inserção: apenas manager+
CREATE POLICY "suppliers_insert" ON suppliers
  FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );

-- Atualização: apenas manager+
CREATE POLICY "suppliers_update" ON suppliers
  FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );

-- Deleção: apenas manager+
CREATE POLICY "suppliers_delete" ON suppliers
  FOR DELETE
  USING (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );


-- =============================================================================
-- TABELA: INGREDIENTS
-- Mesmo padrão de suppliers.
-- =============================================================================

CREATE POLICY "ingredients_select" ON ingredients
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "ingredients_insert" ON ingredients
  FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );

CREATE POLICY "ingredients_update" ON ingredients
  FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );

CREATE POLICY "ingredients_delete" ON ingredients
  FOR DELETE
  USING (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );


-- =============================================================================
-- TABELA: SUPPLIER_PRICE_HISTORY
-- Leitura: todos do tenant; escrita: apenas dados de importação automática.
-- =============================================================================

CREATE POLICY "supplier_price_history_select" ON supplier_price_history
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
  );

-- Inserção: apenas backend (via import_jobs) — RLS nega usuário comum
CREATE POLICY "supplier_price_history_insert" ON supplier_price_history
  FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

-- Atualização: somente backend
CREATE POLICY "supplier_price_history_update" ON supplier_price_history
  FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );


-- =============================================================================
-- TABELA: RECIPES (Fichas Técnicas)
-- Mesmo padrão de suppliers.
-- =============================================================================

CREATE POLICY "recipes_select" ON recipes
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "recipes_insert" ON recipes
  FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );

CREATE POLICY "recipes_update" ON recipes
  FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );

CREATE POLICY "recipes_delete" ON recipes
  FOR DELETE
  USING (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );


-- =============================================================================
-- TABELA: RECIPE_ITEMS
-- Itens de fichas técnicas — acesso via recipe_id.
-- =============================================================================

CREATE POLICY "recipe_items_select" ON recipe_items
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "recipe_items_insert" ON recipe_items
  FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );

CREATE POLICY "recipe_items_update" ON recipe_items
  FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );

CREATE POLICY "recipe_items_delete" ON recipe_items
  FOR DELETE
  USING (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );


-- =============================================================================
-- TABELA: STOCK_MOVEMENTS
-- Movimentações de estoque — leitura geral; escrita apenas backend/import.
-- =============================================================================

CREATE POLICY "stock_movements_select" ON stock_movements
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
  );

-- Inserção: apenas backend (via import ou trigger interno)
CREATE POLICY "stock_movements_insert" ON stock_movements
  FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

-- Atualização: apenas em casos especiais (ajuste manual) — require admin
CREATE POLICY "stock_movements_update" ON stock_movements
  FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );

-- Deleção: nunca deleta (é ledger imutável) — RLS nega sempre
CREATE POLICY "stock_movements_delete_deny" ON stock_movements
  FOR DELETE
  USING (false);


-- =============================================================================
-- TABELA: TRANSACTIONS (Contas a Pagar / Receber)
-- Leitura: todos do tenant; escrita: admin ou import.
-- =============================================================================

CREATE POLICY "transactions_select" ON transactions
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
  );

-- Inserção: admin ou backend (import)
CREATE POLICY "transactions_insert" ON transactions
  FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND (is_tenant_admin() OR import_job_id IS NOT NULL)
  );

-- Atualização: admin apenas (ex: marcar como pago)
CREATE POLICY "transactions_update" ON transactions
  FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );

-- Deleção: nunca (é histórico) — RLS nega
CREATE POLICY "transactions_delete_deny" ON transactions
  FOR DELETE
  USING (false);


-- =============================================================================
-- TABELA: CMV_SNAPSHOTS
-- Snapshots financeiros — apenas leitura (backend calcula e insere).
-- =============================================================================

CREATE POLICY "cmv_snapshots_select" ON cmv_snapshots
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
  );

-- Inserção: apenas backend
CREATE POLICY "cmv_snapshots_insert" ON cmv_snapshots
  FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

-- Atualização: nunca (snapshots são imutáveis) — RLS nega
CREATE POLICY "cmv_snapshots_update_deny" ON cmv_snapshots
  FOR UPDATE
  USING (false);

-- Deleção: nunca — RLS nega
CREATE POLICY "cmv_snapshots_delete_deny" ON cmv_snapshots
  FOR DELETE
  USING (false);


-- =============================================================================
-- TABELA: AI_ANALYSIS_LOGS
-- Logs de análise da IA — leitura geral; escrita apenas backend.
-- =============================================================================

CREATE POLICY "ai_analysis_logs_select" ON ai_analysis_logs
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
  );

-- Inserção: apenas backend (IA engine)
CREATE POLICY "ai_analysis_logs_insert" ON ai_analysis_logs
  FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

-- Atualização: backend marca como notificado
CREATE POLICY "ai_analysis_logs_update" ON ai_analysis_logs
  FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
  );

-- Deleção: nunca — RLS nega
CREATE POLICY "ai_analysis_logs_delete_deny" ON ai_analysis_logs
  FOR DELETE
  USING (false);


-- =============================================================================
-- TABELA: IMPORT_JOBS
-- Jobs de importação — admin pode ver seus imports; backend pode escrever.
-- =============================================================================

CREATE POLICY "import_jobs_select" ON import_jobs
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
  );

-- Inserção: backend (trigger de upload)
CREATE POLICY "import_jobs_insert" ON import_jobs
  FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

-- Atualização: backend (progresso do job)
CREATE POLICY "import_jobs_update" ON import_jobs
  FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
  );

-- Deleção: admin apenas (limpeza)
CREATE POLICY "import_jobs_delete" ON import_jobs
  FOR DELETE
  USING (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );


-- =============================================================================
-- FIM DAS POLICIES
-- =============================================================================

COMMENT ON SCHEMA public IS 'Schema público com RLS ativado em todas as tabelas multi-tenant.';
