import { useState, useMemo, useCallback } from "react";
import { useCronogramaTree, CronoTreeNode } from "@/hooks/useCronogramaData";
import { AgrupamentoDetail } from "./AgrupamentoDetail";
import { BmPpuDetailSheet } from "./BmPpuDetailSheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, ChevronDown, Search } from "lucide-react";
import { formatCompact } from "@/lib/format";

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

  // Aggregate bottom-up
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

/* ── Filter logic ── */
function filterTree(
  tree: AggTreeNode[],
  query: string
): { filtered: AggTreeNode[]; autoExpand: Set<string> } {
  if (!query) return { filtered: tree, autoExpand: new Set() };
  const q = query.toLowerCase();
  const autoExpand = new Set<string>();
  const filtered: AggTreeNode[] = [];

  for (const fase of tree) {
    const faseMatch = fase.nome.toLowerCase().includes(q) || fase.ippu.toLowerCase().includes(q);
    const matchedSubfases: AggTreeNode[] = [];

    for (const sf of fase.children) {
      const sfMatch = sf.nome.toLowerCase().includes(q) || sf.ippu.toLowerCase().includes(q);
      const matchedAgrups = sf.children.filter(
        (a) => a.nome.toLowerCase().includes(q) || a.ippu.toLowerCase().includes(q)
      );

      if (sfMatch || matchedAgrups.length > 0) {
        matchedSubfases.push({
          ...sf,
          children: matchedAgrups.length > 0 ? matchedAgrups : sf.children,
        });
        autoExpand.add(fase.id);
        autoExpand.add(sf.id);
      }
    }

    if (faseMatch) {
      filtered.push(fase);
      autoExpand.add(fase.id);
    } else if (matchedSubfases.length > 0) {
      filtered.push({ ...fase, children: matchedSubfases });
      autoExpand.add(fase.id);
    }
  }
  return { filtered, autoExpand };
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

  const tree = useMemo(() => buildAndAggregate(treeData || []), [treeData]);

  const { filtered, autoExpand } = useMemo(
    () => filterTree(tree, search.trim()),
    [tree, search]
  );

  const effectiveExpanded = useMemo(() => {
    if (search.trim()) return new Set([...expandedIds, ...autoExpand]);
    return expandedIds;
  }, [expandedIds, autoExpand, search]);

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const totals = useMemo(() => ({
    valor: tree.reduce((s, f) => s + f.valor, 0),
    previsto: tree.reduce((s, f) => s + f.total_previsto_bm, 0),
    projetado: tree.reduce((s, f) => s + f.total_projetado_bm, 0),
    realizado: tree.reduce((s, f) => s + f.total_realizado_bm, 0),
  }), [tree]);

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
    <div className="space-y-3">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou iPPU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Tree table */}
      <div className="rounded-md border">
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
            {filtered.map((fase) => (
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
          <div className="flex items-center gap-1 md:gap-1.5 min-w-0" style={{ paddingLeft: indent }}>
            {(node.children.length > 0 || isAgrupamento) && (
              isExpanded
                ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                : <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            )}
            {isAgrupamento && node.ippu && (
              <Badge variant="secondary" className="text-[8px] md:text-[9px] font-mono shrink-0 px-1 py-0">
                {node.ippu}
              </Badge>
            )}
            <span className={`truncate ${isFase ? "font-bold text-xs md:text-[13px]" : isSubfase ? "font-semibold text-[11px] md:text-xs" : "text-[10px] md:text-[11px]"}`}>
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