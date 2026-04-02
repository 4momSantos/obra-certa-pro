import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { formatCurrency, formatCompact } from "@/lib/format";
import { WidgetWrapper } from "./WidgetWrapper";

interface WaterfallItem {
  period: string;
  delta: number;
  offset: number;
  isTotal: boolean;
}

export function WaterfallWidget() {
  const { filteredCurvaS, filters, setSelectedPeriod } = useDashboardFilters();

  const data = useMemo<WaterfallItem[]>(() => {
    if (filteredCurvaS.length === 0) return [];

    let runningOffset = 0;
    const items: WaterfallItem[] = filteredCurvaS.map((d) => {
      const delta = d.realizado - d.baseline;
      const item: WaterfallItem = {
        period: d.period,
        delta: Math.abs(delta),
        offset: delta >= 0 ? runningOffset : runningOffset + delta,
        isTotal: false,
      };
      runningOffset += delta;
      return item;
    });

    // Total bar
    const totalDelta = runningOffset;
    items.push({
      period: "Total",
      delta: Math.abs(totalDelta),
      offset: totalDelta >= 0 ? 0 : totalDelta,
      isTotal: true,
    });

    return items;
  }, [filteredCurvaS]);

  const totalDelta = useMemo(
    () => filteredCurvaS.reduce((s, d) => s + (d.realizado - d.baseline), 0),
    [filteredCurvaS]
  );

  const handleClick = (chartData: any) => {
    if (chartData?.activeLabel && chartData.activeLabel !== "Total") {
      setSelectedPeriod(chartData.activeLabel);
    }
  };

  const getBarColor = (item: WaterfallItem) => {
    if (item.isTotal) return "hsl(var(--chart-1))"; // blue
    const rawDelta = filteredCurvaS.find(d => d.period === item.period);
    if (!rawDelta) return "hsl(var(--muted))";
    return (rawDelta.realizado - rawDelta.baseline) >= 0
      ? "hsl(var(--chart-3))"  // green
      : "hsl(var(--chart-4))"; // red
  };

  const getRawDelta = (period: string) => {
    const d = filteredCurvaS.find(p => p.period === period);
    return d ? d.realizado - d.baseline : 0;
  };

  if (data.length === 0) {
    return (
      <WidgetWrapper title="Variação Realizado vs Baseline">
        <div className="h-[340px] flex items-center justify-center text-sm text-muted-foreground">
          Sem dados para os filtros selecionados
        </div>
      </WidgetWrapper>
    );
  }

  return (
    <WidgetWrapper title="Variação Realizado vs Baseline">
      <div className="h-[260px] sm:h-[300px] lg:h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} onClick={handleClick} style={{ cursor: "pointer" }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="period" tick={{ fontSize: 9 }} interval={0} angle={-45} textAnchor="end" height={50} />
            <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} tick={{ fontSize: 10 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0]?.payload as WaterfallItem;
                const raw = item.isTotal ? totalDelta : getRawDelta(item.period);
                const sign = raw >= 0 ? "+" : "";
                const label = item.isTotal
                  ? `Total: ${sign}${formatCompact(raw)}`
                  : `${item.period}: ${sign}${formatCompact(raw)} ${raw >= 0 ? "acima" : "abaixo"} do baseline`;
                return (
                  <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
                    <p className={raw >= 0 ? "text-green-500" : "text-red-500"}>{label}</p>
                    <p className="text-muted-foreground">{formatCurrency(Math.abs(raw))}</p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />
            {filters.selectedPeriod && (
              <ReferenceLine x={filters.selectedPeriod} stroke="hsl(var(--accent))" strokeWidth={2} strokeDasharray="4 4" />
            )}
            {/* Invisible offset bar */}
            <Bar dataKey="offset" stackId="waterfall" fill="transparent" />
            {/* Visible delta bar */}
            <Bar dataKey="delta" stackId="waterfall" name="Variação" radius={[3, 3, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={getBarColor(entry)}
                  opacity={filters.selectedPeriod && filters.selectedPeriod !== entry.period && !entry.isTotal ? 0.3 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </WidgetWrapper>
  );
}
