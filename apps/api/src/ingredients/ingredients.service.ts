import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { USER_SUPABASE_CLIENT } from "../supabase/supabase.module";
import type { Database } from "@zeus/database";
import { CreateIngredientDto } from "./dto/create-ingredient.dto";
import { UpdateIngredientDto } from "./dto/update-ingredient.dto";
import { QueryIngredientDto } from "./dto/query-ingredient.dto";

type Ingredient = Database["public"]["Tables"]["ingredients"]["Row"];

@Injectable()
export class IngredientsService {
  constructor(
    @Inject(USER_SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient<Database>
  ) {}

  async create(tenantId: string, dto: CreateIngredientDto): Promise<Ingredient> {
    const { data, error } = await this.supabase
      .from("ingredients")
      .insert({
        tenant_id: tenantId,
        name: dto.name,
        category: dto.category ?? null,
        unit: dto.unit,
        unit_cost: dto.unit_cost ?? 0,
        stock_quantity: dto.stock_quantity ?? 0,
        min_stock_alert: dto.min_stock_alert ?? 0,
        expiry_date: dto.expiry_date ?? null,
        preferred_supplier_id: dto.preferred_supplier_id ?? null,
      })
      .select()
      .single();

    if (error) {
      // Código 23505 = violação de unique constraint (nome duplicado no tenant)
      if (error.code === "23505") {
        throw new ConflictException(
          `Ingrediente com nome "${dto.name}" já existe neste tenant.`
        );
      }
      throw new Error(`Erro ao criar ingrediente: ${error.message}`);
    }

    return data;
  }

  async findAll(
    tenantId: string,
    query: QueryIngredientDto
  ): Promise<{ data: Ingredient[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = this.supabase
      .from("ingredients")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .range(from, to)
      .order("name", { ascending: true });

    if (query.is_active !== undefined) {
      q = q.eq("is_active", query.is_active);
    }

    if (query.category) {
      q = q.eq("category", query.category);
    }

    if (query.search) {
      // Busca case-insensitive por nome usando operador ilike do PostgreSQL
      q = q.ilike("name", `%${query.search}%`);
    }

    if (query.low_stock) {
      // Filtra ingredientes onde stock_quantity <= min_stock_alert
      q = q.lte("stock_quantity", this.supabase.rpc as never);
      // Usando filter direto pois Supabase JS não suporta comparação entre colunas diretamente
      // Workaround: usar filter com expressão raw
      q = (q as any).filter("stock_quantity", "lte", "min_stock_alert");
    }

    const { data, error, count } = await q;

    if (error) throw new Error(`Erro ao buscar ingredientes: ${error.message}`);

    return {
      data: data ?? [],
      total: count ?? 0,
      page,
      limit,
    };
  }

  async findOne(tenantId: string, id: string): Promise<Ingredient> {
    const { data, error } = await this.supabase
      .from("ingredients")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Ingrediente ${id} não encontrado.`);
    }

    return data;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateIngredientDto
  ): Promise<Ingredient> {
    // Verifica existência antes de atualizar
    await this.findOne(tenantId, id);

    const patch: Database["public"]["Tables"]["ingredients"]["Update"] = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.category !== undefined) patch.category = dto.category;
    if (dto.unit !== undefined) patch.unit = dto.unit;
    if (dto.unit_cost !== undefined) patch.unit_cost = dto.unit_cost;
    if (dto.stock_quantity !== undefined) patch.stock_quantity = dto.stock_quantity;
    if (dto.min_stock_alert !== undefined) patch.min_stock_alert = dto.min_stock_alert;
    if (dto.expiry_date !== undefined) patch.expiry_date = dto.expiry_date;
    if (dto.preferred_supplier_id !== undefined) patch.preferred_supplier_id = dto.preferred_supplier_id;
    if (dto.is_active !== undefined) patch.is_active = dto.is_active;

    const { data, error } = await this.supabase
      .from("ingredients")
      .update(patch)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar ingrediente: ${error.message}`);

    return data;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);

    const { error } = await this.supabase
      .from("ingredients")
      .update({ is_active: false })
      .eq("tenant_id", tenantId)
      .eq("id", id);

    if (error) throw new Error(`Erro ao remover ingrediente: ${error.message}`);
  }

  /**
   * Retorna as categorias únicas de ingredientes do tenant.
   * Usado para popular selects no frontend.
   */
  async getCategories(tenantId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("ingredients")
      .select("category")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .not("category", "is", null)
      .order("category");

    if (error) return [];

    const categories = [...new Set((data ?? []).map((r) => r.category as string))];
    return categories.filter(Boolean);
  }

  /**
   * Retorna ingredientes com estoque abaixo do mínimo.
   * Chamado pelo agente de IA para gerar alertas.
   */
  async getLowStockAlerts(
    tenantId: string
  ): Promise<Array<Ingredient & { deficit: number }>> {
    const { data, error } = await this.supabase
      .from("ingredients")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (error || !data) return [];

    return data
      .filter((i) => i.stock_quantity <= i.min_stock_alert && i.min_stock_alert > 0)
      .map((i) => ({ ...i, deficit: i.min_stock_alert - i.stock_quantity }))
      .sort((a, b) => b.deficit - a.deficit);
  }
}
