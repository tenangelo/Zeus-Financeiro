/**
 * Validadores Zod compartilhados entre frontend e backend.
 * Garantem que as regras de validação sejam idênticas nos dois lados.
 */

// Nota: importar zod separadamente em cada app para evitar bundle duplicado.
// Este arquivo exporta apenas as funções de validação puras.

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]{2,60}$/.test(slug);
}

export function isValidPhone(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

export function isValidCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  const calc = (d: string, weights: number[]) =>
    weights.reduce((acc, w, i) => acc + parseInt(d[i]!, 10) * w, 0);
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const r1 = calc(digits, w1) % 11;
  const r2 = calc(digits, w2) % 11;
  return (
    parseInt(digits[12]!, 10) === (r1 < 2 ? 0 : 11 - r1) &&
    parseInt(digits[13]!, 10) === (r2 < 2 ? 0 : 11 - r2)
  );
}

export function formatCurrency(
  value: number,
  currency = "BRL",
  locale = "pt-BR"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}
