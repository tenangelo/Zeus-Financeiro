'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Contexto de Tenant (Multi-Tenancy)
 *
 * Armazena o tenant_id do usuário logado, extraído do profile.
 * Usado em todo o app para garantir que só acesse dados do seu tenant.
 *
 * Fluxo:
 * 1. Usuário faz login
 * 2. middleware.ts valida sessão e renova JWT
 * 3. TenantProvider é montado na raiz da app
 * 4. TenantProvider lê auth.uid() via Supabase client
 * 5. TenantProvider busca profiles(auth.uid()) para extrair tenant_id
 * 6. useCurrentTenant() retorna tenant_id para componentes
 */

interface TenantContextType {
  tenantId: string | null;
  loading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTenantId() {
      try {
        const supabase = createClient();

        // Obtém o usuário autenticado
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          setError('Erro ao obter usuário');
          setLoading(false);
          return;
        }

        if (!user) {
          // Não autenticado — deixa tenant_id como null
          setLoading(false);
          return;
        }

        // Busca o profile do usuário para extrair tenant_id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();

        if (profileError) {
          setError('Erro ao obter tenant do profile');
          setLoading(false);
          return;
        }

        setTenantId(profile?.tenant_id || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }

    loadTenantId();
  }, []);

  return (
    <TenantContext.Provider value={{ tenantId, loading, error }}>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook para acessar o tenant_id do usuário atual
 *
 * Exemplo:
 *   const { tenantId, loading } = useCurrentTenant();
 *   if (loading) return <Skeleton />;
 *   return <Dashboard tenantId={tenantId} />;
 */
export function useCurrentTenant(): TenantContextType {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error(
      'useCurrentTenant deve ser usado dentro de TenantProvider'
    );
  }
  return context;
}
