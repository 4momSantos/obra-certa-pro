import { useState, useMemo } from "react";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { formatCurrency } from "@/lib/format";
import { WidgetWrapper } from "./WidgetWrapper";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type SortField = "label" | "baseline" | "previsto" | "projetado" | "realizado" | "adiantamento";
type SortDir = "asc" | "desc";

export function DataTableWidget() {
  const { filteredPeriods, filters, setSelectedPeriod } = useDashboardFilters();
  const [sortField, setSortField] = useState<SortField>("label");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    return [...filteredPeriods].sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
  }, [filteredPeriods, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const columns: { field: SortField; label: string }[] = [
    { field: "label", label: "Período" },
    { field: "baseline", label: "Baseline" },
    { field: "previsto", label: "Previsto" },
    { field: "projetado", label: "Projetado" },
    { field: "realizado", label: "Realizado" },
    { field: "adiantamento", label: "Adiant." },
  ];

  return (
    <WidgetWrapper title="Tabela de Períodos" noPadding>
      <div className="overflow-auto max-h-[380px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border/50">
              {columns.map((col) => (
                <th
                  key={col.field}
                  className="text-left px-3 py-2 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                  onClick={() => toggleSort(col.field)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <SortIcon field={col.field} />
                  </span>
                </th>
              ))}
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const isSelected = filters.selectedPeriod === p.label;
              return (
                <tr
                  key={p.id}
                  className={`border-b border-border/30 cursor-pointer transition-colors ${
                    isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                  } ${filters.selectedPeriod && !isSelected ? "opacity-40" : ""}`}
                  onClick={() => setSelectedPeriod(p.label)}
                >
                  <td className="px-3 py-2 font-mono font-medium">{p.label}</td>
                  <td className="px-3 py-2 font-mono">{formatCurrency(p.baseline)}</td>
                  <td className="px-3 py-2 font-mono">{formatCurrency(p.previsto)}</td>
                  <td className="px-3 py-2 font-mono">{formatCurrency(p.projetado)}</td>
                  <td className="px-3 py-2 font-mono font-medium">{formatCurrency(p.realizado)}</td>
                  <td className="px-3 py-2 font-mono">{formatCurrency(p.adiantamento)}</td>
                  <td className="px-3 py-2">
                    <Badge variant={p.fechado ? "default" : "secondary"} className="text-[9px]">
                      {p.fechado ? "Fechado" : "Aberto"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </WidgetWrapper>
  );
}
