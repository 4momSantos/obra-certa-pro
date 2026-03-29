import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { dateToBM, parseDateBR } from "@/lib/bm-utils";

export interface BMValueRow {
  ippu: string;
  bm_name: string;
  bm_number: number;
  tipo: string;
  valor: number;
}

export function useAllBMValues() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["all-bm-values", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<BMValueRow[]> => {
      const { data, error } = await supabase
        .from("cronograma_bm_values")
        .select("ippu, bm_name, bm_number, tipo, valor");
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ippu: d.ippu || "",
        bm_name: d.bm_name,
        bm_number: d.bm_number,
        tipo: d.tipo,
        valor: Number(d.valor) || 0,
      }));
    },
  });
}

export function useAllRelEventos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["all-rel-eventos", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rel_eventos")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAllSigemDocs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["all-sigem-docs", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sigem_documents")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useBMSummary(bmValues: BMValueRow[] | undefined) {
  return useMemo(() => {
    if (!bmValues || bmValues.length === 0)
      return { ultimoBM: 0, totalMedido: 0, totalPrevisto: 0, bmAtualNum: 1, bmStatusMap: new Map<number, "realizado" | "atual" | "futuro">() };

    let maxRealized = 0;
    let totalMedido = 0;
    let totalPrevisto = 0;
    bmValues.forEach((v) => {
      if (v.tipo === "Realizado" && v.valor > 0) {
        if (v.bm_number > maxRealized) maxRealized = v.bm_number;
        totalMedido += v.valor;
      }
      if (v.tipo === "Previsto") totalPrevisto += v.valor;
    });

    const bmAtualNum = maxRealized + 1;
    const bmStatusMap = new Map<number, "realizado" | "atual" | "futuro">();
    for (let i = 1; i <= 22; i++) {
      if (i <= maxRealized) bmStatusMap.set(i, "realizado");
      else if (i === bmAtualNum) bmStatusMap.set(i, "atual");
      else bmStatusMap.set(i, "futuro");
    }

    return { ultimoBM: maxRealized, totalMedido, totalPrevisto, bmAtualNum, bmStatusMap };
  }, [bmValues]);
}

export function useBMEvents(relEventos: any[] | undefined, selectedBM: string) {
  return useMemo(() => {
    if (!relEventos) return [];
    return relEventos.filter((e) => {
      const d = e.data_aprovacao || e.data_inf_execucao || e.data_execucao;
      return d && dateToBM(d) === selectedBM;
    });
  }, [relEventos, selectedBM]);
}

export function useBMDocs(sigemDocs: any[] | undefined, selectedBM: string) {
  return useMemo(() => {
    if (!sigemDocs) return [];
    return sigemDocs.filter((d) => {
      const parsed = parseDateBR(d.incluido_em);
      return parsed && dateToBM(parsed) === selectedBM;
    });
  }, [sigemDocs, selectedBM]);
}
