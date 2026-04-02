import { useMemo } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllBMValues, useBMSummary } from "@/hooks/useBMData";
import { useCronogramaTree } from "@/hooks/useCronogramaData";

function fmtK(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
}

export function ComparativoTab() {
  const { data: bmValues, isLoading } = useAllBMValues();
  const { data: tree } = useCronogramaTree();
  const summary = useBMSummary(bmValues);

  const { matrix, bmColumns, rows } = useMemo(() => {
    if (!bmValues || !tree) return { matrix: {} as any, bmColumns: [] as string[], rows: [] as any[] };

    // Build matrix: ippu -> bm_name -> { Previsto, Realizado, Projetado }
    const m: Record<string, Record<string, Record<string, number>>> = {};
    bmValues.forEach((v) => {
      if (!v.ippu) return;
      if (!m[v.ippu]) m[v.ippu] = {};
      if (!m[v.ippu][v.bm_name]) m[v.ippu][v.bm_name] = {};
      m[v.ippu][v.bm_name][v.tipo] = (m[v.ippu][v.bm_name][v.tipo] || 0) + v.valor;
    });

    // Top 50 agrupamentos by valor from tree
    const agrups = tree
      .filter((n) => n.nivel.includes("Agrupamento"))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 50);

    // BM columns: up to ultimoBM + 3
    const maxBM = Math.min(summary.ultimoBM + 3, 22);
    const cols = Array.from({ length: maxBM }, (_, i) => `BM-${String(i + 1).padStart(2, "0")}`);

    return {
      matrix: m,
      bmColumns: cols,
      rows: agrups.map((a) => ({
        ippu: a.ippu,
        nome: a.nome,
        sconAvg: a.scon_avg_avanco,
        valor: a.valor,
      })),
    };
  }, [bmValues, tree, summary.ultimoBM]);

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>;

  if (rows.length === 0) return <p className="text-sm text-muted-foreground text-center py-12">Nenhum dado disponível para o comparativo</p>;

  return (
    <ScrollArea className="w-full">
      <div className="min-w-max">
        <table className="text-[9px] border-collapse w-full">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-background px-2 py-1.5 text-left font-semibold text-[10px] border-b border-r min-w-[160px]">
                iPPU
              </th>
              <th className="px-2 py-1.5 text-right font-semibold text-[10px] border-b border-r min-w-[50px]">SCON%</th>
              {bmColumns.map((bm) => (
                <th key={bm} className="px-1.5 py-1.5 text-center font-semibold text-[10px] border-b min-w-[70px]">
                  {bm}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.ippu} className="hover:bg-muted/30 cursor-pointer">
                <td className="sticky left-0 z-10 bg-background px-2 py-1 border-b border-r font-mono text-[10px] truncate max-w-[160px]" title={`${row.ippu} — ${row.nome}`}>
                  {row.ippu}
                </td>
                <td className="px-2 py-1 text-right border-b border-r font-mono">
                  {row.sconAvg != null ? `${row.sconAvg.toFixed(0)}%` : "—"}
                </td>
                {bmColumns.map((bm) => {
                  const cell = matrix[row.ippu]?.[bm];
                  const prev = cell?.Previsto || 0;
                  const real = cell?.Realizado || 0;
                  const bg = real > 0
                    ? "bg-emerald-500/10"
                    : prev > 0
                    ? "bg-primary/5"
                    : "bg-muted/30";
                  return (
                    <td key={bm} className={`px-1.5 py-1 text-center border-b ${bg}`}>
                      {prev > 0 || real > 0 ? (
                        <div className="space-y-0">
                          <div className="text-primary/80">P: {fmtK(prev)}</div>
                          {real > 0 && <div className="text-emerald-700 font-bold">R: {fmtK(real)}</div>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
