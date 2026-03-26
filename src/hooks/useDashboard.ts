import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DashboardWidget {
  id: string;
  dashboard_id: string;
  type: string;
  title: string;
  config: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
  created_at: string;
  updated_at: string;
}

export interface DashboardDetail {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  layout: Record<string, unknown>;
  filters: Record<string, unknown>;
  settings: Record<string, unknown>;
  is_template: boolean;
  created_at: string;
  updated_at: string;
  widgets: DashboardWidget[];
}

const DASHBOARD_KEY = "dashboard";
const WIDGETS_KEY = "dashboard-widgets";

export function useDashboard(id: string | undefined) {
  return useQuery({
    queryKey: [DASHBOARD_KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<DashboardDetail | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("dashboards")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // not found
        throw error;
      }

      const { data: widgets, error: wErr } = await supabase
        .from("dashboard_widgets")
        .select("*")
        .eq("dashboard_id", id)
        .order("created_at", { ascending: true });

      if (wErr) throw wErr;

      return {
        ...data,
        description: data.description ?? "",
        layout: (data.layout ?? {}) as Record<string, unknown>,
        filters: (data.filters ?? {}) as Record<string, unknown>,
        settings: (data.settings ?? {}) as Record<string, unknown>,
        is_template: data.is_template ?? false,
        widgets: (widgets ?? []).map((w) => ({
          ...w,
          config: (w.config ?? {}) as Record<string, unknown>,
          position: (w.position ?? { x: 0, y: 0, w: 4, h: 3 }) as DashboardWidget["position"],
        })),
      };
    },
  });
}

export function useDashboardWidgets(dashboardId: string | undefined) {
  return useQuery({
    queryKey: [WIDGETS_KEY, dashboardId],
    enabled: !!dashboardId,
    queryFn: async (): Promise<DashboardWidget[]> => {
      if (!dashboardId) return [];

      const { data, error } = await supabase
        .from("dashboard_widgets")
        .select("*")
        .eq("dashboard_id", dashboardId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((w) => ({
        ...w,
        config: (w.config ?? {}) as Record<string, unknown>,
        position: (w.position ?? { x: 0, y: 0, w: 4, h: 3 }) as DashboardWidget["position"],
      }));
    },
  });
}

export function useCreateWidget() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (widget: {
      dashboard_id: string;
      type: string;
      title: string;
      config?: Record<string, unknown>;
      position?: { x: number; y: number; w: number; h: number };
    }) => {
      const payload = {
        dashboard_id: widget.dashboard_id,
        type: widget.type,
        title: widget.title,
        config: (widget.config ?? {}) as import("@/integrations/supabase/types").Json,
        position: (widget.position ?? { x: 0, y: 0, w: 4, h: 3 }) as import("@/integrations/supabase/types").Json,
      };

      const { data, error } = await supabase
        .from("dashboard_widgets")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [DASHBOARD_KEY, data.dashboard_id] });
      qc.invalidateQueries({ queryKey: [WIDGETS_KEY, data.dashboard_id] });
    },
  });
}

export function useUpdateWidget() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dashboardId, updates }: {
      id: string;
      dashboardId: string;
      updates: Record<string, unknown>;
    }) => {
      const { error } = await supabase
        .from("dashboard_widgets")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      return { dashboardId };
    },
    onSuccess: (ctx) => {
      qc.invalidateQueries({ queryKey: [DASHBOARD_KEY, ctx.dashboardId] });
      qc.invalidateQueries({ queryKey: [WIDGETS_KEY, ctx.dashboardId] });
    },
  });
}

export function useDeleteWidget() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dashboardId }: { id: string; dashboardId: string }) => {
      const { error } = await supabase
        .from("dashboard_widgets")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { dashboardId };
    },
    onSuccess: (ctx) => {
      qc.invalidateQueries({ queryKey: [DASHBOARD_KEY, ctx.dashboardId] });
      qc.invalidateQueries({ queryKey: [WIDGETS_KEY, ctx.dashboardId] });
      toast.success("Widget removido");
    },
  });
}
