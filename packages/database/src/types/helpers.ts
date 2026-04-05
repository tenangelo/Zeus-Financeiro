import type { Database } from "./supabase";

/**
 * Helpers de tipagem para tornar as queries Supabase mais ergonômicas.
 *
 * Uso:
 *   const ingredient: TableRow<"ingredients"> = ...
 *   const newIngredient: TableInsert<"ingredients"> = ...
 */

type Tables = Database["public"]["Tables"];

/** Tipo de uma linha retornada pela tabela */
export type TableRow<T extends keyof Tables> = Tables[T]["Row"];

/** Tipo para INSERT em uma tabela */
export type TableInsert<T extends keyof Tables> = Tables[T]["Insert"];

/** Tipo para UPDATE em uma tabela */
export type TableUpdate<T extends keyof Tables> = Tables[T]["Update"];

// Aliases convenientes para as tabelas mais usadas
export type Tenant         = TableRow<"tenants">;
export type Profile        = TableRow<"profiles">;
export type Ingredient     = TableRow<"ingredients">;
export type Supplier       = TableRow<"suppliers">;
export type Recipe         = TableRow<"recipes">;
export type RecipeItem     = TableRow<"recipe_items">;
export type StockMovement  = TableRow<"stock_movements">;
export type Transaction    = TableRow<"transactions">;
export type CmvSnapshot    = TableRow<"cmv_snapshots">;
export type AiAnalysisLog  = TableRow<"ai_analysis_logs">;
export type ImportJob      = TableRow<"import_jobs">;
