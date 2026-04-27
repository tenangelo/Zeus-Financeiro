"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Building2, Users, CreditCard, AlertTriangle, TrendingDown } from "lucide-react";
import { api } from "@/lib/api";

interface Metrics {
  total_tenants: number;
  active_tenants: number;
  new_tenants_30d: number;
  total_users: number;
  active_users: number;
  mrr: number;
  arr: number;
  active_subscriptions: number;
  trialing: number;
  past_due: number;
  plan_distribution: Record<string, number>;
}

function MetricCard({
  label, value, sub, icon: Icon, color = "violet", trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color?: "violet" | "green" | "blue" | "yellow" | "red";
  trend?: { value: string; up: boolean };
}) {
  const colors = {
    violet: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20" },
    green:  { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    blue:   { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/20" },
    yellow: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
    red:    { bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/20" },
  }[color];

  return (
    <div className={`bg-slate-900 border ${colors.border} rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${colors.bg}`}>
          <Icon className={`h-4 w-4 ${colors.text}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${trend.up ? "text-emerald-400" : "text-red-400"}`}>
          {trend.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trend.value}
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return <div className="h-[120px] bg-slate-900 rounded-xl animate-pulse border border-slate-800" />;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Metrics>("/admin/metrics")
      .then(setMetrics)
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard Admin</h1>
        <p className="text-sm text-slate-400 mt-1">Visão geral do Zeus Financeiro SaaS</p>
      </div>

      {/* Revenue */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Receita</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            [1, 2, 3, 4].map(i => <Skeleton key={i} />)
          ) : (
            <>
              <MetricCard label="MRR" value={formatCurrency(metrics?.mrr ?? 0)} sub="Receita Mensal Recorrente" icon={TrendingUp} color="green" />
              <MetricCard label="ARR" value={formatCurrency(metrics?.arr ?? 0)} sub="Receita Anual Recorrente" icon={TrendingUp} color="violet" />
              <MetricCard label="Assinaturas Ativas" value={metrics?.active_subscriptions ?? 0} sub={`${metrics?.trialing ?? 0} em trial`} icon={CreditCard} color="blue" />
              <MetricCard label="Inadimplentes" value={metrics?.past_due ?? 0} sub="Pagamentos em atraso" icon={AlertTriangle} color={( metrics?.past_due ?? 0) > 0 ? "red" : "green"} />
            </>
          )}
        </div>
      </div>

      {/* Tenants & Users */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Clientes</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            [1, 2, 3, 4].map(i => <Skeleton key={i} />)
          ) : (
            <>
              <MetricCard label="Total Restaurantes" value={metrics?.total_tenants ?? 0} sub={`${metrics?.active_tenants ?? 0} ativos`} icon={Building2} color="violet" />
              <MetricCard label="Novos (30 dias)" value={metrics?.new_tenants_30d ?? 0} sub="Últimos 30 dias" icon={Building2} color="green" trend={{ value: `+${metrics?.new_tenants_30d ?? 0} este mês`, up: true }} />
              <MetricCard label="Total Usuários" value={metrics?.total_users ?? 0} sub={`${metrics?.active_users ?? 0} ativos`} icon={Users} color="blue" />
              <MetricCard label="Inativos" value={(metrics?.total_users ?? 0) - (metrics?.active_users ?? 0)} sub="Usuários desativados" icon={Users} color="yellow" />
            </>
          )}
        </div>
      </div>

      {/* Plan Distribution */}
      {!loading && metrics?.plan_distribution && (
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Distribuição por Plano</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(metrics.plan_distribution).map(([tier, count]) => (
                <div key={tier} className="text-center">
                  <p className="text-2xl font-bold text-white">{count}</p>
                  <p className="text-xs text-slate-400 mt-1 capitalize">{tier}</p>
                  <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full">
                    <div
                      className="h-1.5 bg-violet-500 rounded-full"
                      style={{ width: `${((count / (metrics.total_tenants || 1)) * 100).toFixed(0)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {((count / (metrics.total_tenants || 1)) * 100).toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
