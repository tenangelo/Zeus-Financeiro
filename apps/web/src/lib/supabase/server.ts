import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@zeus/database";

/**
 * Supabase client para uso no servidor (Server Components, Route Handlers, Server Actions).
 * Lê e grava cookies de sessão automaticamente via next/headers.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase não configurado. Copie .env.example para .env e preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component não pode setar cookies — ignorar.
            // O middleware é responsável por renovar a sessão nesses casos.
          }
        },
      },
    }
  );
}
