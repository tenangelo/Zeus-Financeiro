import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Version,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from "@nestjs/swagger";
import { RecipesService } from "./recipes.service";
import { CreateRecipeDto } from "./dto/create-recipe.dto";
import { UpdateRecipeDto } from "./dto/update-recipe.dto";
import { AuthGuard } from "../auth/auth.guard";
import { TenantGuard } from "../auth/tenant.guard";
import type { AuthenticatedRequest } from "../auth/auth.guard";

@ApiTags("Recipes")
@ApiBearerAuth()
@UseGuards(AuthGuard, TenantGuard)
@Controller("recipes")
export class RecipesController {
  constructor(private readonly service: RecipesService) {}

  @Post("preview-cost")
  @Version("1")
  @ApiOperation({
    summary: "Simular custo e margem de uma receita antes de criar",
    description:
      "Calcula custo teórico e margem com os preços atuais dos ingredientes. " +
      "Não persiste nada — usado para feedback imediato no formulário de criação.",
  })
  previewCost(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateRecipeDto
  ) {
    return this.service.previewCost(req.tenantId, dto);
  }

  @Post()
  @Version("1")
  @ApiOperation({ summary: "Cadastrar ficha técnica (receita)" })
  create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateRecipeDto
  ) {
    return this.service.create(req.tenantId, dto);
  }

  @Get()
  @Version("1")
  @ApiOperation({ summary: "Listar receitas" })
  @ApiQuery({ name: "category", required: false })
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query("category") category?: string
  ) {
    return this.service.findAll(req.tenantId, category);
  }

  @Get(":id")
  @Version("1")
  @ApiOperation({ summary: "Buscar receita com itens da ficha técnica" })
  findOne(
    @Request() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    return this.service.findOne(req.tenantId, id);
  }

  @Patch(":id")
  @Version("1")
  @ApiOperation({ summary: "Atualizar receita" })
  update(
    @Request() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecipeDto
  ) {
    return this.service.update(req.tenantId, id, dto);
  }

  @Delete(":id")
  @Version("1")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Desativar receita (soft delete)" })
  remove(
    @Request() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    return this.service.remove(req.tenantId, id);
  }
}
