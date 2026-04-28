"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  BarChart3,
  ArrowRight,
  RefreshCw,
  Package,
  BookOpen,
  Upload,
  ArrowLeftRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { api, ApiError } from "@/lib/api";
import { formatCurrency } from "@zeus/shared";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 animate-pulse">
      <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
      <div className="h-8 w-28 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-16 bg-gray-100 rounded" />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  loading = false,
  gradientFrom = "from-blue-500",
  gradientTo = "to-blue-600",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  loading?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
}) {
  if (loading) return <SkeletonCard />;

  return (
    <div className="group relative rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      {/* Accent gradient bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradientFrom} ${gradientTo} opacity-80 group-hover:opacity-100 transition-opacity`} />

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              {trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
              {trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
              {sub}
            </p>
          )}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} text-white shadow-lg shadow-blue-500/20`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  label,
  icon: Icon,
  primary = false,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      className={`group flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
        primary
          ? "bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md shadow-brand-600/30 hover:shadow-lg hover:shadow-brand-600/40 hover:scale-[1.02]"
          : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
    </a>
  );
}

function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center h-[240px] text-gray-400">
      <BarChart3 className="h-12 w-12 mb-3 opacity-40" />
      <p className="text-sm font-medium">Sem dados suficientes para gráfico</p>
      <p className="text-xs mt-1">Adicione lançamentos para ver a evolução</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function DashboardPage() {
  const router = useRouter();
  const [cashflow, setCashflow] = useState<CashFlow | null>(null);
  const [cmv, setCmv] = useState<CmvSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const now = new Date();
  const monthLabel = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]!;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setApiError(false);

      try {
        const [cf, cmvData] = await Promise.allSettled([
          api.get<CashFlow>(`/transactions/cash-flow?from=${from}&to=${to}`),
          api.get<{ data: CmvSnapshot[] }>(`/cmv/snapshots?limit=1`),
        ]);

        if (cancelled) return;

        if (cf.status === "fulfilled") {
          setCashflow(cf.value);
        } else {
          const err = cf.reason;
          if (err instanceof ApiError) {
            if (err.isTenantError) {
              router.replace("/onboarding" as any);
              return;
            }
            if (err.isAuthError) {
              toast.error("Sessão expirada. Faça login novamente.");
              router.replace("/login" as any);
              return;
            }
          }
          setApiError(true);
          toast.error("Não foi possível carregar o fluxo de caixa.");
        }

        if (cmvData.status === "fulfilled") {
          const snaps = (cmvData.value as any)?.data;
          if (Array.isArray(snaps) && snaps.length > 0) setCmv(snaps[0]);
        }
      } catch {
        if (!cancelled) setApiError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  // Chart data mock based on cashflow
  const revenue = cashflow ? parseFloat(cashflow.total_revenue) : 0;
  const expenses = cashflow ? parseFloat(cashflow.total_expenses) : 0;
  const netResult = cashflow ? parseFloat(cashflow.net_result) : 0;
  const isPositive = netResult >= 0;

  const barData = [
    { name: "Receita", value: revenue, color: "#10b981" },
    { name: "Despesas", value: expenses, color: "#ef4444" },
    { name: "Resultado", value: Math.abs(netResult), color: isPositive ? "#2563eb" : "#f59e0b" },
  ];

  // Gauge for CMV
  const cmvPct = cmv ? cmv.gross_margin_pct : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {apiError && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl px-3 py-2 animate-pulse">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>API offline — dados podem estar desatualizados</span>
            </div>
          )}
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600 bg-white border border-gray-200 rounded-xl px-3 py-2 hover:shadow-sm transition-all"
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stat Cards - Fluxo de Caixa */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Fluxo de Caixa do Mês
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Faturamento"
            value={cashflow ? formatCurrency(revenue) : "R$ 0,00"}
            icon={TrendingUp}
            trend="up"
            sub="Receitas totais"
            loading={loading}
            gradientFrom="from-emerald-500"
            gradientTo="to-emerald-600"
          />
          <StatCard
            label="Despesas"
            value={cashflow ? formatCurrency(expenses) : "R$ 0,00"}
            icon={TrendingDown}
            trend="down"
            sub="Custos totais"
            loading={loading}
            gradientFrom="from-red-500"
            gradientTo="to-red-600"
          />
          <StatCard
            label="Resultado Líquido"
            value={cashflow ? formatCurrency(netResult) : "R$ 0,00"}
            icon={DollarSign}
            trend={isPositive ? "up" : "down"}
            sub={isPositive ? "Saldo positivo" : "Saldo negativo"}
            loading={loading}
            gradientFrom={isPositive ? "from-blue-500" : "from-amber-500"}
            gradientTo={isPositive ? "to-blue-600" : "to-amber-600"}
          />
          <StatCard
            label="A Pagar (7 dias)"
            value={cashflow ? formatCurrency(parseFloat(cashflow.pending_payables)) : "R$ 0,00"}
            icon={AlertTriangle}
            sub={cashflow?.overdue_count ? `${cashflow.overdue_count} vencimento(s)` : "Tudo em dia"}
            loading={loading}
            gradientFrom={cashflow && cashflow.overdue_count > 0 ? "from-amber-500" : "from-gray-400"}
            gradientTo={cashflow && cashflow.overdue_count > 0 ? "to-amber-600" : "to-gray-500"}
          />
        </div>
      </section>

      {/* Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: Receita vs Despesas */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Receita vs Despesas</h3>
          {!loading && revenue === 0 && expenses === 0 ? (
            <EmptyChart />
          ) : loading ? (
            <div className="h-[240px] animate-pulse bg-gray-100 rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: 12,
                  }}
                  formatter={(val: number) => formatCurrency(val)}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={60}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* CMV Gauge */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Saúde do CMV</h3>
          {!loading && !cmv ? (
            <div className="flex flex-col items-center justify-center h-[240px] text-gray-400">
              <BarChart3 className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">Nenhum snapshot de CMV</p>
              <a href="/dashboard/cmv" className="mt-2 text-brand-600 text-sm hover:underline flex items-center gap-1">
                Calcular CMV <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          ) : loading ? (
            <div className="h-[240px] animate-pulse bg-gray-100 rounded-xl" />
          ) : (
            <div className="flex flex-col items-center justify-center h-[240px]">
              {/* Circular Progress */}
              <div className="relative w-40 h-40">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke={cmvPct >= 60 ? "#10b981" : cmvPct >= 40 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(cmvPct / 100) * 314} 314`}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">{cmvPct.toFixed(1)}%</span>
                  <span className="text-xs text-gray-500">Margem Bruta</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 w-full">
                <div className="text-center">
                  <p className="text-xs text-gray-400">CMV Real</p>
                  <p className="text-sm font-semibold text-gray-700">
                    {cmv ? formatCurrency(parseFloat(cmv.real_cmv)) : "—"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Divergência</p>
                  <p className={`text-sm font-semibold ${cmv && Math.abs(cmv.cmv_divergence_pct) > 5 ? "text-red-600" : "text-emerald-600"}`}>
                    {cmv ? `${cmv.cmv_divergence_pct.toFixed(2)}%` : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Ações Rápidas */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Ações Rápidas
        </h2>
        <div className="flex flex-wrap gap-2">
          <QuickAction href="/dashboard/transactions" label="Novo Lançamento" icon={ArrowLeftRight} primary />
          <QuickAction href="/dashboard/ingredients" label="Novo Ingrediente" icon={Package} />
          <QuickAction href="/dashboard/recipes" label="Nova Ficha Técnica" icon={BookOpen} />
          <QuickAction href="/dashboard/import" label="Importar CSV" icon={Upload} />
          <QuickAction href="/dashboard/cmv" label="Calcular CMV" icon={BarChart3} />
        </div>
      </section>
    </div>
  );
}
