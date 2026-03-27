import React, { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useGitecByFiscal, type GitecFiscalRow } from "@/hooks/useGitec";

const fmt = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(0)}K` : `R$ ${v.toFixed(0)}`;

interface Props {
  onFilterFiscal: (fiscal: string) => void;
}

export const FiscaisTab: React.FC<Props> = ({ onFilterFiscal }) => {
  const { data: fiscais, isLoading } = useGitecByFiscal();
  const [sortKey, setSortKey] = useState<string>("pendente");

  const sorted = useMemo(() => {
    if (!fiscais) return [];
    const arr = [...fiscais];
    switch (sortKey) {
      case "fiscal": return arr.sort((a, b) => a.fiscal_responsavel.localeCompare(b.fiscal_responsavel));
      case "total": return arr.sort((a, b) => b.total - a.total);
      case "aprovados": return arr.sort((a, b) => b.aprovados - a.aprovados);
      case "pendente":
      default: return arr.sort((a, b) => b.valor_pendente - a.valor_pendente);
    }
  }, [fiscais, sortKey]);

  const topFiscal = sorted[0];

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!fiscais || fiscais.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado de fiscal encontrado</p>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Fiscais Ativos</p>
          <p className="text-2xl font-bold">{sorted.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Maior Valor Pendente</p>
          <p className="text-lg font-bold">{topFiscal?.fiscal_responsavel ?? "-"}</p>
          <p className="text-xs text-muted-foreground">{fmt(topFiscal?.valor_pendente ?? 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Pendente (todos)</p>
          <p className="text-2xl font-bold">{fmt(sorted.reduce((s, r) => s + r.valor_pendente, 0))}</p>
        </CardContent></Card>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Fiscal" sortKey="fiscal" current={sortKey} onSort={setSortKey} />
              <SortableHead label="Total" sortKey="total" current={sortKey} onSort={setSortKey} className="text-right" />
              <SortableHead label="Aprovados" sortKey="aprovados" current={sortKey} onSort={setSortKey} className="text-right" />
              <TableHead className="text-right">Pendentes</TableHead>
              <TableHead className="text-right">R$ Pendente</TableHead>
              <SortableHead label="R$ Aprovado" sortKey="pendente" current={sortKey} onSort={setSortKey} className="text-right" />
              <TableHead>Progresso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => {
              const isTop = topFiscal && r.fiscal_responsavel === topFiscal.fiscal_responsavel;
              const pct = r.total > 0 ? (r.aprovados / r.total) * 100 : 0;
              return (
                <TableRow
                  key={r.fiscal_responsavel}
                  className={`cursor-pointer hover:bg-muted/50 ${isTop ? "border-l-2 border-l-destructive" : ""} ${r.valor_pendente >= 1e6 ? "bg-destructive/5" : ""}`}
                  onClick={() => onFilterFiscal(r.fiscal_responsavel)}
                >
                  <TableCell className="text-sm font-medium">
                    {r.fiscal_responsavel}
                    {r.valor_pendente >= 1e6 && <Badge variant="destructive" className="ml-2 text-[10px]">Alto Volume</Badge>}
                  </TableCell>
                  <TableCell className="text-right text-sm">{r.total}</TableCell>
                  <TableCell className="text-right text-sm">{r.aprovados}</TableCell>
                  <TableCell className="text-right text-sm">{r.pendentes}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmt(r.valor_pendente)}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmt(r.valor_aprovado)}</TableCell>
                  <TableCell className="w-28">
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className="text-[10px] text-muted-foreground w-8 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

function SortableHead({ label, sortKey, current, onSort, className }: {
  label: string; sortKey: string; current: string; onSort: (k: string) => void; className?: string;
}) {
  return (
    <TableHead className={`cursor-pointer select-none ${className ?? ""}`} onClick={() => onSort(sortKey)}>
      {label} {current === sortKey && "↓"}
    </TableHead>
  );
}
