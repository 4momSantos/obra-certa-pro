import { useMemo, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAllBMValues, useBMSummary } from "@/hooks/useBMData";
import { useCronogramaTree, useGitecEventosByIppu } from "@/hooks/useCronogramaData";
import { formatCurrencyFull } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

type GroupLevel = "agrupamento" | "subfase" | "fase";

function fmtK(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
}

interface CellSelection {
  key: string; // grouping key (ippu or fase/subfase name)
  label: string;
  bm: string;
  ippus: string[]; // all ippus in this group (for gitec lookup)
}

function CellDetailPopover({
  cell,
  matrix,
  onClose,
}: {
  cell: CellSelection;
  matrix: Record<string, Record<string, Record<string, number>>>;
  onClose: () => void;
}) {
  // Use first ippu for gitec events (only meaningful at agrupamento level)
  const { data: gitecEvents } = useGitecEventosByIppu(cell.ippus.length === 1 ? cell.ippus[0] : null);

  // Aggregate values across all ippus in the group
  const totals = useMemo(() => {
    let prev = 0, real = 0, proj = 0;
    cell.ippus.forEach((ippu) => {
      const c = matrix[ippu]?.[cell.bm];
      if (c) {
        prev += c.Previsto || 0;
        real += c.Realizado || 0;
        proj += c.Projetado || 0;
      }
    });
    return { prev, real, proj };
  }, [cell, matrix]);

  const filteredEvents = useMemo(() => {
    if (!gitecEvents) return [];
    return gitecEvents.filter((e) => e.bm_name === cell.bm);
  }, [gitecEvents, cell.bm]);

  return (
    <div className="space-y-3 max-w-[320px]">
      <div>
        <p className="text-xs text-muted-foreground">Item</p>
        <p className="text-sm font-semibold truncate">{cell.label}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{cell.bm}</p>
        <div className="grid grid-cols-3 gap-2 mt-1">
          <div>
            <p className="text-[10px] text-muted-foreground">Previsto</p>
            <p className="text-sm font-mono text-primary">{formatCurrencyFull(totals.prev)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Projetado</p>
            <p className="text-sm font-mono text-amber-600">{formatCurrencyFull(totals.proj)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Realizado</p>
            <p className="text-sm font-mono text-emerald-700">{formatCurrencyFull(totals.real)}</p>
          </div>
        </div>
      </div>

      {cell.ippus.length === 1 && filteredEvents.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1">Eventos GITEC ({filteredEvents.length})</p>
          <div className="max-h-[160px] overflow-y-auto space-y-1">
            {filteredEvents.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between text-[10px] border-b border-border/50 py-0.5">
                <span className="font-mono truncate max-w-[120px]" title={ev.tag}>{ev.tag}</span>
                <span className="text-muted-foreground">{ev.etapa}</span>
                <Badge variant={ev.status === "Aprovado" ? "default" : "secondary"} className="text-[9px] h-4">
                  {ev.status}
                </Badge>
                <span className="font-mono">{fmtK(ev.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {cell.ippus.length > 1 && (
        <p className="text-[10px] text-muted-foreground italic">
          Agrupamento com {cell.ippus.length} iPPUs — detalhe GITEC disponível na visão por Agrupamento.
        </p>
      )}
    </div>
  );
}

export function ComparativoTab() {
  const { data: bmValues, isLoading } = useAllBMValues();
  const { data: tree } = useCronogramaTree();
  const summary = useBMSummary(bmValues);
  const [groupLevel, setGroupLevel] = useState<GroupLevel>("agrupamento");
  const [selectedCell, setSelectedCell] = useState<CellSelection | null>(null);

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

    // BM columns
    const maxBM = Math.min(summary.ultimoBM + 3, 22);
    const cols = Array.from({ length: maxBM }, (_, i) => `BM-${String(i + 1).padStart(2, "0")}`);

    // Build rows based on grouping level
    const agrups = tree.filter((n) => n.nivel.includes("Agrupamento"));

    if (groupLevel === "agrupamento") {
      const sorted = agrups.sort((a, b) => b.valor - a.valor).slice(0, 50);
      return {
        matrix: m,
        bmColumns: cols,
        rows: sorted.map((a) => ({
          key: a.ippu,
          label: `${a.ippu} — ${a.nome}`,
          shortLabel: a.ippu,
          nome: a.nome,
          sconAvg: a.scon_avg_avanco,
          valor: a.valor,
          ippus: [a.ippu],
        })),
      };
    }

    // Group by fase or subfase
    const groupField = groupLevel === "fase" ? "fase_nome" : "subfase_nome";
    const groups: Record<string, { valor: number; sconSum: number; sconCount: number; ippus: string[] }> = {};
    agrups.forEach((a) => {
      const gName = a[groupField] || "Sem classificação";
      if (!groups[gName]) groups[gName] = { valor: 0, sconSum: 0, sconCount: 0, ippus: [] };
      groups[gName].valor += a.valor;
      if (a.scon_avg_avanco != null) {
        groups[gName].sconSum += a.scon_avg_avanco;
        groups[gName].sconCount += 1;
      }
      groups[gName].ippus.push(a.ippu);
    });

    const groupRows = Object.entries(groups)
      .sort(([, a], [, b]) => b.valor - a.valor)
      .slice(0, 50)
      .map(([name, g]) => ({
        key: name,
        label: name,
        shortLabel: name,
        nome: "",
        sconAvg: g.sconCount > 0 ? g.sconSum / g.sconCount : null,
        valor: g.valor,
        ippus: g.ippus,
      }));

    return { matrix: m, bmColumns: cols, rows: groupRows };
  }, [bmValues, tree, summary.ultimoBM, groupLevel]);

  // Compute aggregated cell values for grouped rows
  const getCellValues = (ippus: string[], bm: string) => {
    let prev = 0, real = 0, proj = 0;
    ippus.forEach((ippu) => {
      const cell = matrix[ippu]?.[bm];
      if (cell) {
        prev += cell.Previsto || 0;
        real += cell.Realizado || 0;
        proj += cell.Projetado || 0;
      }
    });
    return { prev, real, proj };
  };

  const levelLabels: Record<GroupLevel, string> = {
    agrupamento: "Agrupamento (iPPU)",
    subfase: "Subfase",
    fase: "Fase",
  };

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>;

  if (rows.length === 0) return <p className="text-sm text-muted-foreground text-center py-12">Nenhum dado disponível para o comparativo</p>;

  return (
    <div className="space-y-3">
      {/* Grouping selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Agrupar por:</span>
        <Select value={groupLevel} onValueChange={(v) => { setGroupLevel(v as GroupLevel); setSelectedCell(null); }}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="agrupamento">Agrupamento (iPPU)</SelectItem>
            <SelectItem value="subfase">Subfase</SelectItem>
            <SelectItem value="fase">Fase</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="w-full">
        <div className="min-w-max">
          <table className="text-[9px] border-collapse w-full">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-background px-2 py-1.5 text-left font-semibold text-[10px] border-b border-r min-w-[260px] max-w-[320px]">
                  {levelLabels[groupLevel]}
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
                <tr key={row.key} className="hover:bg-muted/30">
                  <td
                    className="sticky left-0 z-10 bg-background px-2 py-1 border-b border-r text-[10px] truncate max-w-[320px]"
                    title={row.label}
                  >
                    {groupLevel === "agrupamento" ? (
                      <span>
                        <span className="font-mono font-semibold">{row.shortLabel}</span>
                        <span className="text-muted-foreground ml-1">— {row.nome}</span>
                      </span>
                    ) : (
                      <span className="font-semibold">{row.shortLabel}</span>
                    )}
                  </td>
                  <td className="px-2 py-1 text-right border-b border-r font-mono">
                    {row.sconAvg != null ? `${row.sconAvg.toFixed(0)}%` : "—"}
                  </td>
                  {bmColumns.map((bm) => {
                    const { prev, real, proj } = getCellValues(row.ippus, bm);
                    const hasData = prev > 0 || real > 0 || proj > 0;
                    const bg = real > 0
                      ? "bg-emerald-500/10"
                      : prev > 0
                      ? "bg-primary/5"
                      : "bg-muted/30";

                    const cellKey = `${row.key}__${bm}`;
                    const isOpen = selectedCell?.key === row.key && selectedCell?.bm === bm;

                    return (
                      <td key={bm} className={`px-1.5 py-1 text-center border-b ${bg}`}>
                        {hasData ? (
                          <Popover
                            open={isOpen}
                            onOpenChange={(open) => {
                              if (open) {
                                setSelectedCell({ key: row.key, label: row.label, bm, ippus: row.ippus });
                              } else {
                                setSelectedCell(null);
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <button className="w-full text-left cursor-pointer hover:bg-accent/20 rounded px-0.5 -mx-0.5">
                                <div className="space-y-0">
                                  <div className="text-primary/80">P: {fmtK(prev)}</div>
                                  {real > 0 && <div className="text-emerald-700 font-bold">R: {fmtK(real)}</div>}
                                </div>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto min-w-[280px]" side="bottom" align="start">
                              <CellDetailPopover cell={selectedCell!} matrix={matrix} onClose={() => setSelectedCell(null)} />
                            </PopoverContent>
                          </Popover>
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
    </div>
  );
}
