"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency } from "@zeus/shared";

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  unit_cost: number;
  stock_quantity: number;
  min_stock_alert: number;
  category: string | null;
  is_active: boolean;
}

const UNITS = ["kg", "g", "l", "ml", "un", "cx", "pct"] as const;

const CATEGORIES = [
  "Carnes e Aves",
  "Frutos do Mar",
  "Hortifruti",
  "Laticínios e Ovos",
  "Grãos e Cereais",
  "Massas e Farinhas",
  "Temperos e Molhos",
  "Bebidas",
  "Descartáveis",
  "Limpeza",
  "Outros",
];

const EMPTY_FORM = {
  name: "",
  unit: "kg" as (typeof UNITS)[number],
  unit_cost: "",
  stock_quantity: "",
  min_stock_alert: "",
  category: "",
};

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ data: Ingredient[] }>(
        `/ingredients?search=${encodeURIComponent(search)}&is_active=true`
      );
      setIngredients(res.data ?? []);
    } catch (err: any) {
      console.error("Erro ao carregar ingredientes:", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [search]);

  function openNew() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        unit: form.unit,
        unit_cost: parseFloat(form.unit_cost) || 0,
        stock_quantity: parseFloat(form.stock_quantity) || 0,
        min_stock_alert: parseFloat(form.min_stock_alert) || 0,
        category: form.category || undefined,
      };

      if (editId) {
        await api.patch(`/ingredients/${editId}`, payload);
      } else {
        await api.post("/ingredients", payload);
      }

      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditId(null);
      await load();
    } catch (err: any) {
      setFormError(err.message ?? "Erro ao salvar ingrediente.");
    } finally {
      setSaving(false);
    }
  }

  const lowStock = ingredients.filter(
    i => i.min_stock_alert > 0 && i.stock_quantity <= i.min_stock_alert
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ingredientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{ingredients.length} cadastrados</p>
        </div>
        <button
          onClick={openNew}
          className="shrink-0 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          + Novo Ingrediente
        </button>
      </div>

      {/* Alerta de estoque baixo */}
      {lowStock.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-yellow-500 text-lg mt-0.5">⚠</span>
          <div>
            <p className="text-sm font-medium text-yellow-800">
              {lowStock.length} ingrediente(s) com estoque abaixo do mínimo
            </p>
            <p className="text-xs text-yellow-600 mt-0.5">
              {lowStock.map(i => i.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editId ? "Editar Ingrediente" : "Novo Ingrediente"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600">Nome *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    placeholder="Ex: Tomate Italiano"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Categoria</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    <option value="">Selecionar...</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Unidade *</label>
                  <select
                    required
                    value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value as typeof form.unit }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    {UNITS.map(u => (
                      <option key={u} value={u}>
                        {u === "kg" ? "kg — quilograma" : u === "g" ? "g — grama" :
                         u === "l" ? "l — litro" : u === "ml" ? "ml — mililitro" :
                         u === "un" ? "un — unidade" : u === "cx" ? "cx — caixa" : "pct — pacote"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Custo Unitário (R$)</label>
                  <input
                    type="number" step="0.0001" min="0"
                    value={form.unit_cost}
                    onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Estoque Atual</label>
                  <input
                    type="number" step="0.001" min="0"
                    value={form.stock_quantity}
                    onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Estoque Mínimo</label>
                  <input
                    type="number" step="0.001" min="0"
                    value={form.min_stock_alert}
                    onChange={e => setForm(f => ({ ...f, min_stock_alert: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    placeholder="0"
                  />
                </div>
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
                  {saving ? "Salvando..." : editId ? "Atualizar" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Busca */}
      <div className="relative max-w-sm">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar ingrediente..."
          className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Nome", "Categoria", "Unid.", "Custo Unit.", "Estoque", "Mínimo", "Status"].map(h => (
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
              ) : ingredients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <p className="text-gray-400 text-sm">
                      {search ? `Nenhum ingrediente encontrado para "${search}".` : "Nenhum ingrediente cadastrado."}
                    </p>
                    {!search && (
                      <button onClick={openNew} className="mt-2 text-brand-600 text-sm hover:underline">
                        Cadastrar primeiro ingrediente →
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                ingredients.map(ing => {
                  const belowMin = ing.min_stock_alert > 0 && ing.stock_quantity <= ing.min_stock_alert;
                  return (
                    <tr key={ing.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{ing.name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {ing.category ? (
                          <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">{ing.category}</span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{ing.unit}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium">
                        {formatCurrency(ing.unit_cost)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${belowMin ? "text-red-600" : "text-gray-700"}`}>
                          {ing.stock_quantity} {ing.unit}
                        </span>
                        {belowMin && <span className="ml-1 text-xs text-red-400">⚠ baixo</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {ing.min_stock_alert > 0 ? `${ing.min_stock_alert} ${ing.unit}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          ing.is_active
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}>
                          {ing.is_active ? "Ativo" : "Inativo"}
                        </span>
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
