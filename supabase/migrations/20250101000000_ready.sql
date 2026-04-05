-- =============================================================================
-- ZEUS FINANCEIRO — Schema Completo para Supabase
-- Versão: 1.0.0
-- Executar no SQL Editor do Supabase em ordem sequencial.
-- =============================================================================


-- =============================================================================
-- SEÇÃO 0: EXTENSÕES
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";         -- pgvector para embeddings de IA
-- pg_cron requer Pro+ (comentado para free tier)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- busca textual por similaridade


-- =============================================================================
-- SEÇÃO 1: TIPOS ENUMERADOS (ENUMs)
-- Centraliza os valores válidos e evita strings mágicas no código.
-- =============================================================================

CREATE TYPE plan_tier_enum AS ENUM (
  'trial',
  'starter',
  'pro',
  'enterprise'
);

CREATE TYPE user_role_enum AS ENUM (
  'owner',      -- dono do restaurante, acesso total
  'manager',    -- gerente, acesso operacional
  'staff'       -- funcionário, acesso limitado
);

CREATE TYPE transaction_type_enum AS ENUM (
  'revenue',    -- receita
  'expense'     -- despesa
);

CREATE TYPE transaction_status_enum AS ENUM (
  'pending',
  'confirmed',
  'cancelled',
  'reconciled'
);

CREATE TYPE movement_type_enum AS ENUM (
  'purchase',       -- entrada por compra
  'consumption',    -- baixa por uso em produção
  'waste',          -- perda/quebra
  'adjustment',     -- ajuste manual de inventário
  'return'          -- devolução ao fornecedor
);

CREATE TYPE analysis_type_enum AS ENUM (
  'cost_alert',         -- alerta de custo de ingrediente
  'waste_detection',    -- divergência estoque teórico vs real
  'supplier_comparison',-- comparação de fornecedores
  'margin_drop',        -- queda de margem em prato
  'cash_flow_risk',     -- risco de fluxo de caixa
  'monthly_summary'     -- resumo mensal proativo
);

CREATE TYPE import_status_enum AS ENUM (
  'queued',
  'processing',
  'completed',
  'failed'
);

CREATE TYPE import_source_enum AS ENUM (
  'csv',
  'excel',
  'xml',
  'api_webhook',
  'manual'
);


-- =============================================================================
-- SEÇÃO 2: TABELAS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 2.1  TENANTS
-- Representa cada restaurante/empresa cadastrada no SaaS.
-- Não possui tenant_id próprio — é a raiz da hierarquia.
-- -----------------------------------------------------------------------------
CREATE TABLE tenants (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 150),
  slug                text        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9\-]+$'),
  whatsapp_number     text        CHECK (whatsapp_number ~ '^\+[1-9]\d{7,14}$'),
  plan_tier           plan_tier_enum NOT NULL DEFAULT 'trial',
  is_active           boolean     NOT NULL DEFAULT true,
  settings            jsonb       NOT NULL DEFAULT '{}',
  -- settings keys esperadas: cmv_alert_threshold_pct, waste_alert_threshold_pct,
  --                          notification_hour, timezone, currency
  trial_ends_at       timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE tenants IS 'Raiz do modelo multi-tenant. Cada registro representa um restaurante/empresa.';
COMMENT ON COLUMN tenants.settings IS 'Configurações específicas do tenant: thresholds de alerta, timezone, moeda.';


-- -----------------------------------------------------------------------------
-- 2.2  PROFILES
-- Estende auth.users do Supabase com dados de negócio e vínculo ao tenant.
-- O id deve ser igual ao auth.users.id para o JOIN funcionar com auth.uid().
-- -----------------------------------------------------------------------------
CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id       uuid        NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  full_name       text        NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 150),
  role            user_role_enum NOT NULL DEFAULT 'staff',
  whatsapp_number text        CHECK (whatsapp_number ~ '^\+[1-9]\d{7,14}$'),
  avatar_url      text,
  is_active       boolean     NOT NULL DEFAULT true,
  last_login_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS 'Estende auth.users. Vincula usuário autenticado ao seu tenant.';
COMMENT ON COLUMN profiles.role IS 'owner: acesso total | manager: operacional | staff: leitura limitada.';


-- -----------------------------------------------------------------------------
-- 2.3  SUPPLIERS (Fornecedores)
-- -----------------------------------------------------------------------------
CREATE TABLE suppliers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            text        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 200),
  document        text,       -- CNPJ/CPF (armazenar sem formatação)
  contact_name    text,
  contact_phone   text,
  contact_email   text        CHECK (contact_email ~* '^[^@]+@[^@]+\.[^@]+$'),
  payment_terms   text,       -- ex: "30/60/90 dias"
  avg_delivery_days smallint  CHECK (avg_delivery_days >= 0),
  notes           text,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE suppliers IS 'Fornecedores do tenant. Usado para comparação de preços pelo agente de IA.';


-- -----------------------------------------------------------------------------
-- 2.4  INGREDIENTS (Insumos/Ingredientes)
-- -----------------------------------------------------------------------------
CREATE TABLE ingredients (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  category            text,       -- ex: "carnes", "laticínios", "hortifruti"
  unit                text        NOT NULL CHECK (unit IN ('kg', 'g', 'l', 'ml', 'un', 'cx', 'pct')),
  unit_cost           numeric(15,4) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  stock_quantity      numeric(15,4) NOT NULL DEFAULT 0,
  min_stock_alert     numeric(15,4) NOT NULL DEFAULT 0 CHECK (min_stock_alert >= 0),
  expiry_date         date,
  preferred_supplier_id uuid      REFERENCES suppliers(id) ON DELETE SET NULL,
  is_active           boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ingredients_unique_name_per_tenant UNIQUE (tenant_id, name)
);

COMMENT ON TABLE ingredients IS 'Catálogo de insumos do tenant com custo unitário e controle de estoque.';
COMMENT ON COLUMN ingredients.unit_cost IS 'Custo unitário atual. Atualizado automaticamente via stock_movements.';


-- -----------------------------------------------------------------------------
-- 2.5  SUPPLIER_PRICE_HISTORY (Histórico de Preços por Fornecedor)
-- Alimenta o agente de IA para comparação e detecção de variação de preço.
-- -----------------------------------------------------------------------------
CREATE TABLE supplier_price_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id     uuid        NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  ingredient_id   uuid        NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  unit_price      numeric(15,4) NOT NULL CHECK (unit_price > 0),
  quantity        numeric(15,4),
  price_date      date        NOT NULL DEFAULT CURRENT_DATE,
  source          text        DEFAULT 'manual', -- 'manual', 'nota_fiscal', 'import'
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE supplier_price_history IS 'Série temporal de preços por fornecedor/ingrediente. Base para alertas de custo da IA.';


-- -----------------------------------------------------------------------------
-- 2.6  RECIPES (Fichas Técnicas / Cardápio)
-- -----------------------------------------------------------------------------
CREATE TABLE recipes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  category            text,       -- ex: "entradas", "pratos principais", "bebidas"
  description         text,
  sale_price          numeric(15,4) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
  theoretical_cost    numeric(15,4) NOT NULL DEFAULT 0 CHECK (theoretical_cost >= 0),
  theoretical_margin  numeric(8,4)  GENERATED ALWAYS AS (
                        CASE WHEN sale_price > 0
                          THEN ROUND(((sale_price - theoretical_cost) / sale_price) * 100, 4)
                          ELSE 0
                        END
                      ) STORED,
  serving_size        numeric(10,4),  -- porção em gramas ou ml
  preparation_time_min smallint,
  is_active           boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT recipes_unique_name_per_tenant UNIQUE (tenant_id, name)
);

COMMENT ON TABLE recipes IS 'Fichas técnicas do cardápio. theoretical_margin é calculada automaticamente.';
COMMENT ON COLUMN recipes.theoretical_margin IS 'Margem teórica (%) = (sale_price - theoretical_cost) / sale_price * 100. Coluna computada.';


-- -----------------------------------------------------------------------------
-- 2.7  RECIPE_ITEMS (Itens da Ficha Técnica)
-- -----------------------------------------------------------------------------
CREATE TABLE recipe_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipe_id             uuid        NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id         uuid        NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity              numeric(15,4) NOT NULL CHECK (quantity > 0),
  unit_cost_snapshot    numeric(15,4) NOT NULL DEFAULT 0,
  -- Snapshot do custo no momento da criação/atualização da ficha.
  -- Não atualiza automaticamente para não distorcer histórico.
  waste_factor_pct      numeric(5,2) NOT NULL DEFAULT 0 CHECK (waste_factor_pct BETWEEN 0 AND 100),
  -- Fator de perda esperado no preparo (ex: 10% de perda no corte da carne)
  notes                 text,

  CONSTRAINT recipe_items_unique_per_recipe UNIQUE (recipe_id, ingredient_id)
);

COMMENT ON TABLE recipe_items IS 'Composição de cada ficha técnica. waste_factor_pct inclui perda esperada no preparo.';


-- -----------------------------------------------------------------------------
-- 2.8  STOCK_MOVEMENTS (Movimentações de Estoque)
-- Tabela de alta frequência — particionada por mês para performance.
-- -----------------------------------------------------------------------------
CREATE TABLE stock_movements (
  id              uuid            NOT NULL DEFAULT gen_random_uuid(),
  tenant_id       uuid            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ingredient_id   uuid            NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  movement_type   movement_type_enum NOT NULL,
  quantity        numeric(15,4)   NOT NULL CHECK (quantity > 0),
  unit_cost       numeric(15,4)   NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  total_cost      numeric(15,4)   GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  supplier_id     uuid            REFERENCES suppliers(id) ON DELETE SET NULL,
  reference_id    uuid,           -- FK polimórfica: transaction_id, import_job_id, etc.
  reference_type  text,           -- 'transaction', 'import_job', 'manual'
  notes           text,
  created_by      uuid            REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz     NOT NULL DEFAULT now(),

  PRIMARY KEY (id, created_at)    -- Necessário para particionamento por RANGE
) PARTITION BY RANGE (created_at);

-- Partições iniciais (criar as futuras via pg_cron ou migration)
CREATE TABLE stock_movements_2025_01 PARTITION OF stock_movements
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE stock_movements_2025_02 PARTITION OF stock_movements
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE stock_movements_2025_03 PARTITION OF stock_movements
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE stock_movements_2025_04 PARTITION OF stock_movements
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE stock_movements_2025_05 PARTITION OF stock_movements
  FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE stock_movements_2025_06 PARTITION OF stock_movements
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE stock_movements_2025_07 PARTITION OF stock_movements
  FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE stock_movements_2025_08 PARTITION OF stock_movements
  FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE stock_movements_2025_09 PARTITION OF stock_movements
  FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE stock_movements_2025_10 PARTITION OF stock_movements
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE stock_movements_2025_11 PARTITION OF stock_movements
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE stock_movements_2025_12 PARTITION OF stock_movements
  FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE stock_movements_2026_01 PARTITION OF stock_movements
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE stock_movements_2026_02 PARTITION OF stock_movements
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE stock_movements_2026_03 PARTITION OF stock_movements
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE stock_movements_2026_04 PARTITION OF stock_movements
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE stock_movements_2026_05 PARTITION OF stock_movements
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE stock_movements_2026_06 PARTITION OF stock_movements
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE stock_movements_2026_07 PARTITION OF stock_movements
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE stock_movements_2026_08 PARTITION OF stock_movements
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE stock_movements_2026_09 PARTITION OF stock_movements
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE stock_movements_2026_10 PARTITION OF stock_movements
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE stock_movements_2026_11 PARTITION OF stock_movements
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE stock_movements_2026_12 PARTITION OF stock_movements
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

COMMENT ON TABLE stock_movements IS 'Ledger imutável de movimentações de estoque. Particionado mensalmente.';


-- -----------------------------------------------------------------------------
-- 2.9  TRANSACTIONS (Contas a Pagar / Receber / Lançamentos)
-- Também particionada por data para suportar grandes volumes.
-- -----------------------------------------------------------------------------
CREATE TABLE transactions (
  id                uuid            NOT NULL DEFAULT gen_random_uuid(),
  tenant_id         uuid            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type              transaction_type_enum NOT NULL,
  category          text            NOT NULL,
  description       text,
  amount            numeric(15,4)   NOT NULL CHECK (amount > 0),
  currency          char(3)         NOT NULL DEFAULT 'BRL',
  transaction_date  date            NOT NULL,
  due_date          date,
  paid_at           timestamptz,
  status            transaction_status_enum NOT NULL DEFAULT 'pending',
  supplier_id       uuid            REFERENCES suppliers(id) ON DELETE SET NULL,
  import_source     import_source_enum,
  import_job_id     uuid,
  notes             text,
  created_by        uuid            REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        timestamptz     NOT NULL DEFAULT now(),
  updated_at        timestamptz     NOT NULL DEFAULT now(),

  PRIMARY KEY (id, transaction_date)
) PARTITION BY RANGE (transaction_date);

-- Partições (mesmo padrão de stock_movements)
CREATE TABLE transactions_2025_01 PARTITION OF transactions FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE transactions_2025_02 PARTITION OF transactions FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE transactions_2025_03 PARTITION OF transactions FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE transactions_2025_04 PARTITION OF transactions FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE transactions_2025_05 PARTITION OF transactions FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE transactions_2025_06 PARTITION OF transactions FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE transactions_2025_07 PARTITION OF transactions FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE transactions_2025_08 PARTITION OF transactions FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE transactions_2025_09 PARTITION OF transactions FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE transactions_2025_10 PARTITION OF transactions FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE transactions_2025_11 PARTITION OF transactions FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE transactions_2025_12 PARTITION OF transactions FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE transactions_2026_01 PARTITION OF transactions FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE transactions_2026_02 PARTITION OF transactions FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE transactions_2026_03 PARTITION OF transactions FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE transactions_2026_04 PARTITION OF transactions FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE transactions_2026_05 PARTITION OF transactions FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE transactions_2026_06 PARTITION OF transactions FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE transactions_2026_07 PARTITION OF transactions FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE transactions_2026_08 PARTITION OF transactions FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE transactions_2026_09 PARTITION OF transactions FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE transactions_2026_10 PARTITION OF transactions FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE transactions_2026_11 PARTITION OF transactions FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE transactions_2026_12 PARTITION OF transactions FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

COMMENT ON TABLE transactions IS 'Lançamentos financeiros (receitas e despesas). Particionado por transaction_date.';


-- -----------------------------------------------------------------------------
-- 2.10  CMV_SNAPSHOTS (Snapshots de CMV calculados pelo backend)
-- Imutável após criação — representa o estado financeiro de um período.
-- -----------------------------------------------------------------------------
CREATE TABLE cmv_snapshots (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_start            date        NOT NULL,
  period_end              date        NOT NULL,
  revenue                 numeric(15,4) NOT NULL DEFAULT 0,
  theoretical_cmv         numeric(15,4) NOT NULL DEFAULT 0,
  real_cmv                numeric(15,4) NOT NULL DEFAULT 0,
  cmv_divergence_pct      numeric(8,4)  GENERATED ALWAYS AS (
                            CASE WHEN theoretical_cmv > 0
                              THEN ROUND(((real_cmv - theoretical_cmv) / theoretical_cmv) * 100, 4)
                              ELSE 0
                            END
                          ) STORED,
  gross_margin_pct        numeric(8,4)  GENERATED ALWAYS AS (
                            CASE WHEN revenue > 0
                              THEN ROUND(((revenue - real_cmv) / revenue) * 100, 4)
                              ELSE 0
                            END
                          ) STORED,
  breakdown_by_category   jsonb       NOT NULL DEFAULT '{}',
  -- {"carnes": {"theoretical": 1200, "real": 1380}, "laticínios": {...}}
  calculated_by           text        NOT NULL DEFAULT 'backend_service',
  calculated_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cmv_snapshots_period_per_tenant UNIQUE (tenant_id, period_start, period_end)
);

COMMENT ON TABLE cmv_snapshots IS 'Snapshots calculados pelo backend. cmv_divergence_pct e gross_margin_pct são colunas computadas.';


-- -----------------------------------------------------------------------------
-- 2.11  AI_ANALYSIS_LOGS (Logs do Agente de IA com Embeddings)
-- Armazena histórico de insights e embeddings para busca semântica futura.
-- -----------------------------------------------------------------------------
CREATE TABLE ai_analysis_logs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  analysis_type       analysis_type_enum NOT NULL,
  trigger_event       text        NOT NULL,
  -- Ex: "ingredient_price_change:tomate:+15%", "cmv_divergence:october:+8%"
  input_context       jsonb       NOT NULL DEFAULT '{}',
  -- Dados brutos enviados ao LLM (para auditoria e reprocessamento)
  insight_text        text        NOT NULL,
  -- Texto do insight gerado pela IA (enviado ao WhatsApp)
  recommendation      text,
  confidence_score    numeric(4,3) NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 1),
  model_used          text,       -- ex: "gpt-4o", "claude-3-5-sonnet"
  tokens_used         integer,
  notification_sent   boolean     NOT NULL DEFAULT false,
  notification_channel text,      -- 'whatsapp', 'email', 'dashboard_only'
  notification_sent_at timestamptz,
  embedding           vector(1536),
  -- Embedding do insight_text para busca semântica histórica.
  -- Dimensão 1536 compatível com text-embedding-3-small da OpenAI.
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_analysis_logs IS 'Histórico de análises da IA com embeddings pgvector para recuperação semântica.';
COMMENT ON COLUMN ai_analysis_logs.embedding IS 'Vetor 1536 dimensões (OpenAI text-embedding-3-small). Usar <=> para cosine similarity.';


-- -----------------------------------------------------------------------------
-- 2.12  IMPORT_JOBS (Jobs de Importação Universal)
-- Rastreia o estado de cada importação de dados externos.
-- -----------------------------------------------------------------------------
CREATE TABLE import_jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_system     text,       -- ex: "Linx", "Totvs", "Bling", "manual"
  file_type         import_source_enum NOT NULL,
  original_filename text,
  storage_path      text,       -- Caminho no Supabase Storage
  status            import_status_enum NOT NULL DEFAULT 'queued',
  target_table      text        NOT NULL,
  -- tabela de destino: 'transactions', 'stock_movements', 'ingredients'
  rows_total        integer     NOT NULL DEFAULT 0,
  rows_processed    integer     NOT NULL DEFAULT 0,
  rows_failed       integer     NOT NULL DEFAULT 0,
  error_log         jsonb       NOT NULL DEFAULT '[]',
  -- Array de {row: N, field: "x", error: "mensagem"}
  mapping_config    jsonb       NOT NULL DEFAULT '{}',
  -- Mapeamento de colunas do arquivo para o schema interno
  started_at        timestamptz,
  completed_at      timestamptz,
  created_by        uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE import_jobs IS 'Rastreia importações de dados externos (CSV, Excel, XML) com log de erros por linha.';


-- =============================================================================
-- SEÇÃO 3: ÍNDICES
-- Criados após as tabelas para clareza. Cobrem os padrões de query mais comuns.
-- =============================================================================

-- PROFILES
CREATE INDEX idx_profiles_tenant ON profiles (tenant_id);
CREATE INDEX idx_profiles_role ON profiles (tenant_id, role) WHERE is_active = true;

-- SUPPLIERS
CREATE INDEX idx_suppliers_tenant ON suppliers (tenant_id) WHERE is_active = true;

-- SUPPLIER_PRICE_HISTORY
CREATE INDEX idx_sph_tenant_ingredient_date ON supplier_price_history (tenant_id, ingredient_id, price_date DESC);
CREATE INDEX idx_sph_supplier ON supplier_price_history (tenant_id, supplier_id, price_date DESC);

-- INGREDIENTS
CREATE INDEX idx_ingredients_tenant ON ingredients (tenant_id) WHERE is_active = true;
CREATE INDEX idx_ingredients_low_stock ON ingredients (tenant_id, stock_quantity)
  WHERE stock_quantity <= min_stock_alert;

-- RECIPES
CREATE INDEX idx_recipes_tenant ON recipes (tenant_id) WHERE is_active = true;
CREATE INDEX idx_recipes_category ON recipes (tenant_id, category) WHERE is_active = true;

-- RECIPE_ITEMS
CREATE INDEX idx_recipe_items_recipe ON recipe_items (recipe_id);
CREATE INDEX idx_recipe_items_ingredient ON recipe_items (tenant_id, ingredient_id);

-- STOCK_MOVEMENTS (herdado pelas partições)
CREATE INDEX idx_stock_movements_tenant_ingredient ON stock_movements (tenant_id, ingredient_id, created_at DESC);
CREATE INDEX idx_stock_movements_type ON stock_movements (tenant_id, movement_type, created_at DESC);

-- TRANSACTIONS (herdado pelas partições)
CREATE INDEX idx_transactions_tenant_date ON transactions (tenant_id, transaction_date DESC)
  INCLUDE (amount, category, status, type);
CREATE INDEX idx_transactions_status ON transactions (tenant_id, status, due_date)
  WHERE status IN ('pending', 'confirmed');
CREATE INDEX idx_transactions_supplier ON transactions (tenant_id, supplier_id, transaction_date DESC);

-- CMV_SNAPSHOTS
CREATE INDEX idx_cmv_snapshots_tenant_period ON cmv_snapshots (tenant_id, period_start DESC);

-- AI_ANALYSIS_LOGS
CREATE INDEX idx_ai_logs_tenant_type ON ai_analysis_logs (tenant_id, analysis_type, created_at DESC);
CREATE INDEX idx_ai_logs_pending_notification ON ai_analysis_logs (tenant_id, created_at DESC)
  WHERE notification_sent = false;
-- Índice vetorial para busca semântica (ivfflat — balanceia velocidade e precisão)
-- lists = 100 é adequado para até ~1M embeddings por tenant pool.
-- Ajustar para lists = 200+ quando o total de registros passar de 500k.
CREATE INDEX idx_ai_logs_embedding ON ai_analysis_logs
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- IMPORT_JOBS
CREATE INDEX idx_import_jobs_tenant_status ON import_jobs (tenant_id, status, created_at DESC);


-- =============================================================================
-- SEÇÃO 4: FUNÇÕES AUXILIARES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 4.1  get_current_tenant_id()
-- Função central de segurança: resolve o tenant_id do usuário autenticado.
-- SECURITY DEFINER: roda com permissão do owner, não do caller (authenticated).
-- STABLE: o Postgres faz cache por query — evita N+1 lookups em policies.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM profiles
  WHERE id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_current_tenant_id IS
  'Resolve tenant_id do auth.uid() atual. Usada em todas as RLS policies. SECURITY DEFINER + STABLE para segurança e performance.';


-- -----------------------------------------------------------------------------
-- 4.2  is_tenant_admin()
-- Verifica se o usuário atual tem role owner ou manager.
-- Usada em policies que restringem operações destrutivas.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_tenant_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role IN ('owner', 'manager')
  );
$$;

COMMENT ON FUNCTION is_tenant_admin IS
  'Retorna true se o usuário atual tem role owner ou manager. Usada em policies de escrita/deleção.';


-- -----------------------------------------------------------------------------
-- 4.3  update_updated_at_column()
-- Trigger function genérica para manter updated_at atualizado.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- -----------------------------------------------------------------------------
-- 4.4  refresh_recipe_theoretical_cost()
-- Recalcula o custo teórico da receita ao alterar seus itens ou unit_cost.
-- Roda como trigger AFTER INSERT/UPDATE/DELETE em recipe_items.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_recipe_theoretical_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipe_id uuid;
  v_new_cost  numeric(15,4);
BEGIN
  v_recipe_id := COALESCE(NEW.recipe_id, OLD.recipe_id);

  SELECT COALESCE(SUM(
    ri.quantity
    * ri.unit_cost_snapshot
    * (1 + ri.waste_factor_pct / 100.0)
  ), 0)
  INTO v_new_cost
  FROM recipe_items ri
  WHERE ri.recipe_id = v_recipe_id;

  UPDATE recipes
  SET theoretical_cost = v_new_cost,
      updated_at = now()
  WHERE id = v_recipe_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION refresh_recipe_theoretical_cost IS
  'Recalcula theoretical_cost na tabela recipes sempre que recipe_items mudar. Inclui waste_factor_pct no custo.';


-- -----------------------------------------------------------------------------
-- 4.5  update_ingredient_stock()
-- Atualiza stock_quantity do ingrediente após cada movimentação.
-- Entradas (purchase): soma. Saídas (consumption, waste, adjustment): subtrai.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_ingredient_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.movement_type IN ('purchase', 'return') THEN
    UPDATE ingredients
    SET stock_quantity = stock_quantity + NEW.quantity,
        unit_cost = NEW.unit_cost,  -- atualiza custo corrente
        updated_at = now()
    WHERE id = NEW.ingredient_id;
  ELSIF NEW.movement_type IN ('consumption', 'waste', 'adjustment') THEN
    UPDATE ingredients
    SET stock_quantity = GREATEST(0, stock_quantity - NEW.quantity),
        updated_at = now()
    WHERE id = NEW.ingredient_id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_ingredient_stock IS
  'Trigger AFTER INSERT em stock_movements. Mantém stock_quantity e unit_cost do ingrediente sincronizados.';


-- =============================================================================
-- SEÇÃO 5: TRIGGERS
-- =============================================================================

-- updated_at automático
CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_ingredients_updated_at
  BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Custo teórico da receita
CREATE TRIGGER trg_recipe_cost_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON recipe_items
  FOR EACH ROW EXECUTE FUNCTION refresh_recipe_theoretical_cost();

-- Estoque após movimentação
CREATE TRIGGER trg_stock_after_movement
  AFTER INSERT ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION update_ingredient_stock();


-- =============================================================================
-- SEÇÃO 6: ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
-- Princípio: authenticated nunca bypassa RLS.
--            service_role (backend) bypassa nativamente — manter a service key
--            apenas no backend, NUNCA expor no frontend.
-- =============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE tenants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cmv_snapshots        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs          ENABLE ROW LEVEL SECURITY;

-- Garantir que tabelas não vazem dados sem uma policy explícita
-- (o padrão do Supabase já nega tudo com RLS ativo, mas ser explícito é melhor)
ALTER TABLE tenants              FORCE ROW LEVEL SECURITY;
ALTER TABLE profiles             FORCE ROW LEVEL SECURITY;
ALTER TABLE suppliers            FORCE ROW LEVEL SECURITY;
ALTER TABLE supplier_price_history FORCE ROW LEVEL SECURITY;
ALTER TABLE ingredients          FORCE ROW LEVEL SECURITY;
ALTER TABLE recipes              FORCE ROW LEVEL SECURITY;
ALTER TABLE recipe_items         FORCE ROW LEVEL SECURITY;
ALTER TABLE stock_movements      FORCE ROW LEVEL SECURITY;
ALTER TABLE transactions         FORCE ROW LEVEL SECURITY;
ALTER TABLE cmv_snapshots        FORCE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_logs     FORCE ROW LEVEL SECURITY;
ALTER TABLE import_jobs          FORCE ROW LEVEL SECURITY;


-- ============================================================
-- TENANTS
-- Usuário lê apenas o próprio tenant. Nenhum role pode alterar
-- dados de billing/plan via client — apenas o backend (service_role).
-- ============================================================
CREATE POLICY "tenants_select_own"
  ON tenants FOR SELECT
  USING (id = get_current_tenant_id());

-- Apenas owner pode atualizar nome e configurações do tenant
CREATE POLICY "tenants_update_owner_only"
  ON tenants FOR UPDATE
  USING (
    id = get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'owner'
        AND is_active = true
    )
  )
  WITH CHECK (
    id = get_current_tenant_id()
    -- plan_tier e is_active NÃO devem ser alteráveis pelo cliente:
    -- validar no backend que essas colunas não foram enviadas no payload.
  );

-- INSERT e DELETE de tenants: apenas service_role (via backend de onboarding)
-- Sem policy para INSERT/DELETE = authenticated não consegue executar.


-- ============================================================
-- PROFILES
-- ============================================================

-- Qualquer usuário autenticado vê todos os perfis do seu tenant
CREATE POLICY "profiles_tenant_select"
  ON profiles FOR SELECT
  USING (tenant_id = get_current_tenant_id());

-- Usuário atualiza apenas o próprio perfil
CREATE POLICY "profiles_self_update"
  ON profiles FOR UPDATE
  USING (id = auth.uid() AND tenant_id = get_current_tenant_id())
  WITH CHECK (id = auth.uid() AND tenant_id = get_current_tenant_id());

-- Owner/manager pode criar perfis no mesmo tenant
CREATE POLICY "profiles_admin_insert"
  ON profiles FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );

-- Owner pode desativar outros usuários (soft delete via is_active)
CREATE POLICY "profiles_owner_deactivate"
  ON profiles FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid()
        AND p2.role = 'owner'
        AND p2.is_active = true
    )
  )
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Hard DELETE: bloqueado para todos os roles via client.
-- Remoção real apenas via service_role no backend (compliance LGPD).


-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE POLICY "suppliers_tenant_select"
  ON suppliers FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "suppliers_admin_insert"
  ON suppliers FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );

CREATE POLICY "suppliers_admin_update"
  ON suppliers FOR UPDATE
  USING (tenant_id = get_current_tenant_id() AND is_tenant_admin())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "suppliers_owner_delete"
  ON suppliers FOR DELETE
  USING (
    tenant_id = get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner' AND is_active = true
    )
  );


-- ============================================================
-- SUPPLIER_PRICE_HISTORY
-- ============================================================
CREATE POLICY "sph_tenant_select"
  ON supplier_price_history FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "sph_admin_insert"
  ON supplier_price_history FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );

-- Histórico de preços é imutável: UPDATE e DELETE negados para authenticated.


-- ============================================================
-- INGREDIENTS
-- ============================================================
CREATE POLICY "ingredients_tenant_select"
  ON ingredients FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "ingredients_admin_insert"
  ON ingredients FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );

CREATE POLICY "ingredients_admin_update"
  ON ingredients FOR UPDATE
  USING (tenant_id = get_current_tenant_id() AND is_tenant_admin())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "ingredients_owner_delete"
  ON ingredients FOR DELETE
  USING (
    tenant_id = get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner' AND is_active = true
    )
  );


-- ============================================================
-- RECIPES
-- ============================================================
CREATE POLICY "recipes_tenant_select"
  ON recipes FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "recipes_admin_insert"
  ON recipes FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );

CREATE POLICY "recipes_admin_update"
  ON recipes FOR UPDATE
  USING (tenant_id = get_current_tenant_id() AND is_tenant_admin())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "recipes_owner_delete"
  ON recipes FOR DELETE
  USING (
    tenant_id = get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner' AND is_active = true
    )
  );


-- ============================================================
-- RECIPE_ITEMS
-- ============================================================
CREATE POLICY "recipe_items_tenant_select"
  ON recipe_items FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "recipe_items_admin_write"
  ON recipe_items FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );

CREATE POLICY "recipe_items_admin_update"
  ON recipe_items FOR UPDATE
  USING (tenant_id = get_current_tenant_id() AND is_tenant_admin())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "recipe_items_admin_delete"
  ON recipe_items FOR DELETE
  USING (tenant_id = get_current_tenant_id() AND is_tenant_admin());


-- ============================================================
-- STOCK_MOVEMENTS
-- Leitura: todos os roles do tenant.
-- Escrita: apenas admin (manager/owner).
-- NUNCA deletar movimentações — são ledger financeiro imutável.
-- ============================================================
CREATE POLICY "stock_movements_tenant_select"
  ON stock_movements FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "stock_movements_admin_insert"
  ON stock_movements FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );

-- UPDATE e DELETE bloqueados para authenticated: ledger imutável.
-- Correções devem ser feitas via nova movimentação de ajuste.


-- ============================================================
-- TRANSACTIONS
-- Leitura: todos os roles.
-- Escrita (INSERT/UPDATE): apenas admin.
-- DELETE: apenas owner e somente registros no status 'pending'.
-- ============================================================
CREATE POLICY "transactions_tenant_select"
  ON transactions FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "transactions_admin_insert"
  ON transactions FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );

CREATE POLICY "transactions_admin_update"
  ON transactions FOR UPDATE
  USING (tenant_id = get_current_tenant_id() AND is_tenant_admin())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "transactions_owner_delete_pending"
  ON transactions FOR DELETE
  USING (
    tenant_id = get_current_tenant_id()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner' AND is_active = true
    )
  );


-- ============================================================
-- CMV_SNAPSHOTS
-- Apenas leitura para authenticated.
-- Escrita exclusiva do backend via service_role.
-- ============================================================
CREATE POLICY "cmv_snapshots_tenant_select"
  ON cmv_snapshots FOR SELECT
  USING (tenant_id = get_current_tenant_id());

-- INSERT, UPDATE, DELETE: sem policy para authenticated = bloqueado.
-- O backend usa service_role que bypassa RLS.


-- ============================================================
-- AI_ANALYSIS_LOGS
-- Leitura: todos os roles do tenant.
-- Escrita: bloqueada para authenticated — apenas service_role.
-- ============================================================
CREATE POLICY "ai_logs_tenant_select"
  ON ai_analysis_logs FOR SELECT
  USING (tenant_id = get_current_tenant_id());

-- INSERT/UPDATE/DELETE: sem policy para authenticated = bloqueado.


-- ============================================================
-- IMPORT_JOBS
-- Leitura: todos os roles do tenant.
-- Criação: apenas admin (quem faz upload).
-- ============================================================
CREATE POLICY "import_jobs_tenant_select"
  ON import_jobs FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "import_jobs_admin_insert"
  ON import_jobs FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );

-- UPDATE de status: apenas service_role (worker de importação).
-- DELETE: bloqueado — manter histórico de importações para auditoria.


-- =============================================================================
-- SEÇÃO 7: PERMISSÕES DE ROLE
-- Revoga o acesso excessivo e concede apenas o necessário.
-- =============================================================================

-- Revogar acesso do anon ao schema público inteiramente
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Revogar ALL do authenticated (vai conceder apenas o necessário abaixo)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Conceder apenas as permissões DML necessárias (RLS filtra o resto)
GRANT SELECT ON tenants              TO authenticated;
GRANT SELECT, UPDATE ON profiles     TO authenticated;
GRANT SELECT, INSERT ON suppliers    TO authenticated;
GRANT SELECT, INSERT ON supplier_price_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ingredients TO authenticated;
GRANT SELECT, INSERT, UPDATE ON recipes     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON recipe_items TO authenticated;
GRANT SELECT, INSERT ON stock_movements  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO authenticated;
GRANT SELECT ON cmv_snapshots        TO authenticated;
GRANT SELECT ON ai_analysis_logs     TO authenticated;
GRANT SELECT, INSERT ON import_jobs  TO authenticated;

-- Conceder execução nas funções helper
GRANT EXECUTE ON FUNCTION get_current_tenant_id TO authenticated;
GRANT EXECUTE ON FUNCTION is_tenant_admin        TO authenticated;

-- service_role tem SUPERUSER dentro do schema — não precisa de GRANTs explícitos.
-- NUNCA expor a service_role key no cliente.


-- =============================================================================
-- SEÇÃO 8: FUNÇÃO DE CRIAÇÃO AUTOMÁTICA DE PARTIÇÕES FUTURAS
-- Agendar via pg_cron no primeiro dia de cada mês.
-- =============================================================================

CREATE OR REPLACE FUNCTION create_monthly_partitions(target_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- Cria partição para o próximo mês a partir de target_date
  next_month      date := date_trunc('month', target_date) + interval '1 month';
  next_month_end  date := next_month + interval '1 month';
  partition_suffix text := to_char(next_month, 'YYYY_MM');
BEGIN
  -- stock_movements
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS stock_movements_%s PARTITION OF stock_movements FOR VALUES FROM (%L) TO (%L)',
    partition_suffix, next_month, next_month_end
  );

  -- transactions
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS transactions_%s PARTITION OF transactions FOR VALUES FROM (%L) TO (%L)',
    partition_suffix, next_month, next_month_end
  );

  RAISE NOTICE 'Partições criadas para o período % a %', next_month, next_month_end;
END;
$$;

COMMENT ON FUNCTION create_monthly_partitions IS
  'Cria partições do próximo mês para stock_movements e transactions. Agendar via pg_cron.';

-- Agendar a criação automática de partições (requer pg_cron habilitado no Supabase Pro+)
-- Roda todo dia 25 às 02:00, criando a partição do mês seguinte com antecedência.
-- Descomente após habilitar a extensão pg_cron:
-- SELECT cron.schedule('create-monthly-partitions', '0 2 25 * *', 'SELECT create_monthly_partitions()');


-- =============================================================================
-- SEÇÃO 9: FUNÇÃO DE ONBOARDING DE TENANT
-- Cria tenant + perfil de owner em uma única transação atômica.
-- Chamada pelo backend no signup, usando service_role.
-- =============================================================================

CREATE OR REPLACE FUNCTION create_tenant_with_owner(
  p_user_id       uuid,
  p_tenant_name   text,
  p_tenant_slug   text,
  p_owner_name    text,
  p_whatsapp      text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Validação básica
  IF p_tenant_slug !~ '^[a-z0-9\-]+$' THEN
    RAISE EXCEPTION 'Slug inválido: use apenas letras minúsculas, números e hífens.';
  END IF;

  -- Cria o tenant
  INSERT INTO tenants (name, slug, whatsapp_number)
  VALUES (p_tenant_name, p_tenant_slug, p_whatsapp)
  RETURNING id INTO v_tenant_id;

  -- Cria o perfil do owner vinculado ao auth.users
  INSERT INTO profiles (id, tenant_id, full_name, role, whatsapp_number)
  VALUES (p_user_id, v_tenant_id, p_owner_name, 'owner', p_whatsapp);

  RETURN v_tenant_id;
END;
$$;

COMMENT ON FUNCTION create_tenant_with_owner IS
  'Onboarding atômico: cria tenant + profile de owner. Chamar via backend com service_role após auth.signUp().';


-- =============================================================================
-- SEÇÃO 10: VIEW AUXILIAR PARA DASHBOARD (sem expor dados sensíveis)
-- =============================================================================

-- View de resumo financeiro do período atual (últimos 30 dias)
-- Segura pois usa get_current_tenant_id() — cada usuário vê apenas seus dados.
CREATE OR REPLACE VIEW current_period_summary AS
SELECT
  t.tenant_id,
  COUNT(*) FILTER (WHERE t.type = 'revenue')  AS revenue_count,
  COUNT(*) FILTER (WHERE t.type = 'expense')  AS expense_count,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'revenue'), 0)  AS total_revenue,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0)  AS total_expenses,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'revenue'), 0)
    - COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) AS net_result,
  COUNT(*) FILTER (WHERE t.status = 'pending' AND t.due_date <= CURRENT_DATE + 7) AS overdue_soon_count
FROM transactions t
WHERE
  t.tenant_id = get_current_tenant_id()
  AND t.transaction_date >= CURRENT_DATE - interval '30 days'
  AND t.status != 'cancelled'
GROUP BY t.tenant_id;

-- RLS na view: a view herda as policies das tabelas subjacentes.
-- Nenhuma policy extra necessária pois usa get_current_tenant_id().


-- =============================================================================
-- FIM DO SCRIPT
-- Versão: 1.0.0 | Zeus Financeiro
-- =============================================================================
