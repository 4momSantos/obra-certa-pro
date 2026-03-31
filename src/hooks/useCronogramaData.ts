import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CronoTreeNode {
  id: string;
  nivel: string;
  ippu: string;
  nome: string;
  valor: number;
  acumulado: number;
  saldo: number;
  fase_nome: string;
  subfase_nome: string;
  sort_order: number;
  total_previsto_bm: number;
  total_projetado_bm: number;
  total_realizado_bm: number;
  // Enriched from views
  semaforo?: "medido" | "executado" | "previsto" | "futuro";
  scon_avg_avanco?: number;
  scon_total?: number;
}

export interface CronoBmRow {
  ippu: string;
  bm_name: string;
  bm_number: number;
  previsto: number;
  projetado: number;
  realizado: number;
}

export interface CurvaSRow {
  label: string;
  col_index: number;
  previsto_acum: number;
  projetado_acum: number;
  realizado_acum: number;
  previsto_mensal: number;
  projetado_mensal: number;
  realizado_mensal: number;
}

function normalizePpu(v: string) {
  return (v || "").replace(/_/g, "-").trim();
}

export function useCronogramaTree() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["cronograma-tree", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CronoTreeNode[]> => {
      // Fetch tree, gitec and scon views in parallel
      const [treeRes, gitecRes, sconRes] = await Promise.all([
        supabase.from("vw_cronograma_tree_completo" as any).select("*").order("sort_order"),
        supabase.from("vw_gitec_por_ppu" as any).select("*"),
        supabase.from("vw_scon_por_ppu" as any).select("*"),
      ]);
      if (treeRes.error) throw treeRes.error;

      const gitecMap = new Map<string, any>();
      (gitecRes.data || []).forEach((r: any) => {
        if (r.item_ppu) gitecMap.set(normalizePpu(r.item_ppu), r);
      });
      const sconMap = new Map<string, any>();
      (sconRes.data || []).forEach((r: any) => {
        if (r.item_wbs) sconMap.set(normalizePpu(r.item_wbs), r);
      });

      return (treeRes.data || []).map((d: any) => {
        const ippu = normalizePpu(d.ippu || "");
        const g = gitecMap.get(ippu);
        const s = sconMap.get(ippu);
        const totalPrev = Number(d.total_previsto_bm) || 0;

        let semaforo: "medido" | "executado" | "previsto" | "futuro" = "futuro";
        if (g && Number(g.valor_aprovado) > 0) semaforo = "medido";
        else if (s && Number(s.avg_avanco) > 0) semaforo = "executado";
        else if (totalPrev > 0) semaforo = "previsto";

        return {
          id: d.id,
          nivel: d.nivel,
          ippu,
          nome: d.nome || "",
          valor: Number(d.valor) || 0,
          acumulado: Number(d.acumulado) || 0,
          saldo: Number(d.saldo) || 0,
          fase_nome: d.fase_nome || "",
          subfase_nome: d.subfase_nome || "",
          sort_order: d.sort_order || 0,
          total_previsto_bm: totalPrev,
          total_projetado_bm: Number(d.total_projetado_bm) || 0,
          total_realizado_bm: Number(d.total_realizado_bm) || 0,
          semaforo,
          scon_avg_avanco: s ? Number(s.avg_avanco) || 0 : undefined,
          scon_total: s ? Number(s.total_componentes) || 0 : undefined,
        };
      });
    },
  });
}

export function useCronogramaBmByIppu(ippu: string | null) {
  return useQuery({
    queryKey: ["cronograma-bm-ippu", ippu],
    enabled: !!ippu,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cronograma_bm_values")
        .select("bm_name, bm_number, tipo, valor")
        .eq("ippu", ippu!);
      if (error) throw error;
      return (data || []) as { bm_name: string; bm_number: number; tipo: string; valor: number }[];
    },
  });
}

export function useCronogramaBm() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["cronograma-bm", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CronoBmRow[]> => {
      const { data, error } = await supabase
        .from("vw_cronograma_bm_por_ippu" as any)
        .select("*");
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ippu: d.ippu || "",
        bm_name: d.bm_name,
        bm_number: d.bm_number,
        previsto: Number(d.previsto) || 0,
        projetado: Number(d.projetado) || 0,
        realizado: Number(d.realizado) || 0,
      }));
    },
  });
}

export function useCurvaS() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["curva-s", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CurvaSRow[]> => {
      const { data, error } = await supabase
        .from("curva_s")
        .select("label, col_index, previsto_acum, projetado_acum, realizado_acum, previsto_mensal, projetado_mensal, realizado_mensal")
        .order("col_index");
      if (error) throw error;
      return (data || []).map((d: any) => ({
        label: d.label,
        col_index: d.col_index,
        previsto_acum: Number(d.previsto_acum) || 0,
        projetado_acum: Number(d.projetado_acum) || 0,
        realizado_acum: Number(d.realizado_acum) || 0,
        previsto_mensal: Number(d.previsto_mensal) || 0,
        projetado_mensal: Number(d.projetado_mensal) || 0,
        realizado_mensal: Number(d.realizado_mensal) || 0,
      }));
    },
  });
}

export function useUltimoBm() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ultimo-bm", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from("vw_ultimo_bm_realizado" as any)
        .select("ultimo_bm")
        .single();
      if (error) throw error;
      return (data as any)?.ultimo_bm || 0;
    },
  });
}

export function useCronogramaComponents(ippu: string | null) {
  return useQuery({
    queryKey: ["cronograma-components", ippu],
    enabled: !!ippu,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!ippu) return [];
      const normalized = normalizePpu(ippu);
      const { data, error } = await supabase
        .from("scon_components")
        .select("*")
        .eq("item_wbs", normalized);
      if (error) throw error;
      return data || [];
    },
  });
}

export interface GitecEventRow {
  id: string;
  tag: string;
  etapa: string;
  status: string;
  valor: number;
  fiscal: string;
  data_execucao: string | null;
  data_aprovacao: string | null;
  bm_name: string | null;
}

export function useGitecEventosByIppu(ippu: string | null) {
  return useQuery({
    queryKey: ["gitec-eventos-ippu", ippu],
    enabled: !!ippu,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<GitecEventRow[]> => {
      if (!ippu) return [];
      const { data, error } = await supabase
        .from("gitec_events")
        .select("id, tag, etapa, status, valor, fiscal, data_execucao, data_aprovacao")
        .eq("ippu", ippu);
      if (error) throw error;

      const { dateToBM } = await import("@/lib/bm-utils");
      return (data || []).map((d: any) => {
        const dateForBm = d.data_aprovacao || d.data_execucao;
        return {
          id: d.id,
          tag: d.tag || "",
          etapa: d.etapa || "",
          status: d.status || "",
          valor: Number(d.valor) || 0,
          fiscal: d.fiscal || "",
          data_execucao: d.data_execucao,
          data_aprovacao: d.data_aprovacao,
          bm_name: dateForBm ? dateToBM(dateForBm) : null,
        };
      });
    },
  });
}
