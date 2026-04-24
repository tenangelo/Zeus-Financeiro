import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyRequest } from "fastify";
import { ADMIN_SUPABASE_CLIENT } from "../supabase/supabase.module";

export interface JwtPayload {
  sub: string;    // auth.users.id (UUID)
  email: string;
  role: string;
  aud: string;
  exp: number;
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: JwtPayload;
  tenantId: string; // resolvido pelo TenantGuard
}

/**
 * Guard que valida o JWT do Supabase delegando ao próprio Auth API.
 * Funciona com ECC (P-256) e qualquer algoritmo de assinatura futuro —
 * não depende de SUPABASE_JWT_SECRET nem de @nestjs/jwt.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(ADMIN_SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Token de autenticação ausente.");
    }

    const { data, error } = await this.supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException("Token inválido ou expirado.");
    }

    // Monta payload compatível com o contrato anterior
    request.user = {
      sub:   data.user.id,
      email: data.user.email ?? "",
      role:  data.user.role ?? "authenticated",
      aud:   "authenticated",
      exp:   0,
    };

    return true;
  }

  private extractToken(request: FastifyRequest): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
