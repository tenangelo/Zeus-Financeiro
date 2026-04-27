-- =============================================================================
-- ZEUS FINANCEIRO — Admin, Plans & Subscriptions
-- =============================================================================

-- -----------------------------------------------------------------------
-- 1. is_super_admin no profiles
-- -----------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.is_super_admin IS 'Acesso ao painel super-admin do SaaS. Nunca expor via RLS a outros usuários.';

-- -----------------------------------------------------------------------
-- 2. stripe_customer_id nos tenants
-- -----------------------------------------------------------------------
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

COMMENT ON COLUMN tenants.stripe_customer_id IS 'ID do customer no Stripe. Criado no onboarding.';
COMMENT ON COLUMN tenants.stripe_subscription_id IS 'ID da assinatura ativa no Stripe.';

-- -----------------------------------------------------------------------
-- 3. PLANS (Planos do SaaS)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  slug                    text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9\-]+$'),
  tier                    plan_tier_enum NOT NULL,
  description             text,
  price_monthly           numeric(10,2) NOT NULL DEFAULT 0,
  price_yearly            numeric(10,2) NOT NULL DEFAULT 0,
  stripe_product_id       text,
  stripe_price_id_monthly text,
  stripe_price_id_yearly  text,
  features                jsonb NOT NULL DEFAULT '[]',
  -- Array de strings: ["Até 3 usuários", "15 ingredientes", "Suporte por email"]
  limits                  jsonb NOT NULL DEFAULT '{}',
  -- { max_users: 3, max_ingredients: 50, max_recipes: 20, ai_insights: false }
  is_active               boolean NOT NULL DEFAULT true,
  is_highlighted          boolean NOT NULL DEFAULT false, -- destaque na página de preços
  sort_order              smallint NOT NULL DEFAULT 0,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE plans IS 'Planos disponíveis no SaaS. Gerenciados pelo super-admin.';

-- -----------------------------------------------------------------------
-- 4. SUBSCRIPTIONS (Assinaturas dos Tenants)
-- -----------------------------------------------------------------------
CREATE TYPE subscription_status_enum AS ENUM (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused'
);

CREATE TYPE billing_interval_enum AS ENUM (
  'monthly',
  'yearly'
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id                 uuid NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  stripe_subscription_id  text UNIQUE,
  stripe_customer_id      text,
  status                  subscription_status_enum NOT NULL DEFAULT 'trialing',
  billing_interval        billing_interval_enum NOT NULL DEFAULT 'monthly',
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  trial_start             timestamptz,
  trial_end               timestamptz,
  canceled_at             timestamptz,
  cancel_at_period_end    boolean NOT NULL DEFAULT false,
  amount                  numeric(10,2) NOT NULL DEFAULT 0,
  currency                char(3) NOT NULL DEFAULT 'BRL',
  metadata                jsonb NOT NULL DEFAULT '{}',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT subscriptions_one_active_per_tenant UNIQUE (tenant_id)
);

COMMENT ON TABLE subscriptions IS 'Assinaturas dos tenants. Uma assinatura ativa por tenant.';

-- -----------------------------------------------------------------------
-- 5. PAYMENT_EVENTS (Log de eventos de pagamento do Stripe)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid REFERENCES tenants(id) ON DELETE SET NULL,
  stripe_event_id text NOT NULL UNIQUE,
  event_type      text NOT NULL,
  -- ex: 'invoice.paid', 'customer.subscription.deleted'
  payload         jsonb NOT NULL DEFAULT '{}',
  processed       boolean NOT NULL DEFAULT false,
  processed_at    timestamptz,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE payment_events IS 'Log idempotente de webhooks do Stripe.';

-- -----------------------------------------------------------------------
-- 6. SEED DOS PLANOS PADRÃO
-- -----------------------------------------------------------------------
INSERT INTO plans (name, slug, tier, description, price_monthly, price_yearly, features, limits, is_active, is_highlighted, sort_order)
VALUES
  (
    'Trial',
    'trial',
    'trial',
    'Experimente por 14 dias sem cartão de crédito.',
    0, 0,
    '["14 dias grátis","Até 2 usuários","50 ingredientes","20 fichas técnicas","Suporte por email"]'::jsonb,
    '{"max_users":2,"max_ingredients":50,"max_recipes":20,"ai_insights":false,"import_csv":false}'::jsonb,
    true, false, 0
  ),
  (
    'Starter',
    'starter',
    'starter',
    'Para restaurantes que estão começando a controlar o financeiro.',
    97, 970,
    '["3 usuários","200 ingredientes","50 fichas técnicas","Fluxo de caixa","DRE básico","Suporte por email"]'::jsonb,
    '{"max_users":3,"max_ingredients":200,"max_recipes":50,"ai_insights":false,"import_csv":true}'::jsonb,
    true, false, 1
  ),
  (
    'Pro',
    'pro',
    'pro',
    'Para restaurantes que querem controle total e análises avançadas.',
    197, 1970,
    '["10 usuários","Ingredientes ilimitados","Fichas técnicas ilimitadas","CMV + DRE completo","Alertas de IA via WhatsApp","Importação CSV/Excel","Suporte prioritário"]'::jsonb,
    '{"max_users":10,"max_ingredients":-1,"max_recipes":-1,"ai_insights":true,"import_csv":true}'::jsonb,
    true, true, 2
  ),
  (
    'Enterprise',
    'enterprise',
    'enterprise',
    'Para redes de restaurantes com múltiplas unidades.',
    497, 4970,
    '["Usuários ilimitados","Multi-unidade","API dedicada","Onboarding personalizado","SLA 99.9%","Suporte dedicado 24/7"]'::jsonb,
    '{"max_users":-1,"max_ingredients":-1,"max_recipes":-1,"ai_insights":true,"import_csv":true}'::jsonb,
    true, false, 3
  )
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------
-- 7. RLS — plans e subscriptions
-- -----------------------------------------------------------------------

-- Plans: leitura pública (qualquer autenticado pode ver), escrita só super-admin via service_role
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select_authenticated"
  ON plans FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Subscriptions: tenant vê só a própria
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- Payment events: service_role only (sem RLS público)
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------
-- 8. TORNAR O USUÁRIO SEED SUPER-ADMIN
-- Substitua pelo UUID se necessário (já deve estar no profiles)
-- -----------------------------------------------------------------------
-- UPDATE profiles SET is_super_admin = true WHERE id = 'SEU_UUID_AQUI';
