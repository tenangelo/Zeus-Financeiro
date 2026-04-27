"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Star, CheckCircle, XCircle, DollarSign } from "lucide-react";
import { api } from "@/lib/api";

interface Plan {
  id: string;
  name: string;
  slug: string;
  tier: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  limits: Record<string, unknown>;
  is_active: boolean;
  is_highlighted: boolean;
  sort_order: number;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
}

const TIER_COLORS: Record<string, string> = {
  trial:      "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  starter:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
  pro:        "bg-violet-500/10 text-violet-400 border-violet-500/20",
  enterprise: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const EMPTY: Partial<Plan> = {
  name: "", slug: "", tier: "starter", description: "",
  price_monthly: 0, price_yearly: 0, features: [], limits: {},
  is_active: true, is_highlighted: false, sort_order: 0,
};

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<Plan> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [featuresText, setFeaturesText] = useState("");
  const [limitsText, setLimitsText] = useState("{}");

  const load = () => {
    setLoading(true);
    api.get<Plan[]>("/plans?include_inactive=true")
      .then(setPlans)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  function openCreate() {
    setModal({ ...EMPTY, features: [], limits: {} });
    setFeaturesText("");
    setLimitsText("{}");
  }

  function openEdit(p: Plan) {
    setModal(p);
    setFeaturesText((p.features ?? []).join("\n"));
    setLimitsText(JSON.stringify(p.limits ?? {}, null, 2));
  }

  async function handleSave() {
    if (!modal) return;
    setSaving(true);
    try {
      let features: string[] = [];
      try { features = featuresText.split("\n").map(f => f.trim()).filter(Boolean); } catch {}
      let limits: Record<string, unknown> = {};
      try { limits = JSON.parse(limitsText); } catch {}

      const payload = { ...modal, features, limits };

      if (modal.id) {
        await api.patch(`/plans/${modal.id}`, payload);
      } else {
        await api.post("/plans", payload);
      }
      setModal(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/plans/${id}`);
    setDeleteConfirm(null);
    load();
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Planos</h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie os planos e preços do SaaS</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Plano
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="h-72 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)
        ) : plans.map(plan => (
          <div
            key={plan.id}
            className={`bg-slate-900 border rounded-xl p-5 space-y-4 relative ${
              plan.is_highlighted ? "border-violet-500/50" : "border-slate-800"
            } ${!plan.is_active ? "opacity-50" : ""}`}
          >
            {plan.is_highlighted && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                <span className="flex items-center gap-1 px-2.5 py-0.5 bg-violet-600 text-white text-[10px] font-bold rounded-full">
                  <Star className="h-2.5 w-2.5" fill="currentColor" />
                  DESTAQUE
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${TIER_COLORS[plan.tier] ?? ""}`}>
                {plan.tier}
              </span>
              <div className="flex gap-1">
                <button onClick={() => openEdit(plan)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setDeleteConfirm(plan.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-white text-lg">{plan.name}</h3>
              {plan.description && <p className="text-xs text-slate-400 mt-1">{plan.description}</p>}
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">
                  R$ {plan.price_monthly.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                </span>
                <span className="text-xs text-slate-400">/mês</span>
              </div>
              {plan.price_yearly > 0 && (
                <p className="text-xs text-emerald-400">
                  R$ {plan.price_yearly.toLocaleString("pt-BR")}/ano
                  <span className="text-slate-500 ml-1">
                    (R$ {(plan.price_yearly / 12).toFixed(0)}/mês)
                  </span>
                </p>
              )}
            </div>

            <ul className="space-y-1.5">
              {(plan.features ?? []).slice(0, 4).map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            {plan.stripe_price_id_monthly && (
              <p className="text-[10px] text-slate-600 font-mono truncate" title={plan.stripe_price_id_monthly}>
                {plan.stripe_price_id_monthly}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg space-y-4 my-4">
            <h2 className="text-lg font-bold text-white">{modal.id ? "Editar Plano" : "Novo Plano"}</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Nome *</label>
                <input value={modal.name ?? ""} onChange={e => setModal(m => ({ ...m!, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Slug *</label>
                <input value={modal.slug ?? ""} onChange={e => setModal(m => ({ ...m!, slug: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-violet-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Tier</label>
              <select value={modal.tier ?? "starter"} onChange={e => setModal(m => ({ ...m!, tier: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500">
                {["trial","starter","pro","enterprise"].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Descrição</label>
              <textarea value={modal.description ?? ""} onChange={e => setModal(m => ({ ...m!, description: e.target.value }))} rows={2}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm resize-none focus:outline-none focus:border-violet-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Preço Mensal (R$)</label>
                <input type="number" min={0} step={0.01} value={modal.price_monthly ?? 0}
                  onChange={e => setModal(m => ({ ...m!, price_monthly: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Preço Anual (R$)</label>
                <input type="number" min={0} step={0.01} value={modal.price_yearly ?? 0}
                  onChange={e => setModal(m => ({ ...m!, price_yearly: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Features (uma por linha)</label>
              <textarea value={featuresText} onChange={e => setFeaturesText(e.target.value)} rows={4}
                placeholder="Até 10 usuários&#10;Ingredientes ilimitados&#10;Suporte prioritário"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm resize-none font-mono focus:outline-none focus:border-violet-500" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Limites (JSON)</label>
              <textarea value={limitsText} onChange={e => setLimitsText(e.target.value)} rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs resize-none font-mono focus:outline-none focus:border-violet-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Stripe Price ID Mensal</label>
                <input value={modal.stripe_price_id_monthly ?? ""} placeholder="price_..."
                  onChange={e => setModal(m => ({ ...m!, stripe_price_id_monthly: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-violet-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Stripe Price ID Anual</label>
                <input value={modal.stripe_price_id_yearly ?? ""} placeholder="price_..."
                  onChange={e => setModal(m => ({ ...m!, stripe_price_id_yearly: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-violet-500" />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={modal.is_active ?? true}
                  onChange={e => setModal(m => ({ ...m!, is_active: e.target.checked }))}
                  className="rounded" />
                <span className="text-sm text-slate-300">Ativo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={modal.is_highlighted ?? false}
                  onChange={e => setModal(m => ({ ...m!, is_highlighted: e.target.checked }))}
                  className="rounded" />
                <span className="text-sm text-slate-300">Destacar na página de preços</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 text-sm text-slate-400 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 text-sm text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50">
                {saving ? "Salvando..." : modal.id ? "Salvar" : "Criar Plano"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-red-900/50 rounded-2xl p-6 w-full max-w-sm space-y-4 text-center">
            <p className="font-bold text-white">Excluir plano?</p>
            <p className="text-xs text-slate-400">Planos com assinaturas ativas não podem ser excluídos.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 text-sm text-slate-400 bg-slate-800 rounded-lg hover:bg-slate-700">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
