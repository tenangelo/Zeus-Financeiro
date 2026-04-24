import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { Decimal } from "decimal.js";
import { USER_SUPABASE_CLIENT } from "../supabase/supabase.module";
import type { Database } from "@zeus/database";
import { CreateRecipeDto, RecipeItemDto } from "./dto/create-recipe.dto";
import { UpdateRecipeDto } from "./dto/update-recipe.dto";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

type Recipe = Database["public"]["Tables"]["recipes"]["Row"];
type RecipeItem = Database["public"]["Tables"]["recipe_items"]["Row"];
type Ingredient = Database["public"]["Tables"]["ingredients"]["Row"];

export interface RecipeWithItems extends Recipe {
  items: Array<RecipeItem & { ingredient: Pick<Ingredient, "id" | "name" | "unit"> }>;
}

export interface RecipeCostPreview {
  recipe_name: string;
  sale_price: number;
  theoretical_cost: string;
  theoretical_margin_pct: string;
  items: Array<{
    ingredient_name: string;
    quantity: number;
    unit: string;
    unit_cost: number;
    waste_factor_pct: number;
    line_cost: string;
  }>;
}

@Injectable()
export class RecipesService {
  constructor(
    @Inject(USER_SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient<Database>
  ) {}

  async create(tenantId: string, dto: CreateRecipeDto): Promise<RecipeWithItems> {
    // 1. Busca ingredientes referenciados para snapshots de custo
    const ingredientIds = dto.items.map((i) => i.ingredient_id);
    const ingredients = await this.fetchIngredients(tenantId, ingredientIds);

    // 2. Calcula custo teórico total
    const theoreticalCost = this.calcTheoreticalCost(dto.items, ingredients);

    // 3. Cria a receita
    const { data: recipe, error: recipeError } = await this.supabase
      .from("recipes")
      .insert({
        tenant_id: tenantId,
        name: dto.name,
        category: dto.category ?? null,
        description: dto.description ?? null,
        sale_price: dto.sale_price,
        theoretical_cost: parseFloat(theoreticalCost.toFixed(4)),
        serving_size: dto.serving_size ?? null,
        preparation_time_min: dto.preparation_time_min ?? null,
      })
      .select()
      .single();

    if (recipeError) {
      if (recipeError.code === "23505") {
        throw new ConflictException(`Receita "${dto.name}" já existe neste tenant.`);
      }
      throw new Error(`Erro ao criar receita: ${recipeError.message}`);
    }

    // 4. Cria os itens da ficha técnica
    await this.upsertRecipeItems(tenantId, recipe.id, dto.items, ingredients);

    return this.findOne(tenantId, recipe.id);
  }

  async findAll(tenantId: string, category?: string): Promise<Recipe[]> {
    let q = this.supabase
      .from("recipes")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name");

    if (category) {
      q = q.eq("category", category);
    }

    const { data, error } = await q;
    if (error) throw new Error(`Erro ao buscar receitas: ${error.message}`);
    return data ?? [];
  }

  async findOne(tenantId: string, id: string): Promise<RecipeWithItems> {
    const { data: recipe, error } = await this.supabase
      .from("recipes")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .single();

    if (error || !recipe) {
      throw new NotFoundException(`Receita ${id} não encontrada.`);
    }

    // Busca itens com dados do ingrediente
    const { data: items, error: itemsError } = await this.supabase
      .from("recipe_items")
      .select(`
        *,
        ingredient:ingredients!inner(id, name, unit)
      `)
      .eq("recipe_id", id)
      .eq("tenant_id", tenantId);

    if (itemsError) throw new Error(`Erro ao buscar itens: ${itemsError.message}`);

    return {
      ...recipe,
      items: (items ?? []) as unknown as Array<RecipeItem & { ingredient: Pick<Ingredient, "id" | "name" | "unit"> }>,
    };
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateRecipeDto
  ): Promise<RecipeWithItems> {
    await this.findOne(tenantId, id);

    let ingredients: Ingredient[] = [];

    if (dto.items && dto.items.length > 0) {
      const ingredientIds = dto.items.map((i) => i.ingredient_id);
      ingredients = await this.fetchIngredients(tenantId, ingredientIds);
    }

    const patch: Database["public"]["Tables"]["recipes"]["Update"] = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.category !== undefined) patch.category = dto.category;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.sale_price !== undefined) patch.sale_price = dto.sale_price;
    if (dto.serving_size !== undefined) patch.serving_size = dto.serving_size;
    if (dto.preparation_time_min !== undefined) patch.preparation_time_min = dto.preparation_time_min;
    if (dto.is_active !== undefined) patch.is_active = dto.is_active;

    const { error } = await this.supabase
      .from("recipes")
      .update(patch)
      .eq("tenant_id", tenantId)
      .eq("id", id);

    if (error) throw new Error(`Erro ao atualizar receita: ${error.message}`);

    // Substitui itens se enviados
    if (dto.items && dto.items.length > 0) {
      await this.supabase
        .from("recipe_items")
        .delete()
        .eq("recipe_id", id)
        .eq("tenant_id", tenantId);

      await this.upsertRecipeItems(tenantId, id, dto.items, ingredients);
    }

    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.supabase
      .from("recipes")
      .update({ is_active: false })
      .eq("tenant_id", tenantId)
      .eq("id", id);
  }

  /**
   * Simula o custo e margem de uma receita ANTES de criá-la.
   * Permite que o usuário ajuste preços antes de salvar.
   */
  async previewCost(
    tenantId: string,
    dto: CreateRecipeDto
  ): Promise<RecipeCostPreview> {
    const ingredientIds = dto.items.map((i) => i.ingredient_id);
    const ingredients = await this.fetchIngredients(tenantId, ingredientIds);

    const itemsPreview = dto.items.map((item) => {
      const ingredient = ingredients.find((i) => i.id === item.ingredient_id);
      if (!ingredient) throw new BadRequestException(`Ingrediente ${item.ingredient_id} não encontrado.`);

      const wasteFactor = item.waste_factor_pct ?? 0;
      const lineCost = new Decimal(item.quantity)
        .mul(new Decimal(ingredient.unit_cost))
        .mul(new Decimal(1).plus(new Decimal(wasteFactor).div(100)));

      return {
        ingredient_name: ingredient.name,
        quantity: item.quantity,
        unit: ingredient.unit,
        unit_cost: ingredient.unit_cost,
        waste_factor_pct: wasteFactor,
        line_cost: lineCost.toFixed(4),
      };
    });

    const totalCost = itemsPreview.reduce(
      (acc, i) => acc.plus(new Decimal(i.line_cost)),
      new Decimal(0)
    );

    const marginPct = dto.sale_price > 0
      ? new Decimal(dto.sale_price).minus(totalCost).div(dto.sale_price).mul(100)
      : new Decimal(0);

    return {
      recipe_name: dto.name,
      sale_price: dto.sale_price,
      theoretical_cost: totalCost.toFixed(4),
      theoretical_margin_pct: marginPct.toFixed(2),
      items: itemsPreview,
    };
  }

  // ---------------------------------------------------------------------------
  // PRIVADOS
  // ---------------------------------------------------------------------------

  private async fetchIngredients(
    tenantId: string,
    ids: string[]
  ): Promise<Ingredient[]> {
    if (ids.length === 0) return [];

    const { data, error } = await this.supabase
      .from("ingredients")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("id", ids)
      .eq("is_active", true);

    if (error) throw new Error(`Erro ao buscar ingredientes: ${error.message}`);

    const found = data ?? [];
    const missing = ids.filter((id) => !found.some((i) => i.id === id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Ingredientes não encontrados ou inativos: ${missing.join(", ")}`
      );
    }

    return found;
  }

  private calcTheoreticalCost(
    items: RecipeItemDto[],
    ingredients: Ingredient[]
  ): Decimal {
    return items.reduce((acc, item) => {
      const ingredient = ingredients.find((i) => i.id === item.ingredient_id)!;
      const wasteFactor = item.waste_factor_pct ?? 0;
      const lineCost = new Decimal(item.quantity)
        .mul(new Decimal(ingredient.unit_cost))
        .mul(new Decimal(1).plus(new Decimal(wasteFactor).div(100)));
      return acc.plus(lineCost);
    }, new Decimal(0));
  }

  private async upsertRecipeItems(
    tenantId: string,
    recipeId: string,
    items: RecipeItemDto[],
    ingredients: Ingredient[]
  ): Promise<void> {
    const rows = items.map((item) => {
      const ingredient = ingredients.find((i) => i.id === item.ingredient_id)!;
      return {
        tenant_id: tenantId,
        recipe_id: recipeId,
        ingredient_id: item.ingredient_id,
        quantity: item.quantity,
        unit_cost_snapshot: ingredient.unit_cost,
        waste_factor_pct: item.waste_factor_pct ?? 0,
        notes: item.notes ?? null,
      };
    });

    const { error } = await this.supabase.from("recipe_items").insert(rows);
    if (error) throw new Error(`Erro ao salvar itens da receita: ${error.message}`);
  }
}
