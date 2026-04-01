import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { formatCurrency } from "@/lib/format";
import { WidgetWrapper } from "./WidgetWrapper";

export function WaterfallWidget() {
  const { filteredCurvaS, filters, setSelectedPeriod } = useDashboardFilters();

  // Waterfall: show variation between realizado and baseline per period
  const data = filteredCurvaS.map((d) => {
    const delta = d.realizado - d.baseline;
    return {
      period: d.period,
      delta,
      positive: delta >= 0,
    };
  });

  const handleClick = (chartData: any) => {
    if (chartData?.activeLabel) {
      setSelectedPeriod(chartData.activeLabel);
    }
  };

  return (
    <WidgetWrapper title="Variação Realizado vs Baseline">
      <div className="h-[260px] sm:h-[300px] lg:h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} onClick={handleClick} style={{ cursor: "pointer" }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="period" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(v: number) => formatCurrency(v)}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: "11px",
              }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />
            {filters.selectedPeriod && (
              <ReferenceLine x={filters.selectedPeriod} stroke="hsl(var(--accent))" strokeWidth={2} strokeDasharray="4 4" />
            )}
            <Bar dataKey="delta" name="Variação" radius={[3, 3, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.positive ? "hsl(var(--chart-3))" : "hsl(var(--chart-4))"}
                  opacity={filters.selectedPeriod && filters.selectedPeriod !== entry.period ? 0.3 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </WidgetWrapper>
  );
}
