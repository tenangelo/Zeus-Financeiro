import {
  Injectable,
  Inject,
  BadRequestException,
} from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "../supabase/supabase.module";
import type { Database } from "@zeus/database";
import { CreateMovementDto } from "./dto/create-movement.dto";
import { IngredientsService } from "../ingredients/ingredients.service";

type StockMovement = Database["public"]["Tables"]["stock_movements"]["Row"];

@Injectable()
export class StockService {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient<Database>,
    private readonly ingredientsService: IngredientsService
  ) {}

  /**
   * Registra uma movimentação de estoque.
   *
   * Regras de negócio:
   * - purchase/return: requer unit_cost
   * - consumption/waste/adjustment: usa unit_cost atual do ingrediente se não informado
   * - O trigger update_ingredient_stock() no banco atualiza stock_quantity automaticamente
   */
  async createMovement(
    tenantId: string,
    userId: string,
    dto: CreateMovementDto
  ): Promise<StockMovement> {
    const ingredient = await this.ingredientsService.findOne(tenantId, dto.ingredient_id);

    // Validação de negócio: compras precisam de custo
    if (
      (dto.movement_type === "purchase" || dto.movement_type === "return") &&
      dto.unit_cost === undefined
    ) {
      throw new BadRequestException(
        "unit_cost é obrigatório para movimentações do tipo purchase/return."
      );
    }

    const unitCost = dto.unit_cost ?? ingredient.unit_cost;

    const { data, error } = await this.supabase
      .from("stock_movements")
      .insert({
        tenant_id: tenantId,
        ingredient_id: dto.ingredient_id,
        movement_type: dto.movement_type,
        quantity: dto.quantity,
        unit_cost: unitCost,
        supplier_id: dto.supplier_id ?? null,
        reference_id: dto.reference_id ?? null,
        reference_type: dto.reference_type ?? "manual",
        notes: dto.notes ?? null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao registrar movimentação: ${error.message}`);

    return data;
  }

  /**
   * Registra baixa de estoque para uma venda (baseado na ficha técnica).
   * Chamado quando uma receita é vendida — desconta os ingredientes proporcionalmente.
   */
  async consumeFromSale(
    tenantId: string,
    userId: string,
    recipeId: string,
    quantity: number,
    saleReferenceId: string
  ): Promise<void> {
    // Busca itens da ficha técnica com custo atual do ingrediente
    const { data: items, error } = await this.supabase
      .from("recipe_items")
      .select(`
        ingredient_id,
        quantity,
        unit_cost_snapshot,
        waste_factor_pct,
        ingredients!inner(unit_cost)
      `)
      .eq("recipe_id", recipeId)
      .eq("tenant_id", tenantId);

    if (error || !items?.length) {
      throw new BadRequestException(`Ficha técnica da receita ${recipeId} não encontrada.`);
    }

    // Cria uma movimentação de consumo para cada ingrediente da ficha
    const movements = items.map((item) => {
      const wasteMultiplier = 1 + (item.waste_factor_pct / 100);
      const totalQty = item.quantity * quantity * wasteMultiplier;
      const ingredient = item.ingredients as unknown as { unit_cost: number };

      return {
        tenant_id: tenantId,
        ingredient_id: item.ingredient_id,
        movement_type: "consumption" as const,
        quantity: parseFloat(totalQty.toFixed(4)),
        unit_cost: ingredient.unit_cost,
        reference_id: saleReferenceId,
        reference_type: "sale_theoretical",
        created_by: userId,
      };
    });

    const { error: insertError } = await this.supabase
      .from("stock_movements")
      .insert(movements);

    if (insertError) {
      throw new Error(`Erro ao registrar baixa de estoque: ${insertError.message}`);
    }
  }

  async listMovements(
    tenantId: string,
    ingredientId?: string,
    limit = 100
  ): Promise<StockMovement[]> {
    let q = this.supabase
      .from("stock_movements")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (ingredientId) {
      q = q.eq("ingredient_id", ingredientId);
    }

    const { data, error } = await q;
    if (error) throw new Error(`Erro ao buscar movimentações: ${error.message}`);
    return data ?? [];
  }
}
