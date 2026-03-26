import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { formatCurrency, formatCompact } from "@/lib/format";
import { WidgetWrapper } from "./WidgetWrapper";
import type { CustomWidgetConfig } from "@/lib/custom-widgets";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.5rem",
  fontSize: "11px",
};

function useWidgetData(config: CustomWidgetConfig) {
  const { filteredPeriods, filteredCurvaS, filteredMetrics } = useDashboardFilters();

  return useMemo(() => {
    let rawData: Record<string, any>[] = [];

    switch (config.table) {
      case "periodos":
        rawData = filteredPeriods;
        break;
      case "curva_s":
        rawData = filteredCurvaS;
        break;
      case "metricas":
        rawData = [filteredMetrics];
        break;
      default:
        return [];
    }

    return rawData.map((row) => {
      const point: Record<string, any> = { x: row[config.xAxis] ?? "" };
      config.valueColumns.forEach((col) => {
        point[col] = typeof row[col] === "number" ? row[col] : 0;
      });
      return point;
    });
  }, [config, filteredPeriods, filteredCurvaS, filteredMetrics]);
}

function ChartContent({ config, data }: { config: CustomWidgetConfig; data: Record<string, any>[] }) {
  const { type, valueColumns } = config;

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
        Nenhum dado disponível
      </div>
    );
  }

  if (type === "kpi") {
    const total = data.reduce((s, d) => s + (d[valueColumns[0]] ?? 0), 0);
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className="text-3xl font-bold font-mono">{formatCompact(total)}</p>
        <p className="text-xs text-muted-foreground mt-1">{valueColumns[0]}</p>
      </div>
    );
  }

  if (type === "pie" || type === "donut") {
    const pieData = valueColumns.map((col, i) => ({
      name: col,
      value: data.reduce((s, d) => s + (d[col] ?? 0), 0),
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={type === "donut" ? "50%" : 0}
            outerRadius="75%"
            dataKey="value"
            stroke="none"
            paddingAngle={2}
          >
            {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Pie>
          <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: "10px" }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // Bar, Line, Area
  const ChartComponent = type === "bar" ? BarChart : type === "line" ? LineChart : AreaChart;
  const SeriesComponent = type === "bar" ? Bar : type === "line" ? Line : Area;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ChartComponent data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
        <XAxis dataKey="x" tick={{ fontSize: 9 }} />
        <YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 9 }} />
        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: "10px" }} />
        {valueColumns.map((col, i) => {
          const color = CHART_COLORS[i % CHART_COLORS.length];
          const props: any = {
            key: col,
            dataKey: col,
            name: col,
            stroke: color,
            fill: type === "bar" ? color : type === "area" ? color : undefined,
            fillOpacity: type === "area" ? 0.15 : undefined,
            strokeWidth: type === "bar" ? undefined : 2,
            radius: type === "bar" ? [3, 3, 0, 0] : undefined,
            dot: type === "line" ? { r: 2 } : false,
          };
          return <SeriesComponent {...props} />;
        })}
      </ChartComponent>
    </ResponsiveContainer>
  );
}

// Full widget for the dashboard grid
interface CustomWidgetProps {
  config: CustomWidgetConfig;
  isEditing: boolean;
  onRemove: (id: string) => void;
}

export function CustomWidget({ config, isEditing, onRemove }: CustomWidgetProps) {
  const data = useWidgetData(config);

  return (
    <WidgetWrapper title={config.title}>
      {isEditing && (
        <Button
          variant="destructive"
          size="sm"
          className="absolute top-2 right-10 h-6 w-6 p-0 z-20"
          onClick={(e) => { e.stopPropagation(); onRemove(config.id); }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
      <div className="h-[280px]">
        <ChartContent config={config} data={data} />
      </div>
    </WidgetWrapper>
  );
}

// Preview for the VisualBuilder dialog
export function CustomWidgetPreview({ config }: { config: CustomWidgetConfig }) {
  const data = useWidgetData(config);

  return (
    <div className="h-full">
      <p className="text-xs font-medium mb-1 truncate">{config.title}</p>
      <div className="h-[calc(100%-20px)]">
        <ChartContent config={config} data={data} />
      </div>
    </div>
  );
}
