import { useCallback, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { formatCompact, formatCurrency } from "@/lib/format";
import { WidgetWrapper } from "./WidgetWrapper";

const SERIES_CONFIG = [
  { key: "baseline", name: "Baseline", color: "hsl(var(--chart-1))" },
  { key: "previsto", name: "Previsto", color: "hsl(var(--chart-2))" },
  { key: "projetado", name: "Projetado", color: "hsl(var(--chart-5))" },
  { key: "realizado", name: "Realizado", color: "hsl(var(--chart-3))" },
] as const;

type SeriesKey = typeof SERIES_CONFIG[number]["key"];

export function DonutWidget() {
  const { filteredMetrics, filters, toggleSeries } = useDashboardFilters();

  const metricMap: Record<SeriesKey, number> = {
    baseline: filteredMetrics.totalBaseline,
    previsto: filteredMetrics.totalPrevisto,
    projetado: filteredMetrics.totalProjetado,
    realizado: filteredMetrics.totalRealizado,
  };

  const total = useMemo(
    () => Object.values(metricMap).reduce((s, v) => s + v, 0),
    [metricMap.baseline, metricMap.previsto, metricMap.projetado, metricMap.realizado]
  );

  const data = useMemo(
    () =>
      SERIES_CONFIG.filter((s) => filters.seriesVisibility[s.key]).map((s) => ({
        name: s.name,
        key: s.key,
        value: metricMap[s.key],
        color: s.color,
        pct: total > 0 ? (metricMap[s.key] / total) * 100 : 0,
      })),
    [filters.seriesVisibility, metricMap, total]
  );

  const handleClick = useCallback(
    (_: unknown, index: number) => {
      const item = data[index];
      if (item) toggleSeries(item.key as keyof typeof filters.seriesVisibility);
    },
    [data, toggleSeries]
  );

  const handleLegendClick = useCallback(
    (entry: any) => {
      const cfg = SERIES_CONFIG.find((s) => s.name === entry.value);
      if (cfg) toggleSeries(cfg.key as keyof typeof filters.seriesVisibility);
    },
    [toggleSeries]
  );

  if (data.length === 0 || total === 0) {
    return (
      <WidgetWrapper title="Distribuição de Valores">
        <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
          Nenhum dado para os filtros selecionados
        </div>
      </WidgetWrapper>
    );
  }

  return (
    <WidgetWrapper title="Distribuição de Valores">
      <div className="h-[240px] sm:h-[270px] lg:h-[300px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={3}
              dataKey="value"
              stroke="none"
              onClick={handleClick}
              style={{ cursor: "pointer" }}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, props: any) => [
                `${formatCurrency(value)} (${props.payload.pct.toFixed(1)}%)`,
                name,
              ]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: "11px",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "10px", cursor: "pointer" }}
              onClick={handleLegendClick}
              payload={SERIES_CONFIG.map((s) => ({
                value: s.name,
                type: "circle" as const,
                color: filters.seriesVisibility[s.key] ? s.color : "hsl(var(--muted))",
              }))}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-lg font-bold font-mono">{formatCompact(filteredMetrics.totalRealizado)}</p>
            <p className="text-[10px] text-muted-foreground">Realizado</p>
          </div>
        </div>
      </div>
    </WidgetWrapper>
  );
}
