import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

const pct = (v: number, total: number) =>
  total > 0 ? ((v / total) * 100).toFixed(1) + "%" : "—";

interface Props {
  bmName: string;
}

export function BmKPIs({ bmName }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["bm-kpis", bmName],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("vw_cronograma_bm_por_ippu")
        .select("previsto, projetado, realizado")
        .eq("bm_name", bmName);

      const totals = (rows ?? []).reduce(
        (acc, r) => ({
          previsto: acc.previsto + (r.previsto ?? 0),
          projetado: acc.projetado + (r.projetado ?? 0),
          realizado: acc.realizado + (r.realizado ?? 0),
        }),
        { previsto: 0, projetado: 0, realizado: 0 }
      );
      return totals;
    },
    staleTime: 30_000,
  });

  // Fetch GITEC approved total for this BM via gitec_events by date range
  const { data: gitecTotal } = useQuery({
    queryKey: ["bm-gitec-total", bmName],
    queryFn: async () => {
      const { bmRange } = await import("@/lib/bm-utils");
      const range = bmRange(bmName);
      const start = range.start.toISOString().split("T")[0];
      const end = range.end.toISOString().split("T")[0];

      const { data: events } = await supabase
        .from("gitec_events")
        .select("valor, status")
        .gte("data_execucao", start)
        .lte("data_execucao", end);

      const approved = (events ?? [])
        .filter((e) => e.status === "Aprovado")
        .reduce((s, e) => s + (e.valor ?? 0), 0);
      const total = (events ?? []).reduce((s, e) => s + (e.valor ?? 0), 0);
      return { approved, total };
    },
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const previsto = data?.projetado ?? 0;
  const executado = data?.realizado ?? 0;
  const medido = gitecTotal?.approved ?? 0;
  const gap = executado - medido;

  const cards = [
    {
      label: "Previsto",
      value: fmtBRL(previsto),
      sub: pct(previsto, previsto),
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Executado SCON",
      value: fmtBRL(executado),
      sub: pct(executado, previsto),
      color: executado >= previsto ? "text-emerald-500" : "text-amber-500",
      bg: executado >= previsto ? "bg-emerald-500/10" : "bg-amber-500/10",
    },
    {
      label: "Medido GITEC",
      value: fmtBRL(medido),
      sub: pct(medido, previsto),
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Gap",
      value: fmtBRL(Math.abs(gap)),
      sub: gap > 0 ? "Exec > Medido" : gap < 0 ? "Medido > Exec" : "Equilibrado",
      color: gap > 0 ? "text-destructive" : "text-emerald-500",
      bg: gap > 0 ? "bg-destructive/10" : "bg-emerald-500/10",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className={cn("border", c.bg)}>
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                {c.label}
              </p>
              <p className={cn("text-xl font-bold font-mono mt-1", c.color)}>
                {c.value}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {previsto > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Medido / Projetado</span>
            <span>{pct(medido, previsto)}</span>
          </div>
          <Progress value={previsto > 0 ? (medido / previsto) * 100 : 0} className="h-2" />
        </div>
      )}
    </div>
  );
}
