import { useMemo, memo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { useEditorFilters } from "@/contexts/EditorFilterContext";

const rawData = [
  { name: "BM-01", planned: 100, actual: 90 },
  { name: "BM-02", planned: 150, actual: 170 },
  { name: "BM-03", planned: 200, actual: 180 },
  { name: "BM-04", planned: 120, actual: 140 },
  { name: "BM-05", planned: 180, actual: 160 },
  { name: "BM-06", planned: 250, actual: 270 },
];

export function WaterfallWidgetContent() {
  const { selectedPeriod, periodRange, setSelectedPeriod } = useEditorFilters();

  const data = useMemo(() => {
    let filtered = rawData;
    if (periodRange) filtered = rawData.slice(periodRange[0], periodRange[1] + 1);

    return filtered.map((d) => {
      const diff = d.actual - d.planned;
      return {
        name: d.name,
        value: diff,
        base: diff >= 0 ? d.planned : d.actual,
        fill: diff >= 0 ? "hsl(140, 60%, 45%)" : "hsl(0, 70%, 55%)",
      };
    });
  }, [periodRange]);

  const tickStyle = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={tickStyle} />
        <YAxis tick={tickStyle} />
        <Tooltip
          formatter={(value: number) => [
            `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR")}`,
            "Variação",
          ]}
        />
        {selectedPeriod && (
          <ReferenceLine x={selectedPeriod} stroke="hsl(var(--primary))" strokeDasharray="4 4" strokeWidth={2} />
        )}
        {/* Invisible base bars for offset */}
        <Bar dataKey="base" stackId="stack" fill="transparent" />
        <Bar
          dataKey="value"
          stackId="stack"
          radius={[3, 3, 0, 0]}
          cursor="pointer"
          onClick={(d) => setSelectedPeriod(selectedPeriod === d.name ? null : d.name)}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} opacity={selectedPeriod && selectedPeriod !== entry.name ? 0.4 : 1} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default memo(WaterfallWidgetContent);
