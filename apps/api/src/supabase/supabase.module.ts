import { Module, Global, Scope } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { REQUEST } from "@nestjs/core";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@zeus/database";
import { FastifyRequest } from "fastify";

export const ADMIN_SUPABASE_CLIENT = "ADMIN_SUPABASE_CLIENT";
export const USER_SUPABASE_CLIENT = "USER_SUPABASE_CLIENT";

/**
 * Supabase Admin Client (service_role).
 * Este client bypassa RLS — usar APENAS no backend para operações
 * que exigem acesso cross-tenant (como jobs) ou etapas pré-auth.
 *
 * NUNCA expor a service_role key no frontend.
 */
const AdminSupabaseClientProvider = {
  provide: ADMIN_SUPABASE_CLIENT,
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
};

/**
 * Supabase User Client (anon key + JWT header).
 * Este client tem escopo por requisição. Ele assume a identidade do usuário
 * repassando o Bearer token para o Supabase, forçando a segurança via RLS do banco.
 */
const UserSupabaseClientProvider = {
  provide: USER_SUPABASE_CLIENT,
  scope: Scope.REQUEST,
  inject: [REQUEST, ConfigService],
  useFactory: (request: FastifyRequest, config: ConfigService): SupabaseClient<Database> => {
    const url = config.getOrThrow<string>("SUPABASE_URL");
    const anonKey = config.getOrThrow<string>("SUPABASE_ANON_KEY");

    // Extrai o header de autorização da requisição original, se houver
    const authHeader = request.headers.authorization;
    const globalHeaders: Record<string, string> = {};
    
    if (authHeader) {
      globalHeaders["Authorization"] = authHeader;
    }

    return createClient<Database>(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: globalHeaders,
      },
    });
  },
};

@Global()
@Module({
  providers: [AdminSupabaseClientProvider, UserSupabaseClientProvider],
  exports: [ADMIN_SUPABASE_CLIENT, USER_SUPABASE_CLIENT],
})
export class SupabaseModule {}
