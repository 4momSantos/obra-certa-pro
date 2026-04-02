import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function fetchFiltered<T>(table: string, column: string, value: string, select = "*"): Promise<T[]> {
  if (!value) return [];
  const rows: T[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase.from(table as any).select(select).eq(column, value).range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

export function usePPUDetail(itemPpu: string | null, itemGitec: string | null) {
  const enabled = !!itemPpu;
  const sconQ = useQuery({
    queryKey: ["ppu-detail-scon", itemPpu],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: () => fetchFiltered<any>("scon_components", "item_wbs", itemPpu!),
  });
  const relQ = useQuery({
    queryKey: ["ppu-detail-rel", itemPpu],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: () => fetchFiltered<any>("rel_eventos", "item_ppu", itemPpu!),
  });
  const sigemQ = useQuery({
    queryKey: ["ppu-detail-sigem", itemPpu],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: () => fetchFiltered<any>("sigem_documents", "ppu", itemPpu!),
  });
  const criterioQ = useQuery({
    queryKey: ["ppu-detail-criterio", itemPpu],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: () => fetchFiltered<any>("criterio_medicao", "item_ppu", itemPpu!),
  });
  const eacQ = useQuery({
    queryKey: ["ppu-detail-eac", itemPpu],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: () => fetchFiltered<any>("eac_items", "ppu", itemPpu!),
  });

  return {
    scon: sconQ.data ?? [],
    rel: relQ.data ?? [],
    sigem: sigemQ.data ?? [],
    criterio: criterioQ.data ?? [],
    eac: eacQ.data ?? [],
    isLoading: sconQ.isLoading || relQ.isLoading || sigemQ.isLoading || criterioQ.isLoading || eacQ.isLoading,
  };
}
