import { useMemo, useState, memo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEditorFilters } from "@/contexts/EditorFilterContext";

const sampleRows = [
  { name: "BM-01", disciplina: "Tubulação", status: "Fechado", previsto: 100, realizado: 95, variacao: -5 },
  { name: "BM-02", disciplina: "Elétrica", status: "Fechado", previsto: 150, realizado: 170, variacao: 13.3 },
  { name: "BM-03", disciplina: "Civil", status: "Aberto", previsto: 200, realizado: 180, variacao: -10 },
  { name: "BM-04", disciplina: "Instrumentação", status: "Aberto", previsto: 120, realizado: 140, variacao: 16.7 },
  { name: "BM-05", disciplina: "Pintura", status: "Fechado", previsto: 180, realizado: 160, variacao: -11.1 },
  { name: "BM-06", disciplina: "Tubulação", status: "Aberto", previsto: 250, realizado: 270, variacao: 8 },
];

type SortKey = "name" | "disciplina" | "previsto" | "realizado" | "variacao";

export function TableWidgetContent() {
  const { selectedPeriod, periodRange, statusFilter, setSelectedPeriod } = useEditorFilters();
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    let rows = sampleRows;
    if (periodRange) rows = rows.slice(periodRange[0], periodRange[1] + 1);
    if (statusFilter === "open") rows = rows.filter((r) => r.status === "Aberto");
    if (statusFilter === "closed") rows = rows.filter((r) => r.status === "Fechado");
    return [...rows].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "number" && typeof vb === "number") return sortAsc ? va - vb : vb - va;
      return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }, [periodRange, statusFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortAsc ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Sem dados para os filtros atuais
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full">
      <Table>
        <TableHeader>
          <TableRow>
            {(["name", "disciplina", "previsto", "realizado", "variacao"] as SortKey[]).map((col) => (
              <TableHead
                key={col}
                className="cursor-pointer select-none text-xs whitespace-nowrap"
                onClick={() => toggleSort(col)}
              >
                <span className="flex items-center">
                  {col === "name" ? "Período" : col === "disciplina" ? "Disciplina" : col === "previsto" ? "Previsto" : col === "realizado" ? "Realizado" : "Variação"}
                  <SortIcon col={col} />
                </span>
              </TableHead>
            ))}
            <TableHead className="text-xs">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((row) => (
            <TableRow
              key={row.name}
              className={`cursor-pointer transition-colors ${selectedPeriod === row.name ? "bg-accent" : "hover:bg-muted/50"}`}
              onClick={() => setSelectedPeriod(selectedPeriod === row.name ? null : row.name)}
            >
              <TableCell className="text-xs font-medium">{row.name}</TableCell>
              <TableCell className="text-xs">{row.disciplina}</TableCell>
              <TableCell className="text-xs">{row.previsto.toLocaleString("pt-BR")}</TableCell>
              <TableCell className="text-xs">{row.realizado.toLocaleString("pt-BR")}</TableCell>
              <TableCell className="text-xs">
                <span className={row.variacao >= 0 ? "text-green-600" : "text-red-600"}>
                  {row.variacao >= 0 ? "+" : ""}{row.variacao.toFixed(1)}%
                </span>
              </TableCell>
              <TableCell>
                <Badge
                  variant={row.status === "Fechado" ? "default" : "secondary"}
                  className="text-[10px] px-1.5 py-0"
                >
                  {row.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default memo(TableWidgetContent);
