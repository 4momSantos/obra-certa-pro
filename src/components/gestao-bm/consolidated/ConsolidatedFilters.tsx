import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, FilterX } from "lucide-react";

interface ConsolidatedFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  fases: string[];
  faseFilter: string;
  onFaseChange: (v: string) => void;
  semaforoFilter: string[];
  onSemaforoToggle: (s: string) => void;
  saldoOnly: boolean;
  onSaldoToggle: () => void;
  onClear: () => void;
  hasFilters: boolean;
}

const SEMAFOROS = [
  { key: "medido", label: "Medido", color: "bg-green-500" },
  { key: "executado", label: "Executado", color: "bg-amber-500" },
  { key: "previsto", label: "Previsto", color: "bg-blue-500" },
  { key: "futuro", label: "Futuro", color: "bg-muted-foreground/30" },
];

export function ConsolidatedFilters({
  search,
  onSearchChange,
  fases,
  faseFilter,
  onFaseChange,
  semaforoFilter,
  onSemaforoToggle,
  saldoOnly,
  onSaldoToggle,
  onClear,
  hasFilters,
}: ConsolidatedFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative w-full max-w-[220px]">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou iPPU..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Fase selector */}
      <Select value={faseFilter} onValueChange={onFaseChange}>
        <SelectTrigger className="h-9 w-[180px] text-xs">
          <SelectValue placeholder="Todas as fases" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todas as fases</SelectItem>
          {fases.map((f) => (
            <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Semáforo toggles */}
      <div className="flex items-center gap-1">
        {SEMAFOROS.map((s) => (
          <button
            key={s.key}
            onClick={() => onSemaforoToggle(s.key)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${
              semaforoFilter.includes(s.key)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-accent"
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${s.color}`} />
            {s.label}
          </button>
        ))}
      </div>

      {/* Saldo toggle */}
      <Button
        variant={saldoOnly ? "default" : "outline"}
        size="sm"
        onClick={onSaldoToggle}
        className="h-8 text-[10px]"
      >
        Só com saldo
      </Button>

      {/* Clear */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-8 text-[10px] gap-1">
          <FilterX className="h-3 w-3" />
          Limpar
        </Button>
      )}
    </div>
  );
}
