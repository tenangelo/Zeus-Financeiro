import { Injectable, Inject, BadRequestException } from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { Decimal } from "decimal.js";
import { USER_SUPABASE_CLIENT } from "../supabase/supabase.module";
import type { Database } from "@zeus/database";

// Decimal.js garante precisão financeira (evita erros de ponto flutuante)
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export interface CmvPeriodResult {
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  revenue: string;
  theoreticalCmv: string;
  realCmv: string;
  cmvDivergencePct: string;
  grossMarginPct: string;
  breakdownByCategory: Record<string, { theoretical: string; real: string }>;
  alertWaste: boolean;
}

/**
 * CmvService — cálculo de CMV com precisão financeira.
 *
 * Roda exclusivamente no backend com service_role.
 * Usa Decimal.js para evitar erros de arredondamento em ponto flutuante
 * que poderiam distorcer margens em operações de alto volume.
 *
 * Fórmula do CMV Real:
 *   CMV Real = Estoque Inicial + Compras do Período - Estoque Final
 *
 * Fórmula do CMV Teórico:
 *   Σ (quantidade_vendida_prato × custo_ficha_técnica)
 */
@Injectable()
export class CmvService {
  constructor(
    @Inject(USER_SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient<Database>
  ) {}

  async calculatePeriod(
    tenantId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<CmvPeriodResult> {
    this.validatePeriod(periodStart, periodEnd);

    const [revenue, theoreticalCmv, realCmv, breakdown] = await Promise.all([
      this.fetchRevenue(tenantId, periodStart, periodEnd),
      this.fetchTheoreticalCmv(tenantId, periodStart, periodEnd),
      this.fetchRealCmv(tenantId, periodStart, periodEnd),
      this.fetchBreakdownByCategory(tenantId, periodStart, periodEnd),
    ]);

    const divergencePct = theoreticalCmv.gt(0)
      ? realCmv.minus(theoreticalCmv).div(theoreticalCmv).mul(100)
      : new Decimal(0);

    const grossMarginPct = revenue.gt(0)
      ? revenue.minus(realCmv).div(revenue).mul(100)
      : new Decimal(0);

    // Alerta de desperdício: divergência acima de 5% indica perda operacional
    const wasteDivergenceThresholdPct = 5;
    const alertWaste = divergencePct.abs().gt(wasteDivergenceThresholdPct);

    const result: CmvPeriodResult = {
      tenantId,
      periodStart,
      periodEnd,
      revenue: revenue.toFixed(4),
      theoreticalCmv: theoreticalCmv.toFixed(4),
      realCmv: realCmv.toFixed(4),
      cmvDivergencePct: divergencePct.toFixed(4),
      grossMarginPct: grossMarginPct.toFixed(4),
      breakdownByCategory: breakdown,
      alertWaste,
    };

    // Persiste snapshot para histórico e leituras do dashboard
    await this.persistSnapshot(result);

    return result;
  }

  // ---------------------------------------------------------------------------
  // PRIVADOS
  // ---------------------------------------------------------------------------

  private validatePeriod(start: string, end: string): void {
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
      throw new BadRequestException("Datas inválidas.");
    }
    if (s >= e) {
      throw new BadRequestException("period_start deve ser anterior a period_end.");
    }
    // Impede períodos maiores que 1 ano para evitar queries excessivamente lentas
    const diffDays = (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 366) {
      throw new BadRequestException("Período máximo permitido é de 366 dias.");
    }
  }

  private async fetchRevenue(
    tenantId: string,
    start: string,
    end: string
  ): Promise<Decimal> {
    const { data, error } = await this.supabase
      .from("transactions")
      .select("amount")
      .eq("tenant_id", tenantId)
      .eq("type", "revenue")
      .eq("status", "confirmed")
      .gte("transaction_date", start)
      .lte("transaction_date", end);

    if (error) throw new Error(`Erro ao buscar receita: ${error.message}`);
    return (data ?? []).reduce(
      (acc, t) => acc.plus(new Decimal(t.amount)),
      new Decimal(0)
    );
  }

  private async fetchTheoreticalCmv(
    tenantId: string,
    start: string,
    end: string
  ): Promise<Decimal> {
    // CMV Teórico = soma das baixas de estoque esperadas pelas vendas confirmadas
    // Aqui usamos stock_movements do tipo 'consumption' gerados automaticamente
    // pelo sistema quando uma venda é registrada com base na ficha técnica.
    const { data, error } = await this.supabase
      .from("stock_movements")
      .select("total_cost")
      .eq("tenant_id", tenantId)
      .eq("movement_type", "consumption")
      .eq("reference_type", "sale_theoretical")
      .gte("created_at", `${start}T00:00:00Z`)
      .lte("created_at", `${end}T23:59:59Z`);

    if (error) throw new Error(`Erro ao buscar CMV teórico: ${error.message}`);
    return (data ?? []).reduce(
      (acc, m) => acc.plus(new Decimal(m.total_cost ?? 0)),
      new Decimal(0)
    );
  }

  private async fetchRealCmv(
    tenantId: string,
    start: string,
    end: string
  ): Promise<Decimal> {
    // CMV Real = Estoque Inicial + Compras - Estoque Final
    // Compras do período
    const { data: purchases, error: pe } = await this.supabase
      .from("stock_movements")
      .select("total_cost")
      .eq("tenant_id", tenantId)
      .eq("movement_type", "purchase")
      .gte("created_at", `${start}T00:00:00Z`)
      .lte("created_at", `${end}T23:59:59Z`);

    if (pe) throw new Error(`Erro ao buscar compras: ${pe.message}`);

    // Saídas reais (consumo + desperdício + ajuste negativo)
    const { data: outputs, error: oe } = await this.supabase
      .from("stock_movements")
      .select("total_cost")
      .eq("tenant_id", tenantId)
      .in("movement_type", ["consumption", "waste", "adjustment"])
      .gte("created_at", `${start}T00:00:00Z`)
      .lte("created_at", `${end}T23:59:59Z`);

    if (oe) throw new Error(`Erro ao buscar saídas: ${oe.message}`);

    const totalPurchases = (purchases ?? []).reduce(
      (acc, m) => acc.plus(new Decimal(m.total_cost ?? 0)),
      new Decimal(0)
    );
    const totalOutputs = (outputs ?? []).reduce(
      (acc, m) => acc.plus(new Decimal(m.total_cost ?? 0)),
      new Decimal(0)
    );

    // Simplificação: CMV Real ≈ total de saídas no período
    // (estoque inicial/final requer inventário físico — usar outputs como proxy)
    return totalOutputs.gt(0) ? totalOutputs : totalPurchases;
  }

  private async fetchBreakdownByCategory(
    tenantId: string,
    start: string,
    end: string
  ): Promise<Record<string, { theoretical: string; real: string }>> {
    const { data, error } = await this.supabase
      .from("stock_movements")
      .select(`
        total_cost,
        movement_type,
        ingredients!inner(category)
      `)
      .eq("tenant_id", tenantId)
      .in("movement_type", ["consumption", "waste"])
      .gte("created_at", `${start}T00:00:00Z`)
      .lte("created_at", `${end}T23:59:59Z`);

    if (error) return {};

    const breakdown: Record<string, { theoretical: Decimal; real: Decimal }> = {};

    for (const row of data ?? []) {
      const category = (row.ingredients as unknown as { category: string | null })?.category ?? "outros";
      if (!breakdown[category]) {
        breakdown[category] = {
          theoretical: new Decimal(0),
          real: new Decimal(0),
        };
      }
      if (row.movement_type === "consumption") {
        breakdown[category]!.theoretical = breakdown[category]!.theoretical.plus(
          new Decimal(row.total_cost ?? 0)
        );
      } else {
        breakdown[category]!.real = breakdown[category]!.real.plus(
          new Decimal(row.total_cost ?? 0)
        );
      }
    }

    return Object.fromEntries(
      Object.entries(breakdown).map(([k, v]) => [
        k,
        { theoretical: v.theoretical.toFixed(4), real: v.real.toFixed(4) },
      ])
    );
  }

  private async persistSnapshot(result: CmvPeriodResult): Promise<void> {
    await (this.supabase.from("cmv_snapshots") as any).upsert(
      {
        tenant_id: result.tenantId,
        period_start: result.periodStart,
        period_end: result.periodEnd,
        revenue: result.revenue,
        theoretical_cmv: result.theoreticalCmv,
        real_cmv: result.realCmv,
        breakdown_by_category: result.breakdownByCategory,
        calculated_by: "backend_cmv_service",
      },
      { onConflict: "tenant_id,period_start,period_end" }
    );
  }
}
