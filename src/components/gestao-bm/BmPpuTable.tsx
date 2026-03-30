import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { bmRange } from "@/lib/bm-utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

const fmtCompact = (v: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", compactDisplay: "short", style: "currency", currency: "BRL" }).format(v);

type SortKey = "item_ppu" | "previsto" | "projetado" | "executado" | "gitec_aprovado" | "gitec_pendente" | "gap";

interface PpuRow {
  item_ppu: string;
  descricao: string;
  disciplina: string;
  previsto: number;
  projetado: number;
  executado: number;
  gitec_aprovado: number;
  gitec_pendente: number;
  gap: number;
  semaforo: "medido" | "processo" | "previsto" | "futuro";
}

interface Props {
  bmName: string;
  statusFilter: string | null;
  onRowClick?: (itemPpu: string) => void;
}

export function BmPpuTable({ bmName, statusFilter, onRowClick }: Props) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("gap");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const { data: cronoData, isLoading: cronoLoading } = useQuery({
    queryKey: ["bm-crono-ippu", bmName],
    queryFn: async () => {
      const { data } = await supabase
        .from("vw_cronograma_bm_por_ippu")
        .select("ippu, previsto, projetado, realizado")
        .eq("bm_name", bmName);
      return data ?? [];
    },
    staleTime: 30_000,
  });

  // 3 sources for descriptions: cronograma_tree, classificacao_ppu, ppu_items
  const { data: treeNames } = useQuery({
    queryKey: ["crono-tree-names"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cronograma_tree")
        .select("ippu, nome")
        .neq("ippu", "")
        .not("ippu", "is", null);
      return data ?? [];
    },
    staleTime: 120_000,
  });

  const { data: classifData } = useQuery({
    queryKey: ["classif-ppu-disc"],
    queryFn: async () => {
      const { data } = await supabase
        .from("classificacao_ppu")
        .select("item_ppu, disciplina");
      return data ?? [];
    },
    staleTime: 120_000,
  });

  const { data: ppuItems } = useQuery({
    queryKey: ["ppu-items-desc"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ppu_items")
        .select("item_ppu, descricao, disc")
        .limit(2000);
      return data ?? [];
    },
    staleTime: 120_000,
  });

  // Use gitec_by_ippu view instead of raw aggregation
  const { data: gitecByPpu } = useQuery({
    queryKey: ["gitec-by-ippu-view"],
    queryFn: async () => {
      const { data } = await supabase
        .from("gitec_by_ippu")
        .select("ippu, val_aprovado, val_pend_verif, val_pend_aprov");
      const agg: Record<string, { approved: number; pending: number; hasEvents: boolean }> = {};
      for (const e of data ?? []) {
        agg[e.ippu ?? ""] = {
          approved: e.val_aprovado ?? 0,
          pending: (e.val_pend_verif ?? 0) + (e.val_pend_aprov ?? 0),
          hasEvents: true,
        };
      }
      return agg;
    },
    staleTime: 30_000,
  });

  const { data: filteredIppus } = useQuery({
    queryKey: ["gitec-filter-ippus", bmName, statusFilter],
    enabled: !!statusFilter,
    queryFn: async () => {
      const range = bmRange(bmName);
      const start = range.start.toISOString().split("T")[0];
      const end = range.end.toISOString().split("T")[0];
      const { data: events } = await supabase
        .from("gitec_events")
        .select("ippu")
        .eq("status", statusFilter!)
        .gte("data_execucao", start)
        .lte("data_execucao", end);
      return new Set((events ?? []).map((e) => e.ippu));
    },
    staleTime: 30_000,
  });

  // Build ppuMap with fallback: ppu_items > cronograma_tree for desc, classificacao_ppu for disc
  const ppuMap = useMemo(() => {
    const m: Record<string, { descricao: string; disc: string }> = {};
    // Layer 1: cronograma_tree names
    for (const t of treeNames ?? []) {
      if (t.ippu) m[t.ippu] = { descricao: t.nome ?? "", disc: "" };
    }
    // Layer 2: classificacao_ppu disciplines
    for (const c of classifData ?? []) {
      if (c.item_ppu) {
        if (!m[c.item_ppu]) m[c.item_ppu] = { descricao: "", disc: "" };
        m[c.item_ppu].disc = c.disciplina ?? "";
      }
    }
    // Layer 3: ppu_items overrides (highest priority)
    for (const p of ppuItems ?? []) {
      if (p.item_ppu) {
        const existing = m[p.item_ppu] ?? { descricao: "", disc: "" };
        m[p.item_ppu] = {
          descricao: p.descricao || existing.descricao,
          disc: p.disc || existing.disc,
        };
      }
    }
    return m;
  }, [treeNames, classifData, ppuItems]);

  const rows: PpuRow[] = useMemo(() => {
    return (cronoData ?? []).map((c) => {
      const ippu = c.ippu ?? "";
      const info = ppuMap[ippu] ?? { descricao: "", disc: "" };
      const gitec = gitecByPpu?.[ippu] ?? { approved: 0, pending: 0, hasEvents: false };
      const executado = c.realizado ?? 0;

      let semaforo: PpuRow["semaforo"] = "futuro";
      if (gitec.approved > 0) semaforo = "medido";
      else if (gitec.hasEvents) semaforo = "processo";
      else if ((c.previsto ?? 0) > 0) semaforo = "previsto";

      return {
        item_ppu: ippu,
        descricao: info.descricao,
        disciplina: info.disc,
        previsto: c.previsto ?? 0,
        projetado: c.projetado ?? 0,
        executado,
        gitec_aprovado: gitec.approved,
        gitec_pendente: gitec.pending,
        gap: executado - gitec.approved,
        semaforo,
      };
    });
  }, [cronoData, ppuMap, gitecByPpu]);

  const filtered = useMemo(() => {
    let result = rows;
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
  }, [rows, search, statusFilter, filteredIppus, sortKey, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => ({
        previsto: acc.previsto + r.previsto,
        projetado: acc.projetado + r.projetado,
        executado: acc.executado + r.executado,
        gitec_aprovado: acc.gitec_aprovado + r.gitec_aprovado,
        gitec_pendente: acc.gitec_pendente + r.gitec_pendente,
        gap: acc.gap + r.gap,
      }),
      { previsto: 0, projetado: 0, executado: 0, gitec_aprovado: 0, gitec_pendente: 0, gap: 0 }
    );
  }, [filtered]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
    setPage(0);
  };

  const semaforoIcon = (s: PpuRow["semaforo"]) => {
    switch (s) {
      case "medido": return <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" title="Medido" />;
      case "processo": return <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" title="Em processo" />;
      case "previsto": return <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" title="Previsto" />;
      default: return <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground/30" title="Futuro" />;
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

  if (cronoLoading) {
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
                <SortHeader label="Previsto" k="previsto" />
                <SortHeader label="Projetado" k="projetado" className="hidden md:table-cell" />
                <SortHeader label="Executado" k="executado" />
                <SortHeader label="GITEC Aprov." k="gitec_aprovado" />
                <SortHeader label="GITEC Pend." k="gitec_pendente" className="hidden md:table-cell" />
                <SortHeader label="Gap" k="gap" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
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
                      <span className="hidden sm:inline">{fmtBRL(r.previsto)}</span>
                      <span className="sm:hidden">{fmtCompact(r.previsto)}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-purple-500 px-2 hidden md:table-cell">{fmtBRL(r.projetado)}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-emerald-500 px-2">
                      <span className="hidden sm:inline">{fmtBRL(r.executado)}</span>
                      <span className="sm:hidden">{fmtCompact(r.executado)}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-emerald-600 font-semibold px-2">
                      <span className="hidden sm:inline">{fmtBRL(r.gitec_aprovado)}</span>
                      <span className="sm:hidden">{fmtCompact(r.gitec_aprovado)}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-amber-500 px-2 hidden md:table-cell">{fmtBRL(r.gitec_pendente)}</TableCell>
                    <TableCell className={cn("text-right font-mono text-xs font-semibold px-2", r.gap > 0 ? "text-destructive" : "text-emerald-500")}>
                      <span className="hidden sm:inline">{fmtBRL(Math.abs(r.gap))}</span>
                      <span className="sm:hidden">{fmtCompact(Math.abs(r.gap))}</span>
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
                  <TableCell className="text-right font-mono text-blue-500 px-2">{fmtBRL(totals.previsto)}</TableCell>
                  <TableCell className="text-right font-mono text-purple-500 px-2 hidden md:table-cell">{fmtBRL(totals.projetado)}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-500 px-2">{fmtBRL(totals.executado)}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-600 px-2">{fmtBRL(totals.gitec_aprovado)}</TableCell>
                  <TableCell className="text-right font-mono text-amber-500 px-2 hidden md:table-cell">{fmtBRL(totals.gitec_pendente)}</TableCell>
                  <TableCell className={cn("text-right font-mono px-2", totals.gap > 0 ? "text-destructive" : "text-emerald-500")}>
                    {fmtBRL(Math.abs(totals.gap))}
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
