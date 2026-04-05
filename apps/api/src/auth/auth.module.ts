import { Module } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { TenantGuard } from "./tenant.guard";

/**
 * Módulo de autenticação.
 * AuthGuard valida o JWT via Supabase Auth API (suporte a ECC P-256).
 * TenantGuard resolve o tenant_id a partir do user.sub.
 */
@Module({
  providers: [AuthGuard, TenantGuard],
  exports: [AuthGuard, TenantGuard],
})
export class AuthModule {}
