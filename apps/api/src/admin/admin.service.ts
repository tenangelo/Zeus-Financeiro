import { Injectable, Inject, NotFoundException, BadRequestException } from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_SUPABASE_CLIENT } from "../supabase/supabase.module";
import type { Database } from "@zeus/database";

@Injectable()
export class AdminService {
  constructor(
    @Inject(ADMIN_SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient<Database>,
  ) {}

  // ─── Dashboard Metrics ────────────────────────────────────────────────
  async getMetrics() {
    const [tenantsRes, profilesRes, subsRes] = await Promise.all([
      this.supabase.from("tenants").select("id, plan_tier, is_active, created_at"),
      this.supabase.from("profiles").select("id, is_active, created_at"),
      (this.supabase as any).from("subscriptions").select("id, status, amount, billing_interval, current_period_end"),
    ]);

    const tenants = tenantsRes.data ?? [];
    const profiles = profilesRes.data ?? [];
    const subs = subsRes.data ?? [];

    const activeSubs = subs.filter((s: any) => s.status === "active");
    const mrr = activeSubs.reduce((sum: number, s: any) => {
      const amt = Number(s.amount) || 0;
      return sum + (s.billing_interval === "yearly" ? amt / 12 : amt);
    }, 0);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      total_tenants: tenants.length,
      active_tenants: tenants.filter(t => t.is_active).length,
      new_tenants_30d: tenants.filter(t => new Date(t.created_at) >= thirtyDaysAgo).length,
      total_users: profiles.length,
      active_users: profiles.filter(p => p.is_active).length,
      mrr: Number(mrr.toFixed(2)),
      arr: Number((mrr * 12).toFixed(2)),
      active_subscriptions: activeSubs.length,
      trialing: subs.filter((s: any) => s.status === "trialing").length,
      past_due: subs.filter((s: any) => s.status === "past_due").length,
      plan_distribution: tenants.reduce<Record<string, number>>((acc, t) => {
        acc[t.plan_tier] = (acc[t.plan_tier] ?? 0) + 1;
        return acc;
      }, {}),
    };
  }

  // ─── Tenants ──────────────────────────────────────────────────────────
  async listTenants(page = 1, limit = 20, search?: string) {
    let query = this.supabase
      .from("tenants")
      .select("*, profiles(id, full_name, role, is_active, last_login_at), subscriptions(status, amount, billing_interval, current_period_end)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { data: data ?? [], total: count ?? 0, page, limit };
  }

  async getTenant(id: string) {
    const { data, error } = await this.supabase
      .from("tenants")
      .select("*, profiles(*), subscriptions(*)")
      .eq("id", id)
      .single();

    if (error || !data) throw new NotFoundException(`Tenant ${id} não encontrado.`);
    return data;
  }

  async updateTenant(id: string, dto: {
    name?: string;
    plan_tier?: string;
    is_active?: boolean;
    settings?: Record<string, unknown>;
  }) {
    const { data, error } = await this.supabase
      .from("tenants")
      .update(dto as any)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException("Falha ao atualizar tenant.");
    return data;
  }

  async deleteTenant(id: string) {
    const { error } = await this.supabase
      .from("tenants")
      .delete()
      .eq("id", id);

    if (error) throw new BadRequestException(`Erro ao deletar: ${error.message}`);
  }

  async toggleTenantActive(id: string, isActive: boolean) {
    const { data, error } = await this.supabase
      .from("tenants")
      .update({ is_active: isActive })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException("Tenant não encontrado.");
    return data;
  }

  // ─── Users ────────────────────────────────────────────────────────────
  async listUsers(page = 1, limit = 20, search?: string) {
    let query = this.supabase
      .from("profiles")
      .select("*, tenants(id, name, plan_tier)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) query = query.ilike("full_name", `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { data: data ?? [], total: count ?? 0, page, limit };
  }

  async toggleUserActive(userId: string, isActive: boolean) {
    const { data, error } = await this.supabase
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", userId)
      .select()
      .single();

    if (error || !data) throw new NotFoundException("Usuário não encontrado.");
    return data;
  }

  async setSuperAdmin(userId: string, isSuperAdmin: boolean) {
    const { data, error } = await this.supabase
      .from("profiles")
      .update({ is_super_admin: isSuperAdmin } as any)
      .eq("id", userId)
      .select()
      .single();

    if (error || !data) throw new NotFoundException("Usuário não encontrado.");
    return data;
  }

  // ─── Subscriptions ────────────────────────────────────────────────────
  async listSubscriptions(page = 1, limit = 20) {
    const { data, error, count } = await (this.supabase as any)
      .from("subscriptions")
      .select("*, tenants(id, name), plans(id, name, tier)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw new Error(error.message);
    return { data: data ?? [], total: count ?? 0, page, limit };
  }

  async assignPlan(tenantId: string, planId: string, billingInterval: "monthly" | "yearly" = "monthly") {
    const { data: plan } = await (this.supabase as any).from("plans").select("price_monthly, price_yearly").eq("id", planId).single();
    if (!plan) throw new NotFoundException("Plano não encontrado.");

    const amount = billingInterval === "yearly" ? plan.price_yearly : plan.price_monthly;

    const { data, error } = await (this.supabase as any)
      .from("subscriptions")
      .upsert({
        tenant_id: tenantId,
        plan_id: planId,
        status: "active",
        billing_interval: billingInterval,
        amount,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + (billingInterval === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "tenant_id" })
      .select()
      .single();

    if (error || !data) throw new BadRequestException(`Erro ao atribuir plano: ${error?.message}`);

    // Sync plan_tier on tenants
    await this.supabase.from("tenants").update({ plan_tier: (await (this.supabase as any).from("plans").select("tier").eq("id", planId).single()).data?.tier } as any).eq("id", tenantId);

    return data;
  }
}
