"use client";

import { useEffect, useState } from "react";
import {
  Store, Phone, Settings2, Bell, Globe, Shield, Save, CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

interface TenantSettings {
  cmv_alert_threshold_pct: number;
  waste_alert_threshold_pct: number;
  notification_hour: string;
  timezone: string;
  currency: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  whatsapp_number: string | null;
  plan_tier: "trial" | "starter" | "pro" | "enterprise";
  is_active: boolean;
  settings: TenantSettings;
  trial_ends_at: string | null;
  created_at: string;
}

const PLAN_LABELS: Record<Tenant["plan_tier"], string> = {
  trial: "Trial (14 dias)",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

const PLAN_COLORS: Record<Tenant["plan_tier"], string> = {
  trial: "bg-yellow-100 text-yellow-800",
  starter: "bg-blue-100 text-blue-800",
  pro: "bg-brand-100 text-brand-700",
  enterprise: "bg-purple-100 text-purple-800",
};

export default function SettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Campos editáveis
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cmvAlert, setCmvAlert] = useState("35");
  const [wasteAlert, setWasteAlert] = useState("5");
  const [notifHour, setNotifHour] = useState("09:00");

  useEffect(() => {
    api.get<Tenant>("/tenants/me").then(data => {
      setTenant(data);
      setName(data.name);
      setWhatsapp(data.whatsapp_number ?? "");
      const s = data.settings;
      setCmvAlert(String(s.cmv_alert_threshold_pct ?? 35));
      setWasteAlert(String(s.waste_alert_threshold_pct ?? 5));
      setNotifHour(s.notification_hour ?? "09:00");
    }).catch(err => {
      setError(err.message);
    }).finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const updated = await api.patch<Tenant>("/tenants/me", {
        name: name.trim(),
        whatsapp_number: whatsapp.trim() || null,
        settings: {
          ...(tenant?.settings ?? {}),
          cmv_alert_threshold_pct: Number(cmvAlert),
          waste_alert_threshold_pct: Number(wasteAlert),
          notification_hour: notifHour,
        },
      });
      setTenant(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie os dados e alertas do seu restaurante.</p>
      </div>

      {/* Plano atual */}
      {tenant && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <Shield className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Plano Atual</p>
              <p className="text-xs text-gray-400">
                {tenant.trial_ends_at
                  ? `Trial expira em ${new Date(tenant.trial_ends_at).toLocaleDateString("pt-BR")}`
                  : "Assinatura ativa"}
              </p>
            </div>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${PLAN_COLORS[tenant.plan_tier]}`}>
            {PLAN_LABELS[tenant.plan_tier]}
          </span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Dados do Restaurante */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <Store className="h-5 w-5 text-brand-600" />
            <h2 className="font-semibold text-gray-900">Dados do Restaurante</h2>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              minLength={2}
              maxLength={150}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">Identificador (slug)</Label>
            <Input
              id="slug"
              value={tenant?.slug ?? ""}
              disabled
              className="bg-gray-50 font-mono text-sm text-gray-400"
            />
            <p className="text-xs text-gray-400">O slug não pode ser alterado após a criação.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="whatsapp">
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                WhatsApp para Notificações
              </div>
            </Label>
            <Input
              id="whatsapp"
              type="tel"
              placeholder="+5511999887766"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
            />
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="h-5 w-5 text-brand-600" />
            <h2 className="font-semibold text-gray-900">Limites de Alerta</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cmvAlert">CMV máximo (%)</Label>
              <Input
                id="cmvAlert"
                type="number"
                min={1}
                max={100}
                step={0.5}
                value={cmvAlert}
                onChange={e => setCmvAlert(e.target.value)}
              />
              <p className="text-xs text-gray-400">Alertar quando CMV real ultrapassar este %</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wasteAlert">Desperdício máximo (%)</Label>
              <Input
                id="wasteAlert"
                type="number"
                min={0}
                max={50}
                step={0.5}
                value={wasteAlert}
                onChange={e => setWasteAlert(e.target.value)}
              />
              <p className="text-xs text-gray-400">Divergência estoque teórico vs real</p>
            </div>
          </div>
        </div>

        {/* Preferências */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <Settings2 className="h-5 w-5 text-brand-600" />
            <h2 className="font-semibold text-gray-900">Preferências</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="notifHour">Horário de Relatório</Label>
              <Input
                id="notifHour"
                type="time"
                value={notifHour}
                onChange={e => setNotifHour(e.target.value)}
              />
              <p className="text-xs text-gray-400">Envio diário do resumo via WhatsApp</p>
            </div>

            <div className="space-y-1.5">
              <Label>Fuso Horário</Label>
              <div className="flex items-center gap-2 h-10 px-3 border border-input rounded-md bg-gray-50">
                <Globe className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-sm text-gray-500">America/Sao_Paulo</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 justify-end">
          {saved && (
            <div className="flex items-center gap-1.5 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              Salvo com sucesso!
            </div>
          )}
          <Button
            type="submit"
            className="bg-brand-600 hover:bg-brand-700"
            disabled={saving}
          >
            {saving ? (
              "Salvando..."
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
