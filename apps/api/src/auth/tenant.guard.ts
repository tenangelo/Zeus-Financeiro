import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@zeus/database";
import { SUPABASE_CLIENT } from "../supabase/supabase.module";
import type { AuthenticatedRequest } from "./auth.guard";

/**
 * Guard que resolve e injeta o tenantId na requisição.
 * Deve ser usado APÓS o AuthGuard.
 *
 * Faz lookup na tabela profiles usando o user.sub do JWT
 * para determinar qual tenant_id pertence ao usuário.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient<Database>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.sub;

    if (!userId) {
      throw new ForbiddenException("Usuário não autenticado.");
    }

    const { data: profile, error } = await this.supabase
      .from("profiles")
      .select("tenant_id, role, is_active")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      throw new ForbiddenException("Perfil não encontrado.");
    }

    if (!profile.is_active) {
      throw new ForbiddenException("Usuário inativo.");
    }

    request.tenantId = profile.tenant_id;
    return true;
  }
}
