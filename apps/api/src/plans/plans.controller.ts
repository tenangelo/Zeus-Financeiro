import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  UseGuards, Version, ParseUUIDPipe, Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PlansService, CreatePlanDto, UpdatePlanDto } from "./plans.service";
import { AuthGuard } from "../auth/auth.guard";
import { AdminGuard } from "../admin/admin.guard";

@ApiTags("Plans")
@Controller("plans")
export class PlansController {
  constructor(private readonly service: PlansService) {}

  // Público: qualquer autenticado pode listar planos (para página de preços)
  @Get()
  @Version("1")
  @ApiOperation({ summary: "Listar planos ativos (público)" })
  findAll(@Query("include_inactive") includeInactive?: string) {
    return this.service.findAll(includeInactive === "true");
  }

  @Get(":id")
  @Version("1")
  @ApiOperation({ summary: "Detalhes de um plano" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  // Admin-only abaixo
  @Post()
  @Version("1")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, AdminGuard)
  @ApiOperation({ summary: "Criar plano (admin)" })
  create(@Body() dto: CreatePlanDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  @Version("1")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, AdminGuard)
  @ApiOperation({ summary: "Editar plano (admin)" })
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdatePlanDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @Version("1")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, AdminGuard)
  @ApiOperation({ summary: "Excluir plano sem assinaturas ativas (admin)" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
