import {
  Controller, Get, Patch, Delete, Post, Body, Param, Query,
  UseGuards, Version, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { AuthGuard } from "../auth/auth.guard";
import { AdminGuard } from "./admin.guard";
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

class UpdateTenantAdminDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() plan_tier?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
}

class AssignPlanDto {
  @IsUUID() plan_id: string;
  @IsOptional() @IsEnum(["monthly", "yearly"]) billing_interval?: "monthly" | "yearly";
}

class SetSuperAdminDto {
  @IsBoolean() is_super_admin: boolean;
}

@ApiTags("Admin")
@ApiBearerAuth()
@UseGuards(AuthGuard, AdminGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get("metrics")
  @Version("1")
  @ApiOperation({ summary: "Métricas globais do SaaS (MRR, tenants, usuários)" })
  getMetrics() {
    return this.service.getMetrics();
  }

  // ─── Tenants ─────────────────────────────────────────────────────
  @Get("tenants")
  @Version("1")
  @ApiOperation({ summary: "Listar todos os tenants" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "search", required: false })
  listTenants(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("search") search?: string,
  ) {
    return this.service.listTenants(page, limit, search);
  }

  @Get("tenants/:id")
  @Version("1")
  @ApiOperation({ summary: "Detalhes de um tenant" })
  getTenant(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.getTenant(id);
  }

  @Patch("tenants/:id")
  @Version("1")
  @ApiOperation({ summary: "Editar tenant (admin)" })
  updateTenant(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantAdminDto,
  ) {
    return this.service.updateTenant(id, dto);
  }

  @Patch("tenants/:id/activate")
  @Version("1")
  @ApiOperation({ summary: "Ativar tenant" })
  activateTenant(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.toggleTenantActive(id, true);
  }

  @Patch("tenants/:id/deactivate")
  @Version("1")
  @ApiOperation({ summary: "Desativar tenant (bloquear acesso)" })
  deactivateTenant(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.toggleTenantActive(id, false);
  }

  @Delete("tenants/:id")
  @Version("1")
  @ApiOperation({ summary: "Deletar tenant e todos os dados (irreversível)" })
  deleteTenant(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.deleteTenant(id);
  }

  @Post("tenants/:id/assign-plan")
  @Version("1")
  @ApiOperation({ summary: "Atribuir/trocar plano de um tenant" })
  assignPlan(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignPlanDto,
  ) {
    return this.service.assignPlan(id, dto.plan_id, dto.billing_interval);
  }

  // ─── Users ───────────────────────────────────────────────────────
  @Get("users")
  @Version("1")
  @ApiOperation({ summary: "Listar todos os usuários" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "search", required: false })
  listUsers(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("search") search?: string,
  ) {
    return this.service.listUsers(page, limit, search);
  }

  @Patch("users/:id/activate")
  @Version("1")
  @ApiOperation({ summary: "Ativar usuário" })
  activateUser(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.toggleUserActive(id, true);
  }

  @Patch("users/:id/deactivate")
  @Version("1")
  @ApiOperation({ summary: "Desativar usuário" })
  deactivateUser(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.toggleUserActive(id, false);
  }

  @Patch("users/:id/super-admin")
  @Version("1")
  @ApiOperation({ summary: "Conceder/revogar acesso super-admin" })
  setSuperAdmin(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SetSuperAdminDto,
  ) {
    return this.service.setSuperAdmin(id, dto.is_super_admin);
  }

  // ─── Subscriptions ───────────────────────────────────────────────
  @Get("subscriptions")
  @Version("1")
  @ApiOperation({ summary: "Listar todas as assinaturas" })
  listSubscriptions(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.listSubscriptions(page, limit);
  }
}
