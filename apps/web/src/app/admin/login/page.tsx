"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Zap, Shield, ArrowRight, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;

      // Validate super-admin privilege before entering the panel
      await api.get("/admin/metrics");
      router.push(redirectTo as any);
      router.refresh();
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (msg === "Forbidden" || msg.includes("403") || msg.toLowerCase().includes("super")) {
        // Signed in but not super-admin — sign out so state is clean
        const supabase = createClient();
        await supabase.auth.signOut();
        setError("Esta conta não tem privilégio de super admin. Contate o proprietário do sistema.");
      } else {
        setError(msg || "Erro ao autenticar. Verifique e-mail e senha.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(124,58,237,0.15),transparent)]" />
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

      <div className="relative w-full max-w-[380px] space-y-7">
        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 shadow-2xl shadow-violet-500/30 ring-1 ring-violet-400/20">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Zeus Admin</h1>
            <p className="text-xs text-slate-500 mt-0.5">Painel de Super Administrador</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-2xl shadow-black/60 ring-1 ring-white/[0.04]">
          {/* Access badge */}
          <div className="flex items-center gap-2 mb-6 pb-5 border-b border-slate-800">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/10">
              <Shield className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Acesso Restrito</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                E-mail
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                placeholder="admin@exemplo.com"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-500/20 rounded-xl px-3.5 py-3">
                <span className="text-red-400 text-sm mt-px shrink-0">⚠</span>
                <p className="text-xs text-red-300 leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Verificando acesso...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Entrar como Admin
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <div className="text-center">
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            Acessar o app de clientes
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
