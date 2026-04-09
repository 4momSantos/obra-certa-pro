import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ReferenceLine, CartesianGrid,
} from "recharts";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

const fmtK = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
};

interface Props {
  bmName: string;
}

export function BmCharts({ bmName }: Props) {
  return (
    <div>
      <Tabs defaultValue="ppu">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">Gráficos</h3>
          <TabsList className="h-8">
            <TabsTrigger value="ppu" className="text-xs px-3 h-7">Por PPU</TabsTrigger>
            <TabsTrigger value="evolucao" className="text-xs px-3 h-7">Evolução</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="ppu" className="mt-0">
          <BarChartByPPU bmName={bmName} />
        </TabsContent>
        <TabsContent value="evolucao" className="mt-0">
          <EvolutionChart bmName={bmName} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Bar Chart by PPU ──────────────────────────────────────────────────────────

function BarChartByPPU({ bmName }: { bmName: string }) {
  // 1. BM period
  const { data: bmPeriodo } = useQuery({
    queryKey: ["bm-periodo", bmName],
    queryFn: async () => {
      const { data } = await supabase
        .from("bm_periodos")
        .select("periodo_inicio, periodo_fim")
        .eq("bm_name", bmName)
        .single();
      return data;
    },
    staleTime: 300_000,
  });

  // 2. PPU items
  const { data: ppuItems } = useQuery({
    queryKey: ["ppu-items-full"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ppu_items")
        .select("item_ppu, descricao, valor_total")
        .order("item_ppu");
      return data ?? [];
    },
    staleTime: 300_000,
  });

  // 3. GITEC in BM period
  const { data: gitecBmData, isLoading } = useQuery({
    queryKey: ["gitec-bm-period", bmName],
    enabled: !!bmPeriodo,
    queryFn: async () => {
      if (!bmPeriodo) return [];
      const { data } = await supabase
        .from("gitec_events")
        .select("ippu, valor, status")
        .eq("status", "Aprovado")
        .gte("data_execucao", bmPeriodo.periodo_inicio)
        .lte("data_execucao", bmPeriodo.periodo_fim);
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const chartData = useMemo(() => {
    if (!ppuItems || !gitecBmData) return [];

    // Aggregate GITEC by iPPU
    const gitecMap: Record<string, number> = {};
    for (const e of gitecBmData) {
      if (e.ippu) gitecMap[e.ippu] = (gitecMap[e.ippu] ?? 0) + (e.valor ?? 0);
    }

    // Build chart data — only items with GITEC in period
    const rows = ppuItems
      .filter((p) => (gitecMap[p.item_ppu] ?? 0) > 0)
      .map((p) => ({
        name: (p.descricao ?? p.item_ppu)?.substring(0, 25) || p.item_ppu,
        contratual: p.valor_total ?? 0,
        gitec_bm: gitecMap[p.item_ppu] ?? 0,
      }))
      .sort((a, b) => b.gitec_bm - a.gitec_bm)
      .slice(0, 15);

    return rows;
  }, [ppuItems, gitecBmData]);

  if (isLoading) return <Skeleton className="h-[300px] w-full rounded-lg" />;

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground border rounded-lg">
        Sem medição GITEC neste período.
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-3 bg-card">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            formatter={(v: number, name: string) => [fmtBRL(v), name]}
            contentStyle={{ fontSize: 11, background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
            labelStyle={{ fontWeight: 700 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="contratual" name="Valor Contratual" fill="hsl(217, 91%, 60%)" radius={[0, 0, 0, 0]} barSize={14} />
          <Bar dataKey="gitec_bm" name="GITEC no BM" fill="hsl(142, 71%, 45%)" barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Evolution Chart (mini Curva S) ────────────────────────────────────────────

function EvolutionChart({ bmName }: { bmName: string }) {
  const bmNumber = parseInt(bmName.replace("BM-", ""));

  const { data, isLoading } = useQuery({
    queryKey: ["bm-chart-evolution"],
    queryFn: async () => {
      const { data: curva } = await supabase
        .from("curva_s")
        .select("label, col_index, previsto_acum, realizado_acum, projetado_acum")
        .order("col_index", { ascending: true });

      return (curva ?? []).map((c) => ({
        label: c.label,
        index: c.col_index,
        projetado: c.projetado_acum ?? 0,
        realizado: c.realizado_acum ?? 0,
        previsto: c.previsto_acum ?? 0,
      }));
    },
    staleTime: 300_000,
  });

  if (isLoading) return <Skeleton className="h-[300px] w-full rounded-lg" />;

  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground border rounded-lg">
        Sem dados de Curva S disponíveis.
      </div>
    );
  }

  // BM-N maps to col_index N+1
  const bmColIndex = bmNumber + 1;
  const bmLabel = data.find((d) => d.index === bmColIndex)?.label;

  return (
    <div className="border rounded-lg p-3 bg-card">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
          <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            formatter={(v: number, name: string) => [fmtBRL(v), name]}
            contentStyle={{ fontSize: 11, background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="projetado" name="Projetado" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.1} strokeWidth={1.5} />
          <Area type="monotone" dataKey="realizado" name="Realizado" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.08} strokeWidth={2.5} />
          <Area type="monotone" dataKey="previsto" name="Previsto" stroke="hsl(25, 95%, 53%)" fill="none" strokeWidth={1.5} strokeDasharray="5 3" />
          {bmLabel && (
            <ReferenceLine
              x={bmLabel}
              stroke="hsl(var(--destructive))"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{ value: bmName, position: "top", fontSize: 10, fill: "hsl(var(--destructive))" }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
