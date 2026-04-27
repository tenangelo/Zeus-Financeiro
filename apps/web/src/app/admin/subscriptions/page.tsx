"use client";

import { useEffect, useState, useCallback } from "react";
import { CreditCard, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";

interface Subscription {
  id: string;
  status: string;
  amount: number;
  billing_interval: "monthly" | "yearly";
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string | null;
  tenants?: { id: string; name: string };
  plans?: { id: string; name: string; tier: string };
}

const STATUS_STYLES: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  active:   { label: "Ativo",       cls: "bg-emerald-500/10 text-emerald-400", icon: CheckCircle },
  trialing: { label: "Trial",       cls: "bg-yellow-500/10 text-yellow-400",   icon: CreditCard },
  past_due: { label: "Atrasado",    cls: "bg-red-500/10 text-red-400",         icon: AlertTriangle },
  canceled: { label: "Cancelado",   cls: "bg-slate-500/10 text-slate-400",     icon: CreditCard },
  paused:   { label: "Pausado",     cls: "bg-blue-500/10 text-blue-400",       icon: CreditCard },
};

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Subscription[]; total: number }>(
        `/admin/subscriptions?page=${page}&limit=20`
      );
      setSubs(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const activeSubs = subs.filter(s => s.status === "active");
  const mrr = activeSubs.reduce((acc, s) => acc + (s.billing_interval === "yearly" ? s.amount / 12 : s.amount), 0);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Assinaturas</h1>
        <p className="text-sm text-slate-400 mt-1">{total} assinaturas no sistema</p>
      </div>

      {/* MRR Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-emerald-500/20 rounded-xl p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">MRR</p>
          <p className="text-2xl font-bold text-white">
            {mrr.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Ativas</p>
          <p className="text-2xl font-bold text-white">{activeSubs.length}</p>
        </div>
        <div className="bg-slate-900 border border-red-500/20 rounded-xl p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Atrasadas</p>
          <p className="text-2xl font-bold text-white">{subs.filter(s => s.status === "past_due").length}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Restaurante</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Plano</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Próx. cobrança</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stripe ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              [1,2,3].map(i => (
                <tr key={i}>{[1,2,3,4,5,6].map(j => <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>)}</tr>
              ))
            ) : subs.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">Nenhuma assinatura encontrada.</td></tr>
            ) : subs.map(sub => {
              const st = STATUS_STYLES[sub.status] ?? STATUS_STYLES["canceled"]!;
              const StatusIcon = st!.icon;
              return (
                <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-white">{sub.tenants?.name ?? "—"}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-slate-300 capitalize">{sub.plans?.name ?? "—"}</span>
                    <span className="text-xs text-slate-500 ml-1">({sub.billing_interval === "yearly" ? "anual" : "mensal"})</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`flex items-center gap-1.5 w-fit text-xs font-semibold px-2.5 py-1 rounded-full ${st!.cls}`}>
                      <StatusIcon className="h-3 w-3" />
                      {st!.label}
                    </span>
                    {sub.cancel_at_period_end && <p className="text-[10px] text-orange-400 mt-1">Cancela no fim do período</p>}
                  </td>
                  <td className="px-4 py-4 text-white font-medium">
                    {sub.amount > 0
                      ? `R$ ${sub.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                      : <span className="text-slate-500">Grátis</span>}
                  </td>
                  <td className="px-4 py-4 text-slate-400 text-xs">
                    {sub.current_period_end
                      ? new Date(sub.current_period_end).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-4 py-4 text-slate-600 text-[10px] font-mono">
                    {sub.stripe_subscription_id ? sub.stripe_subscription_id.slice(0, 20) + "..." : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {Math.ceil(total / 20) > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>{total} registros</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="px-3 py-1.5 bg-slate-800 rounded-lg disabled:opacity-30 hover:bg-slate-700">Anterior</button>
            <span className="px-3 py-1.5 bg-slate-800 rounded-lg">{page} / {Math.ceil(total/20)}</span>
            <button onClick={() => setPage(p => p+1)} disabled={page===Math.ceil(total/20)} className="px-3 py-1.5 bg-slate-800 rounded-lg disabled:opacity-30 hover:bg-slate-700">Próximo</button>
          </div>
        </div>
      )}
    </div>
  );
}
