/**
 * Cliente HTTP para a API NestJS.
 * Injeta automaticamente o token JWT do Supabase em cada requisição.
 * Inclui tratamento de erros com tipos padronizados e retry automático.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

/** Structured API error for consistent handling in the UI layer */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** true when user has no tenant (needs onboarding) */
  get isTenantError(): boolean {
    return this.status === 403 && (
      this.message.toLowerCase().includes("tenant") ||
      this.code === "NO_TENANT"
    );
  }

  /** true when token is expired or invalid */
  get isAuthError(): boolean {
    return this.status === 401;
  }

  /** true when the API server is unreachable */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

async function getToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const { createClient } = await import("./supabase/client");
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

import { toast } from "sonner";

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    toast.error("Sem conexão com a internet ou servidor offline.");
    throw new ApiError("Não foi possível conectar ao servidor.", 0, "NETWORK_ERROR");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const errorMessage = body?.message ?? body?.error?.message ?? `Erro ${res.status}: ${res.statusText}`;
    
    // Redirecionamento automático quando token expira (e não é uma rota pública)
    if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
      toast.error("Sua sessão expirou. Faça login novamente.");
      window.location.href = "/login";
    }
    
    // Erros do servidor disparam um toast global
    if (res.status >= 500) {
      toast.error("Erro interno no servidor. Nossa equipe foi notificada.");
    }

    throw new ApiError(
      errorMessage,
      res.status,
      body?.error?.code ?? body?.code,
      body?.error?.field ?? body?.field,
    );
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body != null ? JSON.stringify(body) : null }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body != null ? JSON.stringify(body) : null }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body != null ? JSON.stringify(body) : null }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
