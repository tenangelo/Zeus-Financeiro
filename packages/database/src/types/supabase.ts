/**
 * ARQUIVO GERADO AUTOMATICAMENTE
 *
 * Este arquivo é um placeholder. Após configurar o Supabase CLI e rodar o schema,
 * execute na raiz do monorepo:
 *
 *   pnpm db:generate-types
 *
 * O comando acima vai substituir este arquivo com os tipos reais gerados
 * a partir do banco de dados Supabase conectado.
 *
 * Documentação: https://supabase.com/docs/guides/api/rest/generating-types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          whatsapp_number: string | null;
          plan_tier: "trial" | "starter" | "pro" | "enterprise";
          is_active: boolean;
          settings: Json;
          trial_ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          whatsapp_number?: string | null;
          plan_tier?: "trial" | "starter" | "pro" | "enterprise";
          is_active?: boolean;
          settings?: Json;
          trial_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          whatsapp_number?: string | null;
          plan_tier?: "trial" | "starter" | "pro" | "enterprise";
          is_active?: boolean;
          settings?: Json;
          trial_ends_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          tenant_id: string;
          full_name: string;
          role: "owner" | "manager" | "staff";
          whatsapp_number: string | null;
          avatar_url: string | null;
          is_active: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          tenant_id: string;
          full_name: string;
          role?: "owner" | "manager" | "staff";
          whatsapp_number?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          tenant_id?: string;
          full_name?: string;
          role?: "owner" | "manager" | "staff";
          whatsapp_number?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          last_login_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      ingredients: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          category: string | null;
          unit: string;
          unit_cost: number;
          stock_quantity: number;
          min_stock_alert: number;
          expiry_date: string | null;
          preferred_supplier_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          category?: string | null;
          unit: string;
          unit_cost?: number;
          stock_quantity?: number;
          min_stock_alert?: number;
          expiry_date?: string | null;
          preferred_supplier_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          category?: string | null;
          unit?: string;
          unit_cost?: number;
          stock_quantity?: number;
          min_stock_alert?: number;
          expiry_date?: string | null;
          preferred_supplier_id?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          document: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          payment_terms: string | null;
          avg_delivery_days: number | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          document?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          payment_terms?: string | null;
          avg_delivery_days?: number | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          document?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          payment_terms?: string | null;
          avg_delivery_days?: number | null;
          notes?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      supplier_price_history: {
        Row: {
          id: string;
          tenant_id: string;
          supplier_id: string;
          ingredient_id: string;
          unit_price: number;
          quantity: number | null;
          price_date: string;
          source: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          supplier_id: string;
          ingredient_id: string;
          unit_price: number;
          quantity?: number | null;
          price_date?: string;
          source?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>; // histórico imutável
        Relationships: [];
      };
      recipes: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          category: string | null;
          description: string | null;
          sale_price: number;
          theoretical_cost: number;
          theoretical_margin: number; // coluna computada
          serving_size: number | null;
          preparation_time_min: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          category?: string | null;
          description?: string | null;
          sale_price?: number;
          theoretical_cost?: number;
          serving_size?: number | null;
          preparation_time_min?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          category?: string | null;
          description?: string | null;
          sale_price?: number;
          serving_size?: number | null;
          preparation_time_min?: number | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      recipe_items: {
        Row: {
          id: string;
          tenant_id: string;
          recipe_id: string;
          ingredient_id: string;
          quantity: number;
          unit_cost_snapshot: number;
          waste_factor_pct: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          recipe_id: string;
          ingredient_id: string;
          quantity: number;
          unit_cost_snapshot?: number;
          waste_factor_pct?: number;
          notes?: string | null;
        };
        Update: {
          quantity?: number;
          unit_cost_snapshot?: number;
          waste_factor_pct?: number;
          notes?: string | null;
        };
        Relationships: [];
      };
      stock_movements: {
        Row: {
          id: string;
          tenant_id: string;
          ingredient_id: string;
          movement_type: "purchase" | "consumption" | "waste" | "adjustment" | "return";
          quantity: number;
          unit_cost: number;
          total_cost: number; // coluna computada
          supplier_id: string | null;
          reference_id: string | null;
          reference_type: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          ingredient_id: string;
          movement_type: "purchase" | "consumption" | "waste" | "adjustment" | "return";
          quantity: number;
          unit_cost?: number;
          supplier_id?: string | null;
          reference_id?: string | null;
          reference_type?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>; // ledger imutável
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          tenant_id: string;
          type: "revenue" | "expense";
          category: string;
          description: string | null;
          amount: number;
          currency: string;
          transaction_date: string;
          due_date: string | null;
          paid_at: string | null;
          status: "pending" | "confirmed" | "cancelled" | "reconciled";
          supplier_id: string | null;
          import_source: string | null;
          import_job_id: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          type: "revenue" | "expense";
          category: string;
          description?: string | null;
          amount: number;
          currency?: string;
          transaction_date: string;
          due_date?: string | null;
          paid_at?: string | null;
          status?: "pending" | "confirmed" | "cancelled" | "reconciled";
          supplier_id?: string | null;
          import_source?: string | null;
          import_job_id?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          description?: string | null;
          amount?: number;
          due_date?: string | null;
          paid_at?: string | null;
          status?: "pending" | "confirmed" | "cancelled" | "reconciled";
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      cmv_snapshots: {
        Row: {
          id: string;
          tenant_id: string;
          period_start: string;
          period_end: string;
          revenue: number;
          theoretical_cmv: number;
          real_cmv: number;
          cmv_divergence_pct: number;
          gross_margin_pct: number;
          breakdown_by_category: Json;
          calculated_by: string;
          calculated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          period_start: string;
          period_end: string;
          revenue?: number;
          theoretical_cmv?: number;
          real_cmv?: number;
          breakdown_by_category?: Json;
          calculated_by?: string;
          calculated_at?: string;
        };
        Update: {
          revenue?: number;
          theoretical_cmv?: number;
          real_cmv?: number;
          breakdown_by_category?: Json;
          calculated_by?: string;
        };
        Relationships: [];
      };
      ai_analysis_logs: {
        Row: {
          id: string;
          tenant_id: string;
          analysis_type: string;
          trigger_event: string;
          input_context: Json;
          insight_text: string;
          recommendation: string | null;
          confidence_score: number;
          model_used: string | null;
          tokens_used: number | null;
          notification_sent: boolean;
          notification_channel: string | null;
          notification_sent_at: string | null;
          embedding: string | null; // vector — tratado como string no cliente
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          analysis_type: string;
          trigger_event: string;
          input_context?: Json;
          insight_text: string;
          recommendation?: string | null;
          confidence_score?: number;
          model_used?: string | null;
          tokens_used?: number | null;
          notification_sent?: boolean;
          notification_channel?: string | null;
          notification_sent_at?: string | null;
          embedding?: string | null;
          created_at?: string;
        };
        Update: {
          notification_sent?: boolean;
          notification_channel?: string | null;
          notification_sent_at?: string | null;
        };
        Relationships: [];
      };
      import_jobs: {
        Row: {
          id: string;
          tenant_id: string;
          source_system: string | null;
          file_type: string;
          original_filename: string | null;
          storage_path: string | null;
          status: "queued" | "processing" | "completed" | "failed";
          target_table: string;
          rows_total: number;
          rows_processed: number;
          rows_failed: number;
          error_log: Json;
          mapping_config: Json;
          started_at: string | null;
          completed_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          source_system?: string | null;
          file_type: string;
          original_filename?: string | null;
          storage_path?: string | null;
          status?: "queued" | "processing" | "completed" | "failed";
          target_table: string;
          rows_total?: number;
          rows_processed?: number;
          rows_failed?: number;
          error_log?: Json;
          mapping_config?: Json;
          started_at?: string | null;
          completed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          status?: "queued" | "processing" | "completed" | "failed";
          rows_total?: number;
          rows_processed?: number;
          rows_failed?: number;
          error_log?: Json;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      current_period_summary: {
        Row: {
          tenant_id: string;
          revenue_count: number;
          expense_count: number;
          total_revenue: number;
          total_expenses: number;
          net_result: number;
          overdue_soon_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_current_tenant_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      is_tenant_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      create_tenant_with_owner: {
        Args: {
          p_user_id: string;
          p_tenant_name: string;
          p_tenant_slug: string;
          p_owner_name: string;
          p_whatsapp?: string;
        };
        Returns: string;
      };
    };
    Enums: {
      plan_tier_enum: "trial" | "starter" | "pro" | "enterprise";
      user_role_enum: "owner" | "manager" | "staff";
      transaction_type_enum: "revenue" | "expense";
      transaction_status_enum: "pending" | "confirmed" | "cancelled" | "reconciled";
      movement_type_enum: "purchase" | "consumption" | "waste" | "adjustment" | "return";
      analysis_type_enum:
        | "cost_alert"
        | "waste_detection"
        | "supplier_comparison"
        | "margin_drop"
        | "cash_flow_risk"
        | "monthly_summary";
      import_status_enum: "queued" | "processing" | "completed" | "failed";
      import_source_enum: "csv" | "excel" | "xml" | "api_webhook" | "manual";
    };
  };
}
