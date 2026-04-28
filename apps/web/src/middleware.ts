import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware de autenticação.
 * Renova o token de sessão em todas as requisições para manter o usuário logado.
 * Redireciona para /login se a rota protegida for acessada sem sessão.
 *
 * Se as variáveis NEXT_PUBLIC_SUPABASE_URL / ANON_KEY não estiverem configuradas
 * (ex: primeiro boot antes de criar o .env), o middleware deixa passar sem autenticar.
 */

const PROTECTED_ROUTES = ["/dashboard", "/ingredients", "/recipes", "/transactions", "/reports", "/admin", "/onboarding"];
const AUTH_ROUTES = ["/login", "/signup"];
const ADMIN_AUTH_ROUTES = ["/admin/login"];

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sem credenciais configuradas: deixa passar (ambiente de setup inicial)
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: any) {
          cookiesToSet.forEach(({ name, value }: any) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }: any) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Renova a sessão (não usar getUser() em lógica protegida — pode ser spoofado)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  // Authenticated user hitting /admin/login → send directly to admin panel
  const isAdminAuthRoute = ADMIN_AUTH_ROUTES.some(r => pathname.startsWith(r));
  if (isAdminAuthRoute && user) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Unauthenticated user trying a protected route (admin/login is public — skip it)
  if (isProtected && !user && !isAdminAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    // Admin routes get a dedicated login page; everything else uses /login
    redirectUrl.pathname = pathname.startsWith("/admin") ? "/admin/login" : "/login";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Authenticated user hitting /login or /signup → send to dashboard
  if (isAuthRoute && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  // Permite que o onboarding seja acessado por usuários autenticados sem tenant
  // (o redirect para onboarding acontece no lado do cliente no dashboard)

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
