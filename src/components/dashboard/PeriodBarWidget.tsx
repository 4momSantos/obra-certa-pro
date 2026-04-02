import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Cell,
} from "recharts";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { formatCurrency } from "@/lib/format";
import { WidgetWrapper } from "./WidgetWrapper";

export function PeriodBarWidget() {
  const { filteredCurvaS, filters, setSelectedPeriod } = useDashboardFilters();

  const handleClick = (data: any) => {
    if (data?.activeLabel) {
      setSelectedPeriod(data.activeLabel);
    }
  };

  return (
    <WidgetWrapper title="Comparativo por Período">
      <div className="h-[260px] sm:h-[300px] lg:h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filteredCurvaS} onClick={handleClick} style={{ cursor: "pointer" }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="period" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(v: number) => formatCurrency(v)}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: "11px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "10px" }} />
            {filters.selectedPeriod && (
              <ReferenceLine x={filters.selectedPeriod} stroke="hsl(var(--accent))" strokeWidth={2} strokeDasharray="4 4" />
            )}
            {filters.seriesVisibility.baseline && (
              <Bar dataKey="baseline" name="Baseline" fill="hsl(var(--chart-1))" opacity={0.7} radius={[2, 2, 0, 0]}>
                {filteredCurvaS.map((entry) => (
                  <Cell
                    key={entry.period}
                    opacity={filters.selectedPeriod && filters.selectedPeriod !== entry.period ? 0.3 : 0.7}
                  />
                ))}
              </Bar>
            )}
            {filters.seriesVisibility.previsto && (
              <Bar dataKey="previsto" name="Previsto" fill="hsl(var(--chart-2))" opacity={0.7} radius={[2, 2, 0, 0]}>
                {filteredCurvaS.map((entry) => (
                  <Cell
                    key={entry.period}
                    opacity={filters.selectedPeriod && filters.selectedPeriod !== entry.period ? 0.3 : 0.7}
                  />
                ))}
              </Bar>
            )}
            {filters.seriesVisibility.realizado && (
              <Bar dataKey="realizado" name="Realizado" fill="hsl(var(--chart-3))" radius={[2, 2, 0, 0]}>
                {filteredCurvaS.map((entry) => (
                  <Cell
                    key={entry.period}
                    opacity={filters.selectedPeriod && filters.selectedPeriod !== entry.period ? 0.3 : 1}
                  />
                ))}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </WidgetWrapper>
  );
}
