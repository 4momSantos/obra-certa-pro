import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useEquipes() {
  return useQuery({
    queryKey: ["vw_equipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_equipes")
        .select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDisciplinas() {
  return useQuery({
    queryKey: ["vw_disciplinas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_disciplinas")
        .select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSconComponentes() {
  return useQuery({
    queryKey: ["vw_scon_componentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_scon_componentes")
        .select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCobertura() {
  return useQuery({
    queryKey: ["cobertura_scon"],
    queryFn: async () => {
      // Get cronograma tree items (PPU level)
      const { data: tree, error: treeErr } = await supabase
        .from("vw_cronograma_tree_completo")
        .select("ippu, nome, valor, total_realizado_bm")
        .not("ippu", "is", null);
      if (treeErr) throw treeErr;

      // Get SCON coverage per PPU
      const { data: scon, error: sconErr } = await supabase
        .from("vw_scon_por_ppu")
        .select("item_wbs, avg_avanco, total_componentes");
      if (sconErr) throw sconErr;

      const sconMap = new Map(
        (scon ?? []).map((s) => [s.item_wbs, s])
      );

      const items = (tree ?? []).map((t) => {
        const s = sconMap.get(t.ippu ?? "");
        const hasScon = !!s && (s.total_componentes ?? 0) > 0;
        const avanco = s?.avg_avanco ?? 0;
        const anomalia = hasScon && avanco > 1.05;

        let semaforo: "verde" | "laranja" | "azul" | "cinza" = "cinza";
        if ((t.total_realizado_bm ?? 0) > 0) semaforo = "verde";
        else if (hasScon && avanco > 0) semaforo = "laranja";
        else if ((t.valor ?? 0) > 0) semaforo = "azul";

        return {
          ippu: t.ippu ?? "",
          nome: t.nome ?? "",
          valor: t.valor ?? 0,
          semaforo,
          hasScon,
          avanco,
          anomalia,
          componentes: s?.total_componentes ?? 0,
        };
      });

      const semScon = items.filter((i) => !i.hasScon);
      const anomalias = items.filter((i) => i.anomalia);
      const comScon = items.filter((i) => i.hasScon).length;
      const cobertura = items.length > 0 ? comScon / items.length : 0;

      return {
        items,
        semScon,
        anomalias,
        semSconValor: semScon.reduce((a, b) => a + b.valor, 0),
        cobertura,
      };
    },
  });
}
