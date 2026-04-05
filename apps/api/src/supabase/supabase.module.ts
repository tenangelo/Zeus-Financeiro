import { Module, Global } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@zeus/database";

export const SUPABASE_CLIENT = "SUPABASE_CLIENT";

/**
 * Módulo global que provê o Supabase Admin Client (service_role).
 * Este client bypassa RLS — usar APENAS no backend para operações
 * que exigem acesso cross-tenant (cálculo CMV, jobs de IA, onboarding).
 *
 * NUNCA expor a service_role key no frontend.
 */
@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): SupabaseClient<Database> => {
        const url = config.getOrThrow<string>("SUPABASE_URL");
        const serviceKey = config.getOrThrow<string>("SUPABASE_SERVICE_ROLE_KEY");
        return createClient<Database>(url, serviceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
      },
    },
  ],
  exports: [SUPABASE_CLIENT],
})
export class SupabaseModule {}
