import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@zeus/database";

/**
 * Supabase client para uso no lado do cliente (Client Components).
 * Usa a ANON KEY — submetida a RLS em todas as queries.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase não configurado. Copie .env.example para .env e preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createBrowserClient<Database>(url, key);
}
