import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BmPpuDetailSheet } from "./BmPpuDetailSheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, Search, X } from "lucide-react";
import { formatCompact } from "@/lib/format";
import { ConsolidatedKPIs } from "./consolidated/ConsolidatedKPIs";
import { ConsolidatedCharts } from "./consolidated/ConsolidatedCharts";
import { cn } from "@/lib/utils";

interface PpuItem {
  item_ppu: string;
  descricao: string;
  fase: string;
  subfase: string;
  disc: string;
  valor_total: number;
}

interface TreeLeaf extends PpuItem {
  gitec_aprovado: number;
  avanco: number;
}

interface TreeGroup {
  key: string;
  nome: string;
  valor_total: number;
  gitec_aprovado: number;
  avanco: number;
  children: TreeLeaf[];
}

/* ── Main Component ── */
export function BmConsolidatedTree() {
  const [search, setSearch] = useState("");
  const [expandedFases, setExpandedFases] = useState<Set<string>>(new Set());
  const [detailPpu, setDetailPpu] = useState<string | null>(null);

  // 1. PPU items
  const { data: ppuItems, isLoading: ppuLoading } = useQuery({
    queryKey: ["ppu-items-consolidated"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ppu_items")
        .select("item_ppu, descricao, fase, subfase, disc, valor_total")
        .order("item_ppu");
      return (data ?? []).map((p) => ({
        item_ppu: p.item_ppu,
        descricao: p.descricao ?? "",
        fase: (p.fase ?? "").trim() || "Sem fase",
        subfase: (p.subfase ?? "").trim(),
        disc: p.disc ?? "",
        valor_total: Number(p.valor_total) || 0,
      })) as PpuItem[];
    },
    staleTime: 300_000,
  });

  // 2. GITEC aprovados (all time, accumulated)
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

  // Build tree: fase → items
  const tree = useMemo(() => {
    if (!ppuItems) return [];
    const gitec = gitecData ?? {};
    const faseMap = new Map<string, TreeGroup>();

    for (const p of ppuItems) {
      if (!faseMap.has(p.fase)) {
        faseMap.set(p.fase, {
          key: p.fase,
          nome: p.fase,
          valor_total: 0,
          gitec_aprovado: 0,
          avanco: 0,
          children: [],
        });
      }
      const fase = faseMap.get(p.fase)!;
      const gitecVal = gitec[p.item_ppu] ?? 0;
      fase.valor_total += p.valor_total;
      fase.gitec_aprovado += gitecVal;
      fase.children.push({
        ...p,
        gitec_aprovado: gitecVal,
        avanco: p.valor_total > 0 ? (gitecVal / p.valor_total) * 100 : 0,
      });
    }

    const groups = Array.from(faseMap.values());
    for (const g of groups) {
      g.avanco = g.valor_total > 0 ? (g.gitec_aprovado / g.valor_total) * 100 : 0;
      g.children.sort((a, b) => a.item_ppu.localeCompare(b.item_ppu));
    }
    groups.sort((a, b) => b.valor_total - a.valor_total);
    return groups;
  }, [ppuItems, gitecData]);

  // Filter
  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree;
    const q = search.toLowerCase();
    return tree
      .map((fase) => {
        const faseMatch = fase.nome.toLowerCase().includes(q);
        const matchedChildren = fase.children.filter(
          (c) => c.item_ppu.toLowerCase().includes(q) || c.descricao.toLowerCase().includes(q)
        );
        if (faseMatch) return fase;
        if (matchedChildren.length > 0) return { ...fase, children: matchedChildren };
        return null;
      })
      .filter(Boolean) as TreeGroup[];
  }, [tree, search]);

  // Auto-expand on search
  const effectiveExpanded = useMemo(() => {
    if (search.trim()) {
      return new Set(filteredTree.map((f) => f.key));
    }
    return expandedFases;
  }, [expandedFases, filteredTree, search]);

  const toggle = useCallback((key: string) => {
    setExpandedFases((prev) => {
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
      {/* KPI Cards */}
      <ConsolidatedKPIs
        valor={valorContrato}
        previsto={totalPrevisto}
        projetado={totalProjetado}
        realizado={totalRealizado}
        gitec={totalGitec}
      />

      {/* Charts */}
      <ConsolidatedCharts fases={chartFases} />

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar PPU ou descrição..."
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
          {ppuItems?.length ?? 0} itens em {tree.length} fases
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
                isExpanded={effectiveExpanded.has(fase.key)}
                toggle={() => toggle(fase.key)}
                onItemClick={setDetailPpu}
              />
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-primary/10 border-t-2 border-primary/30">
            <tr>
              <td className="px-3 py-2 text-xs font-bold text-foreground">
                TOTAL ({ppuItems?.length ?? 0} itens)
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

/* ── Fase row with expandable items ── */
function FaseRows({
  fase,
  isExpanded,
  toggle,
  onItemClick,
}: {
  fase: TreeGroup;
  isExpanded: boolean;
  toggle: () => void;
  onItemClick: (ppu: string) => void;
}) {
  return (
    <>
      {/* Fase header row */}
      <tr
        className="border-b cursor-pointer hover:bg-accent/30 bg-primary/5 border-l-[3px] border-l-primary"
        onClick={toggle}
      >
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            {isExpanded
              ? <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
              : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            }
            <span className="font-bold text-[13px]">{fase.nome}</span>
            <Badge variant="secondary" className="text-[9px] ml-1">{fase.children.length} itens</Badge>
          </div>
        </td>
        <td className="text-right px-2 py-2 text-xs font-semibold">{formatCompact(fase.valor_total)}</td>
        <td className="text-right px-2 py-2 text-xs font-semibold text-emerald-600">
          {fase.gitec_aprovado > 0 ? formatCompact(fase.gitec_aprovado) : "—"}
        </td>
        <td className="px-2 py-2">
          {fase.avanco > 0 ? (
            <div className="flex items-center gap-1.5 justify-center">
              <Progress value={Math.min(fase.avanco, 100)} className="h-2 w-16" />
              <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">
                {fase.avanco.toFixed(1)}%
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground text-center block">—</span>
          )}
        </td>
      </tr>

      {/* Item rows */}
      {isExpanded && fase.children.map((item) => (
        <tr
          key={item.item_ppu}
          className="border-b cursor-pointer hover:bg-accent/30 border-l border-l-muted-foreground/20"
          onClick={() => onItemClick(item.item_ppu)}
        >
          <td className="px-3 py-1.5">
            <div className="flex items-start gap-1.5" style={{ paddingLeft: 24 }}>
              <Badge variant="secondary" className="text-[8px] font-mono shrink-0 px-1 py-0">
                {item.item_ppu}
              </Badge>
              <span className="text-[11px] break-words">{item.descricao || "—"}</span>
              {item.disc && (
                <Badge variant="outline" className="text-[8px] shrink-0 px-1 py-0 ml-auto">
                  {item.disc}
                </Badge>
              )}
            </div>
          </td>
          <td className="text-right px-2 py-1.5 text-[11px] font-mono">
            {item.valor_total > 0 ? formatCompact(item.valor_total) : "—"}
          </td>
          <td className="text-right px-2 py-1.5 text-[11px] font-mono text-emerald-600">
            {item.gitec_aprovado > 0 ? formatCompact(item.gitec_aprovado) : "—"}
          </td>
          <td className="px-2 py-1.5">
            {item.avanco > 0 ? (
              <div className="flex items-center gap-1 justify-center">
                <Progress value={Math.min(item.avanco, 100)} className="h-1.5 w-12" />
                <span className="text-[9px] font-mono text-muted-foreground w-10 text-right">
                  {item.avanco.toFixed(1)}%
                </span>
              </div>
            ) : (
              <span className="text-[9px] text-muted-foreground text-center block">—</span>
            )}
          </td>
        </tr>
      ))}
    </>
  );
}
