import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ImportStats {
  lastImportAt: string | null;
  counts: { sigem: number; gitec: number; scon: number };
  isStale: boolean; // > 7 days
}

export function useImportStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["import-stats", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ImportStats> => {
      const { data: batches } = await supabase
        .from("import_batches")
        .select("created_at, source, row_count")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!batches || batches.length === 0) {
        return { lastImportAt: null, counts: { sigem: 0, gitec: 0, scon: 0 }, isStale: true };
      }

      const lastImportAt = batches[0].created_at;
      const isStale = lastImportAt
        ? Date.now() - new Date(lastImportAt).getTime() > 7 * 86400000
        : true;

      const counts = { sigem: 0, gitec: 0, scon: 0, cronograma: 0 };
      batches.forEach(b => {
        const src = (b.source || "").toLowerCase();
        const rc = b.row_count || 0;
        if (src.includes("sigem")) counts.sigem += rc;
        else if (src.includes("gitec") || src.includes("rel_evento")) counts.gitec += rc;
        else if (src.includes("scon")) counts.scon += rc;
        else if (src.includes("cronograma")) counts.cronograma += rc;
      });

      return { lastImportAt, counts, isStale };
    },
  });
}
