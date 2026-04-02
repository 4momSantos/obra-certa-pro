import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { allBMs, bmRange } from "@/lib/bm-utils";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  selected: string | null;
  onSelect: (bm: string) => void;
}

export function BmSelector({ selected, onSelect }: Props) {
  const { data: ultimoBm, isLoading } = useQuery({
    queryKey: ["ultimo-bm"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vw_ultimo_bm_realizado")
        .select("ultimo_bm")
        .single();
      return data?.ultimo_bm ?? 0;
    },
    staleTime: 60_000,
  });

  const bms = allBMs();
  const currentBm = (ultimoBm ?? 0) + 1;

  // Auto-select current BM on load
  const effectiveBm = selected ?? `BM-${String(currentBm).padStart(2, "0")}`;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  const selectedRange = bmRange(effectiveBm);

  return (
    <div className="space-y-2">
      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin">
        {bms.map((bm) => {
          const isDone = bm.number <= (ultimoBm ?? 0);
          const isCurrent = bm.number === currentBm;
          const isFuture = bm.number > currentBm;
          const isSelected = bm.name === effectiveBm;

          return (
            <button
              key={bm.name}
              onClick={() => onSelect(bm.name)}
              className={cn(
                "shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-mono font-medium transition-all border",
                isSelected
                  ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                  : "",
                isDone
                  ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                  : isCurrent
                    ? "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400 animate-pulse"
                    : "bg-muted/50 text-muted-foreground/60 border-border/50"
              )}
            >
              {isDone && <Check className="h-3 w-3" />}
              {bm.name.replace("BM-", "")}
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
