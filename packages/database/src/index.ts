/**
 * @zeus/database
 *
 * Ponto de entrada do pacote de tipos do banco de dados.
 * Os tipos em supabase.ts são gerados automaticamente via:
 *   pnpm db:generate-types
 *
 * Após conectar o Supabase CLI ao projeto, rodar o comando acima
 * para substituir os placeholders abaixo pelos tipos reais.
 */

export type { Database } from "./types/supabase";
export * from "./types/enums";
export * from "./types/helpers";
