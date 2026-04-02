import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SHARES_KEY = "dashboard-shares";

export interface ShareEntry {
  id: string;
  dashboard_id: string;
  shared_with: string;
  permission: string;
  created_at: string | null;
  user_email?: string;
  user_name?: string;
}

export function useDashboardShares(dashboardId: string | undefined) {
  return useQuery({
    queryKey: [SHARES_KEY, dashboardId],
    enabled: !!dashboardId,
    queryFn: async (): Promise<ShareEntry[]> => {
      if (!dashboardId) return [];

      const { data, error } = await supabase
        .from("dashboard_shares")
        .select("*")
        .eq("dashboard_id", dashboardId);

      if (error) throw error;

      // Get profile info for shared users
      const userIds = (data ?? []).map((s) => s.shared_with);
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

      return (data ?? []).map((s) => ({
        ...s,
        user_name: profileMap.get(s.shared_with) ?? null,
      })) as ShareEntry[];
    },
  });
}

export function useShareDashboard() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dashboardId,
      userId,
      permission,
    }: {
      dashboardId: string;
      userId: string;
      permission: string;
    }) => {
      const { error } = await supabase.from("dashboard_shares").insert({
        dashboard_id: dashboardId,
        shared_with: userId,
        permission,
      });
      if (error) throw error;
      return { dashboardId };
    },
    onSuccess: (ctx) => {
      qc.invalidateQueries({ queryKey: [SHARES_KEY, ctx.dashboardId] });
      toast.success("Usuário adicionado");
    },
    onError: () => toast.error("Erro ao compartilhar"),
  });
}

export function useUpdateSharePermission() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shareId,
      dashboardId,
      permission,
    }: {
      shareId: string;
      dashboardId: string;
      permission: string;
    }) => {
      const { error } = await supabase
        .from("dashboard_shares")
        .update({ permission })
        .eq("id", shareId);
      if (error) throw error;
      return { dashboardId };
    },
    onSuccess: (ctx) => {
      qc.invalidateQueries({ queryKey: [SHARES_KEY, ctx.dashboardId] });
    },
  });
}

export function useRemoveShare() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shareId,
      dashboardId,
    }: {
      shareId: string;
      dashboardId: string;
    }) => {
      const { error } = await supabase
        .from("dashboard_shares")
        .delete()
        .eq("id", shareId);
      if (error) throw error;
      return { dashboardId };
    },
    onSuccess: (ctx) => {
      qc.invalidateQueries({ queryKey: [SHARES_KEY, ctx.dashboardId] });
      toast.success("Acesso removido");
    },
  });
}

export function useFindUserByEmail() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.functions.invoke(
        "find-user-by-email",
        { body: { email } },
      );
      if (error) throw error;
      return data as { user: { id: string; email: string; full_name: string | null } | null };
    },
  });
}
