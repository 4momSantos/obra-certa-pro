import { useState, useMemo } from "react";
import { MoreVertical, Trash2, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine,
} from "recharts";
import type { DashboardWidget } from "@/hooks/useDashboard";
import { useEditorFilters } from "@/contexts/EditorFilterContext";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(340, 65%, 50%)",
  "hsl(45, 80%, 55%)",
];

const SERIES_COLORS: Record<string, string> = {
  baseline: "hsl(var(--muted-foreground))",
  previsto: "hsl(var(--primary))",
  projetado: "hsl(var(--accent))",
  realizado: "hsl(160, 60%, 45%)",
};

const sampleData = [
  { name: "BM-01", baseline: 100, previsto: 110, projetado: 105, realizado: 95 },
  { name: "BM-02", baseline: 200, previsto: 190, projetado: 210, realizado: 180 },
  { name: "BM-03", baseline: 350, previsto: 340, projetado: 360, realizado: 320 },
  { name: "BM-04", baseline: 500, previsto: 480, projetado: 510, realizado: 470 },
  { name: "BM-05", baseline: 650, previsto: 630, projetado: 660, realizado: 610 },
  { name: "BM-06", baseline: 800, previsto: 790, projetado: 820, realizado: 760 },
];

function ChartContent({ type }: { type: string }) {
  const { selectedPeriod, periodRange, seriesVisibility, setSelectedPeriod } = useEditorFilters();

  const filteredData = useMemo(() => {
    let data = sampleData;
    if (periodRange) {
      data = data.slice(periodRange[0], periodRange[1] + 1);
    }
    return data;
  }, [periodRange]);

  const visibleSeries = useMemo(
    () => Object.entries(seriesVisibility).filter(([, v]) => v).map(([k]) => k),
    [seriesVisibility]
  );

  const handleBarClick = (data: { name?: string }) => {
    if (data?.name) {
      setSelectedPeriod(selectedPeriod === data.name ? null : data.name);
    }
  };

  const commonProps = { data: filteredData, margin: { top: 5, right: 20, bottom: 5, left: 0 } };
  const tickStyle = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

  switch (type) {
    case "bar":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={tickStyle} />
            <YAxis tick={tickStyle} />
            <Tooltip />
            {selectedPeriod && (
              <ReferenceLine x={selectedPeriod} stroke="hsl(var(--primary))" strokeDasharray="4 4" strokeWidth={2} />
            )}
            {visibleSeries.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                fill={SERIES_COLORS[key] || CHART_COLORS[i % CHART_COLORS.length]}
                radius={[3, 3, 0, 0]}
                opacity={selectedPeriod ? 0.6 : 1}
                onClick={(d) => handleBarClick(d)}
                cursor="pointer"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    case "line":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={tickStyle} />
            <YAxis tick={tickStyle} />
            <Tooltip />
            {selectedPeriod && (
              <ReferenceLine x={selectedPeriod} stroke="hsl(var(--primary))" strokeDasharray="4 4" strokeWidth={2} />
            )}
            {visibleSeries.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={SERIES_COLORS[key] || CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5, onClick: (_: unknown, payload: { payload?: { name?: string } }) => handleBarClick(payload?.payload ?? {}) }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    case "area":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={tickStyle} />
            <YAxis tick={tickStyle} />
            <Tooltip />
            {selectedPeriod && (
              <ReferenceLine x={selectedPeriod} stroke="hsl(var(--primary))" strokeDasharray="4 4" strokeWidth={2} />
            )}
            {visibleSeries.map((key, i) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                fill={SERIES_COLORS[key] || CHART_COLORS[i % CHART_COLORS.length]}
                fillOpacity={0.15}
                stroke={SERIES_COLORS[key] || CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    case "pie":
    case "donut":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filteredData}
              cx="50%"
              cy="50%"
              innerRadius={type === "donut" ? "55%" : 0}
              outerRadius="80%"
              dataKey={visibleSeries[0] || "baseline"}
              nameKey="name"
              paddingAngle={2}
            >
              {filteredData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  opacity={selectedPeriod && entry.name !== selectedPeriod ? 0.3 : 1}
                  cursor="pointer"
                  onClick={() => handleBarClick(entry)}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    case "kpi": {
      const total = filteredData.reduce((s, d) => s + (d[visibleSeries[0] as keyof typeof d] as number ?? 0), 0);
      return (
        <div className="flex flex-col items-center justify-center h-full gap-1">
          <span className="text-3xl font-bold text-foreground">{total.toLocaleString("pt-BR")}</span>
          <span className="text-xs text-muted-foreground capitalize">{visibleSeries[0] || "baseline"}</span>
        </div>
      );
    }
    default:
      return (
        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
          Widget tipo "{type}" — em breve
        </div>
      );
  }
}

interface Props {
  widget: DashboardWidget;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}

export function WidgetRenderer({ widget, onDelete, readOnly }: Props) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <>
      <Card className="h-full flex flex-col border border-border/50 bg-card">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4 space-y-0">
          <CardTitle className="text-sm font-medium truncate">{widget.title}</CardTitle>
          {!readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem disabled>
                  <Settings className="h-3.5 w-3.5 mr-2" /> Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>
        <CardContent className="flex-1 p-3 pt-0 min-h-[160px]">
          <ChartContent type={widget.type} />
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover widget</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{widget.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDelete(widget.id)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
