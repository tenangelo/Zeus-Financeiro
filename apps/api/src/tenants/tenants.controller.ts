import {
  Controller, Get, Post, Patch, Body, UseGuards, Request, Version,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { TenantsService } from "./tenants.service";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { UpdateTenantDto } from "./dto/update-tenant.dto";
import { AuthGuard } from "../auth/auth.guard";
import { TenantGuard } from "../auth/tenant.guard";
import type { AuthenticatedRequest } from "../auth/auth.guard";

@ApiTags("Tenants")
@ApiBearerAuth()
@Controller("tenants")
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  // Rota pública (só precisa de JWT, sem TenantGuard — usuário ainda não tem tenant)
  @Post("onboarding")
  @Version("1")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Criar tenant + profile de owner no onboarding inicial" })
  createOnboarding(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateTenantDto,
  ) {
    return this.service.createWithOwner(req.user.sub, dto.name, dto.slug, dto.whatsapp_number);
  }

  @Get("me")
  @Version("1")
  @UseGuards(AuthGuard, TenantGuard)
  @ApiOperation({ summary: "Retorna dados do tenant do usuário autenticado" })
  getMyTenant(@Request() req: AuthenticatedRequest) {
    return this.service.findOne(req.tenantId);
  }

  @Patch("me")
  @Version("1")
  @UseGuards(AuthGuard, TenantGuard)
  @ApiOperation({ summary: "Atualizar dados do tenant (owner/manager)" })
  updateMyTenant(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.service.update(req.tenantId, req.user.sub, dto);
  }

  @Get("me/team")
  @Version("1")
  @UseGuards(AuthGuard, TenantGuard)
  @ApiOperation({ summary: "Listar membros ativos do tenant" })
  getTeam(@Request() req: AuthenticatedRequest) {
    return this.service.getTeamMembers(req.tenantId);
  }
}
