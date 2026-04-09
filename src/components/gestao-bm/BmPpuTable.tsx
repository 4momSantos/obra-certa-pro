import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { buildGitecToPpuLookup, aggregateGitecByPpu } from "@/lib/ppu-match";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

const fmtCompact = (v: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", compactDisplay: "short", style: "currency", currency: "BRL" }).format(v);

type SortKey = "item_ppu" | "valor_contratual" | "gitec_bm" | "gitec_acum" | "avanco";

interface PpuRow {
  item_ppu: string;
  descricao: string;
  disciplina: string;
  fase: string;
  valor_contratual: number;
  gitec_bm: number;
  gitec_acum: number;
  avanco: number;
  semaforo: "medido" | "pendente" | "sem_evento";
}

interface Props {
  bmName: string;
  statusFilter: string | null;
  onRowClick?: (itemPpu: string) => void;
}

export function BmPpuTable({ bmName, statusFilter, onRowClick }: Props) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("gitec_bm");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [onlyWithMedicao, setOnlyWithMedicao] = useState(false);
  const PAGE_SIZE = 20;

  // 1. BM period
  const { data: bmPeriodo } = useQuery({
    queryKey: ["bm-periodo", bmName],
    queryFn: async () => {
      const { data } = await supabase
        .from("bm_periodos")
        .select("periodo_inicio, periodo_fim")
        .eq("bm_name", bmName)
        .single();
      return data;
    },
    staleTime: 300_000,
  });

  // 2. PPU items
  const { data: ppuItems, isLoading: ppuLoading } = useQuery({
    queryKey: ["ppu-items-full"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ppu_items")
        .select("item_ppu, item_gitec, descricao, fase, disc, valor_total")
        .order("item_ppu");
      return data ?? [];
    },
    staleTime: 300_000,
  });

  // Build dual-match lookup
  const ppuLookup = useMemo(
    () => (ppuItems ? buildGitecToPpuLookup(ppuItems) : null),
    [ppuItems]
  );

  // 3. GITEC in BM period
  const { data: gitecBmData } = useQuery({
    queryKey: ["gitec-bm-period", bmName],
    enabled: !!bmPeriodo,
    queryFn: async () => {
      if (!bmPeriodo) return [];
      const { data } = await supabase
        .from("gitec_events")
        .select("ippu, valor, status, data_execucao")
        .eq("status", "Aprovado")
        .gte("data_execucao", bmPeriodo.periodo_inicio)
        .lte("data_execucao", bmPeriodo.periodo_fim);
      return data ?? [];
    },
    staleTime: 30_000,
  });

  // 4. GITEC accumulated until end of BM
  const { data: gitecAcumData } = useQuery({
    queryKey: ["gitec-acum", bmName],
    enabled: !!bmPeriodo,
    queryFn: async () => {
      if (!bmPeriodo) return [];
      const { data } = await supabase
        .from("gitec_events")
        .select("ippu, valor, status")
        .eq("status", "Aprovado")
        .lte("data_execucao", bmPeriodo.periodo_fim);
      return data ?? [];
    },
    staleTime: 30_000,
  });

  // 5. Status filter — GITEC events with specific status in period
  const { data: filteredIppus } = useQuery({
    queryKey: ["gitec-filter-ippus", bmName, statusFilter],
    enabled: !!statusFilter && !!bmPeriodo,
    queryFn: async () => {
      if (!bmPeriodo) return new Set<string>();
      const { data: events } = await supabase
        .from("gitec_events")
        .select("ippu")
        .eq("status", statusFilter!)
        .gte("data_execucao", bmPeriodo.periodo_inicio)
        .lte("data_execucao", bmPeriodo.periodo_fim);
      return new Set((events ?? []).map((e) => e.ippu).filter(Boolean) as string[]);
    },
    staleTime: 30_000,
  });

  // Aggregate GITEC by iPPU
  const gitecByIppu = useMemo(() => {
    if (!ppuLookup) {
      // Fallback: direct match only
      const bmMap: Record<string, number> = {};
      for (const e of gitecBmData ?? []) {
        if (e.ippu) bmMap[e.ippu] = (bmMap[e.ippu] ?? 0) + (e.valor ?? 0);
      }
      const acumMap: Record<string, number> = {};
      for (const e of gitecAcumData ?? []) {
        if (e.ippu) acumMap[e.ippu] = (acumMap[e.ippu] ?? 0) + (e.valor ?? 0);
      }
      return { bmMap, acumMap };
    }

    // Use dual match
    const bmAgg = aggregateGitecByPpu(
      (gitecBmData ?? []).map((e) => ({ ippu: e.ippu, valor: e.valor })),
      ppuLookup
    );
    const acumAgg = aggregateGitecByPpu(
      (gitecAcumData ?? []).map((e) => ({ ippu: e.ippu, valor: e.valor })),
      ppuLookup
    );
    return { bmMap: bmAgg.byPpu, acumMap: acumAgg.byPpu };
  }, [gitecBmData, gitecAcumData, ppuLookup]);

  const rows: PpuRow[] = useMemo(() => {
    return (ppuItems ?? []).map((p) => {
      const ippu = p.item_ppu;
      const valorContratual = p.valor_total ?? 0;
      const gitecBm = gitecByIppu.bmMap[ippu] ?? 0;
      const gitecAcum = gitecByIppu.acumMap[ippu] ?? 0;
      const avanco = valorContratual > 0 ? (gitecAcum / valorContratual) * 100 : 0;

      let semaforo: PpuRow["semaforo"] = "sem_evento";
      if (gitecBm > 0) semaforo = "medido";
      else if (gitecAcum > 0) semaforo = "pendente";

      return {
        item_ppu: ippu,
        descricao: p.descricao ?? "",
        disciplina: p.disc ?? "",
        fase: p.fase ?? "",
        valor_contratual: valorContratual,
        gitec_bm: gitecBm,
        gitec_acum: gitecAcum,
        avanco,
        semaforo,
      };
    });
  }, [ppuItems, gitecByIppu]);

  const filtered = useMemo(() => {
    let result = rows;
    if (onlyWithMedicao) {
      result = result.filter((r) => r.gitec_bm > 0);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) => r.item_ppu.toLowerCase().includes(q) || r.descricao.toLowerCase().includes(q)
      );
    }
    if (statusFilter && filteredIppus) {
      result = result.filter((r) => filteredIppus.has(r.item_ppu));
    }
    result.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "string") return sortAsc ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
      return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return result;
  }, [rows, search, statusFilter, filteredIppus, sortKey, sortAsc, onlyWithMedicao]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => ({
        valor_contratual: acc.valor_contratual + r.valor_contratual,
        gitec_bm: acc.gitec_bm + r.gitec_bm,
        gitec_acum: acc.gitec_acum + r.gitec_acum,
      }),
      { valor_contratual: 0, gitec_bm: 0, gitec_acum: 0 }
    );
  }, [filtered]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
    setPage(0);
  };

  const semaforoIcon = (s: PpuRow["semaforo"]) => {
    switch (s) {
      case "medido": return <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" title="Medido neste BM" />;
      case "pendente": return <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" title="Medido em BMs anteriores" />;
      default: return <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground/30" title="Sem medição GITEC" />;
    }
  };

  const SortHeader = ({ label, k, className: cls }: { label: string; k: SortKey; className?: string }) => (
    <TableHead
      className={cn("cursor-pointer select-none text-right text-[11px] hover:text-foreground px-2", cls)}
      onClick={() => handleSort(k)}
    >
      {label} {sortKey === k ? (sortAsc ? "↑" : "↓") : ""}
    </TableHead>
  );

  if (ppuLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">PPUs do {bmName}</h3>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar PPU ou descrição..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
            <Switch
              checked={onlyWithMedicao}
              onCheckedChange={(v) => { setOnlyWithMedicao(v); setPage(0); }}
              className="h-4 w-7"
            />
            Apenas com medição
          </label>
          <span className="text-[10px] text-muted-foreground">{filtered.length} itens</span>
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] w-8 px-1" />
                <TableHead
                  className="text-[11px] cursor-pointer select-none hover:text-foreground px-2"
                  onClick={() => handleSort("item_ppu")}
                >
                  PPU {sortKey === "item_ppu" ? (sortAsc ? "↑" : "↓") : ""}
                </TableHead>
                <TableHead className="text-[11px] px-2">Descrição</TableHead>
                <TableHead className="text-[11px] px-2 hidden lg:table-cell">Disc.</TableHead>
                <SortHeader label="Valor Contratual" k="valor_contratual" />
                <SortHeader label="GITEC no BM" k="gitec_bm" />
                <SortHeader label="GITEC Acum." k="gitec_acum" className="hidden md:table-cell" />
                <SortHeader label="% Avanço" k="avanco" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhum item encontrado para este BM.
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((r) => (
                  <TableRow
                    key={r.item_ppu}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onRowClick?.(r.item_ppu)}
                  >
                    <TableCell className="text-center px-1">{semaforoIcon(r.semaforo)}</TableCell>
                    <TableCell className="font-mono font-bold text-xs px-2 whitespace-nowrap">{r.item_ppu}</TableCell>
                    <TableCell className="text-xs px-2 max-w-[120px] md:max-w-[200px] truncate">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">{r.descricao || "—"}</span>
                        </TooltipTrigger>
                        {r.descricao && (
                          <TooltipContent side="top" className="max-w-xs text-xs">
                            {r.descricao}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell px-2">
                      {r.disciplina && (
                        <Badge variant="secondary" className="text-[9px]">{r.disciplina}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-blue-500 px-2">
                      <span className="hidden sm:inline">{fmtBRL(r.valor_contratual)}</span>
                      <span className="sm:hidden">{fmtCompact(r.valor_contratual)}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-emerald-600 font-semibold px-2">
                      {r.gitec_bm > 0 ? (
                        <>
                          <span className="hidden sm:inline">{fmtBRL(r.gitec_bm)}</span>
                          <span className="sm:hidden">{fmtCompact(r.gitec_bm)}</span>
                        </>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-emerald-500 px-2 hidden md:table-cell">
                      {r.gitec_acum > 0 ? fmtBRL(r.gitec_acum) : "—"}
                    </TableCell>
                    <TableCell className="text-right px-2 w-24">
                      {r.avanco > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <Progress value={Math.min(r.avanco, 100)} className="h-1.5 flex-1" />
                          <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">
                            {r.avanco.toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {paged.length > 0 && (
              <TableFooter>
                <TableRow className="font-semibold text-xs">
                  <TableCell colSpan={3} className="text-right px-2 lg:hidden">Total</TableCell>
                  <TableCell colSpan={4} className="text-right px-2 hidden lg:table-cell">Total</TableCell>
                  <TableCell className="text-right font-mono text-blue-500 px-2">{fmtBRL(totals.valor_contratual)}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-600 px-2">{fmtBRL(totals.gitec_bm)}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-500 px-2 hidden md:table-cell">{fmtBRL(totals.gitec_acum)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground px-2">
                    {totals.valor_contratual > 0 ? (totals.gitec_acum / totals.valor_contratual * 100).toFixed(1) + "%" : "—"}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              Página {page + 1} de {totalPages}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
