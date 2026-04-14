import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BmPpuDetailSheet } from "./BmPpuDetailSheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronRight, ChevronDown, Search, X, AlertTriangle } from "lucide-react";
import { formatCompact } from "@/lib/format";
import { ConsolidatedKPIs } from "./consolidated/ConsolidatedKPIs";
import { ConsolidatedCharts } from "./consolidated/ConsolidatedCharts";
import { buildGitecToPpuLookup, aggregateGitecByPpu } from "@/lib/ppu-match";
import { buildConsolidatedTree, type FaseNode, type SubfaseNode, type TreeItem } from "@/lib/consolidated-tree";

/* ── Main Component ── */
export function BmConsolidatedTree() {
  const [search, setSearch] = useState("");
  const [expandedFases, setExpandedFases] = useState<Set<string>>(new Set());
  const [expandedSubfases, setExpandedSubfases] = useState<Set<string>>(new Set());
  const [detailPpu, setDetailPpu] = useState<string | null>(null);

  // 1. PPU items
  const { data: ppuItems, isLoading: ppuLoading } = useQuery({
    queryKey: ["ppu-items-consolidated"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ppu_items")
        .select("item_ppu, item_gitec, descricao, fase, subfase, agrupamento, disc, valor_total")
        .order("item_ppu");
      return (data ?? []).map((p) => ({
        item_ppu: p.item_ppu,
        item_gitec: p.item_gitec ?? null,
        descricao: p.descricao ?? "",
        fase: (p.fase ?? "").trim(),
        subfase: (p.subfase ?? "").trim(),
        agrupamento: (p.agrupamento ?? "").trim(),
        disc: p.disc ?? "",
        valor_total: Number(p.valor_total) || 0,
      }));
    },
    staleTime: 300_000,
  });

  // 2. GITEC aprovados
  const { data: gitecData } = useQuery({
    queryKey: ["gitec-all-approved"],
    queryFn: async () => {
      const { data } = await supabase
        .from("gitec_events")
        .select("ippu, valor")
        .eq("status", "Aprovado");
      const map: Record<string, number> = {};
      for (const e of data ?? []) {
        if (e.ippu) map[e.ippu] = (map[e.ippu] ?? 0) + (Number(e.valor) || 0);
      }
      return map;
    },
    staleTime: 30_000,
  });

  // 3. Contract value
  const { data: contrato } = useQuery({
    queryKey: ["contrato-valor"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contratos")
        .select("valor_contratual")
        .limit(1)
        .single();
      return data;
    },
    staleTime: 300_000,
  });

  // 4. Curva S totals
  const { data: curvaS } = useQuery({
    queryKey: ["curva-s-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("curva_s")
        .select("previsto_acum, projetado_acum, realizado_acum")
        .order("col_index", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    staleTime: 300_000,
  });

  // Build dual-match lookup & aggregate
  const ppuLookup = useMemo(
    () => (ppuItems ? buildGitecToPpuLookup(ppuItems) : null),
    [ppuItems]
  );

  const gitecAgg = useMemo(() => {
    if (!ppuLookup || !gitecData) return { byPpu: {} as Record<string, number>, orphanTotal: 0, orphanCount: 0 };
    const events = Object.entries(gitecData).flatMap(([ippu, valor]) => [{ ippu, valor }]);
    return aggregateGitecByPpu(events, ppuLookup);
  }, [gitecData, ppuLookup]);

  // Build 3-level tree
  const treeResult = useMemo(() => {
    if (!ppuItems) return null;
    return buildConsolidatedTree(ppuItems, gitecAgg.byPpu);
  }, [ppuItems, gitecAgg]);

  const tree = treeResult?.tree ?? [];

  // Filter
  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree;
    const q = search.toLowerCase();
    return tree
      .map((fase) => {
        const faseMatch = fase.nome.toLowerCase().includes(q);
        if (faseMatch) return fase;

        const filteredSubfases = fase.subfases
          .map((sf) => {
            const sfMatch = sf.nome.toLowerCase().includes(q);
            if (sfMatch) return sf;
            const matchedChildren = sf.children.filter(
              (c) => c.item_ppu.toLowerCase().includes(q) || c.descricao.toLowerCase().includes(q)
            );
            if (matchedChildren.length > 0) return { ...sf, children: matchedChildren };
            return null;
          })
          .filter(Boolean) as SubfaseNode[];

        if (filteredSubfases.length > 0) return { ...fase, subfases: filteredSubfases };
        return null;
      })
      .filter(Boolean) as FaseNode[];
  }, [tree, search]);

  // Auto-expand on search
  const effectiveExpandedFases = useMemo(() => {
    if (search.trim()) return new Set(filteredTree.map((f) => f.key));
    return expandedFases;
  }, [expandedFases, filteredTree, search]);

  const effectiveExpandedSubfases = useMemo(() => {
    if (search.trim()) {
      const keys = new Set<string>();
      filteredTree.forEach((f) => f.subfases.forEach((sf) => keys.add(sf.key)));
      return keys;
    }
    return expandedSubfases;
  }, [expandedSubfases, filteredTree, search]);

  const toggleFase = useCallback((key: string) => {
    setExpandedFases((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleSubfase = useCallback((key: string) => {
    setExpandedSubfases((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // KPI totals
  const valorContrato = contrato?.valor_contratual ?? 0;
  const totalPrevisto = Number(curvaS?.previsto_acum) || 0;
  const totalProjetado = Number(curvaS?.projetado_acum) || 0;
  const totalRealizado = Number(curvaS?.realizado_acum) || 0;
  const totalGitec = tree.reduce((s, f) => s + f.gitec_aprovado, 0);

  // Chart data
  const chartFases = useMemo(() =>
    tree.map((f) => ({
      nome: f.nome,
      valor: f.valor_total,
      previsto: 0,
      projetado: 0,
      realizado: f.gitec_aprovado,
    })),
  [tree]);

  if (ppuLoading) {
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
      {/* Data quality warning */}
      {treeResult?.hasCorruptedData && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-700">
            {treeResult.corruptedCount} itens com campo "Fase" inconsistente — a hierarquia foi reconstruída automaticamente a partir do código PPU. Reimporte a PPU com o mapeamento correto para dados 100% fiéis.
          </AlertDescription>
        </Alert>
      )}

      <ConsolidatedKPIs
        valor={valorContrato}
        previsto={totalPrevisto}
        projetado={totalProjetado}
        realizado={totalRealizado}
        gitec={totalGitec}
      />

      <ConsolidatedCharts fases={chartFases} />

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar PPU, descrição ou agrupamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        {search && (
          <Button variant="ghost" size="sm" onClick={() => setSearch("")} className="h-8 text-xs gap-1">
            <X className="h-3 w-3" /> Limpar
          </Button>
        )}
        <span className="text-[10px] text-muted-foreground">
          {treeResult?.totalItems ?? 0} itens em {tree.length} fases
        </span>
      </div>

      {/* Tree table */}
      <div className="rounded-md border overflow-auto max-h-[65vh]">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr className="border-b">
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Nome</th>
              <th className="text-right px-2 py-2 text-xs font-medium text-muted-foreground w-[100px]">Valor Contratual</th>
              <th className="text-right px-2 py-2 text-xs font-medium text-muted-foreground w-[100px]">GITEC Aprovado</th>
              <th className="text-center px-2 py-2 text-xs font-medium text-muted-foreground w-[100px]">% Avanço</th>
            </tr>
          </thead>
          <tbody>
            {filteredTree.map((fase) => (
              <FaseRows
                key={fase.key}
                fase={fase}
                isFaseExpanded={effectiveExpandedFases.has(fase.key)}
                expandedSubfases={effectiveExpandedSubfases}
                toggleFase={() => toggleFase(fase.key)}
                toggleSubfase={toggleSubfase}
                onItemClick={setDetailPpu}
              />
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-primary/10 border-t-2 border-primary/30">
            <tr>
              <td className="px-3 py-2 text-xs font-bold text-foreground">
                TOTAL ({treeResult?.totalItems ?? 0} itens)
              </td>
              <td className="text-right px-2 py-2 text-xs font-bold">
                {formatCompact(tree.reduce((s, f) => s + f.valor_total, 0))}
              </td>
              <td className="text-right px-2 py-2 text-xs font-bold text-emerald-600">
                {formatCompact(totalGitec)}
              </td>
              <td className="text-center px-2 py-2 text-xs font-bold">
                {tree.reduce((s, f) => s + f.valor_total, 0) > 0
                  ? (totalGitec / tree.reduce((s, f) => s + f.valor_total, 0) * 100).toFixed(1) + "%"
                  : "—"}
              </td>
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

/* ── Fase row with subfases ── */
function FaseRows({
  fase,
  isFaseExpanded,
  expandedSubfases,
  toggleFase,
  toggleSubfase,
  onItemClick,
}: {
  fase: FaseNode;
  isFaseExpanded: boolean;
  expandedSubfases: Set<string>;
  toggleFase: () => void;
  toggleSubfase: (key: string) => void;
  onItemClick: (ppu: string) => void;
}) {
  return (
    <>
      {/* Fase header */}
      <tr
        className="border-b cursor-pointer hover:bg-accent/30 bg-primary/5 border-l-[3px] border-l-primary"
        onClick={toggleFase}
      >
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            {isFaseExpanded
              ? <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
              : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            }
            <span className="font-bold text-[13px]">{fase.nome}</span>
            <Badge variant="secondary" className="text-[9px] ml-1">
              {fase.itemCount} itens · {fase.subfases.length} grupos
            </Badge>
          </div>
        </td>
        <td className="text-right px-2 py-2 text-xs font-semibold">{formatCompact(fase.valor_total)}</td>
        <td className="text-right px-2 py-2 text-xs font-semibold text-emerald-600">
          {fase.gitec_aprovado > 0 ? formatCompact(fase.gitec_aprovado) : "—"}
        </td>
        <td className="px-2 py-2">
          <ProgressCell value={fase.avanco} size="normal" />
        </td>
      </tr>

      {/* Subfases */}
      {isFaseExpanded && fase.subfases.map((sf) => (
        <SubfaseRows
          key={sf.key}
          subfase={sf}
          isExpanded={expandedSubfases.has(sf.key)}
          toggle={() => toggleSubfase(sf.key)}
          onItemClick={onItemClick}
        />
      ))}
    </>
  );
}

/* ── Subfase row with items ── */
function SubfaseRows({
  subfase,
  isExpanded,
  toggle,
  onItemClick,
}: {
  subfase: SubfaseNode;
  isExpanded: boolean;
  toggle: () => void;
  onItemClick: (ppu: string) => void;
}) {
  return (
    <>
      <tr
        className="border-b cursor-pointer hover:bg-accent/20 bg-muted/30 border-l-[3px] border-l-muted-foreground/30"
        onClick={toggle}
      >
        <td className="px-3 py-1.5">
          <div className="flex items-center gap-1.5" style={{ paddingLeft: 20 }}>
            {isExpanded
              ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            }
            <span className="font-semibold text-[12px]">{subfase.nome}</span>
            <Badge variant="outline" className="text-[8px] ml-1">{subfase.children.length}</Badge>
          </div>
        </td>
        <td className="text-right px-2 py-1.5 text-[11px] font-medium">{formatCompact(subfase.valor_total)}</td>
        <td className="text-right px-2 py-1.5 text-[11px] font-medium text-emerald-600">
          {subfase.gitec_aprovado > 0 ? formatCompact(subfase.gitec_aprovado) : "—"}
        </td>
        <td className="px-2 py-1.5">
          <ProgressCell value={subfase.avanco} size="small" />
        </td>
      </tr>

      {isExpanded && subfase.children.map((item) => (
        <tr
          key={item.item_ppu}
          className="border-b cursor-pointer hover:bg-accent/30 border-l border-l-muted-foreground/10"
          onClick={() => onItemClick(item.item_ppu)}
        >
          <td className="px-3 py-1">
            <div className="flex items-start gap-1.5" style={{ paddingLeft: 44 }}>
              <Badge variant="secondary" className="text-[8px] font-mono shrink-0 px-1 py-0">
                {item.item_ppu}
              </Badge>
              <span className="text-[11px] break-words">{item.descricao || item.agrupamento || "—"}</span>
              {item.disc && (
                <Badge variant="outline" className="text-[8px] shrink-0 px-1 py-0 ml-auto">
                  {item.disc}
                </Badge>
              )}
            </div>
          </td>
          <td className="text-right px-2 py-1 text-[11px] font-mono">
            {item.valor_total > 0 ? formatCompact(item.valor_total) : "—"}
          </td>
          <td className="text-right px-2 py-1 text-[11px] font-mono text-emerald-600">
            {item.gitec_aprovado > 0 ? formatCompact(item.gitec_aprovado) : "—"}
          </td>
          <td className="px-2 py-1">
            <ProgressCell value={item.avanco} size="tiny" />
          </td>
        </tr>
      ))}
    </>
  );
}

/* ── Shared progress cell ── */
function ProgressCell({ value, size }: { value: number; size: "normal" | "small" | "tiny" }) {
  if (value <= 0) return <span className="text-[10px] text-muted-foreground text-center block">—</span>;
  const barW = size === "normal" ? "w-16" : size === "small" ? "w-14" : "w-12";
  const barH = size === "normal" ? "h-2" : "h-1.5";
  const textSize = size === "tiny" ? "text-[9px]" : "text-[10px]";
  return (
    <div className="flex items-center gap-1 justify-center">
      <Progress value={Math.min(value, 100)} className={`${barH} ${barW}`} />
      <span className={`${textSize} font-mono text-muted-foreground w-10 text-right`}>
        {value.toFixed(1)}%
      </span>
    </div>
  );
}
