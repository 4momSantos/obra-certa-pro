import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CriterioMedicaoRow {
  id: string;
  identificador: string;
  item_ppu: string;
  nivel_estrutura: string;
  nome: string;
  dicionario_etapa: string;
  peso_absoluto: number;
  peso_fisico_fin: number;
}

export function useCriterioMedicao() {
  return useQuery({
    queryKey: ["criterio-medicao"],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<CriterioMedicaoRow[]> => {
      const { data, error } = await supabase
        .from("criterio_medicao")
        .select("id, identificador, item_ppu, nivel_estrutura, nome, dicionario_etapa, peso_absoluto, peso_fisico_fin")
        .eq("nivel_estrutura", "7 - Etapa")
        .order("identificador");
      if (error) throw error;
      return (data || []).map((d) => ({
        id: d.id,
        identificador: d.identificador || "",
        item_ppu: d.item_ppu || "",
        nivel_estrutura: d.nivel_estrutura || "",
        nome: d.nome || "",
        dicionario_etapa: d.dicionario_etapa || "",
        peso_absoluto: Number(d.peso_absoluto) || 0,
        peso_fisico_fin: Number(d.peso_fisico_fin) || 0,
      }));
    },
  });
}

export function getEtapasByAgrupamento(
  criterios: CriterioMedicaoRow[],
  ippu: string
): CriterioMedicaoRow[] {
  // iPPU: "B-3.4.19" → base: "3.4.19"
  const baseId = ippu.replace(/^[A-Z][-_]/, "").replace(/_/g, ".");

  return criterios
    .filter((c) => {
      if (c.item_ppu === baseId) return true;
      if (c.identificador && c.identificador.startsWith(baseId + ".")) return true;
      return false;
    })
    .sort((a, b) => {
      const numA = parseInt(a.identificador?.split(".").pop() || "0");
      const numB = parseInt(b.identificador?.split(".").pop() || "0");
      return numA - numB;
    });
}
