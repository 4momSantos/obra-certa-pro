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

/* ── Comps dots summary ── */
function CompsDots({ node }: { node: CronoTreeNode }) {
  const total = node.scon_total || 0;
  if (!total) return <span className="text-[10px] text-muted-foreground">—</span>;
  return <span className="text-[10px] font-mono">{total}</span>;
}

/* ── Build hierarchy ── */
interface TreeGroup {
  fase: CronoTreeNode;
  subfases: { node: CronoTreeNode; agrupamentos: CronoTreeNode[] }[];
}

function buildHierarchy(nodes: CronoTreeNode[]): TreeGroup[] {
  const fases: TreeGroup[] = [];
  let currentFase: TreeGroup | null = null;
  let currentSubfase: { node: CronoTreeNode; agrupamentos: CronoTreeNode[] } | null = null;

  for (const n of nodes) {
    if (n.nivel === "3 - Fase") {
      currentFase = { fase: n, subfases: [] };
      fases.push(currentFase);
      currentSubfase = null;
    } else if (n.nivel === "4 - Subfase" && currentFase) {
      currentSubfase = { node: n, agrupamentos: [] };
      currentFase.subfases.push(currentSubfase);
    } else if (n.nivel === "5 - Agrupamento" && currentSubfase) {
      currentSubfase.agrupamentos.push(n);
    }
  }
  return fases;
}

/* ── Filter logic ── */
function filterHierarchy(groups: TreeGroup[], query: string): { filtered: TreeGroup[]; autoExpand: Set<string> } {
  if (!query) return { filtered: groups, autoExpand: new Set() };
  const q = query.toLowerCase();
  const autoExpand = new Set<string>();
  const filtered: TreeGroup[] = [];

  for (const g of groups) {
    const faseMatch = g.fase.nome.toLowerCase().includes(q) || g.fase.ippu.toLowerCase().includes(q);
    const matchedSubfases: typeof g.subfases = [];

    for (const sf of g.subfases) {
      const sfMatch = sf.node.nome.toLowerCase().includes(q) || sf.node.ippu.toLowerCase().includes(q);
      const matchedAgrups = sf.agrupamentos.filter(
        (a) => a.nome.toLowerCase().includes(q) || a.ippu.toLowerCase().includes(q)
      );

      if (sfMatch || matchedAgrups.length > 0) {
        matchedSubfases.push({ node: sf.node, agrupamentos: matchedAgrups.length > 0 ? matchedAgrups : sf.agrupamentos });
        autoExpand.add(g.fase.id);
        autoExpand.add(sf.node.id);
      }
    }

    if (faseMatch) {
      filtered.push(g);
      autoExpand.add(g.fase.id);
    } else if (matchedSubfases.length > 0) {
      filtered.push({ fase: g.fase, subfases: matchedSubfases });
      autoExpand.add(g.fase.id);
    }
  }
  return { filtered, autoExpand };
}

/* ── Main Component ── */
export function BmConsolidatedTree() {
  const { data: treeData, isLoading } = useCronogramaTree();
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [detailPpu, setDetailPpu] = useState<string | null>(null);

  const hierarchy = useMemo(() => buildHierarchy(treeData || []), [treeData]);

  const { filtered, autoExpand } = useMemo(
    () => filterHierarchy(hierarchy, search.trim()),
    [hierarchy, search]
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

  // Totals
  const totals = useMemo(() => {
    const fases = (treeData || []).filter((n) => n.nivel === "3 - Fase");
    return {
      valor: fases.reduce((s, n) => s + n.valor, 0),
      previsto: fases.reduce((s, n) => s + n.total_previsto_bm, 0),
      projetado: fases.reduce((s, n) => s + n.total_projetado_bm, 0),
      realizado: fases.reduce((s, n) => s + n.total_realizado_bm, 0),
    };
  }, [treeData]);

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
      <div className="rounded-md border overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr className="border-b">
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground min-w-[280px]">Nome</th>
              <th className="text-right px-2 py-2 text-xs font-medium text-muted-foreground w-[100px]">Valor</th>
              <th className="text-right px-2 py-2 text-xs font-medium text-muted-foreground w-[100px]">Prev. BM</th>
              <th className="text-right px-2 py-2 text-xs font-medium text-muted-foreground w-[100px]">Proj. BM</th>
              <th className="text-right px-2 py-2 text-xs font-medium text-muted-foreground w-[100px]">Real. BM</th>
              <th className="text-center px-2 py-2 text-xs font-medium text-muted-foreground w-[80px]">SCON %</th>
              <th className="text-center px-2 py-2 text-xs font-medium text-muted-foreground w-[70px]">Comps</th>
              <th className="text-center px-2 py-2 text-xs font-medium text-muted-foreground w-[50px]">Sem</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((group) => {
              const faseOpen = effectiveExpanded.has(group.fase.id);
              return (
                <FaseRows
                  key={group.fase.id}
                  group={group}
                  faseOpen={faseOpen}
                  effectiveExpanded={effectiveExpanded}
                  toggle={toggle}
                  onComponentClick={setDetailPpu}
                />
              );
            })}
          </tbody>
          {/* Total row */}
          <tfoot className="sticky bottom-0 bg-primary/10 border-t-2 border-primary/30">
            <tr>
              <td className="px-3 py-2 text-xs font-bold text-foreground">TOTAL</td>
              <td className="text-right px-2 py-2 text-xs font-bold">{formatCompact(totals.valor)}</td>
              <td className="text-right px-2 py-2 text-xs font-bold">{formatCompact(totals.previsto)}</td>
              <td className="text-right px-2 py-2 text-xs font-bold">{formatCompact(totals.projetado)}</td>
              <td className="text-right px-2 py-2 text-xs font-bold text-green-700">{formatCompact(totals.realizado)}</td>
              <td />
              <td />
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Reuse existing detail sheet */}
      <BmPpuDetailSheet
        open={!!detailPpu}
        onClose={() => setDetailPpu(null)}
        itemPpu={detailPpu ?? ""}
        bmName=""
      />
    </div>
  );
}

/* ── Fase Rows ── */
function FaseRows({
  group,
  faseOpen,
  effectiveExpanded,
  toggle,
  onComponentClick,
}: {
  group: TreeGroup;
  faseOpen: boolean;
  effectiveExpanded: Set<string>;
  toggle: (id: string) => void;
  onComponentClick: (ppu: string) => void;
}) {
  const f = group.fase;
  return (
    <>
      <tr
        className="border-b cursor-pointer hover:bg-accent/30 bg-primary/5 border-l-[3px] border-l-primary"
        onClick={() => toggle(f.id)}
      >
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            {faseOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
            <span className="font-bold text-[13px]">{f.nome}</span>
          </div>
        </td>
        <td className="text-right px-2 py-2 text-xs">{formatCompact(f.valor)}</td>
        <td className="text-right px-2 py-2 text-xs">{formatCompact(f.total_previsto_bm)}</td>
        <td className="text-right px-2 py-2 text-xs">{formatCompact(f.total_projetado_bm)}</td>
        <td className="text-right px-2 py-2 text-xs text-green-700">{formatCompact(f.total_realizado_bm)}</td>
        <td />
        <td />
        <td />
      </tr>
      {faseOpen &&
        group.subfases.map((sf) => {
          const sfOpen = effectiveExpanded.has(sf.node.id);
          return (
            <SubfaseRows
              key={sf.node.id}
              subfase={sf}
              sfOpen={sfOpen}
              effectiveExpanded={effectiveExpanded}
              toggle={toggle}
              onComponentClick={onComponentClick}
            />
          );
        })}
    </>
  );
}

/* ── Subfase Rows ── */
function SubfaseRows({
  subfase,
  sfOpen,
  effectiveExpanded,
  toggle,
  onComponentClick,
}: {
  subfase: { node: CronoTreeNode; agrupamentos: CronoTreeNode[] };
  sfOpen: boolean;
  effectiveExpanded: Set<string>;
  toggle: (id: string) => void;
  onComponentClick: (ppu: string) => void;
}) {
  const n = subfase.node;
  return (
    <>
      <tr
        className="border-b cursor-pointer hover:bg-accent/30 border-l-2 border-l-teal-500"
        onClick={() => toggle(n.id)}
      >
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5 pl-6">
            {sfOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            <span className="font-semibold text-xs">{n.nome}</span>
          </div>
        </td>
        <td className="text-right px-2 py-2 text-xs">{formatCompact(n.valor)}</td>
        <td className="text-right px-2 py-2 text-xs">{formatCompact(n.total_previsto_bm)}</td>
        <td className="text-right px-2 py-2 text-xs">{formatCompact(n.total_projetado_bm)}</td>
        <td className="text-right px-2 py-2 text-xs text-green-700">{formatCompact(n.total_realizado_bm)}</td>
        <td />
        <td />
        <td />
      </tr>
      {sfOpen &&
        subfase.agrupamentos.map((a) => (
          <AgrupamentoRow
            key={a.id}
            node={a}
            expanded={effectiveExpanded.has(a.id)}
            toggle={toggle}
            onComponentClick={onComponentClick}
          />
        ))}
    </>
  );
}

/* ── Agrupamento Row ── */
function AgrupamentoRow({
  node,
  expanded,
  toggle,
  onComponentClick,
}: {
  node: CronoTreeNode;
  expanded: boolean;
  toggle: (id: string) => void;
  onComponentClick: (ppu: string) => void;
}) {
  const sconPct = node.scon_avg_avanco != null ? Math.min(node.scon_avg_avanco * 100, 100) : null;

  return (
    <>
      <tr
        className="border-b cursor-pointer hover:bg-accent/30 border-l border-l-muted-foreground/20"
        onClick={() => toggle(node.id)}
      >
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5 pl-12">
            {expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
            <Badge variant="secondary" className="text-[9px] font-mono shrink-0 px-1 py-0">
              {node.ippu}
            </Badge>
            <span className="text-[11px] truncate">{node.nome}</span>
          </div>
        </td>
        <td className="text-right px-2 py-2 text-[11px]">{formatCompact(node.valor)}</td>
        <td className="text-right px-2 py-2 text-[11px]">{formatCompact(node.total_previsto_bm)}</td>
        <td className="text-right px-2 py-2 text-[11px]">{formatCompact(node.total_projetado_bm)}</td>
        <td className="text-right px-2 py-2 text-[11px] text-green-700">{formatCompact(node.total_realizado_bm)}</td>
        <td className="px-2 py-2">
          {sconPct != null ? (
            <div className="flex items-center gap-1 justify-center">
              <Progress
                value={sconPct}
                className={`h-2 w-12 ${sconPct >= 100 ? "[&>div]:bg-green-500" : sconPct > 0 ? "[&>div]:bg-amber-500" : ""}`}
              />
              <span className="text-[10px] w-7 text-right">{sconPct.toFixed(0)}%</span>
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground text-center block">—</span>
          )}
        </td>
        <td className="text-center px-2 py-2"><CompsDots node={node} /></td>
        <td className="text-center px-2 py-2"><SemaforoDot s={node.semaforo} /></td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="p-0">
            <AgrupamentoDetail ippu={node.ippu} onComponentClick={onComponentClick} />
          </td>
        </tr>
      )}
    </>
  );
}
