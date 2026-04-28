import { Injectable, Inject, NotFoundException, ConflictException } from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_SUPABASE_CLIENT } from "../supabase/supabase.module";
import type { Database } from "@zeus/database";

export interface CreatePlanDto {
  name: string;
  slug: string;
  tier: "trial" | "starter" | "pro" | "enterprise";
  description?: string;
  price_monthly: number;
  price_yearly: number;
  features?: string[];
  limits?: Record<string, unknown>;
  is_highlighted?: boolean;
  sort_order?: number;
}

export interface UpdatePlanDto extends Partial<CreatePlanDto> {
  is_active?: boolean;
  stripe_product_id?: string;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
}

@Injectable()
export class PlansService {
  constructor(
    @Inject(ADMIN_SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient<Database>,
  ) {}

  async findAll(includeInactive = false) {
    let query = (this.supabase as any)
      .from("plans")
      .select("*")
      .order("sort_order");

    if (!includeInactive) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findOne(id: string) {
    const { data, error } = await (this.supabase as any)
      .from("plans")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) throw new NotFoundException(`Plano ${id} não encontrado.`);
    return data;
  }

  async create(dto: CreatePlanDto) {
    const { data: existing } = await (this.supabase as any).from("plans").select("id").eq("slug", dto.slug).single();
    if (existing) throw new ConflictException(`Slug "${dto.slug}" já existe.`);

    const { data, error } = await (this.supabase as any)
      .from("plans")
      .insert({
        name: dto.name,
        slug: dto.slug,
        tier: dto.tier,
        description: dto.description ?? null,
        price_monthly: dto.price_monthly,
        price_yearly: dto.price_yearly,
        features: (dto.features ?? []) as any,
        limits: (dto.limits ?? {}) as any,
        is_highlighted: dto.is_highlighted ?? false,
        sort_order: dto.sort_order ?? 0,
      })
      .select()
      .single();

    if (error || !data) throw new Error(`Erro ao criar plano: ${error?.message}`);
    return data;
  }

  async update(id: string, dto: UpdatePlanDto) {
    const { data, error } = await (this.supabase as any)
      .from("plans")
      .update(dto as any)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException("Plano não encontrado.");
    return data;
  }

  async remove(id: string) {
    const { count } = await (this.supabase as any)
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", id)
      .eq("status", "active");

    if ((count ?? 0) > 0) {
      throw new ConflictException("Não é possível excluir um plano com assinaturas ativas.");
    }

    const { error } = await (this.supabase as any).from("plans").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
}
