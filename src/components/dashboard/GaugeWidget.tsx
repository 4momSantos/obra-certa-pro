import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { formatPercent } from "@/lib/format";
import { WidgetWrapper } from "./WidgetWrapper";

export function GaugeWidget() {
  const { filteredMetrics } = useDashboardFilters();
  const percentage = filteredMetrics.avancoFinanceiro;
  const displayPct = Math.min(percentage, 1);

  const data = [
    { name: "Realizado", value: displayPct },
    { name: "Restante", value: 1 - displayPct },
  ];

  const getColor = (pct: number) => {
    if (pct >= 0.8) return "hsl(var(--chart-3))";
    if (pct >= 0.5) return "hsl(var(--chart-2))";
    return "hsl(var(--chart-4))";
  };

  return (
    <WidgetWrapper title="Avanço Financeiro">
      <div className="h-[240px] sm:h-[270px] lg:h-[300px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="60%"
              startAngle={210}
              endAngle={-30}
              innerRadius="60%"
              outerRadius="85%"
              dataKey="value"
              stroke="none"
              cornerRadius={6}
            >
              <Cell fill={getColor(displayPct)} />
              <Cell fill="hsl(var(--muted))" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingTop: "10%" }}>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-extrabold font-mono" style={{ color: getColor(displayPct) }}>
              {formatPercent(percentage)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">do contrato</p>
          </div>
        </div>
      </div>
    </WidgetWrapper>
  );
}
