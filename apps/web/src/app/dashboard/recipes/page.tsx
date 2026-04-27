"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency } from "@zeus/shared";

interface Ingredient { id: string; name: string; unit: string; unit_cost: number; }
interface RecipeItem { ingredient_id: string; quantity: number; waste_factor_pct: number; }
interface Recipe {
  id: string; name: string; category: string | null; serving_size: number;
  serving_unit: string; theoretical_cost: number; sale_price: number | null; is_active: boolean;
}
interface RecipeWithItems extends Recipe {
  items: Array<{ ingredient_id: string; quantity: number; waste_factor_pct: number }>;
}

const SERVING_UNITS = ["porção", "unidade", "kg", "g", "l", "ml"];

const RECIPE_CATEGORIES = [
  "Entrada",
  "Prato Principal",
  "Guarnição",
  "Sobremesa",
  "Bebida",
  "Lanche / Hambúrguer",
  "Pizza",
  "Massa",
  "Salada",
  "Caldos e Sopas",
  "Outros",
];

const EMPTY_FORM = { name: "", category: "", serving_size: "1", serving_unit: "porção", sale_price: "" };
const EMPTY_ITEM: RecipeItem = { ingredient_id: "", quantity: 1, waste_factor_pct: 0 };

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState<RecipeItem[]>([{ ...EMPTY_ITEM }]);
  const [preview, setPreview] = useState<{ theoretical_cost: number; margin_pct?: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadRecipes() {
    setLoading(true);
    try {
      const res = await api.get<{ data: Recipe[] }>(`/recipes?search=${encodeURIComponent(search)}&is_active=true`);
      setRecipes(res.data ?? []);
    } catch (err: any) {
      console.error("Erro ao carregar fichas:", err.message);
    } finally { setLoading(false); }
  }

  async function loadIngredients() {
    try {
      const res = await api.get<{ data: Ingredient[] }>("/ingredients?is_active=true&limit=200");
      setIngredients(res.data ?? []);
    } catch { /* silent */ }
  }

  useEffect(() => { loadRecipes(); }, [search]);
  useEffect(() => { loadIngredients(); }, []);

  function openForm() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setItems([{ ...EMPTY_ITEM }]);
    setPreview(null);
    setFormError(null);
    setShowForm(true);
  }

  async function openEdit(r: Recipe) {
    setEditId(r.id);
    setForm({
      name: r.name,
      category: r.category ?? "",
      serving_size: String(r.serving_size),
      serving_unit: r.serving_unit,
      sale_price: r.sale_price ? String(r.sale_price) : "",
    });
    setPreview(null);
    setFormError(null);
    // Carrega itens da ficha
    try {
      const full = await api.get<RecipeWithItems>(`/recipes/${r.id}`);
      setItems(full.items.length > 0
        ? full.items.map(i => ({ ingredient_id: i.ingredient_id, quantity: i.quantity, waste_factor_pct: i.waste_factor_pct }))
        : [{ ...EMPTY_ITEM }]
      );
    } catch {
      setItems([{ ...EMPTY_ITEM }]);
    }
    setShowForm(true);
  }

  async function handleDelete() {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      await api.delete(`/recipes/${deleteConfirmId}`);
      setDeleteConfirmId(null);
      await loadRecipes();
    } catch (err: any) {
      console.error("Erro ao excluir ficha:", err.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handlePreview() {
    const validItems = items.filter(i => i.ingredient_id && i.quantity > 0);
    if (!validItems.length) return;
    setPreviewLoading(true);
    try {
      const res = await api.post<{ theoretical_cost: number; margin_pct?: number }>(
        "/recipes/preview-cost",
        { items: validItems, sale_price: form.sale_price ? parseFloat(form.sale_price) : undefined }
      );
      setPreview(res);
    } catch { /* ignore */ }
    finally { setPreviewLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const validItems = items.filter(i => i.ingredient_id && i.quantity > 0);
    if (!validItems.length) {
      setFormError("Adicione pelo menos um ingrediente à ficha técnica.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        category: form.category || undefined,
        serving_size: parseFloat(form.serving_size) || 1,
        serving_unit: form.serving_unit,
        sale_price: form.sale_price ? parseFloat(form.sale_price) : undefined,
        items: validItems,
      };

      if (editId) {
        await api.patch(`/recipes/${editId}`, payload);
      } else {
        await api.post("/recipes", payload);
      }
      setShowForm(false);
      setEditId(null);
      await loadRecipes();
    } catch (err: any) {
      setFormError(err.message ?? "Erro ao salvar ficha técnica.");
    } finally { setSaving(false); }
  }

  function updateItem(index: number, field: keyof RecipeItem, value: string | number) {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
    setPreview(null);
  }

  const totalCost = preview?.theoretical_cost ?? 0;
  const marginPct = preview?.margin_pct;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fichas Técnicas</h1>
          <p className="text-sm text-gray-500 mt-0.5">{recipes.length} cadastradas</p>
        </div>
        <button
          onClick={openForm}
          className="shrink-0 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          + Nova Ficha Técnica
        </button>
      </div>

      {/* Modal — slide-over lateral para comportar ingredientes */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl">
            {/* Header do modal */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">{editId ? "Editar Ficha Técnica" : "Nova Ficha Técnica"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-5 space-y-5">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {formError}
                </div>
              )}

              {/* Dados gerais */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600">Nome da Receita *</label>
                  <input
                    required value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    placeholder="Ex: Risoto de Funghi"
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
                    {RECIPE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Preço de Venda (R$)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.sale_price}
                    onChange={e => { setForm(f => ({ ...f, sale_price: e.target.value })); setPreview(null); }}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Rendimento</label>
                  <input
                    type="number" min="0.01" step="0.01"
                    value={form.serving_size}
                    onChange={e => setForm(f => ({ ...f, serving_size: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Unidade de Rendimento</label>
                  <select
                    value={form.serving_unit}
                    onChange={e => setForm(f => ({ ...f, serving_unit: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    {SERVING_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Ingredientes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Ingredientes</label>
                  <button type="button" onClick={() => setItems(p => [...p, { ...EMPTY_ITEM }])}
                    className="text-xs text-brand-600 hover:text-brand-800 font-medium">
                    + Adicionar linha
                  </button>
                </div>

                {ingredients.length === 0 && (
                  <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-3">
                    ⚠ Nenhum ingrediente cadastrado. <a href="/dashboard/ingredients" className="underline">Cadastre primeiro.</a>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-400 px-1">
                    <span className="col-span-6">Ingrediente</span>
                    <span className="col-span-3">Quantidade</span>
                    <span className="col-span-2">Perda %</span>
                  </div>
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <select
                        value={item.ingredient_id}
                        onChange={e => updateItem(idx, "ingredient_id", e.target.value)}
                        className="col-span-6 border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                      >
                        <option value="">Selecione...</option>
                        {ingredients.map(ing => (
                          <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                        ))}
                      </select>
                      <input
                        type="number" min="0.001" step="0.001" value={item.quantity}
                        onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                        className="col-span-3 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                        placeholder="Qtd"
                      />
                      <input
                        type="number" min="0" max="100" step="0.1" value={item.waste_factor_pct}
                        onChange={e => updateItem(idx, "waste_factor_pct", parseFloat(e.target.value) || 0)}
                        className="col-span-2 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                        placeholder="%"
                      />
                      {items.length > 1 && (
                        <button type="button" onClick={() => setItems(p => p.filter((_, i) => i !== idx))}
                          className="col-span-1 text-red-400 hover:text-red-600 text-lg leading-none text-center">
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview de custo */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  {preview ? (
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-xs text-gray-500">Custo Teórico</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(totalCost)}</p>
                      </div>
                      {marginPct !== undefined && (
                        <div>
                          <p className="text-xs text-gray-500">Margem</p>
                          <p className={`text-lg font-bold ${marginPct >= 60 ? "text-green-600" : marginPct >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                            {marginPct.toFixed(1)}%
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Simule o custo antes de salvar</p>
                  )}
                </div>
                <button
                  type="button" onClick={handlePreview} disabled={previewLoading}
                  className="shrink-0 px-3 py-2 border border-brand-300 text-brand-700 text-sm rounded-lg hover:bg-brand-50 disabled:opacity-50"
                >
                  {previewLoading ? "..." : "Simular Custo"}
                </button>
              </div>
            </form>

            {/* Footer fixo */}
            <div className="shrink-0 flex gap-2 p-5 border-t border-gray-100">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleCreate as any}
                disabled={saving}
                className="flex-1 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Salvando..." : editId ? "Atualizar Ficha Técnica" : "Salvar Ficha Técnica"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmação de exclusão */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Excluir ficha técnica?</h2>
            <p className="text-sm text-gray-500 mb-6">
              A ficha será desativada e não aparecerá mais nas listagens.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Excluindo..." : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Busca */}
      <div className="relative max-w-sm">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar ficha técnica..."
          className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Nome", "Categoria", "Rendimento", "Custo Teórico", "Preço Venda", "Margem", "Status", "Ações"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center">
                    <div className="flex justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                    </div>
                  </td>
                </tr>
              ) : recipes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <p className="text-gray-400 text-sm">Nenhuma ficha técnica cadastrada.</p>
                    <button onClick={openForm} className="mt-2 text-brand-600 text-sm hover:underline">
                      Criar primeira ficha →
                    </button>
                  </td>
                </tr>
              ) : (
                recipes.map(r => {
                  const margin = r.sale_price && r.theoretical_cost
                    ? ((r.sale_price - r.theoretical_cost) / r.sale_price) * 100
                    : null;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                      <td className="px-4 py-3 text-xs">
                        {r.category ? (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">{r.category}</span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {r.serving_size} {r.serving_unit}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">
                        {formatCurrency(r.theoretical_cost)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {r.sale_price ? formatCurrency(r.sale_price) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {margin !== null ? (
                          <span className={`font-semibold ${margin >= 60 ? "text-green-600" : margin >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                            {margin.toFixed(1)}%
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          r.is_active
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}>
                          {r.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openEdit(r)}
                            className="text-xs text-brand-600 hover:text-brand-800 font-medium hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(r.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline"
                          >
                            Excluir
                          </button>
                        </div>
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
