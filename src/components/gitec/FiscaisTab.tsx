import React, { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useGitecByFiscal, useGitecEvents, defaultFilters, type GitecFiscalRow } from "@/hooks/useGitec";

const fmt = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(0)}K` : `R$ ${v.toFixed(0)}`;

interface Props {
  onFilterFiscal: (fiscal: string) => void;
}

export const FiscaisTab: React.FC<Props> = ({ onFilterFiscal }) => {
  const { data: fiscais, isLoading } = useGitecByFiscal();
  const [selectedFiscal, setSelectedFiscal] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string>("pendente");

  const sorted = useMemo(() => {
    if (!fiscais) return [];
    const arr = [...fiscais];
    switch (sortKey) {
      case "fiscal": return arr.sort((a, b) => a.fiscal.localeCompare(b.fiscal));
      case "total": return arr.sort((a, b) => b.total - a.total);
      case "aprovados": return arr.sort((a, b) => b.aprovados - a.aprovados);
      case "pendente":
      default: return arr.sort((a, b) => (b.val_pend_verif + b.val_pend_aprov) - (a.val_pend_verif + a.val_pend_aprov));
    }
  }, [fiscais, sortKey]);

  const topFiscal = sorted[0];
  const totalFiscais = sorted.length;

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
          <p className="text-2xl font-bold">{totalFiscais}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Maior Valor Pendente</p>
          <p className="text-lg font-bold">{topFiscal?.fiscal ?? "-"}</p>
          <p className="text-xs text-muted-foreground">{fmt((topFiscal?.val_pend_verif ?? 0) + (topFiscal?.val_pend_aprov ?? 0))}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Pendente (todos)</p>
          <p className="text-2xl font-bold">{fmt(sorted.reduce((s, r) => s + r.val_pend_verif + r.val_pend_aprov, 0))}</p>
        </CardContent></Card>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Fiscal" sortKey="fiscal" current={sortKey} onSort={setSortKey} />
              <SortableHead label="Total" sortKey="total" current={sortKey} onSort={setSortKey} className="text-right" />
              <TableHead className="text-right">Aprovados</TableHead>
              <TableHead className="text-right">Pend. Verif.</TableHead>
              <TableHead className="text-right">Pend. Aprov.</TableHead>
              <TableHead className="text-right">R$ Pend. Verif.</TableHead>
              <SortableHead label="R$ Pend. Aprov." sortKey="pendente" current={sortKey} onSort={setSortKey} className="text-right" />
              <TableHead>Proporção</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => {
              const totalPend = r.val_pend_verif + r.val_pend_aprov;
              const isTop = topFiscal && r.fiscal === topFiscal.fiscal;
              const pctAprov = r.total > 0 ? (r.aprovados / r.total) * 100 : 0;
              const pctVerif = r.total > 0 ? (r.pend_verif / r.total) * 100 : 0;
              return (
                <TableRow
                  key={r.fiscal}
                  className={`cursor-pointer hover:bg-muted/50 ${isTop ? "border-l-2 border-l-destructive" : ""}`}
                  onClick={() => setSelectedFiscal(r.fiscal)}
                >
                  <TableCell className="text-sm font-medium">
                    {r.fiscal}
                    {totalPend >= 1e6 && <Badge variant="destructive" className="ml-2 text-[10px]">Alto Volume</Badge>}
                  </TableCell>
                  <TableCell className="text-right text-sm">{r.total}</TableCell>
                  <TableCell className="text-right text-sm">{r.aprovados}</TableCell>
                  <TableCell className="text-right text-sm">{r.pend_verif}</TableCell>
                  <TableCell className="text-right text-sm">{r.pend_aprov}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmt(r.val_pend_verif)}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmt(r.val_pend_aprov)}</TableCell>
                  <TableCell className="w-28">
                    <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                      <div className="bg-primary" style={{ width: `${pctAprov}%` }} />
                      <div className="bg-secondary" style={{ width: `${pctVerif}%` }} />
                      <div className="bg-accent" style={{ width: `${100 - pctAprov - pctVerif}%` }} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Fiscal detail sheet */}
      <FiscalDetailSheet
        fiscal={selectedFiscal}
        open={!!selectedFiscal}
        onClose={() => setSelectedFiscal(null)}
        onFilterPipeline={(f) => { setSelectedFiscal(null); onFilterFiscal(f); }}
        fiscalData={sorted.find(f => f.fiscal === selectedFiscal)}
      />
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

function FiscalDetailSheet({ fiscal, open, onClose, onFilterPipeline, fiscalData }: {
  fiscal: string | null; open: boolean; onClose: () => void;
  onFilterPipeline: (f: string) => void; fiscalData?: GitecFiscalRow;
}) {
  const { data: events } = useGitecEvents(
    { ...defaultFilters, fiscal: fiscal ?? "all" },
    200
  );

  const pendentes = useMemo(() =>
    (events ?? []).filter(e => e.status !== "Aprovado").sort((a, b) => b.aging - a.aging),
    [events]
  );

  const agingBuckets = useMemo(() => {
    const b = { low: 0, mid: 0, high: 0 };
    for (const e of pendentes) {
      if (e.aging <= 30) b.low++;
      else if (e.aging <= 60) b.mid++;
      else b.high++;
    }
    return b;
  }, [pendentes]);

  const totalBuckets = agingBuckets.low + agingBuckets.mid + agingBuckets.high || 1;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {fiscal && fiscalData && (
          <>
            <SheetHeader>
              <SheetTitle>{fiscal}</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Total Eventos</p><p className="font-bold text-lg">{fiscalData.total}</p></div>
                <div><p className="text-xs text-muted-foreground">Aprovados</p><p className="font-bold text-lg">{fiscalData.aprovados}</p></div>
                <div><p className="text-xs text-muted-foreground">R$ Pend. Verif.</p><p className="font-bold">{fmt(fiscalData.val_pend_verif)}</p></div>
                <div><p className="text-xs text-muted-foreground">R$ Pend. Aprov.</p><p className="font-bold">{fmt(fiscalData.val_pend_aprov)}</p></div>
              </div>

              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-2">Distribuição de Aging</p>
                <div className="flex h-6 rounded-lg overflow-hidden">
                  <div className="bg-primary flex items-center justify-center text-[10px] text-primary-foreground" style={{ width: `${(agingBuckets.low / totalBuckets) * 100}%` }}>
                    {agingBuckets.low > 0 && `≤30d (${agingBuckets.low})`}
                  </div>
                  <div className="bg-secondary flex items-center justify-center text-[10px] text-secondary-foreground" style={{ width: `${(agingBuckets.mid / totalBuckets) * 100}%` }}>
                    {agingBuckets.mid > 0 && `31-60d (${agingBuckets.mid})`}
                  </div>
                  <div className="bg-destructive flex items-center justify-center text-[10px] text-destructive-foreground" style={{ width: `${(agingBuckets.high / totalBuckets) * 100}%` }}>
                    {agingBuckets.high > 0 && `>60d (${agingBuckets.high})`}
                  </div>
                </div>
              </div>

              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-2">Eventos Pendentes ({pendentes.length})</p>
                <div className="space-y-1 max-h-[300px] overflow-auto">
                  {pendentes.slice(0, 30).map(e => (
                    <div key={e.id} className="flex items-center justify-between text-xs rounded border p-2">
                      <span className="font-mono">{e.tag || e.ippu || "-"}</span>
                      <span>{e.status}</span>
                      <Badge variant={e.aging > 60 ? "destructive" : "secondary"} className="text-[10px]">{e.aging}d</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <button
                className="w-full text-sm text-primary hover:underline text-center pt-2"
                onClick={() => onFilterPipeline(fiscal)}
              >
                Ver todos os eventos na Pipeline →
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
