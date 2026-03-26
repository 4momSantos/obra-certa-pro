import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { useCronograma } from "@/contexts/CronogramaContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Filter, RotateCcw, Lock, Unlock } from "lucide-react";

export function DashboardSlicers() {
  const { state } = useCronograma();
  const { filters, setPeriodRange, setStatus, resetFilters } = useDashboardFilters();
  const periods = state.periods;

  const startLabel = periods[filters.periodRange[0]]?.label ?? "";
  const endLabel = periods[filters.periodRange[1]]?.label ?? "";

  const hasActiveFilters =
    filters.periodRange[0] !== 0 ||
    filters.periodRange[1] !== periods.length - 1 ||
    filters.status !== "all" ||
    filters.selectedPeriod !== null;

  return (
    <div className="glass-card rounded-xl p-4 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span>Filtros</span>
      </div>

      {/* Period Range Slider */}
      <div className="flex items-center gap-3 flex-1 min-w-[250px]">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Períodos:</span>
        <div className="flex-1">
          <Slider
            min={0}
            max={periods.length - 1}
            step={1}
            value={[filters.periodRange[0], filters.periodRange[1]]}
            onValueChange={(val) => setPeriodRange([val[0], val[1]])}
            className="w-full"
          />
        </div>
        <Badge variant="secondary" className="font-mono text-xs whitespace-nowrap">
          {startLabel} — {endLabel}
        </Badge>
      </div>

      {/* Status Filter */}
      <Select value={filters.status} onValueChange={(v) => setStatus(v as typeof filters.status)}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <span className="flex items-center gap-2">Todos</span>
          </SelectItem>
          <SelectItem value="fechado">
            <span className="flex items-center gap-2"><Lock className="h-3 w-3" /> Fechados</span>
          </SelectItem>
          <SelectItem value="aberto">
            <span className="flex items-center gap-2"><Unlock className="h-3 w-3" /> Abertos</span>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Cross-filter indicator */}
      {filters.selectedPeriod && (
        <Badge variant="default" className="text-xs">
          Selecionado: {filters.selectedPeriod}
        </Badge>
      )}

      {/* Reset */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs gap-1">
          <RotateCcw className="h-3 w-3" />
          Limpar
        </Button>
      )}
    </div>
  );
}
