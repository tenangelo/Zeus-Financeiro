"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Shield, CheckCircle, XCircle, Star } from "lucide-react";
import { api } from "@/lib/api";

interface User {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_super_admin: boolean;
  last_login_at: string | null;
  created_at: string;
  tenants?: { id: string; name: string; plan_tier: string };
}

const ROLE_COLORS: Record<string, string> = {
  owner:   "bg-violet-500/10 text-violet-400",
  manager: "bg-blue-500/10 text-blue-400",
  staff:   "bg-slate-500/10 text-slate-400",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const res = await api.get<{ data: User[]; total: number }>(`/admin/users?${params}`);
      setUsers(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(user: User) {
    setActionLoading(user.id);
    const endpoint = user.is_active ? `/admin/users/${user.id}/deactivate` : `/admin/users/${user.id}/activate`;
    await api.patch(endpoint, {});
    setActionLoading(null);
    load();
  }

  async function toggleSuperAdmin(user: User) {
    setActionLoading(user.id + "-sa");
    await api.patch(`/admin/users/${user.id}/super-admin`, { is_super_admin: !user.is_super_admin });
    setActionLoading(null);
    load();
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Usuários</h1>
        <p className="text-sm text-slate-400 mt-1">{total} usuários no sistema</p>
      </div>

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

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuário</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Restaurante</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Último acesso</th>
              <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              [1,2,3,4,5].map(i => (
                <tr key={i}>
                  {[1,2,3,4,5,6].map(j => (
                    <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-500">Nenhum usuário encontrado.</td>
              </tr>
            ) : users.map(user => (
              <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10 text-violet-400 text-sm font-bold shrink-0">
                      {user.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="font-medium text-white flex items-center gap-1.5">
                        {user.full_name}
                        {user.is_super_admin && (
                          <Star className="h-3 w-3 text-yellow-400" fill="currentColor" />
                        )}
                      </p>
                      <p className="text-[10px] font-mono text-slate-600">{user.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  {user.tenants ? (
                    <div>
                      <p className="text-sm text-white">{user.tenants.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{user.tenants.plan_tier}</p>
                    </div>
                  ) : <span className="text-slate-600 text-xs">—</span>}
                </td>
                <td className="px-4 py-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${ROLE_COLORS[user.role] ?? ""}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-4">
                  {user.is_active ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                      <CheckCircle className="h-3.5 w-3.5" />Ativo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
                      <XCircle className="h-3.5 w-3.5" />Inativo
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 text-slate-500 text-xs">
                  {user.last_login_at
                    ? new Date(user.last_login_at).toLocaleDateString("pt-BR")
                    : "Nunca"}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5 justify-end">
                    <button
                      onClick={() => toggleSuperAdmin(user)}
                      disabled={actionLoading === user.id + "-sa"}
                      className={`p-1.5 rounded-lg transition-colors ${
                        user.is_super_admin
                          ? "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-950/30"
                          : "text-slate-500 hover:text-yellow-400 hover:bg-yellow-950/20"
                      }`}
                      title={user.is_super_admin ? "Revogar super-admin" : "Conceder super-admin"}
                    >
                      <Shield className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => toggleActive(user)}
                      disabled={actionLoading === user.id}
                      className={`p-1.5 rounded-lg transition-colors ${
                        user.is_active
                          ? "text-slate-400 hover:text-red-400 hover:bg-red-950/30"
                          : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30"
                      }`}
                      title={user.is_active ? "Desativar" : "Ativar"}
                    >
                      {user.is_active ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>{total} registros</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="px-3 py-1.5 bg-slate-800 rounded-lg disabled:opacity-30 hover:bg-slate-700">Anterior</button>
            <span className="px-3 py-1.5 bg-slate-800 rounded-lg">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="px-3 py-1.5 bg-slate-800 rounded-lg disabled:opacity-30 hover:bg-slate-700">Próximo</button>
          </div>
        </div>
      )}
    </div>
  );
}
