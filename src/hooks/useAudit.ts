import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AuditFilters {
  offset: number;
  usuario?: string;
  acao?: string;
  referencia?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useAuditLog(filters: AuditFilters) {
  return useQuery({
    queryKey: ["audit-log", filters],
    queryFn: async () => {
      let q = supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters.usuario) q = q.ilike("user_nome", `%${filters.usuario}%`);
      if (filters.acao) q = q.eq("acao", filters.acao);
      if (filters.referencia) q = q.ilike("referencia", `%${filters.referencia}%`);
      if (filters.dateFrom) q = q.gte("created_at", filters.dateFrom);
      if (filters.dateTo) q = q.lte("created_at", `${filters.dateTo}T23:59:59`);

      const { data, error } = await q.range(filters.offset, filters.offset + 49);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAuditForEntity(entidade: string, referencia: string | null, limit = 10) {
  return useQuery({
    queryKey: ["audit-entity", entidade, referencia],
    enabled: !!referencia,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .eq("entidade", entidade)
        .ilike("referencia", `%${referencia}%`)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
  });
}

export async function logAudit(
  acao: string,
  entidade: string,
  referencia: string,
  detalhes: any,
  userId?: string,
  userName?: string
) {
  await supabase.from("audit_log").insert({
    user_id: userId,
    user_nome: userName || "",
    acao,
    entidade,
    referencia,
    detalhes: detalhes || {},
  } as any);
}
