import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject,
} from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@zeus/database";
import { ADMIN_SUPABASE_CLIENT } from "../supabase/supabase.module";
import type { AuthenticatedRequest } from "../auth/auth.guard";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject(ADMIN_SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient<Database>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.sub;
    if (!userId) throw new ForbiddenException("Não autenticado.");

    const { data: profile } = await this.supabase
      .from("profiles")
      .select("is_super_admin, is_active")
      .eq("id", userId)
      .single();

    if (!profile?.is_active) throw new ForbiddenException("Usuário inativo.");
    if (!profile?.is_super_admin) throw new ForbiddenException("Acesso restrito a super-admins.");

    return true;
  }
}
