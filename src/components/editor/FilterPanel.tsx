import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { useEditorFilters } from "@/contexts/EditorFilterContext";

const SERIES_OPTIONS = [
  { key: "baseline", label: "Baseline" },
  { key: "previsto", label: "Previsto" },
  { key: "projetado", label: "Projetado" },
  { key: "realizado", label: "Realizado" },
];

interface Props {
  periodCount?: number;
  periodLabels?: string[];
}

export function FilterPanel({ periodCount = 30, periodLabels }: Props) {
  const {
    periodRange, statusFilter, seriesVisibility,
    setPeriodRange, setStatusFilter, setSeriesVisibility,
    clearAllFilters, activeFilterCount,
  } = useEditorFilters();

  const rangeValue = periodRange ?? [0, periodCount - 1];

  const getRangeLabel = (idx: number) => {
    if (periodLabels && periodLabels[idx]) return periodLabels[idx];
    return `BM-${String(idx + 1).padStart(2, "0")}`;
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative" title="Filtros">
          <Filter className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-80 sm:w-96">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            Filtros
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={clearAllFilters}>
                <X className="h-3 w-3" /> Limpar
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Period Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Range de Períodos</Label>
            <Slider
              min={0}
              max={periodCount - 1}
              step={1}
              value={rangeValue}
              onValueChange={(val) => {
                if (val[0] === 0 && val[1] === periodCount - 1) {
                  setPeriodRange(null);
                } else {
                  setPeriodRange([val[0], val[1]]);
                }
              }}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{getRangeLabel(rangeValue[0])}</span>
              <span>{getRangeLabel(rangeValue[1])}</span>
            </div>
          </div>

          <Separator />

          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "open" | "closed")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Abertos</SelectItem>
                <SelectItem value="closed">Fechados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Series Visibility */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Séries</Label>
            <div className="space-y-2">
              {SERIES_OPTIONS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`series-${key}`}
                    checked={seriesVisibility[key] !== false}
                    onCheckedChange={(checked) => setSeriesVisibility(key, !!checked)}
                  />
                  <label htmlFor={`series-${key}`} className="text-sm cursor-pointer">
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
