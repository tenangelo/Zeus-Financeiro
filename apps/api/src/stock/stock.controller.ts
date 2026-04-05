import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Version,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { StockService } from "./stock.service";
import { CreateMovementDto } from "./dto/create-movement.dto";
import { AuthGuard } from "../auth/auth.guard";
import { TenantGuard } from "../auth/tenant.guard";
import type { AuthenticatedRequest } from "../auth/auth.guard";

@ApiTags("Stock")
@ApiBearerAuth()
@UseGuards(AuthGuard, TenantGuard)
@Controller("stock")
export class StockController {
  constructor(private readonly service: StockService) {}

  @Post("movements")
  @Version("1")
  @ApiOperation({
    summary: "Registrar movimentação de estoque",
    description:
      "Cria entrada ou saída de estoque. " +
      "O banco atualiza stock_quantity via trigger automaticamente.",
  })
  createMovement(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateMovementDto
  ) {
    return this.service.createMovement(req.tenantId, req.user.sub, dto);
  }

  @Get("movements")
  @Version("1")
  @ApiOperation({ summary: "Listar movimentações de estoque" })
  @ApiQuery({ name: "ingredient_id", required: false })
  @ApiQuery({ name: "limit", required: false, example: 100 })
  listMovements(
    @Request() req: AuthenticatedRequest,
    @Query("ingredient_id") ingredientId?: string,
    @Query("limit") limit?: number
  ) {
    return this.service.listMovements(req.tenantId, ingredientId, limit);
  }
}
