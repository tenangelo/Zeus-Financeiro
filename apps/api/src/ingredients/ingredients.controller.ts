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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
} from "@nestjs/swagger";
import { IngredientsService } from "./ingredients.service";
import { CreateIngredientDto } from "./dto/create-ingredient.dto";
import { UpdateIngredientDto } from "./dto/update-ingredient.dto";
import { QueryIngredientDto } from "./dto/query-ingredient.dto";
import { AuthGuard } from "../auth/auth.guard";
import { TenantGuard } from "../auth/tenant.guard";
import type { AuthenticatedRequest } from "../auth/auth.guard";

@ApiTags("Ingredients")
@ApiBearerAuth()
@UseGuards(AuthGuard, TenantGuard)
@Controller("ingredients")
export class IngredientsController {
  constructor(private readonly service: IngredientsService) {}

  @Post()
  @Version("1")
  @ApiCreatedResponse({ description: "Ingrediente criado com sucesso." })
  @ApiOperation({ summary: "Cadastrar ingrediente" })
  create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateIngredientDto
  ) {
    return this.service.create(req.tenantId, dto);
  }

  @Get()
  @Version("1")
  @ApiOkResponse({ description: "Lista paginada de ingredientes." })
  @ApiOperation({ summary: "Listar ingredientes" })
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: QueryIngredientDto
  ) {
    return this.service.findAll(req.tenantId, query);
  }

  @Get("categories")
  @Version("1")
  @ApiOperation({ summary: "Listar categorias únicas dos ingredientes" })
  getCategories(@Request() req: AuthenticatedRequest) {
    return this.service.getCategories(req.tenantId);
  }

  @Get("low-stock")
  @Version("1")
  @ApiOperation({ summary: "Listar ingredientes com estoque abaixo do mínimo" })
  getLowStock(@Request() req: AuthenticatedRequest) {
    return this.service.getLowStockAlerts(req.tenantId);
  }

  @Get(":id")
  @Version("1")
  @ApiOperation({ summary: "Buscar ingrediente por ID" })
  findOne(
    @Request() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    return this.service.findOne(req.tenantId, id);
  }

  @Patch(":id")
  @Version("1")
  @ApiOperation({ summary: "Atualizar ingrediente" })
  update(
    @Request() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateIngredientDto
  ) {
    return this.service.update(req.tenantId, id, dto);
  }

  @Delete(":id")
  @Version("1")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: "Ingrediente desativado (soft delete)." })
  @ApiOperation({ summary: "Desativar ingrediente" })
  remove(
    @Request() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    return this.service.remove(req.tenantId, id);
  }
}
