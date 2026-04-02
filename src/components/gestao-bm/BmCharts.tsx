import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { bmRange } from "@/lib/bm-utils";
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
  const range = bmRange(bmName);
  const startStr = range.start.toISOString().split("T")[0];
  const endStr = range.end.toISOString().split("T")[0];

  const { data, isLoading } = useQuery({
    queryKey: ["bm-chart-ppu", bmName],
    queryFn: async () => {
      // Cronograma data per PPU
      const { data: crono } = await supabase
        .from("vw_cronograma_bm_por_ippu")
        .select("ippu, previsto, projetado, realizado")
        .eq("bm_name", bmName);

      // GITEC approved per PPU
      const { data: gitec } = await supabase
        .from("gitec_events")
        .select("ippu, valor, status")
        .gte("data_execucao", startStr)
        .lte("data_execucao", endStr);

      const gitecMap: Record<string, number> = {};
      for (const e of gitec ?? []) {
        if (e.status === "Aprovado" && e.ippu) {
          gitecMap[e.ippu] = (gitecMap[e.ippu] ?? 0) + (e.valor ?? 0);
        }
      }

      const rows = (crono ?? []).map((c) => ({
        ppu: c.ippu ?? "",
        previsto: c.previsto ?? 0,
        projetado: c.projetado ?? 0,
        executado: c.realizado ?? 0,
        gitec: gitecMap[c.ippu ?? ""] ?? 0,
      }));

      rows.sort((a, b) => b.previsto - a.previsto);
      return rows.slice(0, 15);
    },
    staleTime: 300_000,
  });

  if (isLoading) return <Skeleton className="h-[300px] w-full rounded-lg" />;

  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground border rounded-lg">
        Sem dados para este BM.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    ppu: d.ppu.length > 12 ? d.ppu.slice(0, 12) + "…" : d.ppu,
  }));

  return (
    <div className="border rounded-lg p-3 bg-card">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis type="category" dataKey="ppu" width={90} tick={{ fontSize: 10, fontFamily: "monospace" }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            formatter={(v: number, name: string) => [fmtBRL(v), name]}
            contentStyle={{ fontSize: 11, background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
            labelStyle={{ fontFamily: "monospace", fontWeight: 700 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="previsto" name="Previsto" fill="hsl(217, 91%, 60%)" radius={[0, 0, 0, 0]} barSize={14} />
          <Bar dataKey="projetado" name="Projetado" fill="hsl(271, 91%, 65%)" barSize={14} />
          <Bar dataKey="executado" name="Executado" fill="hsl(142, 71%, 45%)" barSize={14} />
          <Bar dataKey="gitec" name="GITEC Aprov." fill="hsl(152, 82%, 35%)" barSize={14} />
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

  // Find the label for the selected BM to draw reference line
  const bmLabel = data.find((_, i) => i + 1 === bmNumber)?.label;

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
