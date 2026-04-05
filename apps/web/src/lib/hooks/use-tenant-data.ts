'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useCurrentTenant } from '@/lib/context/tenant-context';
import type { Database } from '@zeus/database';

type Tenant = Database['public']['Tables']['tenants']['Row'];

/**
 * Hook para buscar dados completos do tenant (nome, plano, settings, etc)
 *
 * Exemplo:
 *   const { data: tenant, isLoading } = useTenantData();
 *   return <h1>{tenant?.name}</h1>;
 */
export function useTenantData() {
  const { tenantId, loading: tenantLoading } = useCurrentTenant();

  return useQuery<Tenant | null>({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const supabase = createClient();
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !tenantLoading,
  });
}

/**
 * Hook para buscar o profile completo do usuário (inclui role, whatsapp_number, etc)
 *
 * Exemplo:
 *   const { data: profile } = useProfileData();
 *   return <p>Olá, {profile?.full_name}</p>;
 */
export function useProfileData() {
  const { tenantId, loading: tenantLoading } = useCurrentTenant();

  return useQuery({
    queryKey: ['profile', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !tenantLoading,
  });
}
