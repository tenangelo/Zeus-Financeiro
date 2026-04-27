"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search, Building2, CheckCircle, XCircle, MoreVertical,
  Plus, Trash2, Edit2, CreditCard, Shield, RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan_tier: string;
  is_active: boolean;
  created_at: string;
  stripe_customer_id: string | null;
  profiles?: { id: string; full_name: string; role: string; is_active: boolean }[];
  subscriptions?: { status: string; amount: number; current_period_end: string }[];
}

const PLAN_COLORS: Record<string, string> = {
  trial:      "bg-yellow-500/10 text-yellow-400",
  starter:    "bg-blue-500/10 text-blue-400",
  pro:        "bg-violet-500/10 text-violet-400",
  enterprise: "bg-purple-500/10 text-purple-400",
};

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-emerald-500/10 text-emerald-400",
  trialing: "bg-yellow-500/10 text-yellow-400",
  past_due: "bg-red-500/10 text-red-400",
  canceled: "bg-slate-500/10 text-slate-400",
};

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [editName, setEditName] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<{ id: string; name: string; tier: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (search) params.set("search", search);
      const res = await api.get<{ data: Tenant[]; total: number }>(`/admin/tenants?${params}`);
      setTenants(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get<any[]>("/plans?include_inactive=true").then(setPlans).catch(() => {});
  }, []);

  async function toggleActive(id: string, current: boolean) {
    const endpoint = current ? `/admin/tenants/${id}/deactivate` : `/admin/tenants/${id}/activate`;
    await api.patch(endpoint, {});
    load();
  }

  async function handleDelete(id: string) {
    await api.delete(`/admin/tenants/${id}`);
    setDeleteConfirm(null);
    load();
  }

  async function handleSaveEdit() {
    if (!editTenant) return;
    setSaving(true);
    try {
      await api.patch(`/admin/tenants/${editTenant.id}`, {
        name: editName,
        plan_tier: editPlan,
      });
      setEditTenant(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Restaurantes</h1>
          <p className="text-sm text-slate-400 mt-1">{total} tenants cadastrados</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Restaurante</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Plano</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Assinatura</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuários</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Criado em</th>
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              [1,2,3,4,5].map(i => (
                <tr key={i}>
                  {[1,2,3,4,5,6,7].map(j => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 bg-slate-800 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                  Nenhum restaurante encontrado.
                </td>
              </tr>
            ) : tenants.map(t => {
              const sub = t.subscriptions?.[0];
              return (
                <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 shrink-0">
                        <Building2 className="h-4 w-4 text-violet-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{t.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{t.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${PLAN_COLORS[t.plan_tier] ?? "bg-slate-700 text-slate-300"}`}>
                      {t.plan_tier}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {sub ? (
                      <div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[sub.status] ?? "bg-slate-700 text-slate-300"}`}>
                          {sub.status}
                        </span>
                        {sub.amount > 0 && (
                          <p className="text-xs text-slate-500 mt-1">
                            R$ {sub.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {t.is_active ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                        <CheckCircle className="h-3.5 w-3.5" />Ativo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
                        <XCircle className="h-3.5 w-3.5" />Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-slate-400 text-xs">
                    {t.profiles?.filter(p => p.is_active).length ?? 0} ativos
                  </td>
                  <td className="px-4 py-4 text-slate-500 text-xs">
                    {new Date(t.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        onClick={() => { setEditTenant(t); setEditName(t.name); setEditPlan(t.plan_tier); }}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => toggleActive(t.id, t.is_active)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title={t.is_active ? "Desativar" : "Ativar"}
                      >
                        {t.is_active ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(t.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>{total} registros</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-slate-800 rounded-lg disabled:opacity-30 hover:bg-slate-700 transition-colors"
            >
              Anterior
            </button>
            <span className="px-3 py-1.5 bg-slate-800 rounded-lg">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-slate-800 rounded-lg disabled:opacity-30 hover:bg-slate-700 transition-colors"
            >
              Próximo
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTenant && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold text-white">Editar Restaurante</h2>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Nome</label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Plano</label>
              <select
                value={editPlan}
                onChange={e => setEditPlan(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
              >
                {["trial","starter","pro","enterprise"].map(p => (
                  <option key={p} value={p} className="capitalize">{p}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditTenant(null)} className="flex-1 px-4 py-2 text-sm text-slate-400 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSaveEdit} disabled={saving} className="flex-1 px-4 py-2 text-sm text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50">
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-red-900/50 rounded-2xl p-6 w-full max-w-sm space-y-4 text-center">
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
                <Trash2 className="h-6 w-6 text-red-400" />
              </div>
            </div>
            <div>
              <p className="font-bold text-white">Excluir restaurante?</p>
              <p className="text-xs text-slate-400 mt-1">Esta ação é irreversível e apaga todos os dados do tenant.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 text-sm text-slate-400 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
