/**
 * Espelha os ENUMs definidos no schema.sql.
 * Manter em sincronia com a Seção 1 do schema.
 */

export type PlanTier = "trial" | "starter" | "pro" | "enterprise";

export type UserRole = "owner" | "manager" | "staff";

export type TransactionType = "revenue" | "expense";

export type TransactionStatus = "pending" | "confirmed" | "cancelled" | "reconciled";

export type MovementType =
  | "purchase"
  | "consumption"
  | "waste"
  | "adjustment"
  | "return";

export type AnalysisType =
  | "cost_alert"
  | "waste_detection"
  | "supplier_comparison"
  | "margin_drop"
  | "cash_flow_risk"
  | "monthly_summary";

export type ImportStatus = "queued" | "processing" | "completed" | "failed";

export type ImportSource = "csv" | "excel" | "xml" | "api_webhook" | "manual";
