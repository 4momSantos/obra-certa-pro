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

export function useCronogramaTree() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["cronograma-tree", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CronoTreeNode[]> => {
      const { data, error } = await supabase
        .from("vw_cronograma_tree_completo" as any)
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        nivel: d.nivel,
        ippu: d.ippu || "",
        nome: d.nome || "",
        valor: Number(d.valor) || 0,
        acumulado: Number(d.acumulado) || 0,
        saldo: Number(d.saldo) || 0,
        fase_nome: d.fase_nome || "",
        subfase_nome: d.subfase_nome || "",
        sort_order: d.sort_order || 0,
        total_previsto_bm: Number(d.total_previsto_bm) || 0,
        total_projetado_bm: Number(d.total_projetado_bm) || 0,
        total_realizado_bm: Number(d.total_realizado_bm) || 0,
      }));
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
      return data?.ultimo_bm || 0;
    },
  });
}
