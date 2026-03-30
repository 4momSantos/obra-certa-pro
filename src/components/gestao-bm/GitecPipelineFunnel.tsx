import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { bmRange } from "@/lib/bm-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

interface Stage {
  key: string;
  label: string;
  count: number;
  value: number;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface Props {
  bmName: string;
  activeStatus: string | null;
  onFilterStatus: (status: string | null) => void;
}

export function GitecPipelineFunnel({ bmName, activeStatus, onFilterStatus }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["gitec-pipeline", bmName],
    queryFn: async () => {
      const range = bmRange(bmName);
      const start = range.start.toISOString().split("T")[0];
      const end = range.end.toISOString().split("T")[0];

      const { data: events } = await supabase
        .from("gitec_events")
        .select("status, valor")
        .gte("data_execucao", start)
        .lte("data_execucao", end);

      const agg: Record<string, { count: number; value: number }> = {};
      for (const e of events ?? []) {
        const s = e.status || "Desconhecido";
        if (!agg[s]) agg[s] = { count: 0, value: 0 };
        agg[s].count++;
        agg[s].value += e.valor ?? 0;
      }
      return agg;
    },
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  const get = (s: string) => data?.[s] ?? { count: 0, value: 0 };
  const totalValue =
    Object.values(data ?? {}).reduce((s, v) => s + v.value, 0);
  const approvedValue = get("Aprovado").value;

  const stages: Stage[] = [
    {
      key: "Pendente de Verificação",
      label: "Pend. Verificação",
      ...get("Pendente de Verificação"),
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-l-amber-500",
    },
    {
      key: "Pendente de Aprovação",
      label: "Pend. Aprovação",
      ...get("Pendente de Aprovação"),
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500/10",
      borderColor: "border-l-orange-500",
    },
    {
      key: "Aprovado",
      label: "Aprovado",
      ...get("Aprovado"),
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-l-emerald-500",
    },
    {
      key: "Recusado",
      label: "Recusado",
      ...get("Recusado"),
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      borderColor: "border-l-destructive",
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Pipeline GITEC</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stages.map((s) => {
          const isActive = activeStatus === s.key;
          return (
            <Card
              key={s.key}
              onClick={() => onFilterStatus(isActive ? null : s.key)}
              className={cn(
                "cursor-pointer border-l-4 transition-all hover:shadow-md",
                s.borderColor,
                s.bgColor,
                isActive && "ring-2 ring-primary ring-offset-1 ring-offset-background"
              )}
            >
              <CardContent className="p-3">
                <p className={cn("text-[11px] font-medium", s.color)}>{s.label}</p>
                <p className={cn("text-lg font-bold font-mono", s.color)}>
                  {s.count}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {fmtBRL(s.value)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {totalValue > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Aprovado / Total GITEC</span>
            <span>{((approvedValue / totalValue) * 100).toFixed(1)}%</span>
          </div>
          <Progress value={(approvedValue / totalValue) * 100} className="h-2" />
        </div>
      )}
    </div>
  );
}
