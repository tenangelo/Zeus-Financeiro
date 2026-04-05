"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency } from "@zeus/shared";

interface CmvResult {
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

function MetricCard({
  label, value, sub, alert = false, good = false,
}: { label: string; value: string; sub?: string; alert?: boolean; good?: boolean }) {
  const border = alert ? "border-l-red-400" : good ? "border-l-brand-500" : "border-l-gray-300";
  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${border} p-5 shadow-sm`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className={`mt-1 text-xs ${alert ? "text-red-500" : "text-gray-400"}`}>{sub}</p>}
    </div>
  );
}

export default function CmvPage() {
  const [result, setResult] = useState<CmvResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  const now = new Date();
  const [from, setFrom] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
  const [to, setTo] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]!
  );

  async function handleCalculate() {
    setCalculating(true);
    setCalcError(null);
    try {
      const data = await api.get<CmvResult>(`/cmv/calculate?start=${from}&end=${to}`);
      setResult(data);
    } catch (err: any) {
      setCalcError(err.message ?? "Erro ao calcular CMV.");
    } finally {
      setCalculating(false);
    }
  }

  const r = result;
  const divergenceAlert = r && Math.abs(parseFloat(r.cmvDivergencePct)) > 5;
  const breakdown = r
    ? Object.entries(r.breakdownByCategory).map(([cat, v]) => ({
        category: cat,
        theoretical: parseFloat(v.theoretical),
        real: parseFloat(v.real),
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CMV — Custo de Mercadoria Vendida</h1>
          <p className="text-sm text-gray-500 mt-0.5">Analise real vs. teórico e identifique desperdícios</p>
        </div>
        <button
          onClick={handleCalculate}
          disabled={calculating}
          className="shrink-0 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {calculating ? "Calculando..." : "↻ Calcular CMV"}
        </button>
      </div>

      {/* Filtros de período */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Período de Análise</p>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">De</label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Até</label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <button
            onClick={handleCalculate}
            disabled={calculating}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {calculating ? "Calculando..." : "Calcular"}
          </button>
        </div>
      </div>

      {/* Erro inline */}
      {calcError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {calcError}
        </div>
      )}

      {/* Alerta de desperdício */}
      {r?.alertWaste && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-red-500 text-lg mt-0.5">⚠</span>
          <div>
            <p className="text-sm font-medium text-red-800">Desperdício acima do limite</p>
            <p className="text-xs text-red-600 mt-0.5">
              Divergência de {parseFloat(r.cmvDivergencePct).toFixed(2)}% detectada — investigue perdas operacionais.
            </p>
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {!r && !calculating && !calcError && (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-500 font-medium">Nenhum CMV calculado ainda para este período.</p>
          <p className="text-gray-400 text-sm mt-1">Selecione o período acima e clique em "Calcular CMV".</p>
        </div>
      )}

      {/* Métricas principais */}
      {r && (
        <>
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Período: {new Date(r.periodStart + "T00:00:00").toLocaleDateString("pt-BR")} –{" "}
              {new Date(r.periodEnd + "T00:00:00").toLocaleDateString("pt-BR")}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Faturamento"
                value={formatCurrency(parseFloat(r.revenue))}
                good
              />
              <MetricCard
                label="CMV Real"
                value={formatCurrency(parseFloat(r.realCmv))}
                sub={`${(parseFloat(r.realCmv) / parseFloat(r.revenue) * 100).toFixed(1)}% do faturamento`}
              />
              <MetricCard
                label="CMV Teórico"
                value={formatCurrency(parseFloat(r.theoreticalCmv))}
                sub={`${(parseFloat(r.theoreticalCmv) / parseFloat(r.revenue) * 100).toFixed(1)}% do faturamento`}
              />
              <MetricCard
                label="Margem Bruta"
                value={`${parseFloat(r.grossMarginPct).toFixed(1)}%`}
                good={parseFloat(r.grossMarginPct) >= 60}
                alert={parseFloat(r.grossMarginPct) < 50}
                sub={parseFloat(r.grossMarginPct) < 60 ? "Abaixo de 60% — atenção" : "Dentro do esperado"}
              />
            </div>
          </section>

          {/* Divergência */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Divergência (Desperdício)
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-4 max-w-sm">
              <MetricCard
                label="Divergência CMV Real vs Teórico"
                value={`${parseFloat(r.cmvDivergencePct).toFixed(2)}%`}
                alert={!!divergenceAlert}
                good={!divergenceAlert}
                sub={divergenceAlert ? "⚠ Acima de 5% — investigar" : "Dentro do limite de 5%"}
              />
            </div>
          </section>

          {/* Breakdown por categoria */}
          {breakdown.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Breakdown por Categoria
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {["Categoria", "CMV Teórico", "CMV Real", "Diferença"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {breakdown.map(b => {
                        const diff = b.real - b.theoretical;
                        return (
                          <tr key={b.category} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900 capitalize">{b.category}</td>
                            <td className="px-4 py-3 text-gray-700">{formatCurrency(b.theoretical)}</td>
                            <td className="px-4 py-3 text-gray-700">{formatCurrency(b.real)}</td>
                            <td className="px-4 py-3">
                              <span className={`font-medium ${diff > 0 ? "text-red-600" : "text-green-600"}`}>
                                {diff > 0 ? "+" : ""}{formatCurrency(diff)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {breakdown.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
              <p className="text-gray-400 text-sm">
                Sem movimentações de estoque no período — o breakdown por categoria requer entradas/saídas registradas.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
