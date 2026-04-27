"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Store, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

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
      setStep(2);
    } catch (err: any) {
      setError(err.message ?? "Erro ao criar restaurante.");
    } finally {
      setLoading(false);
    }
  }

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tudo pronto!</h1>
            <p className="mt-2 text-gray-500">
              <span className="font-medium text-brand-600">{name}</span> foi configurado com sucesso.
              Agora você tem 14 dias de trial gratuito no plano Pro.
            </p>
          </div>
          <Button
            className="w-full bg-brand-600 hover:bg-brand-700 h-11"
            onClick={() => router.push("/dashboard")}
          >
            Ir para o Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600">
              <Zap className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bem-vindo ao Zeus Financeiro</h1>
          <p className="mt-2 text-gray-500 text-sm">
            Vamos configurar o seu restaurante. Leva menos de 1 minuto.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <Store className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Dados do Restaurante</p>
              <p className="text-xs text-gray-400">Você pode alterar depois nas configurações.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome do Restaurante *</Label>
              <Input
                id="name"
                placeholder="Ex: Cantina do João"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                required
                minLength={2}
                maxLength={150}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug">
                Identificador único{" "}
                <span className="text-xs text-gray-400">(gerado automaticamente)</span>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 shrink-0">zeus.app/</span>
                <Input
                  id="slug"
                  placeholder="cantina-do-joao"
                  value={slug}
                  onChange={e => setSlug(slugify(e.target.value))}
                  required
                  minLength={3}
                  maxLength={80}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="whatsapp">
                WhatsApp{" "}
                <span className="text-xs text-gray-400">(opcional — para notificações)</span>
              </Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="+5511999887766"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-brand-600 hover:bg-brand-700 h-11"
              disabled={loading || !name.trim() || !slug.trim()}
            >
              {loading ? "Criando..." : "Criar Restaurante"}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400">
          14 dias grátis no plano Pro. Sem cartão de crédito.
        </p>
      </div>
    </div>
  );
}
