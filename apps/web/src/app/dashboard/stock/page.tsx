"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency } from "@zeus/shared";

type MovementType = "purchase" | "consumption" | "waste" | "adjustment" | "return";

interface StockMovement {
  id: string;
  ingredient_id: string;
  movement_type: MovementType;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  notes: string | null;
  reference_type: string | null;
  created_at: string;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  unit_cost: number;
  stock_quantity: number;
  min_stock_alert: number;
}

const MOVEMENT_LABELS: Record<MovementType, string> = {
  purchase: "Compra",
  consumption: "Consumo",
  waste: "Desperdício",
  adjustment: "Ajuste",
  return: "Devolução",
};

const MOVEMENT_COLORS: Record<MovementType, string> = {
  purchase: "bg-green-50 text-green-700 border-green-200",
  consumption: "bg-blue-50 text-blue-700 border-blue-200",
  waste: "bg-red-50 text-red-700 border-red-200",
  adjustment: "bg-yellow-50 text-yellow-700 border-yellow-200",
  return: "bg-purple-50 text-purple-700 border-purple-200",
};

const EMPTY_FORM = {
  ingredient_id: "",
  movement_type: "purchase" as MovementType,
  quantity: "",
  unit_cost: "",
  notes: "",
};

export default function StockPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [filterIngredient, setFilterIngredient] = useState("");

  const ingredientMap = Object.fromEntries(ingredients.map(i => [i.id, i]));

  async function loadAll() {
    setLoading(true);
    try {
      const [movRes, ingRes] = await Promise.allSettled([
        api.get<StockMovement[]>("/stock/movements?limit=200"),
        api.get<{ data: Ingredient[] }>("/ingredients?is_active=true&limit=200"),
      ]);
      if (movRes.status === "fulfilled") {
        setMovements(Array.isArray(movRes.value) ? movRes.value : []);
      }
      if (ingRes.status === "fulfilled") {
        setIngredients(ingRes.value?.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  function openForm() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  const needsCost = form.movement_type === "purchase" || form.movement_type === "return";
  const selectedIngredient = ingredientMap[form.ingredient_id];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ingredient_id: form.ingredient_id,
        movement_type: form.movement_type,
        quantity: parseFloat(form.quantity),
        notes: form.notes || undefined,
      };
      if (form.unit_cost) {
        payload.unit_cost = parseFloat(form.unit_cost);
      }
      await api.post("/stock/movements", payload);
      setShowForm(false);
      setForm(EMPTY_FORM);
      await loadAll();
    } catch (err: any) {
      setFormError(err.message ?? "Erro ao registrar movimentação.");
    } finally {
      setSaving(false);
    }
  }

  const lowStock = ingredients.filter(
    i => i.min_stock_alert > 0 && i.stock_quantity <= i.min_stock_alert
  );

  const filtered = filterIngredient
    ? movements.filter(m => m.ingredient_id === filterIngredient)
    : movements;

  // Totais do dia
  const today = new Date().toISOString().split("T")[0]!;
  const todayMovements = movements.filter(m => m.created_at.startsWith(today));
  const todayIn = todayMovements
    .filter(m => m.movement_type === "purchase")
    .reduce((s, m) => s + (m.total_cost ?? 0), 0);
  const todayOut = todayMovements
    .filter(m => m.movement_type === "consumption" || m.movement_type === "waste")
    .reduce((s, m) => s + (m.total_cost ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estoque</h1>
          <p className="text-sm text-gray-500 mt-0.5">Movimentações de entrada e saída</p>
        </div>
        <button
          onClick={openForm}
          className="shrink-0 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          + Registrar Movimentação
        </button>
      </div>

      {/* Alerta de estoque baixo */}
      {lowStock.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-yellow-500 text-lg mt-0.5">⚠</span>
          <div>
            <p className="text-sm font-medium text-yellow-800">
              {lowStock.length} ingrediente(s) abaixo do estoque mínimo
            </p>
            <p className="text-xs text-yellow-600 mt-0.5">
              {lowStock.map(i => `${i.name} (${i.stock_quantity} ${i.unit})`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-green-400 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Compras Hoje</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(todayIn)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-red-400 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Saídas Hoje</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(todayOut)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-yellow-400 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Estoque Baixo</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{lowStock.length}</p>
          <p className="mt-1 text-xs text-gray-400">ingrediente(s)</p>
        </div>
      </div>

      {/* Modal de movimentação */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Registrar Movimentação</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-600">Ingrediente *</label>
                <select
                  required
                  value={form.ingredient_id}
                  onChange={e => setForm(f => ({ ...f, ingredient_id: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  <option value="">Selecionar ingrediente...</option>
                  {ingredients.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} — estoque atual: {i.stock_quantity} {i.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Tipo de Movimentação *</label>
                <select
                  required
                  value={form.movement_type}
                  onChange={e => setForm(f => ({ ...f, movement_type: e.target.value as MovementType, unit_cost: "" }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  {(Object.keys(MOVEMENT_LABELS) as MovementType[]).map(t => (
                    <option key={t} value={t}>{MOVEMENT_LABELS[t]}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  {form.movement_type === "purchase" && "Entrada de estoque por compra"}
                  {form.movement_type === "consumption" && "Baixa por uso em produção"}
                  {form.movement_type === "waste" && "Baixa por desperdício ou vencimento"}
                  {form.movement_type === "adjustment" && "Correção manual do estoque"}
                  {form.movement_type === "return" && "Devolução ao fornecedor"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Quantidade * {selectedIngredient && <span className="text-gray-400">({selectedIngredient.unit})</span>}
                  </label>
                  <input
                    required
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    placeholder="0,000"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Custo Unitário (R$) {needsCost ? "*" : <span className="text-gray-400">(opcional)</span>}
                  </label>
                  <input
                    required={needsCost}
                    type="number"
                    step="0.0001"
                    min="0"
                    value={form.unit_cost}
                    onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))}
                    placeholder={
                      !needsCost && selectedIngredient
                        ? `${selectedIngredient.unit_cost} (atual)`
                        : "0,00"
                    }
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Observações</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  placeholder="Ex: NF 12345, ajuste de inventário..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Salvando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filtro por ingrediente */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterIngredient}
          onChange={e => setFilterIngredient(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="">Todos os ingredientes</option>
          {ingredients.map(i => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
        {filterIngredient && (
          <button
            onClick={() => setFilterIngredient("")}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Limpar filtro
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} movimentação(ões)</span>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Data", "Ingrediente", "Tipo", "Qtd.", "Custo Unit.", "Total", "Obs."].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <div className="flex justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <p className="text-gray-400 text-sm">Nenhuma movimentação registrada.</p>
                    <button
                      onClick={openForm}
                      className="mt-2 text-brand-600 text-sm hover:underline"
                    >
                      Registrar primeira movimentação →
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map(mov => {
                  const ing = ingredientMap[mov.ingredient_id];
                  const isIn = mov.movement_type === "purchase" || mov.movement_type === "return";
                  return (
                    <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(mov.created_at).toLocaleString("pt-BR", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {ing ? ing.name : <span className="text-gray-400 text-xs">{mov.ingredient_id.slice(0, 8)}…</span>}
                        {ing && <span className="ml-1 text-xs text-gray-400">({ing.unit})</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${MOVEMENT_COLORS[mov.movement_type]}`}>
                          {MOVEMENT_LABELS[mov.movement_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">
                        <span className={isIn ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                          {isIn ? "+" : "−"}{mov.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatCurrency(mov.unit_cost)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(mov.total_cost ?? 0)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-[160px] truncate">
                        {mov.notes ?? (mov.reference_type && mov.reference_type !== "manual" ? mov.reference_type : "—")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
