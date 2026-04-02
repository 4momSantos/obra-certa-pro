import { useState, useMemo, useCallback } from "react";
import { useCronogramaTree, CronoTreeNode } from "@/hooks/useCronogramaData";
import { AgrupamentoDetail } from "./AgrupamentoDetail";
import { BmPpuDetailSheet } from "./BmPpuDetailSheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, ChevronDown } from "lucide-react";
import { formatCompact } from "@/lib/format";
import { ConsolidatedKPIs } from "./consolidated/ConsolidatedKPIs";
import { ConsolidatedCharts } from "./consolidated/ConsolidatedCharts";
import { ConsolidatedFilters } from "./consolidated/ConsolidatedFilters";
import { FaseInlineSummary } from "./consolidated/FaseInlineSummary";

function normalizePpu(v: string) {
  return (v || "").replace(/_/g, "-").trim();
}

/* ── Tree node with aggregated values ── */
interface AggTreeNode {
  id: string;
  nivel: string;
  ippu: string;
  nome: string;
  valor: number;
  acumulado: number;
  saldo: number;
  total_previsto_bm: number;
  total_projetado_bm: number;
  total_realizado_bm: number;
  scon_avg_avanco?: number;
  scon_total?: number;
  semaforo?: "medido" | "executado" | "previsto" | "futuro";
  children: AggTreeNode[];
  sort_order: number;
}

/* ── Build hierarchy from flat nodes and aggregate bottom-up ── */
function buildAndAggregate(flatNodes: CronoTreeNode[]): AggTreeNode[] {
  const fases: AggTreeNode[] = [];
  let currentFase: AggTreeNode | null = null;
  let currentSubfase: AggTreeNode | null = null;

  const sorted = [...flatNodes].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  for (const n of sorted) {
    const node: AggTreeNode = {
      id: n.id,
      nivel: n.nivel,
      ippu: normalizePpu(n.ippu),
      nome: n.nome || "",
      valor: n.valor,
      acumulado: n.acumulado,
      saldo: n.saldo,
      total_previsto_bm: n.total_previsto_bm,
      total_projetado_bm: n.total_projetado_bm,
      total_realizado_bm: n.total_realizado_bm,
      scon_avg_avanco: n.scon_avg_avanco,
      scon_total: n.scon_total,
      semaforo: n.semaforo,
      children: [],
      sort_order: n.sort_order,
    };

    if (n.nivel === "3 - Fase") {
      currentFase = node;
      currentSubfase = null;
      fases.push(node);
    } else if (n.nivel === "4 - Subfase" && currentFase) {
      currentSubfase = node;
      currentFase.children.push(node);
    } else if (n.nivel === "5 - Agrupamento" && currentSubfase) {
      currentSubfase.children.push(node);
    }
  }

  for (const fase of fases) {
    for (const subfase of fase.children) {
      subfase.total_previsto_bm = subfase.children.reduce((s, a) => s + a.total_previsto_bm, 0);
      subfase.total_projetado_bm = subfase.children.reduce((s, a) => s + a.total_projetado_bm, 0);
      subfase.total_realizado_bm = subfase.children.reduce((s, a) => s + a.total_realizado_bm, 0);
    }
    fase.total_previsto_bm = fase.children.reduce((s, sf) => s + sf.total_previsto_bm, 0);
    fase.total_projetado_bm = fase.children.reduce((s, sf) => s + sf.total_projetado_bm, 0);
    fase.total_realizado_bm = fase.children.reduce((s, sf) => s + sf.total_realizado_bm, 0);
  }

  return fases;
}

/* ── Semáforo dot ── */
function SemaforoDot({ s }: { s?: string }) {
  const colors: Record<string, string> = {
    medido: "bg-green-500",
    executado: "bg-amber-500",
    previsto: "bg-blue-500",
    futuro: "bg-muted-foreground/30",
  };
  return <div className={`h-3 w-3 rounded-full ${colors[s || "futuro"]}`} />;
}

/* ── Main Component ── */
export function BmConsolidatedTree() {
  const { data: treeData, isLoading } = useCronogramaTree();
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [detailPpu, setDetailPpu] = useState<string | null>(null);
  const [faseFilter, setFaseFilter] = useState("__all__");
  const [semaforoFilter, setSemaforoFilter] = useState<string[]>([]);
  const [saldoOnly, setSaldoOnly] = useState(false);

  const tree = useMemo(() => buildAndAggregate(treeData || []), [treeData]);

  const faseNames = useMemo(() => tree.map((f) => f.nome), [tree]);

  // Apply filters
  const filteredTree = useMemo(() => {
    let result = tree;

    // Fase filter
    if (faseFilter !== "__all__") {
      result = result.filter((f) => f.nome === faseFilter);
    }

    // Semáforo filter — filter agrupamentos within subfases
    if (semaforoFilter.length > 0) {
      result = result
        .map((fase) => ({
          ...fase,
          children: fase.children
            .map((sf) => ({
              ...sf,
              children: sf.children.filter((a) => semaforoFilter.includes(a.semaforo || "futuro")),
            }))
            .filter((sf) => sf.children.length > 0),
        }))
        .filter((f) => f.children.length > 0);
    }

    // Saldo filter
    if (saldoOnly) {
      result = result
        .map((fase) => ({
          ...fase,
          children: fase.children
            .map((sf) => ({
              ...sf,
              children: sf.children.filter((a) => a.saldo > 0),
            }))
            .filter((sf) => sf.children.length > 0),
        }))
        .filter((f) => f.children.length > 0);
    }

    // Text search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result
        .map((fase) => {
          const faseMatch = fase.nome.toLowerCase().includes(q) || fase.ippu.toLowerCase().includes(q);
          const matchedSf = fase.children
            .map((sf) => {
              const sfMatch = sf.nome.toLowerCase().includes(q) || sf.ippu.toLowerCase().includes(q);
              const matchedAgrups = sf.children.filter(
                (a) => a.nome.toLowerCase().includes(q) || a.ippu.toLowerCase().includes(q)
              );
              if (sfMatch || matchedAgrups.length > 0) {
                return { ...sf, children: matchedAgrups.length > 0 ? matchedAgrups : sf.children };
              }
              return null;
            })
            .filter(Boolean) as AggTreeNode[];

          if (faseMatch) return fase;
          if (matchedSf.length > 0) return { ...fase, children: matchedSf };
          return null;
        })
        .filter(Boolean) as AggTreeNode[];
    }

    return result;
  }, [tree, faseFilter, semaforoFilter, saldoOnly, search]);

  // Auto-expand on search
  const autoExpandIds = useMemo(() => {
    if (!search.trim()) return new Set<string>();
    const ids = new Set<string>();
    filteredTree.forEach((f) => {
      ids.add(f.id);
      f.children.forEach((sf) => ids.add(sf.id));
    });
    return ids;
  }, [filteredTree, search]);

  const effectiveExpanded = useMemo(() => {
    if (search.trim()) return new Set([...expandedIds, ...autoExpandIds]);
    return expandedIds;
  }, [expandedIds, autoExpandIds, search]);

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Totals from filtered data
  const totals = useMemo(() => ({
    valor: filteredTree.reduce((s, f) => s + f.valor, 0),
    previsto: filteredTree.reduce((s, f) => s + f.total_previsto_bm, 0),
    projetado: filteredTree.reduce((s, f) => s + f.total_projetado_bm, 0),
    realizado: filteredTree.reduce((s, f) => s + f.total_realizado_bm, 0),
  }), [filteredTree]);

  // Chart data from full tree (unfiltered fases)
  const chartFases = useMemo(() =>
    tree.map((f) => ({
      nome: f.nome,
      valor: f.valor,
      previsto: f.total_previsto_bm,
      projetado: f.total_projetado_bm,
      realizado: f.total_realizado_bm,
    })),
  [tree]);

  const hasFilters = faseFilter !== "__all__" || semaforoFilter.length > 0 || saldoOnly || search.trim() !== "";

  const clearFilters = useCallback(() => {
    setSearch("");
    setFaseFilter("__all__");
    setSemaforoFilter([]);
    setSaldoOnly(false);
  }, []);

  const toggleSemaforo = useCallback((s: string) => {
    setSemaforoFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <ConsolidatedKPIs
        valor={totals.valor}
        previsto={totals.previsto}
        projetado={totals.projetado}
        realizado={totals.realizado}
      />

      {/* Charts */}
      <ConsolidatedCharts fases={chartFases} />

      {/* Filters */}
      <ConsolidatedFilters
        search={search}
        onSearchChange={setSearch}
        fases={faseNames}
        faseFilter={faseFilter}
        onFaseChange={setFaseFilter}
        semaforoFilter={semaforoFilter}
        onSemaforoToggle={toggleSemaforo}
        saldoOnly={saldoOnly}
        onSaldoToggle={() => setSaldoOnly((p) => !p)}
        onClear={clearFilters}
        hasFilters={hasFilters}
      />

      {/* Tree table */}
      <div className="rounded-md border overflow-auto max-h-[65vh]">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr className="border-b">
              <th className="text-left px-2 md:px-3 py-2 text-xs font-medium text-muted-foreground">Nome</th>
              <th className="text-right px-1 md:px-2 py-2 text-xs font-medium text-muted-foreground w-[60px] md:w-[90px]">Valor</th>
              <th className="text-right px-1 md:px-2 py-2 text-xs font-medium text-muted-foreground w-[60px] md:w-[90px]">Prev.</th>
              <th className="hidden md:table-cell text-right px-2 py-2 text-xs font-medium text-muted-foreground w-[90px]">Proj.</th>
              <th className="text-right px-1 md:px-2 py-2 text-xs font-medium text-muted-foreground w-[60px] md:w-[90px]">Real.</th>
              <th className="text-center px-1 py-2 text-xs font-medium text-muted-foreground w-[55px] md:w-[80px]">SCON</th>
              <th className="hidden md:table-cell text-center px-1 py-2 text-xs font-medium text-muted-foreground w-[50px]">Comp</th>
              <th className="hidden md:table-cell text-center px-1 py-2 text-xs font-medium text-muted-foreground w-[40px]">Sem</th>
            </tr>
          </thead>
          <tbody>
            {filteredTree.map((fase) => (
              <TreeRows
                key={fase.id}
                node={fase}
                depth={0}
                effectiveExpanded={effectiveExpanded}
                toggle={toggle}
                onComponentClick={setDetailPpu}
              />
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-primary/10 border-t-2 border-primary/30">
            <tr>
              <td className="px-2 md:px-3 py-2 text-xs font-bold text-foreground">TOTAL</td>
              <td className="text-right px-1 md:px-2 py-2 text-xs font-bold">{formatCompact(totals.valor)}</td>
              <td className="text-right px-1 md:px-2 py-2 text-xs font-bold">{formatCompact(totals.previsto)}</td>
              <td className="hidden md:table-cell text-right px-2 py-2 text-xs font-bold">{formatCompact(totals.projetado)}</td>
              <td className="text-right px-1 md:px-2 py-2 text-xs font-bold text-green-700">{formatCompact(totals.realizado)}</td>
              <td />
              <td className="hidden md:table-cell" />
              <td className="hidden md:table-cell" />
            </tr>
          </tfoot>
        </table>
      </div>

      <BmPpuDetailSheet
        open={!!detailPpu}
        onClose={() => setDetailPpu(null)}
        itemPpu={detailPpu ?? ""}
        bmName=""
      />
    </div>
  );
}

/* ── Recursive tree row renderer ── */
function TreeRows({
  node,
  depth,
  effectiveExpanded,
  toggle,
  onComponentClick,
}: {
  node: AggTreeNode;
  depth: number;
  effectiveExpanded: Set<string>;
  toggle: (id: string) => void;
  onComponentClick: (ppu: string) => void;
}) {
  const isExpanded = effectiveExpanded.has(node.id);
  const isAgrupamento = node.nivel === "5 - Agrupamento";
  const isFase = node.nivel === "3 - Fase";
  const isSubfase = node.nivel === "4 - Subfase";

  const borderClass = isFase
    ? "bg-primary/5 border-l-[3px] border-l-primary"
    : isSubfase
    ? "border-l-2 border-l-teal-500"
    : "border-l border-l-muted-foreground/20";

  const indent = depth * 20;
  const sconPct = isAgrupamento && node.scon_avg_avanco != null
    ? Math.min(node.scon_avg_avanco * 100, 100)
    : null;

  return (
    <>
      <tr
        className={`border-b cursor-pointer hover:bg-accent/30 ${borderClass}`}
        onClick={() => toggle(node.id)}
      >
        <td className="px-2 md:px-3 py-1.5 md:py-2">
          <div className="flex items-start gap-1 md:gap-1.5 min-w-0" style={{ paddingLeft: indent }}>
            {(node.children.length > 0 || isAgrupamento) && (
              isExpanded
                ? <ChevronDown className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                : <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            )}
            {isAgrupamento && node.ippu && (
              <Badge variant="secondary" className="text-[8px] md:text-[9px] font-mono shrink-0 px-1 py-0">
                {node.ippu}
              </Badge>
            )}
            <span className={`break-words hyphens-auto ${isFase ? "font-bold text-xs md:text-[13px]" : isSubfase ? "font-semibold text-[11px] md:text-xs" : "text-[10px] md:text-[11px]"}`}>
              {node.nome}
            </span>
          </div>
        </td>
        <td className="text-right px-1 md:px-2 py-1.5 md:py-2 text-[10px] md:text-xs">{formatCompact(node.valor)}</td>
        <td className="text-right px-1 md:px-2 py-1.5 md:py-2 text-[10px] md:text-xs">{formatCompact(node.total_previsto_bm)}</td>
        <td className="hidden md:table-cell text-right px-2 py-2 text-xs">{formatCompact(node.total_projetado_bm)}</td>
        <td className="text-right px-1 md:px-2 py-1.5 md:py-2 text-[10px] md:text-xs text-green-700">{formatCompact(node.total_realizado_bm)}</td>
        <td className="px-1 md:px-2 py-1.5 md:py-2">
          {sconPct != null ? (
            <div className="flex items-center gap-1 justify-center">
              <Progress
                value={sconPct}
                className={`h-2 w-8 md:w-12 ${sconPct >= 100 ? "[&>div]:bg-green-500" : sconPct > 0 ? "[&>div]:bg-amber-500" : ""}`}
              />
              <span className="text-[9px] md:text-[10px] w-6 md:w-7 text-right">{sconPct.toFixed(0)}%</span>
            </div>
          ) : (
            !isFase && !isSubfase && <span className="text-[10px] text-muted-foreground text-center block">—</span>
          )}
        </td>
        <td className="hidden md:table-cell text-center px-2 py-2">
          {isAgrupamento && node.scon_total ? (
            <span className="text-[10px] font-mono">{node.scon_total}</span>
          ) : (
            !isFase && !isSubfase && <span className="text-[10px] text-muted-foreground">—</span>
          )}
        </td>
        <td className="hidden md:table-cell text-center px-2 py-2">
          {isAgrupamento && <SemaforoDot s={node.semaforo} />}
        </td>
      </tr>

      {/* Fase/Subfase inline summary */}
      {isExpanded && (isFase || isSubfase) && node.children.length > 0 && (
        <tr>
          <td colSpan={8} className="p-0">
            <FaseInlineSummary
              previsto={node.total_previsto_bm}
              projetado={node.total_projetado_bm}
              realizado={node.total_realizado_bm}
              subfases={node.children.map((c) => ({
                nome: c.nome,
                previsto: c.total_previsto_bm,
                projetado: c.total_projetado_bm,
                realizado: c.total_realizado_bm,
              }))}
            />
          </td>
        </tr>
      )}

      {/* Children */}
      {isExpanded && node.children.map((child) => (
        <TreeRows
          key={child.id}
          node={child}
          depth={depth + 1}
          effectiveExpanded={effectiveExpanded}
          toggle={toggle}
          onComponentClick={onComponentClick}
        />
      ))}

      {/* Agrupamento detail panel (inline) */}
      {isExpanded && isAgrupamento && (
        <tr>
          <td colSpan={8} className="p-0">
            <AgrupamentoDetail ippu={node.ippu} onComponentClick={onComponentClick} />
          </td>
        </tr>
      )}
    </>
  );
}
