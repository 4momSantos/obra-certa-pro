import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useBMPeriodos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["bm-periodos", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bm_periodos")
        .select("*")
        .order("bm_number");
      if (error) throw error;
      return data || [];
    },
  });
}

export function usePrevisaoBM(bmName: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["previsao", bmName, user?.id],
    enabled: !!user && !!bmName,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("previsao_medicao")
        .select("*")
        .eq("bm_name", bmName)
        .order("valor_previsto", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function usePrevisaoResumo(bmName: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["previsao-resumo", bmName, user?.id],
    enabled: !!user && !!bmName,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_previsao_por_disciplina" as any)
        .select("*")
        .eq("bm_name", bmName);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function usePPUElegiveis() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ppu-elegiveis", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const rows: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("ppu_items")
          .select("item_ppu, descricao, fase, subfase, agrupamento, disc, valor_total, preco_unit, qtd")
          .gt("valor_total", 0)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return rows;
    },
  });
}

export function useSconMap() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["scon-map-prev", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_scon_por_ppu" as any)
        .select("item_wbs, avg_avanco");
      if (error) throw error;
      const map = new Map<string, number>();
      (data || []).forEach((r: any) => {
        if (r.item_wbs) map.set(String(r.item_wbs).replace(/_/g, "-"), Number(r.avg_avanco) || 0);
      });
      return map;
    },
  });
}

export function useClassifMap() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["classif-map-prev", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const rows: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("classificacao_ppu")
          .select("item_ppu, disciplina")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      const map = new Map<string, { disciplina: string }>();
      rows.forEach((r: any) => {
        if (r.item_ppu) map.set(r.item_ppu, { disciplina: r.disciplina || "" });
      });
      return map;
    },
  });
}

export function useProjetadoBM(bmName: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["projetado-bm", bmName, user?.id],
    enabled: !!user && !!bmName,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cronograma_bm_values")
        .select("valor")
        .eq("bm_name", bmName)
        .eq("tipo", "Projetado");
      if (error) throw error;
      return (data || []).reduce((s: number, r: any) => s + (Number(r.valor) || 0), 0);
    },
  });
}

export function useUpdatePrevisaoStatus() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id, ippu, bmName, novoStatus, justificativa,
    }: {
      id: string; ippu: string; bmName: string;
      novoStatus: string; justificativa: string;
    }) => {
      const { data: current } = await supabase
        .from("previsao_medicao").select("status").eq("id", id).single();

      const updateData: any = { status: novoStatus };
      if (justificativa) updateData.justificativa = justificativa;

      const { error } = await supabase
        .from("previsao_medicao").update(updateData).eq("id", id);
      if (error) throw error;

      await supabase.from("previsao_historico").insert({
        previsao_id: id,
        bm_name: bmName,
        ippu,
        status_anterior: current?.status || "",
        status_novo: novoStatus,
        justificativa: justificativa || `Status alterado para ${novoStatus}`,
        alterado_por: user?.id,
        alterado_por_nome: profile?.full_name || "",
      } as any);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["previsao", vars.bmName] });
      queryClient.invalidateQueries({ queryKey: ["previsao-resumo", vars.bmName] });
    },
  });
}

export function useEditPrevisao() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id, ippu, bmName, qtd_prevista, valor_previsto, justificativa,
    }: {
      id: string; ippu: string; bmName: string;
      qtd_prevista: number; valor_previsto: number; justificativa: string;
    }) => {
      const { error } = await supabase
        .from("previsao_medicao")
        .update({ qtd_prevista, valor_previsto, justificativa } as any)
        .eq("id", id);
      if (error) throw error;

      await supabase.from("previsao_historico").insert({
        previsao_id: id,
        bm_name: bmName,
        ippu,
        status_anterior: "",
        status_novo: "",
        justificativa: "Valores alterados",
        alterado_por: user?.id,
        alterado_por_nome: profile?.full_name || "",
      } as any);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["previsao", vars.bmName] });
      queryClient.invalidateQueries({ queryKey: ["previsao-resumo", vars.bmName] });
    },
  });
}
