import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useContrato } from "@/contexts/ContratoContext";

export interface ColumnMappingRow {
  id: string;
  contrato_id: string | null;
  source: string;
  header_row: number;
  mappings: Record<string, number>;
  updated_at: string;
}

export function useColumnMapping(source: string) {
  const { contratoAtivo } = useContrato();
  const contratoId = contratoAtivo?.id ?? null;

  return useQuery({
    queryKey: ["column-mapping", contratoId, source],
    enabled: !!contratoId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_column_mappings")
        .select("*")
        .eq("source", source)
        .eq("contrato_id", contratoId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        mappings: (data.mappings as Record<string, number>) ?? {},
      } as ColumnMappingRow;
    },
  });
}

export function useSaveColumnMapping() {
  const qc = useQueryClient();
  const { contratoId } = useContrato();

  return useMutation({
    mutationFn: async (input: {
      source: string;
      mappings: Record<string, number>;
      headerRow: number;
    }) => {
      if (!contratoId) throw new Error("Contrato não selecionado");

      const { error } = await supabase
        .from("config_column_mappings")
        .upsert(
          {
            contrato_id: contratoId,
            source: input.source,
            mappings: input.mappings as any,
            header_row: input.headerRow,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "contrato_id,source" }
        );
      if (error) throw error;
    },
    onSuccess: (_, input) => {
      qc.invalidateQueries({ queryKey: ["column-mapping", contratoId, input.source] });
    },
  });
}
