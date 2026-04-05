import {
  Controller, Get, Post, Patch, Body, Param,
  Query, UseGuards, Request, Version, ParseUUIDPipe,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { TransactionsService } from "./transactions.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";
import { QueryTransactionDto } from "./dto/query-transaction.dto";
import { DreQueryDto } from "./dto/dre-query.dto";
import { AuthGuard } from "../auth/auth.guard";
import { TenantGuard } from "../auth/tenant.guard";
import type { AuthenticatedRequest } from "../auth/auth.guard";

@ApiTags("Transactions")
@ApiBearerAuth()
@UseGuards(AuthGuard, TenantGuard)
@Controller("transactions")
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Post()
  @Version("1")
  @ApiOperation({ summary: "Criar lançamento financeiro (receita ou despesa)" })
  create(@Request() req: AuthenticatedRequest, @Body() dto: CreateTransactionDto) {
    return this.service.create(req.tenantId, req.user.sub, dto);
  }

  @Get()
  @Version("1")
  @ApiOperation({ summary: "Listar lançamentos com filtros" })
  findAll(@Request() req: AuthenticatedRequest, @Query() query: QueryTransactionDto) {
    return this.service.findAll(req.tenantId, query);
  }

  @Get("cash-flow")
  @Version("1")
  @ApiOperation({ summary: "Resumo de fluxo de caixa para o dashboard" })
  @ApiQuery({ name: "from", example: "2025-01-01" })
  @ApiQuery({ name: "to", example: "2025-01-31" })
  getCashFlow(
    @Request() req: AuthenticatedRequest,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    return this.service.getCashFlowSummary(req.tenantId, from, to);
  }

  @Patch(":id")
  @Version("1")
  @ApiOperation({ summary: "Editar lançamento pendente" })
  update(
    @Request() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.service.update(req.tenantId, id, dto);
  }

  @Get("dre/calculate")
  @Version("1")
  @ApiOperation({ summary: "Calcular DRE (Demonstrativo de Resultado)" })
  calculateDre(@Request() req: AuthenticatedRequest, @Query() query: DreQueryDto) {
    return this.service.calculateDre(req.tenantId, query);
  }

  @Get(":id/logs")
  @Version("1")
  @ApiOperation({ summary: "Histórico de alterações de um lançamento" })
  getLogs(
    @Request() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.getLogs(req.tenantId, id);
  }

  @Patch(":id/confirm")
  @Version("1")
  @ApiOperation({ summary: "Confirmar pagamento/recebimento de um lançamento" })
  confirm(
    @Request() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.confirm(req.tenantId, id);
  }
}
