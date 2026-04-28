import { Injectable, Inject, NotFoundException, ForbiddenException } from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { USER_SUPABASE_CLIENT, ADMIN_SUPABASE_CLIENT } from "../supabase/supabase.module";
import type { Database } from "@zeus/database";
import { UpdateTenantDto } from "./dto/update-tenant.dto";

type Tenant = Database["public"]["Tables"]["tenants"]["Row"];
type TenantUpdate = Database["public"]["Tables"]["tenants"]["Update"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

@Injectable()
export class TenantsService {
  constructor(
    @Inject(USER_SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient<Database>,
    @Inject(ADMIN_SUPABASE_CLIENT)
    private readonly adminSupabase: SupabaseClient<Database>,
  ) {}

  async findOne(tenantId: string): Promise<Tenant> {
    const { data, error } = await this.supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    if (error || !data) throw new NotFoundException("Tenant não encontrado.");
    return data;
  }

  async update(tenantId: string, userId: string, dto: UpdateTenantDto): Promise<Tenant> {
    const { data: profile, error: profileErr } = await this.adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .eq("tenant_id", tenantId)
      .single();

    if (profileErr || !profile) throw new NotFoundException("Profile não encontrado.");
    if (!["owner", "manager"].includes(profile.role)) {
      throw new ForbiddenException("Apenas owner ou manager podem editar o tenant.");
    }

    const payload: TenantUpdate = {};
    if (dto.name !== undefined) payload.name = dto.name;
    if (dto.whatsapp_number !== undefined) payload.whatsapp_number = dto.whatsapp_number;
    if (dto.settings !== undefined) payload.settings = dto.settings as TenantUpdate["settings"];

    const { data, error } = await this.supabase
      .from("tenants")
      .update(payload)
      .eq("id", tenantId)
      .select()
      .single();

    if (error || !data) throw new NotFoundException("Falha ao atualizar o tenant.");
    return data;
  }

  async getTeamMembers(tenantId: string): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("created_at");

    if (error) throw new Error(`Erro ao buscar equipe: ${error.message}`);
    return data ?? [];
  }

  async createWithOwner(
    userId: string,
    name: string,
    slug: string,
    whatsappNumber?: string,
  ): Promise<{ tenant: Tenant; profile: Profile }> {
    const { data: existing } = await this.adminSupabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .single();

    if (existing) throw new ForbiddenException("Usuário já possui um tenant vinculado.");

    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { data: tenant, error: tenantErr } = await this.adminSupabase
      .from("tenants")
      .insert({
        name,
        slug,
        whatsapp_number: whatsappNumber ?? null,
        plan_tier: "trial",
        is_active: true,
        settings: {
          cmv_alert_threshold_pct: 35,
          waste_alert_threshold_pct: 5,
          notification_hour: "09:00",
          timezone: "America/Sao_Paulo",
          currency: "BRL",
        },
        trial_ends_at: trialEnd,
      })
      .select()
      .single();

    if (tenantErr || !tenant) throw new Error(`Erro ao criar tenant: ${tenantErr?.message}`);

    const { data: profile, error: profileErr } = await this.adminSupabase
      .from("profiles")
      .insert({
        id: userId,
        tenant_id: tenant.id,
        full_name: name,
        role: "owner",
        is_active: true,
      })
      .select()
      .single();

    if (profileErr || !profile) {
      await this.adminSupabase.from("tenants").delete().eq("id", tenant.id);
      throw new Error(`Erro ao criar profile: ${profileErr?.message}`);
    }

    // Assign Trial Plan if exists
    const { data: plan } = await this.adminSupabase
      .from("plans")
      .select("id")
      .ilike("name", "%Trial%")
      .single();

    if (plan) {
      await this.adminSupabase.from("subscriptions").insert({
        tenant_id: tenant.id,
        plan_id: plan.id,
        status: "trialing",
        current_period_start: now,
        current_period_end: trialEnd,
        trial_start: now,
        trial_end: trialEnd,
      });
    }

    return { tenant, profile };
  }
}
