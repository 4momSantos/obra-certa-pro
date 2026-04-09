import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { bmRange } from "@/lib/bm-utils";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  selected: string | null;
  onSelect: (bm: string) => void;
}

export function BmSelector({ selected, onSelect }: Props) {
  const { data: periodos, isLoading } = useQuery({
    queryKey: ["bm-periodos-selector"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bm_periodos")
        .select("bm_name, bm_number, status")
        .order("bm_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  if (isLoading || !periodos) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  // Auto-select the "aberto" BM, fallback to first
  const bmAberto = periodos.find((p) => p.status === "aberto");
  const effectiveBm = selected ?? bmAberto?.bm_name ?? periodos[0]?.bm_name ?? "BM-01";
  const selectedRange = bmRange(effectiveBm);

  return (
    <div className="space-y-2">
      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin">
        {periodos.map((bm) => {
          const status = bm.status || "futuro";
          const isSelected = bm.bm_name === effectiveBm;
          const isDone = status === "fechado";
          const isOpen = status === "aberto";

          return (
            <button
              key={bm.bm_name}
              onClick={() => onSelect(bm.bm_name)}
              className={cn(
                "shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-mono font-medium transition-all border",
                isSelected
                  ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                  : "",
                isDone
                  ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                  : isOpen
                    ? "bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400 animate-pulse"
                    : "bg-muted/50 text-muted-foreground/60 border-border/50"
              )}
            >
              {isDone && <Check className="h-3 w-3" />}
              {bm.bm_name.replace("BM-", "")}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground font-mono">
        <span className="font-semibold text-foreground">{effectiveBm}</span>
        {" · "}
        {selectedRange.start.toLocaleDateString("pt-BR")} → {selectedRange.end.toLocaleDateString("pt-BR")}
      </p>
    </div>
  );
}
