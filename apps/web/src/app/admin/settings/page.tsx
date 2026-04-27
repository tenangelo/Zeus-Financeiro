"use client";

import { useState } from "react";
import { Key, Zap, ExternalLink, Copy, CheckCircle } from "lucide-react";

interface EnvVar { key: string; description: string; example: string; link?: string }

const STRIPE_VARS: EnvVar[] = [
  { key: "STRIPE_SECRET_KEY", description: "Chave secreta do Stripe (Railway)", example: "sk_live_...", link: "https://dashboard.stripe.com/apikeys" },
  { key: "STRIPE_WEBHOOK_SECRET", description: "Secret do webhook endpoint (Railway)", example: "whsec_...", link: "https://dashboard.stripe.com/webhooks" },
  { key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", description: "Chave pública (Vercel)", example: "pk_live_...", link: "https://dashboard.stripe.com/apikeys" },
];

const WEBHOOK_EVENTS = [
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "checkout.session.completed",
];

export default function AdminSettingsPage() {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="p-8 max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Configurações Admin</h1>
        <p className="text-sm text-slate-400 mt-1">Variáveis de ambiente e integração Stripe</p>
      </div>

      {/* Stripe Setup */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
            <Zap className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Integração Stripe</h2>
            <p className="text-xs text-slate-400">Configure para habilitar cobranças recorrentes</p>
          </div>
        </div>

        <div className="space-y-3">
          {STRIPE_VARS.map(v => (
            <div key={v.key} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <code className="text-xs text-violet-300 font-mono">{v.key}</code>
                <div className="flex items-center gap-2">
                  {v.link && (
                    <a href={v.link} target="_blank" rel="noreferrer"
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                      <ExternalLink className="h-3 w-3" />
                      Stripe Dashboard
                    </a>
                  )}
                  <button onClick={() => copy(v.key, v.key)} className="p-1 text-slate-400 hover:text-white transition-colors">
                    {copied === v.key ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400">{v.description}</p>
              <code className="text-[10px] text-slate-600">{v.example}</code>
            </div>
          ))}
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-white">URL do Webhook</p>
            <button
              onClick={() => copy(`${process.env.NEXT_PUBLIC_API_URL ?? "https://SEU-BACKEND.railway.app/api/v1"}/billing/webhook`, "webhook")}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              {copied === "webhook" ? <CheckCircle className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              Copiar
            </button>
          </div>
          <code className="text-xs text-violet-300 font-mono break-all">
            https://SEU-BACKEND.railway.app/api/v1/billing/webhook
          </code>
          <p className="text-xs text-slate-500">Configure este endpoint no Stripe Dashboard → Webhooks</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-white">Eventos para assinar</p>
          <div className="flex flex-wrap gap-2">
            {WEBHOOK_EVENTS.map(e => (
              <span key={e} className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg">
                {e}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Railway env vars guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
            <Key className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Variáveis Railway (Backend)</h2>
            <p className="text-xs text-slate-400">Adicione em Railway → Serviço → Variables</p>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1">
          <p className="text-slate-500"># Stripe</p>
          <p>STRIPE_SECRET_KEY=sk_live_...</p>
          <p>STRIPE_WEBHOOK_SECRET=whsec_...</p>
          <p className="text-slate-500 mt-2"># Frontend URL (para redirects do Checkout)</p>
          <p>NEXT_PUBLIC_FRONTEND_URL=https://seu-app.vercel.app</p>
        </div>
      </div>

      {/* Super admin SQL */}
      <div className="bg-slate-900 border border-yellow-500/20 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-500/10">
            <Key className="h-4 w-4 text-yellow-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Tornar-se Super Admin</h2>
            <p className="text-xs text-slate-400">Execute no Supabase SQL Editor para dar acesso ao painel</p>
          </div>
        </div>
        <div className="relative">
          <div className="bg-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300">
            UPDATE profiles SET is_super_admin = true<br />
            WHERE id = &apos;SEU_UUID_AQUI&apos;;
          </div>
          <button
            onClick={() => copy("UPDATE profiles SET is_super_admin = true\nWHERE id = 'SEU_UUID_AQUI';", "sql")}
            className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-white bg-slate-700 rounded-lg transition-colors"
          >
            {copied === "sql" ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Depois de executar, acesse <code className="text-violet-300">/admin</code> — o sistema validará automaticamente.
        </p>
      </div>
    </div>
  );
}
