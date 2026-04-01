import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { formatCompact, formatCurrency } from "@/lib/format";
import { WidgetWrapper } from "./WidgetWrapper";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-3))",
];

export function DonutWidget() {
  const { filteredMetrics } = useDashboardFilters();

  const data = [
    { name: "Baseline", value: filteredMetrics.totalBaseline },
    { name: "Previsto", value: filteredMetrics.totalPrevisto },
    { name: "Projetado", value: filteredMetrics.totalProjetado },
    { name: "Realizado", value: filteredMetrics.totalRealizado },
  ];

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
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index]} />
              ))}
            </Pie>
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
          </PieChart>
        </ResponsiveContainer>
        {/* Center text */}
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
