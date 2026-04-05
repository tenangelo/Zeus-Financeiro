"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency } from "@zeus/shared";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DreResult {
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
}

function DreCard({
  label,
  value,
  sub,
  color = "gray",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: "green" | "red" | "gray" | "blue" | "yellow";
}) {
  const border = {
    green: "border-l-green-400",
    blue: "border-l-blue-400",
    red: "border-l-red-400",
    yellow: "border-l-yellow-400",
    gray: "border-l-gray-300",
  }[color];

  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${border} p-4 shadow-sm`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function DrePage() {
  const [dre, setDre] = useState<DreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const [from, setFrom] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  );
  const [to, setTo] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]!
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<DreResult>(
        `/transactions/dre/calculate?date_from=${from}&date_to=${to}`
      );
      setDre(data);
    } catch (err: any) {
      setError(err.message ?? "Erro ao carregar DRE.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [from, to]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !dre) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-6">
        {error || "Nenhum dado disponível para este período."}
      </div>
    );
  }

  const periodLabel = `${new Date(dre.period_start + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}`;

  // Dados para gráfico de linha (margem ao longo do período)
  const chartData = [
    { name: "Receita", value: parseFloat(dre.net_revenue) },
    { name: "CMV", value: parseFloat(dre.cmv) },
    { name: "Lucro Bruto", value: parseFloat(dre.gross_profit) },
    { name: "Desp. Operac.", value: parseFloat(dre.operating_expenses) },
    { name: "EBITDA", value: parseFloat(dre.ebitda) },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">DRE — Demonstrativo de Resultado</h1>
        <p className="text-sm text-gray-500 mt-0.5">Análise financeira consolidada do período</p>
      </div>

      {/* Filtros de período */}
      <div className="flex gap-3 items-end">
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
        <span className="text-xs text-gray-400 font-medium">{periodLabel}</span>
      </div>

      {/* Indicadores principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DreCard
          label="Receita Bruta"
          value={formatCurrency(parseFloat(dre.gross_revenue))}
          color="blue"
        />
        <DreCard
          label="Receita Líquida"
          value={formatCurrency(parseFloat(dre.net_revenue))}
          sub={`Bruta − Impostos/Taxas`}
          color="blue"
        />
        <DreCard
          label="CMV"
          value={formatCurrency(parseFloat(dre.cmv))}
          sub={`${(parseFloat(dre.cmv) / parseFloat(dre.net_revenue) * 100).toFixed(1)}% da receita`}
          color="red"
        />
        <DreCard
          label="Margem Bruta"
          value={`${dre.gross_margin_pct.toFixed(1)}%`}
          sub={dre.gross_margin_pct >= 60 ? "Saudável" : dre.gross_margin_pct >= 50 ? "Atenção" : "Crítico"}
          color={dre.gross_margin_pct >= 60 ? "green" : dre.gross_margin_pct >= 50 ? "yellow" : "red"}
        />
      </div>

      {/* Lucro Bruto e Operacional */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DreCard
          label="Lucro Bruto"
          value={formatCurrency(parseFloat(dre.gross_profit))}
          sub="Receita Líquida − CMV"
          color="green"
        />
        <DreCard
          label="Desp. Operacionais"
          value={formatCurrency(parseFloat(dre.operating_expenses))}
          sub="Folha + Aluguel + Utilidades + Marketing + Outros"
          color="red"
        />
      </div>

      {/* EBITDA — O coração da rentabilidade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DreCard
          label="EBITDA"
          value={formatCurrency(parseFloat(dre.ebitda))}
          sub={`${dre.ebitda_pct.toFixed(1)}% da receita (meta: 10-20%)`}
          color={dre.ebitda_pct >= 10 ? "green" : "yellow"}
        />
        <DreCard
          label="Resultado Líquido"
          value={formatCurrency(parseFloat(dre.net_income))}
          sub={`${dre.net_margin_pct.toFixed(1)}% de margem`}
          color={parseFloat(dre.net_income) >= 0 ? "green" : "red"}
        />
      </div>

      {/* Gráfico de composição */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Composição de Resultado</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={value => formatCurrency(value as number)}
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #ddd", borderRadius: "8px" }}
            />
            <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela detalhada */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Detalhamento Completo</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {[
                { label: "Receita Bruta", value: dre.gross_revenue, emphasis: true },
                { label: "  (−) Impostos e Taxas", value: dre.taxes_fees },
                { label: "= Receita Líquida", value: dre.net_revenue, emphasis: true },
                { label: "  (−) CMV", value: dre.cmv },
                { label: "= Lucro Bruto", value: dre.gross_profit, emphasis: true },
                { label: "  (−) Despesas Operacionais", value: dre.operating_expenses },
                { label: "= EBITDA", value: dre.ebitda, emphasis: true },
                { label: "  (−) Despesas Financeiras", value: dre.financial_expenses },
                { label: "= Lucro Líquido", value: dre.net_income, emphasis: true },
              ].map((row, i) => (
                <tr key={i} className={row.emphasis ? "bg-gray-50" : ""}>
                  <td className={`py-3 px-4 ${row.emphasis ? "font-semibold text-gray-900" : "text-gray-600"}`}>
                    {row.label}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono ${
                    row.emphasis ? "font-semibold text-gray-900" : "text-gray-700"
                  }`}>
                    {formatCurrency(parseFloat(row.value))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Indicadores de saúde */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <p className="text-sm font-semibold text-blue-900">📊 KPIs de Saúde Financeira</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-blue-600 font-medium">CMV%</span>
            <p className="text-blue-900 font-bold">{(parseFloat(dre.cmv) / parseFloat(dre.net_revenue) * 100).toFixed(1)}%</p>
            <span className="text-blue-500">Meta: 28-35%</span>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Margem Bruta</span>
            <p className="text-blue-900 font-bold">{dre.gross_margin_pct.toFixed(1)}%</p>
            <span className="text-blue-500">Meta: 50-70%</span>
          </div>
          <div>
            <span className="text-blue-600 font-medium">EBITDA%</span>
            <p className="text-blue-900 font-bold">{dre.ebitda_pct.toFixed(1)}%</p>
            <span className="text-blue-500">Meta: 10-20%</span>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Margem Líquida</span>
            <p className="text-blue-900 font-bold">{dre.net_margin_pct.toFixed(1)}%</p>
            <span className="text-blue-500">Meta: 5-10%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
