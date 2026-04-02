import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useCronograma } from "@/contexts/CronogramaContext";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { evaluateDAX, buildDataContext } from "@/lib/dax-engine";
import { formatCurrency, formatCompact } from "@/lib/format";
import { WidgetWrapper } from "./WidgetWrapper";
import type { WidgetConfig } from "./WidgetConfigurator";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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

interface CustomWidgetRendererProps {
  config: WidgetConfig;
  onRemove?: () => void;
}

export function CustomWidgetRenderer({ config, onRemove }: CustomWidgetRendererProps) {
  const { state, getCurvaS } = useCronograma();
  const { filteredPeriods, filteredCurvaS } = useDashboardFilters();

  const data = useMemo<Record<string, unknown>[]>(() => {
    const source = config.table === "curvaS" ? filteredCurvaS : filteredPeriods;
    return source.map((row) => row as unknown as Record<string, unknown>);
  }, [config.table, filteredCurvaS, filteredPeriods]);

  const measureValues = useMemo(() => {
    const ctx = buildDataContext(
      filteredPeriods, filteredCurvaS, state.valorContratual, state.projectName, state.lastUpdate,
    );
    return config.measures.map((expr) => {
      const result = evaluateDAX(expr, ctx);
      return { expression: expr, ...result };
    });
  }, [config.measures, filteredPeriods, filteredCurvaS, state]);

  const xKey = config.xAxis?.name ?? "label";
  const yKeys = config.yAxis.map((c) => c.name);

  const renderChart = () => {
    switch (config.type) {
      case "bar":
        return (
          <div className="h-[240px] sm:h-[270px] lg:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                {yKeys.map((key, i) => (
                  <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case "line":
        return (
          <div className="h-[240px] sm:h-[270px] lg:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                {yKeys.map((key, i) => (
                  <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 2 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      case "area":
        return (
          <div className="h-[240px] sm:h-[270px] lg:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                {yKeys.map((key, i) => (
                  <Area key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.15} strokeWidth={2} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );

      case "pie":
      case "donut": {
        const pieData = yKeys.map((key, i) => ({
          name: config.yAxis[i]?.displayName ?? key,
          value: data.reduce((sum, row) => sum + (Number(row[key]) || 0), 0),
        }));
        return (
          <div className="h-[240px] sm:h-[270px] lg:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={config.type === "donut" ? "50%" : 0}
                  outerRadius="80%"
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );
      }

      case "table":
        return (
          <div className="overflow-x-auto overflow-y-auto max-h-[250px] sm:max-h-[300px]">
            <table className="w-full text-xs min-w-[400px]">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border/50">
                  {config.xAxis && (
                    <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">{config.xAxis.displayName}</th>
                  )}
                  {config.yAxis.map((col) => (
                    <th key={col.name} className="text-left px-3 py-1.5 font-medium text-muted-foreground">{col.displayName}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                    {config.xAxis && (
                      <td className="px-3 py-1.5 font-mono">{String(row[xKey] ?? "")}</td>
                    )}
                    {yKeys.map((key) => (
                      <td key={key} className="px-3 py-1.5 font-mono">
                        {typeof row[key] === "number" ? formatCurrency(row[key] as number) : String(row[key] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "kpi":
        return (
          <div className="flex flex-col items-center justify-center h-[160px] sm:h-[200px] gap-2">
            {measureValues.length > 0 ? (
              measureValues.map((m, i) => (
                <div key={i} className="text-center">
                  <p className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground">
                    {m.error ? "Erro" : typeof m.value === "number" ? formatCompact(m.value) : String(m.value)}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">{m.expression}</p>
                  {m.error && <p className="text-[10px] text-destructive">{m.error}</p>}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Adicione medidas DAX</p>
            )}
          </div>
        );

      default:
        return <div className="p-4 text-sm text-muted-foreground">Tipo de visual não suportado</div>;
    }
  };

  return (
    <WidgetWrapper title={config.title}>
      <div className="relative">
        {onRemove && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-0 right-0 h-8 w-8 p-0 z-10 opacity-0 hover:opacity-100 transition-opacity"
            onClick={onRemove}
          >
            <X className="h-3 w-3 text-destructive" />
          </Button>
        )}
        {renderChart()}
      </div>
    </WidgetWrapper>
  );
}

export function HtmlWidgetRenderer({ config, onRemove }: {
  config: { id: string; title: string; html: string; css: string };
  onRemove?: () => void;
}) {
  const srcDoc = `
    <html>
      <head>
        <style>
          * { margin: 0; box-sizing: border-box; font-family: Inter, system-ui, sans-serif; }
          body { padding: 12px; background: transparent; }
          ${config.css}
        </style>
      </head>
      <body>${config.html}</body>
    </html>
  `;

  return (
    <WidgetWrapper title={config.title}>
      <div className="relative">
        {onRemove && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-0 right-0 h-8 w-8 p-0 z-10 opacity-0 hover:opacity-100 transition-opacity"
            onClick={onRemove}
          >
            <X className="h-3 w-3 text-destructive" />
          </Button>
        )}
        <iframe
          srcDoc={srcDoc}
          className="w-full h-[250px] border-0 rounded"
          sandbox="allow-scripts"
          title={config.title}
        />
      </div>
    </WidgetWrapper>
  );
}
