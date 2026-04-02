import { useMemo, memo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useEditorFilters } from "@/contexts/EditorFilterContext";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(340, 65%, 50%)",
  "hsl(45, 80%, 55%)",
];

const sampleData = [
  { name: "Tubulação", value: 3200 },
  { name: "Elétrica", value: 2100 },
  { name: "Civil", value: 1800 },
  { name: "Instrumentação", value: 1400 },
  { name: "Pintura", value: 900 },
];

export function DonutWidgetContent() {
  const { selectedPeriod, setSelectedPeriod } = useEditorFilters();

  const total = useMemo(() => sampleData.reduce((s, d) => s + d.value, 0), []);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={sampleData}
          cx="50%"
          cy="50%"
          innerRadius="55%"
          outerRadius="80%"
          dataKey="value"
          nameKey="name"
          paddingAngle={2}
        >
          {sampleData.map((entry, i) => (
            <Cell
              key={i}
              fill={COLORS[i % COLORS.length]}
              opacity={selectedPeriod && selectedPeriod !== entry.name ? 0.3 : 1}
              cursor="pointer"
              onClick={() =>
                setSelectedPeriod(selectedPeriod === entry.name ? null : entry.name)
              }
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [
            `${value.toLocaleString("pt-BR")} (${((value / total) * 100).toFixed(1)}%)`,
            "Valor",
          ]}
        />
        <Legend
          verticalAlign="bottom"
          height={28}
          formatter={(value: string) => (
            <span className="text-xs text-muted-foreground">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default memo(DonutWidgetContent);
