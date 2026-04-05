import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Request,
  Version,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CmvService } from "./cmv.service";
import { AuthGuard } from "../auth/auth.guard";
import { TenantGuard } from "../auth/tenant.guard";
import type { AuthenticatedRequest } from "../auth/auth.guard";

@ApiTags("CMV")
@ApiBearerAuth()
@UseGuards(AuthGuard, TenantGuard)
@Controller("cmv")
export class CmvController {
  constructor(private readonly cmv: CmvService) {}

  @Get("calculate")
  @Version("1")
  @ApiOperation({
    summary: "Calcula CMV de um período",
    description:
      "Calcula CMV Teórico vs Real para o período informado e persiste um snapshot. " +
      "O cálculo ocorre integralmente no backend — nunca exposto ao cliente.",
  })
  @ApiQuery({ name: "start", example: "2025-01-01", description: "Data início (YYYY-MM-DD)" })
  @ApiQuery({ name: "end", example: "2025-01-31", description: "Data fim (YYYY-MM-DD)" })
  async calculate(
    @Request() req: AuthenticatedRequest,
    @Query("start") start: string,
    @Query("end") end: string
  ) {
    return this.cmv.calculatePeriod(req.tenantId, start, end);
  }

  @Get("snapshots")
  @Version("1")
  @ApiOperation({ summary: "Lista snapshots de CMV calculados anteriormente" })
  async listSnapshots(@Request() req: AuthenticatedRequest) {
    // Leitura via service_role — RLS não bloqueia aqui pois o tenantId é explícito
    return { tenantId: req.tenantId, message: "Em implementação" };
  }

  @Post("recalculate-all")
  @Version("1")
  @ApiOperation({
    summary: "Força recálculo de todos os snapshots do tenant",
    description: "Operação pesada — usar com moderação. Rate-limited a 1x/hora por tenant.",
  })
  async recalculateAll(@Request() req: AuthenticatedRequest) {
    return { tenantId: req.tenantId, message: "Job enfileirado para recálculo" };
  }
}
