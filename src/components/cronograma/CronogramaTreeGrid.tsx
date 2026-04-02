import React, { useMemo } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCompact } from "@/lib/format";
import type { CronoTreeNode } from "@/hooks/useCronogramaData";

const semaforoColors: Record<string, string> = {
  medido: "bg-emerald-500",
  executado: "bg-amber-500",
  previsto: "bg-blue-500",
  futuro: "bg-muted-foreground/30",
};
const semaforoLabels: Record<string, string> = {
  medido: "MED",
  executado: "EXEC",
  previsto: "PREV",
  futuro: "FUT",
};

interface Props {
  tree: CronoTreeNode[];
  expanded: Set<string>;
  onToggle: (key: string) => void;
  search: string;
  bmFilter: number | null;
  bmFilterValues: Map<string, { previsto: number; projetado: number; realizado: number }>;
  onSelectNode: (node: CronoTreeNode) => void;
}

export function CronogramaTreeGrid({ tree, expanded, onToggle, search, bmFilter, bmFilterValues, onSelectNode }: Props) {
  const lowerSearch = search.toLowerCase();

  const visibleRows = useMemo(() => {
    const filtered = tree.filter(node => {
      // Search filter
      if (lowerSearch) {
        const matchSelf = node.nome.toLowerCase().includes(lowerSearch) || node.ippu.toLowerCase().includes(lowerSearch);
        if (matchSelf) return true;
        // Show parent if child matches
        if (node.nivel.includes("Fase")) {
          return tree.some(n => n.fase_nome === node.nome && (n.nome.toLowerCase().includes(lowerSearch) || n.ippu.toLowerCase().includes(lowerSearch)));
        }
        if (node.nivel.includes("Subfase")) {
          return tree.some(n => n.subfase_nome === node.nome && n.nivel.includes("Agrupamento") && (n.nome.toLowerCase().includes(lowerSearch) || n.ippu.toLowerCase().includes(lowerSearch)));
        }
        return false;
      }
      // Expansion filter
      if (node.nivel.includes("Fase")) return true;
      if (node.nivel.includes("Subfase")) return expanded.has(node.fase_nome);
      if (node.nivel.includes("Agrupamento")) return expanded.has(node.fase_nome) && expanded.has(node.subfase_nome);
      return true;
    });
    return filtered;
  }, [tree, expanded, lowerSearch]);

  // Totals row
  const totals = useMemo(() => {
    const fases = tree.filter(n => n.nivel.includes("Fase"));
    return {
      valor: fases.reduce((s, n) => s + n.valor, 0),
      acum: fases.reduce((s, n) => s + n.acumulado, 0),
      saldo: fases.reduce((s, n) => s + n.saldo, 0),
    };
  }, [tree]);

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="sticky left-0 bg-muted/50 z-10 text-left font-semibold px-3 py-2.5 min-w-[300px]">Nome</th>
              <th className="text-right font-semibold px-3 py-2.5 min-w-[100px]">Valor</th>
              <th className="text-right font-semibold px-3 py-2.5 min-w-[100px]">Acumulado</th>
              <th className="text-right font-semibold px-3 py-2.5 min-w-[100px]">Saldo</th>
              <th className="text-center font-semibold px-2 py-2.5 min-w-[50px]">Sem</th>
              <th className="text-right font-semibold px-2 py-2.5 min-w-[60px]">SCON%</th>
              {bmFilter && (
                <>
                  <th className="text-right font-semibold px-2 py-2.5 min-w-[80px] bg-primary/5">Previsto</th>
                  <th className="text-right font-semibold px-2 py-2.5 min-w-[80px] bg-primary/5">Projetado</th>
                  <th className="text-right font-semibold px-2 py-2.5 min-w-[80px] bg-primary/5">Realizado</th>
                </>
              )}
              <th className="text-right font-semibold px-2 py-2.5 min-w-[50px]">Comps</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(node => {
              const isFase = node.nivel.includes("Fase");
              const isSubfase = node.nivel.includes("Subfase");
              const isAgrup = node.nivel.includes("Agrupamento");
              const indent = isFase ? 0 : isSubfase ? 20 : 40;

              const hasChildren = isFase
                ? tree.some(n => n.nivel.includes("Subfase") && n.fase_nome === node.nome)
                : isSubfase
                  ? tree.some(n => n.nivel.includes("Agrupamento") && n.subfase_nome === node.nome && n.fase_nome === node.fase_nome)
                  : false;

              const isExpanded = expanded.has(node.nome);
              const bmVals = bmFilter ? bmFilterValues.get(node.ippu) : null;

              const rowBg = isFase
                ? "bg-primary/5 border-l-[3px] border-l-primary"
                : isSubfase
                  ? "bg-accent/30 border-l-[3px] border-l-accent"
                  : "border-l-[3px] border-l-border hover:bg-accent/20";

              return (
                <tr
                  key={node.id}
                  className={`border-b transition-colors ${rowBg} ${isAgrup ? "cursor-pointer" : ""}`}
                  onClick={isAgrup ? () => onSelectNode(node) : undefined}
                >
                  <td className="sticky left-0 bg-inherit z-10 px-3 py-2">
                    <div className="flex items-center gap-1" style={{ paddingLeft: indent }}>
                      {hasChildren ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); onToggle(node.nome); }}
                          className="p-0.5 hover:bg-accent rounded shrink-0"
                        >
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          }
                        </button>
                      ) : <span className="w-5 shrink-0" />}
                      <span className={`truncate ${isFase ? "font-bold" : isSubfase ? "font-semibold" : ""}`}>
                        {isAgrup && node.ippu && (
                          <Badge variant="outline" className="mr-1.5 text-[9px] px-1 py-0 font-mono">{node.ippu}</Badge>
                        )}
                        {node.nome}
                      </span>
                    </div>
                  </td>
                  <td className="text-right px-3 py-2 font-mono tabular-nums">{formatCompact(node.valor)}</td>
                  <td className="text-right px-3 py-2 font-mono tabular-nums">{formatCompact(node.acumulado)}</td>
                  <td className="text-right px-3 py-2 font-mono tabular-nums">{formatCompact(node.saldo)}</td>
                  <td className="text-center px-2 py-2">
                    {isAgrup && node.semaforo && (
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase`}>
                        <span className={`h-2 w-2 rounded-full ${semaforoColors[node.semaforo]}`} />
                        {semaforoLabels[node.semaforo]}
                      </span>
                    )}
                  </td>
                  <td className="text-right px-2 py-2 font-mono tabular-nums text-[10px]">
                    {isAgrup && node.scon_avg_avanco !== undefined ? `${node.scon_avg_avanco.toFixed(0)}%` : ""}
                  </td>
                  {bmFilter && (
                    <>
                      <td className="text-right px-2 py-2 font-mono tabular-nums text-[10px] bg-primary/5">
                        {bmVals ? formatCompact(bmVals.previsto) : ""}
                      </td>
                      <td className="text-right px-2 py-2 font-mono tabular-nums text-[10px] bg-primary/5">
                        {bmVals ? formatCompact(bmVals.projetado) : ""}
                      </td>
                      <td className="text-right px-2 py-2 font-mono tabular-nums text-[10px] bg-primary/5">
                        {bmVals ? formatCompact(bmVals.realizado) : ""}
                      </td>
                    </>
                  )}
                  <td className="text-right px-2 py-2 font-mono tabular-nums text-[10px]">
                    {isAgrup && node.scon_total ? node.scon_total : ""}
                  </td>
                </tr>
              );
            })}
            {/* Total row */}
            <tr className="bg-primary text-primary-foreground font-bold sticky bottom-0">
              <td className="sticky left-0 bg-primary z-10 px-3 py-2.5">TOTAL</td>
              <td className="text-right px-3 py-2.5 font-mono">{formatCompact(totals.valor)}</td>
              <td className="text-right px-3 py-2.5 font-mono">{formatCompact(totals.acum)}</td>
              <td className="text-right px-3 py-2.5 font-mono">{formatCompact(totals.saldo)}</td>
              <td></td>
              <td></td>
              {bmFilter && <><td></td><td></td><td></td></>}
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
