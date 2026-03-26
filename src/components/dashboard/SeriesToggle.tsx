import { useDashboardFilters, DashboardFilters } from "@/contexts/DashboardFilterContext";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

const seriesConfig: { key: keyof DashboardFilters["seriesVisibility"]; label: string; color: string }[] = [
  { key: "baseline", label: "Baseline", color: "bg-[hsl(var(--chart-1))]" },
  { key: "previsto", label: "Previsto", color: "bg-[hsl(var(--chart-2))]" },
  { key: "projetado", label: "Projetado", color: "bg-[hsl(var(--chart-5))]" },
  { key: "realizado", label: "Realizado", color: "bg-[hsl(var(--chart-3))]" },
];

export function SeriesToggle() {
  const { filters, toggleSeries } = useDashboardFilters();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground mr-1">Séries:</span>
      {seriesConfig.map((s) => {
        const visible = filters.seriesVisibility[s.key];
        return (
          <Button
            key={s.key}
            variant={visible ? "default" : "outline"}
            size="sm"
            className="h-7 text-[10px] gap-1.5 px-2"
            onClick={() => toggleSeries(s.key)}
          >
            <span className={`h-2 w-2 rounded-full ${visible ? s.color : "bg-muted-foreground/30"}`} />
            {s.label}
            {visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 opacity-50" />}
          </Button>
        );
      })}
    </div>
  );
}
