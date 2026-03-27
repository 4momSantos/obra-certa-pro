import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { useCurvaS } from "@/hooks/useCronogramaData";
import { formatCurrency } from "@/lib/format";
import { WidgetWrapper } from "./WidgetWrapper";

export function CurvaSWidget() {
  const { filteredCurvaS, filters, setSelectedPeriod } = useDashboardFilters();
  const { seriesVisibility } = filters;
  const { data: dbCurvaS } = useCurvaS();

  // Use DB data if available, otherwise fall back to context data
  const chartData = dbCurvaS && dbCurvaS.length > 0
    ? dbCurvaS.map(d => ({
        period: d.label,
        baselineAcum: d.previsto_acum, // baseline = previsto in DB
        previstoAcum: d.previsto_acum,
        projetadoAcum: d.projetado_acum,
        realizadoAcum: d.realizado_acum,
      }))
    : filteredCurvaS;

  const handleClick = (data: any) => {
    if (data?.activeLabel) {
      setSelectedPeriod(data.activeLabel);
    }
  };

  return (
    <WidgetWrapper title="Curva S — Avanço Acumulado">
      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} onClick={handleClick} style={{ cursor: "pointer" }}>
            <defs>
              <linearGradient id="gradBaseline" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradRealizado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="period" tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: "11px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "10px" }} />
            {filters.selectedPeriod && (
              <ReferenceLine
                x={filters.selectedPeriod}
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            )}
            {seriesVisibility.baseline && (
              <Area type="monotone" dataKey="baselineAcum" name="Baseline" stroke="hsl(var(--chart-1))" fill="url(#gradBaseline)" strokeWidth={2} dot={false} />
            )}
            {seriesVisibility.previsto && (
              <Area type="monotone" dataKey="previstoAcum" name="Previsto" stroke="hsl(var(--chart-2))" fill="transparent" strokeWidth={2} strokeDasharray="6 3" dot={false} />
            )}
            {seriesVisibility.projetado && (
              <Area type="monotone" dataKey="projetadoAcum" name="Projetado" stroke="hsl(var(--chart-5))" fill="transparent" strokeWidth={2} strokeDasharray="3 3" dot={false} />
            )}
            {seriesVisibility.realizado && (
              <Area type="monotone" dataKey="realizadoAcum" name="Realizado" stroke="hsl(var(--chart-3))" fill="url(#gradRealizado)" strokeWidth={2.5} dot={{ r: 3 }} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </WidgetWrapper>
  );
}
