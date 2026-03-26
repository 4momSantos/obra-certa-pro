import { useMemo, memo } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useEditorFilters } from "@/contexts/EditorFilterContext";

const sampleKPIs = {
  value: 4250000,
  previousValue: 3900000,
  max: 6000000,
  label: "Valor Realizado",
  format: "currency" as const,
};

function formatValue(value: number, format: string) {
  switch (format) {
    case "currency":
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
    case "percent":
      return `${value.toFixed(1)}%`;
    case "integer":
      return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
    default:
      return value.toLocaleString("pt-BR");
  }
}

export function KPIWidgetContent() {
  const { periodRange } = useEditorFilters();

  const data = useMemo(() => {
    // Simulate filter effect
    const factor = periodRange ? (periodRange[1] - periodRange[0] + 1) / 6 : 1;
    return {
      value: Math.round(sampleKPIs.value * factor),
      previousValue: Math.round(sampleKPIs.previousValue * factor),
      max: sampleKPIs.max,
      label: sampleKPIs.label,
      format: sampleKPIs.format,
    };
  }, [periodRange]);

  const variation = data.previousValue > 0
    ? ((data.value - data.previousValue) / data.previousValue) * 100
    : 0;
  const progressPct = data.max > 0 ? Math.min((data.value / data.max) * 100, 100) : 0;
  const isPositive = variation >= 0;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 px-2">
      <span className="text-xs text-muted-foreground">{data.label}</span>
      <span className="text-2xl font-bold text-foreground">
        {formatValue(data.value, data.format)}
      </span>
      <div className="flex items-center gap-1 text-xs">
        {isPositive ? (
          <ArrowUp className="h-3 w-3 text-green-600" />
        ) : (
          <ArrowDown className="h-3 w-3 text-red-600" />
        )}
        <span className={isPositive ? "text-green-600" : "text-red-600"}>
          {isPositive ? "+" : ""}{variation.toFixed(1)}%
        </span>
        <span className="text-muted-foreground">vs anterior</span>
      </div>
      {data.max > 0 && (
        <div className="w-full max-w-[160px]">
          <Progress value={progressPct} className="h-1.5" />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
            <span>{formatValue(data.value, data.format)}</span>
            <span>{formatValue(data.max, data.format)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(KPIWidgetContent);
