import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DashboardRow {
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
  // joined
  widget_count?: number;
  owner_name?: string | null;
  permission?: "owner" | "view" | "edit";
}

const DASHBOARDS_KEY = "dashboards";

export function useDashboards() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [DASHBOARDS_KEY, user?.id],
    enabled: !!user,
    queryFn: async (): Promise<DashboardRow[]> => {
      if (!user) return [];

      // Fetch own dashboards
      const { data: own, error: ownErr } = await supabase
        .from("dashboards")
        .select("*")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false });

      if (ownErr) throw ownErr;

      // Fetch shared dashboards via dashboard_shares
      const { data: shares, error: sharesErr } = await supabase
        .from("dashboard_shares")
        .select("dashboard_id, permission")
        .eq("shared_with", user.id);

      if (sharesErr) throw sharesErr;

      let sharedDashboards: DashboardRow[] = [];
      if (shares && shares.length > 0) {
        const shareMap = new Map(shares.map((s) => [s.dashboard_id, s.permission]));
        const ids = shares.map((s) => s.dashboard_id);
        const { data: sharedData, error: sharedErr } = await supabase
          .from("dashboards")
          .select("*")
          .in("id", ids)
          .order("updated_at", { ascending: false });

        if (sharedErr) throw sharedErr;

        // Get owner profiles for shared dashboards
        const ownerIds = [...new Set((sharedData ?? []).map((d) => d.owner_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ownerIds);

        const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

        sharedDashboards = (sharedData ?? []).map((d) => ({
          ...d,
          description: d.description ?? "",
          layout: (d.layout ?? {}) as Record<string, unknown>,
          filters: (d.filters ?? {}) as Record<string, unknown>,
          settings: (d.settings ?? {}) as Record<string, unknown>,
          is_template: d.is_template ?? false,
          permission: (shareMap.get(d.id) ?? "view") as "view" | "edit",
          owner_name: profileMap.get(d.owner_id) ?? null,
        }));
      }

      // Get widget counts for all dashboards
      const allIds = [...(own ?? []).map((d) => d.id), ...sharedDashboards.map((d) => d.id)];
      let widgetCounts = new Map<string, number>();
      if (allIds.length > 0) {
        const { data: widgets } = await supabase
          .from("dashboard_widgets")
          .select("dashboard_id")
          .in("dashboard_id", allIds);

        if (widgets) {
          for (const w of widgets) {
            widgetCounts.set(w.dashboard_id, (widgetCounts.get(w.dashboard_id) ?? 0) + 1);
          }
        }
      }

      const ownMapped: DashboardRow[] = (own ?? []).map((d) => ({
        ...d,
        description: d.description ?? "",
        layout: (d.layout ?? {}) as Record<string, unknown>,
        filters: (d.filters ?? {}) as Record<string, unknown>,
        settings: (d.settings ?? {}) as Record<string, unknown>,
        is_template: d.is_template ?? false,
        permission: "owner" as const,
        owner_name: null,
        widget_count: widgetCounts.get(d.id) ?? 0,
      }));

      return [
        ...ownMapped,
        ...sharedDashboards.map((d) => ({
          ...d,
          widget_count: widgetCounts.get(d.id) ?? 0,
        })),
      ];
    },
  });
}

export function useCreateDashboard() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, template }: { name: string; template: string }) => {
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("dashboards")
        .insert({
          owner_id: user.id,
          name,
          description: "",
          settings: { theme: "default", refresh_interval: 0, template },
        })
        .select()
        .single();

      if (error) throw error;

      // If template, insert default widgets
      if (template === "financeiro") {
        const widgets = [
          { dashboard_id: data.id, type: "kpi", title: "KPIs Financeiros", config: {}, position: { x: 0, y: 0, w: 12, h: 3 } },
          { dashboard_id: data.id, type: "line", title: "Curva S", config: { preset: "curvaS" }, position: { x: 0, y: 3, w: 6, h: 8 } },
          { dashboard_id: data.id, type: "waterfall", title: "Waterfall", config: { preset: "waterfall" }, position: { x: 6, y: 3, w: 6, h: 8 } },
        ];
        await supabase.from("dashboard_widgets").insert(widgets);
      } else if (template === "efetivo") {
        const widgets = [
          { dashboard_id: data.id, type: "kpi", title: "KPIs ETF", config: { preset: "etf" }, position: { x: 0, y: 0, w: 12, h: 3 } },
          { dashboard_id: data.id, type: "bar", title: "Efetivo por Período", config: { preset: "etfBar" }, position: { x: 0, y: 3, w: 12, h: 8 } },
        ];
        await supabase.from("dashboard_widgets").insert(widgets);
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DASHBOARDS_KEY] });
    },
  });
}

export function useUpdateDashboard() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("dashboards")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DASHBOARDS_KEY] });
    },
  });
}

export function useDeleteDashboard() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dashboards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DASHBOARDS_KEY] });
      toast.success("Dashboard excluído");
    },
  });
}

export function useDuplicateDashboard() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (sourceId: string) => {
      if (!user) throw new Error("Não autenticado");

      // Get source dashboard
      const { data: source, error: srcErr } = await supabase
        .from("dashboards")
        .select("*")
        .eq("id", sourceId)
        .single();

      if (srcErr || !source) throw srcErr ?? new Error("Dashboard não encontrado");

      // Insert clone
      const { data: clone, error: cloneErr } = await supabase
        .from("dashboards")
        .insert({
          owner_id: user.id,
          name: `Cópia de ${source.name}`,
          description: source.description,
          layout: source.layout,
          filters: source.filters,
          settings: source.settings,
          is_template: false,
        })
        .select()
        .single();

      if (cloneErr || !clone) throw cloneErr ?? new Error("Erro ao duplicar");

      // Copy widgets
      const { data: widgets } = await supabase
        .from("dashboard_widgets")
        .select("type, title, config, position")
        .eq("dashboard_id", sourceId);

      if (widgets && widgets.length > 0) {
        await supabase.from("dashboard_widgets").insert(
          widgets.map((w) => ({ ...w, dashboard_id: clone.id }))
        );
      }

      return clone;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DASHBOARDS_KEY] });
      toast.success("Dashboard duplicado");
    },
  });
}
