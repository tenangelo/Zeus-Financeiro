import { Injectable, Inject, NotFoundException, BadRequestException } from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { Decimal } from "decimal.js";
import { SUPABASE_CLIENT } from "../supabase/supabase.module";
import type { Database } from "@zeus/database";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { QueryTransactionDto } from "./dto/query-transaction.dto";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";
import { DreQueryDto } from "./dto/dre-query.dto";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

export interface CashFlowSummary {
  total_revenue: string;
  total_expenses: string;
  net_result: string;
  pending_payables: string;
  overdue_count: number;
}

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient<Database>
  ) {}

  async create(
    tenantId: string,
    userId: string,
    dto: CreateTransactionDto
  ): Promise<Transaction> {
    const { data, error } = await this.supabase
      .from("transactions")
      .insert({
        tenant_id: tenantId,
        type: dto.type,
        category: dto.category,
        description: dto.description ?? null,
        amount: dto.amount,
        transaction_date: dto.transaction_date,
        due_date: dto.due_date ?? null,
        status: dto.status ?? "pending",
        supplier_id: dto.supplier_id ?? null,
        notes: dto.notes ?? null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar lançamento: ${error.message}`);
    return data;
  }

  async findAll(
    tenantId: string,
    query: QueryTransactionDto
  ): Promise<{ data: Transaction[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const from = (page - 1) * limit;

    let q = this.supabase
      .from("transactions")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("transaction_date", { ascending: false })
      .range(from, from + limit - 1);

    if (query.type) q = q.eq("type", query.type);
    if (query.status) q = q.eq("status", query.status as "pending" | "confirmed" | "cancelled" | "reconciled");
    if (query.date_from) q = q.gte("transaction_date", query.date_from);
    if (query.date_to) q = q.lte("transaction_date", query.date_to);

    const { data, error, count } = await q;
    if (error) throw new Error(`Erro ao buscar lançamentos: ${error.message}`);

    return { data: data ?? [], total: count ?? 0 };
  }

  async getLogs(tenantId: string, transactionId: string) {
    const { data, error } = await this.supabase
      .from("transaction_logs" as any)
      .select("id, action, changed_by, old_data, new_data, changed_at")
      .eq("tenant_id", tenantId)
      .eq("transaction_id", transactionId)
      .order("changed_at", { ascending: false });

    if (error) throw new Error(`Erro ao buscar logs: ${error.message}`);
    return data ?? [];
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateTransactionDto
  ): Promise<Transaction> {
    // Só permite editar lançamentos pendentes
    const { data: existing } = await this.supabase
      .from("transactions")
      .select("status")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .single();

    if (!existing) throw new NotFoundException(`Lançamento ${id} não encontrado.`);

    if (existing.status !== "pending") {
      throw new BadRequestException("Apenas lançamentos pendentes podem ser editados.");
    }

    type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"];
    const patch: TransactionUpdate = {
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.amount !== undefined && { amount: dto.amount }),
      ...(dto.due_date !== undefined && { due_date: dto.due_date }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    };

    const { data, error } = await this.supabase
      .from("transactions")
      .update(patch)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) throw new Error(`Erro ao editar lançamento: ${error?.message}`);
    return data;
  }

  async confirm(tenantId: string, id: string): Promise<Transaction> {
    const { data, error } = await this.supabase
      .from("transactions")
      .update({ status: "confirmed", paid_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException(`Lançamento ${id} não encontrado.`);
    return data;
  }

  /**
   * Resumo de fluxo de caixa — alimenta o widget principal do dashboard.
   * Retorna receitas, despesas, resultado líquido e contas a pagar vencendo em 7 dias.
   */
  async getCashFlowSummary(
    tenantId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<CashFlowSummary> {
    const { data, error } = await this.supabase
      .from("transactions")
      .select("type, amount, status, due_date")
      .eq("tenant_id", tenantId)
      .neq("status", "cancelled")
      .gte("transaction_date", dateFrom)
      .lte("transaction_date", dateTo);

    if (error) throw new Error(`Erro ao buscar fluxo de caixa: ${error.message}`);

    const rows = data ?? [];
    const today = new Date();
    const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    let totalRevenue = new Decimal(0);
    let totalExpenses = new Decimal(0);
    let pendingPayables = new Decimal(0);
    let overdueCount = 0;

    for (const row of rows) {
      const amount = new Decimal(row.amount);

      if (row.type === "revenue") {
        totalRevenue = totalRevenue.plus(amount);
      } else {
        totalExpenses = totalExpenses.plus(amount);

        if (row.status === "pending" && row.due_date) {
          const due = new Date(row.due_date);
          pendingPayables = pendingPayables.plus(amount);
          if (due <= in7Days) overdueCount++;
        }
      }
    }

    return {
      total_revenue: totalRevenue.toFixed(2),
      total_expenses: totalExpenses.toFixed(2),
      net_result: totalRevenue.minus(totalExpenses).toFixed(2),
      pending_payables: pendingPayables.toFixed(2),
      overdue_count: overdueCount,
    };
  }

  /**
   * DRE — Demonstrativo de Resultado do Exercício
   * Calcula receita → CMV → lucro bruto → custos → EBITDA
   */
  async calculateDre(
    tenantId: string,
    query: DreQueryDto
  ): Promise<{
    period_start: string;
    period_end: string;
    gross_revenue: string;
    taxes_fees: string;
    net_revenue: string;
    cmv: string;
    gross_margin_pct: number;
    gross_profit: string;
    operating_expenses: string;
    ebitda: string;
    ebitda_pct: number;
    financial_expenses: string;
    net_income: string;
    net_margin_pct: number;
  }> {
    const from = query.date_from || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
    const to = query.date_to || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0]!;

    // Receitas e despesas por tipo
    const { data: txData } = await this.supabase
      .from("transactions")
      .select("type, amount, category, status")
      .eq("tenant_id", tenantId)
      .neq("status", "cancelled")
      .gte("transaction_date", from)
      .lte("transaction_date", to);

    let grossRevenue = new Decimal(0);
    let taxes = new Decimal(0);
    let utilities = new Decimal(0); // água, luz, gás
    let payroll = new Decimal(0);
    let rent = new Decimal(0);
    let marketing = new Decimal(0);
    let financialExpenses = new Decimal(0);
    let otherExpenses = new Decimal(0);

    for (const tx of txData ?? []) {
      const amt = new Decimal(tx.amount ?? 0);

      if (tx.type === "revenue") {
        grossRevenue = grossRevenue.plus(amt);
      } else if (tx.type === "expense") {
        const cat = (tx.category ?? "OUTROS").toUpperCase();

        if (cat.includes("TAXA") || cat.includes("IMPOSTO")) taxes = taxes.plus(amt);
        else if (cat.includes("ENERGIA") || cat.includes("ÁGUA") || cat.includes("GÁS")) utilities = utilities.plus(amt);
        else if (cat.includes("FOLHA") || cat.includes("PAGAMENTO")) payroll = payroll.plus(amt);
        else if (cat.includes("ALUGUEL")) rent = rent.plus(amt);
        else if (cat.includes("MARKETING") || cat.includes("PUBLICIDADE")) marketing = marketing.plus(amt);
        else if (cat.includes("JUROS") || cat.includes("FINANCEIRO")) financialExpenses = financialExpenses.plus(amt);
        else otherExpenses = otherExpenses.plus(amt);
      }
    }

    // CMV a partir de stock_movements (consumo + desperdício)
    const { data: cmvData } = await this.supabase
      .from("stock_movements")
      .select("total_cost, movement_type")
      .eq("tenant_id", tenantId)
      .in("movement_type", ["consumption", "waste"])
      .gte("created_at", `${from}T00:00:00Z`)
      .lte("created_at", `${to}T23:59:59Z`);

    let cmvTotal = new Decimal(0);
    for (const mov of cmvData ?? []) {
      cmvTotal = cmvTotal.plus(new Decimal(mov.total_cost ?? 0));
    }

    // Cálculos
    const netRevenue = grossRevenue.minus(taxes);
    const grossProfit = netRevenue.minus(cmvTotal);
    const operatingExpenses = utilities.plus(payroll).plus(rent).plus(marketing).plus(otherExpenses);
    const ebitda = grossProfit.minus(operatingExpenses);
    const netIncome = ebitda.minus(financialExpenses);

    const grossMarginPct = grossRevenue.gt(0)
      ? grossProfit.div(grossRevenue).mul(100).toNumber()
      : 0;
    const ebitdaPct = netRevenue.gt(0)
      ? ebitda.div(netRevenue).mul(100).toNumber()
      : 0;
    const netMarginPct = netRevenue.gt(0)
      ? netIncome.div(netRevenue).mul(100).toNumber()
      : 0;

    return {
      period_start: from,
      period_end: to,
      gross_revenue: grossRevenue.toFixed(2),
      taxes_fees: taxes.toFixed(2),
      net_revenue: netRevenue.toFixed(2),
      cmv: cmvTotal.toFixed(2),
      gross_margin_pct: Math.round(grossMarginPct * 10) / 10,
      gross_profit: grossProfit.toFixed(2),
      operating_expenses: operatingExpenses.toFixed(2),
      ebitda: ebitda.toFixed(2),
      ebitda_pct: Math.round(ebitdaPct * 10) / 10,
      financial_expenses: financialExpenses.toFixed(2),
      net_income: netIncome.toFixed(2),
      net_margin_pct: Math.round(netMarginPct * 10) / 10,
    };
  }
}
