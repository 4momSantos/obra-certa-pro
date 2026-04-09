import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const bmNumber = parseInt(bmName.replace("BM-", ""));

  // 1. Curva S — all 23 rows, cached
  const { data: curvaS, isLoading: curvaLoading } = useQuery({
    queryKey: ["curva-s-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("curva_s")
        .select("col_index, previsto_mensal, projetado_mensal, realizado_mensal, previsto_acum, projetado_acum, realizado_acum")
        .order("col_index", { ascending: true });
      return data ?? [];
    },
    staleTime: 300_000,
  });

  // 2. BM period dates
  const { data: bmPeriodo } = useQuery({
    queryKey: ["bm-periodo", bmName],
    queryFn: async () => {
      const { data } = await supabase
        .from("bm_periodos")
        .select("periodo_inicio, periodo_fim, status")
        .eq("bm_name", bmName)
        .single();
      return data;
    },
    staleTime: 300_000,
  });

  // 3. GITEC approved in BM period
  const { data: gitecTotal, isLoading: gitecLoading } = useQuery({
    queryKey: ["bm-gitec-total", bmName],
    enabled: !!bmPeriodo,
    queryFn: async () => {
      if (!bmPeriodo) return { approved: 0, total: 0, count: 0 };

      const { data: events } = await supabase
        .from("gitec_events")
        .select("valor, status, data_aprovacao, data_execucao")
        .gte("data_execucao", bmPeriodo.periodo_inicio)
        .lte("data_execucao", bmPeriodo.periodo_fim);

      let approved = 0;
      let total = 0;
      let count = 0;
      for (const e of events ?? []) {
        total += e.valor ?? 0;
        if (e.status === "Aprovado") {
          approved += e.valor ?? 0;
          count++;
        }
      }
      return { approved, total, count };
    },
    staleTime: 30_000,
  });

  if (curvaLoading || gitecLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  // Extract curva_s data for this BM
  // Memory: BM-N corresponds to col_index N+1
  const curvaIndex = bmNumber + 1;
  const curvaRow = curvaS?.find((c) => c.col_index === curvaIndex);
  const prevCurvaRow = curvaS?.find((c) => c.col_index === curvaIndex - 1);

  const previstoMensal = curvaRow?.previsto_mensal ?? 
    ((curvaRow?.previsto_acum ?? 0) - (prevCurvaRow?.previsto_acum ?? 0));
  const realizadoMensal = curvaRow?.realizado_mensal ??
    ((curvaRow?.realizado_acum ?? 0) - (prevCurvaRow?.realizado_acum ?? 0));
  const projetadoMensal = curvaRow?.projetado_mensal ??
    ((curvaRow?.projetado_acum ?? 0) - (prevCurvaRow?.projetado_acum ?? 0));

  const hasCurvaData = !!curvaRow;
  const medido = gitecTotal?.approved ?? 0;
  const gap = realizadoMensal - medido;
  const noGitec = medido === 0 && bmPeriodo?.status === "fechado";

  const cards = [
    {
      label: "Previsto",
      value: hasCurvaData && previstoMensal > 0 ? fmtBRL(previstoMensal) : "—",
      sub: hasCurvaData ? pct(previstoMensal, previstoMensal) : "Sem dados",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      tooltip: !hasCurvaData ? "Dados de cronograma não disponíveis para este BM" : undefined,
    },
    {
      label: "Realizado (Curva S)",
      value: hasCurvaData && realizadoMensal > 0 ? fmtBRL(realizadoMensal) : "—",
      sub: hasCurvaData && previstoMensal > 0 ? pct(realizadoMensal, previstoMensal) : "Sem dados",
      color: realizadoMensal >= previstoMensal && hasCurvaData ? "text-emerald-500" : "text-amber-500",
      bg: realizadoMensal >= previstoMensal && hasCurvaData ? "bg-emerald-500/10" : "bg-amber-500/10",
    },
    {
      label: "GITEC Medido",
      value: medido > 0 ? fmtBRL(medido) : "—",
      sub: medido > 0 && previstoMensal > 0 ? pct(medido, previstoMensal) : 
           noGitec ? "Sem eventos no período" : "Sem medição",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      tooltip: noGitec ? "Sem eventos GITEC no período deste BM" : undefined,
    },
    {
      label: "Gap",
      value: hasCurvaData && (realizadoMensal > 0 || medido > 0) ? fmtBRL(Math.abs(gap)) : "—",
      sub: gap > 0 ? "Realizado > Medido" : gap < 0 ? "Medido > Realizado" : "Equilibrado",
      color: gap > 0 ? "text-destructive" : "text-emerald-500",
      bg: gap > 0 ? "bg-destructive/10" : "bg-emerald-500/10",
    },
  ];

  const previstoAcum = curvaRow?.previsto_acum ?? 0;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cards.map((c) => (
            <Card key={c.label} className={cn("border", c.bg)}>
              <CardContent className="p-4">
                {c.tooltip ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                          {c.label}
                        </p>
                        <p className={cn("text-xl font-bold font-mono mt-1", c.color)}>
                          {c.value}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{c.sub}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs max-w-xs">
                      {c.tooltip}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                      {c.label}
                    </p>
                    <p className={cn("text-xl font-bold font-mono mt-1", c.color)}>
                      {c.value}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{c.sub}</p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        {previstoAcum > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Medido GITEC / Previsto Acum.</span>
              <span>{pct(medido, previstoAcum)}</span>
            </div>
            <Progress value={previstoAcum > 0 ? (medido / previstoAcum) * 100 : 0} className="h-2" />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
