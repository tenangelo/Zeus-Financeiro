"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatCurrency } from "@zeus/shared";

interface CashFlow {
  total_revenue: string;
  total_expenses: string;
  net_result: string;
  pending_payables: string;
  overdue_count: number;
}

interface CmvSnapshot {
  cmv_divergence_pct: number;
  gross_margin_pct: number;
  real_cmv: string;
  theoretical_cmv: string;
}

function Skeleton() {
  return <div className="h-7 w-24 bg-gray-200 animate-pulse rounded" />;
}

function StatCard({
  label, value, sub, color = "gray", loading = false,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: "green" | "red" | "gray" | "yellow" | "blue";
  loading?: boolean;
}) {
  const border = {
    green:  "border-l-brand-500",
    blue:   "border-l-brand-400",
    red:    "border-l-red-400",
    yellow: "border-l-yellow-400",
    gray:   "border-l-gray-300",
  }[color];

  return (
    <div className={`rounded-xl border border-gray-100 shadow-sm bg-white p-5 border-l-4 ${border}`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <div className="mt-2">
        {loading ? <Skeleton /> : <p className="text-2xl font-bold text-gray-900">{value}</p>}
      </div>
      {sub && !loading && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function QuickAction({ href, label, primary = false }: { href: string; label: string; primary?: boolean }) {
  return (
    <a
      href={href}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        primary
          ? "bg-brand-600 text-white hover:bg-brand-700"
          : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
      }`}
    >
      {label}
    </a>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [cashflow, setCashflow] = useState<CashFlow | null>(null);
  const [cmv, setCmv] = useState<CmvSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const now = new Date();
  const monthLabel = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]!;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setApiError(false);
      try {
        const [cf, cmvData] = await Promise.allSettled([
          api.get<CashFlow>(`/transactions/cash-flow?from=${from}&to=${to}`),
          api.get<{ data: CmvSnapshot[] }>(`/cmv/snapshots?limit=1`),
        ]);
        if (cf.status === "fulfilled") setCashflow(cf.value);
        else {
          // 403 significa que o usuário não tem tenant — redireciona ao onboarding
          setApiError(true);
        }
        if (cmvData.status === "fulfilled") {
          const snaps = (cmvData.value as any)?.data;
          if (Array.isArray(snaps) && snaps.length > 0) setCmv(snaps[0]);
        }
      } catch (err: any) {
        if (err?.message?.includes("403") || err?.message?.toLowerCase().includes("tenant")) {
          router.replace("/onboarding");
          return;
        }
        setApiError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const netResult = cashflow ? parseFloat(cashflow.net_result) : 0;
  const isPositive = netResult >= 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">{monthLabel}</p>
        </div>
        {apiError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
            <span>⚠</span>
            <span>API offline — dados podem estar desatualizados</span>
          </div>
        )}
      </div>

      {/* Fluxo de Caixa */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Fluxo de Caixa do Mês
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Faturamento"
            value={cashflow ? formatCurrency(parseFloat(cashflow.total_revenue)) : "R$ 0,00"}
            color="green"
            loading={loading}
          />
          <StatCard
            label="Despesas"
            value={cashflow ? formatCurrency(parseFloat(cashflow.total_expenses)) : "R$ 0,00"}
            color="red"
            loading={loading}
          />
          <StatCard
            label="Resultado Líquido"
            value={cashflow ? formatCurrency(netResult) : "R$ 0,00"}
            color={isPositive ? "green" : "red"}
            sub={isPositive ? "Saldo positivo" : "Saldo negativo"}
            loading={loading}
          />
          <StatCard
            label="A Pagar (7 dias)"
            value={cashflow ? formatCurrency(parseFloat(cashflow.pending_payables)) : "R$ 0,00"}
            sub={cashflow?.overdue_count ? `${cashflow.overdue_count} vencimento(s)` : "Tudo em dia"}
            color={cashflow && cashflow.overdue_count > 0 ? "yellow" : "gray"}
            loading={loading}
          />
        </div>
      </section>

      {/* CMV */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          CMV do Mês
        </h2>
        {!loading && !cmv ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-400 text-sm">Nenhum snapshot de CMV calculado ainda.</p>
            <a href="/dashboard/cmv" className="mt-2 inline-block text-brand-600 text-sm hover:underline">
              Calcular CMV →
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Margem Bruta"
              value={cmv ? `${Number(cmv.gross_margin_pct).toFixed(1)}%` : "—"}
              color={cmv && cmv.gross_margin_pct >= 60 ? "green" : "yellow"}
              loading={loading}
            />
            <StatCard
              label="CMV Real"
              value={cmv ? formatCurrency(parseFloat(cmv.real_cmv)) : "—"}
              color="gray"
              loading={loading}
            />
            <StatCard
              label="CMV Teórico"
              value={cmv ? formatCurrency(parseFloat(cmv.theoretical_cmv)) : "—"}
              color="blue"
              loading={loading}
            />
            <StatCard
              label="Divergência"
              value={cmv ? `${Number(cmv.cmv_divergence_pct).toFixed(2)}%` : "—"}
              color={cmv && Math.abs(cmv.cmv_divergence_pct) > 5 ? "red" : "green"}
              sub={cmv && Math.abs(cmv.cmv_divergence_pct) > 5 ? "⚠ Acima do limite de 5%" : "Dentro do esperado"}
              loading={loading}
            />
          </div>
        )}
      </section>

      {/* Ações Rápidas */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Ações Rápidas
        </h2>
        <div className="flex flex-wrap gap-2">
          <QuickAction href="/dashboard/transactions" label="+ Lançamento" primary />
          <QuickAction href="/dashboard/ingredients" label="+ Ingrediente" />
          <QuickAction href="/dashboard/recipes" label="+ Ficha Técnica" />
          <QuickAction href="/dashboard/import" label="↑ Importar CSV" />
          <QuickAction href="/dashboard/cmv" label="↻ Calcular CMV" />
        </div>
      </section>
    </div>
  );
}
