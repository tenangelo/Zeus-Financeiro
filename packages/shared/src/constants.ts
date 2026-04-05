/** Thresholds padrão de alerta — podem ser sobrescritos via tenant.settings */
export const CMV_ALERT_THRESHOLD_PCT = 5;    // % de divergência para alertar desperdício
export const STOCK_LOW_ALERT_DAYS = 3;       // dias antes de zerar o estoque mínimo
export const SUPPLIER_PRICE_INCREASE_PCT = 10; // % de aumento de preço para alertar
export const AI_CONFIDENCE_MIN = 0.75;        // score mínimo para disparar WhatsApp

export const SUPPORTED_CURRENCIES = ["BRL", "USD", "EUR"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const INGREDIENT_UNITS = ["kg", "g", "l", "ml", "un", "cx", "pct"] as const;
export type IngredientUnit = (typeof INGREDIENT_UNITS)[number];
