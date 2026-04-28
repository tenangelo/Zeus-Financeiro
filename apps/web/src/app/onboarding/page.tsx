"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Zap,
  Store,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Shield,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

const FEATURES = [
  { icon: BarChart3, text: "CMV e DRE automáticos" },
  { icon: Shield, text: "Dados criptografados" },
  { icon: Sparkles, text: "Insights com IA" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [checkingTenant, setCheckingTenant] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  useEffect(() => {
    async function checkExistingTenant() {
      try {
        await api.get("/tenants/me");
        // Se a requisição funcionar, usuário já tem tenant
        router.replace("/dashboard");
      } catch (err) {
        if (err instanceof ApiError && err.isTenantError) {
          // Usuário não tem tenant, continua no onboarding
          setCheckingTenant(false);
        } else {
          // Outro erro de API
          setCheckingTenant(false);
        }
      }
    }
    checkExistingTenant();
  }, [router]);

  function handleNameChange(v: string) {
    setName(v);
    setSlug(slugify(v));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/tenants/onboarding", {
        name: name.trim(),
        slug: slug.trim(),
        whatsapp_number: whatsapp.trim() || undefined,
      });
      toast.success("Restaurante criado com sucesso!");
      setStep(2);
    } catch (err) {
      const msg = err instanceof ApiError
        ? err.message
        : "Erro ao criar restaurante. Tente novamente.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (checkingTenant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
          <div className="h-10 w-10 border-4 border-brand-500/30 border-t-brand-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm font-medium animate-pulse">Preparando seu ambiente...</p>
        </div>
      </div>
    );
  }

  // Step 2: Success
  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl shadow-emerald-500/30">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tudo pronto! 🎉</h1>
            <p className="mt-3 text-gray-500">
              <span className="font-semibold text-brand-600">{name}</span> foi configurado com sucesso.
              <br />
              Você tem <span className="font-semibold text-emerald-600">14 dias grátis</span> no plano Pro.
            </p>
          </div>
          <Button
            className="w-full bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 h-12 text-base shadow-lg shadow-brand-600/30 hover:shadow-xl transition-all"
            onClick={() => router.push("/dashboard")}
          >
            Ir para o Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Step 1: Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-xl shadow-brand-600/30">
              <Zap className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Bem-vindo ao Zeus</h1>
          <p className="mt-2 text-gray-500 text-sm">
            Configure seu restaurante em menos de 1 minuto.
          </p>
        </div>

        {/* Feature Pills */}
        <div className="flex justify-center gap-3 flex-wrap">
          {FEATURES.map((f) => (
            <div
              key={f.text}
              className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-full px-3 py-1.5 text-xs text-gray-600 shadow-sm"
            >
              <f.icon className="h-3 w-3 text-brand-500" />
              {f.text}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50">
              <Store className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Dados do Restaurante</p>
              <p className="text-xs text-gray-400">Você pode alterar depois.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="ob-name">Nome do Restaurante *</Label>
              <Input
                id="ob-name"
                placeholder="Ex: Cantina do João"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                minLength={2}
                maxLength={150}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ob-slug">
                Identificador único{" "}
                <span className="text-xs text-gray-400">(gerado automaticamente)</span>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 shrink-0">zeus.app/</span>
                <Input
                  id="ob-slug"
                  placeholder="cantina-do-joao"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  required
                  minLength={3}
                  maxLength={80}
                  className="font-mono text-sm h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ob-whatsapp">
                WhatsApp{" "}
                <span className="text-xs text-gray-400">(opcional — para notificações)</span>
              </Label>
              <Input
                id="ob-whatsapp"
                type="tel"
                placeholder="+5511999887766"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="h-11"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <span className="shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 h-12 text-base shadow-lg shadow-brand-600/30 hover:shadow-xl transition-all"
              disabled={loading || !name.trim() || !slug.trim()}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Criando...
                </span>
              ) : (
                <>
                  Criar Restaurante
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400">
          🎁 14 dias grátis no plano Pro. Sem cartão de crédito.
        </p>
      </div>
    </div>
  );
}
