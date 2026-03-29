import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { FileUp, Loader2, Expand, Shrink, Search, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCronogramaTree, useCurvaS, useUltimoBm, useCronogramaBm } from "@/hooks/useCronogramaData";
import { CronogramaTreeGrid } from "@/components/cronograma/CronogramaTreeGrid";
import { CurvaSCharts } from "@/components/cronograma/CurvaSCharts";
import { CronogramaDetailSheet } from "@/components/cronograma/CronogramaDetailSheet";
import { ComparativoTab } from "@/components/cronograma/ComparativoTab";
import { ForecastTab } from "@/components/cronograma/ForecastTab";
import { formatCompact } from "@/lib/format";
import { Link } from "react-router-dom";
import type { CronoTreeNode } from "@/hooks/useCronogramaData";

export default function Cronograma() {
  const { data: tree, isLoading: loadingTree } = useCronogramaTree();
  const { data: curvaS } = useCurvaS();
  const { data: ultimoBm } = useUltimoBm();
  const { data: bmData } = useCronogramaBm();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [bmFilter, setBmFilter] = useState<string>("");
  const [selectedNode, setSelectedNode] = useState<CronoTreeNode | null>(null);

  const expandAll = useCallback(() => {
    if (!tree) return;
    const all = new Set<string>();
    tree.forEach(n => { all.add(n.nome); all.add(`${n.fase_nome}::${n.subfase_nome}::${n.ippu}`); });
    setExpanded(all);
  }, [tree]);

  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  // BM numbers for filter
  const bmNumbers = useMemo(() => {
    const nums = new Set<number>();
    bmData?.forEach(b => nums.add(b.bm_number));
    return [...nums].sort((a, b) => a - b);
  }, [bmData]);

  // BM values for selected filter
  const bmFilterValues = useMemo(() => {
    if (!bmFilter || !bmData) return new Map<string, { previsto: number; projetado: number; realizado: number }>();
    const bmNum = parseInt(bmFilter);
    const map = new Map<string, { previsto: number; projetado: number; realizado: number }>();
    bmData.filter(b => b.bm_number === bmNum).forEach(b => map.set(b.ippu, b));
    return map;
  }, [bmFilter, bmData]);

  // Totals
  const totals = useMemo(() => {
    if (!tree) return { contrato: 0, acum: 0, saldo: 0, agrups: 0 };
    const fases = tree.filter(n => n.nivel.includes("Fase"));
    return {
      contrato: fases.reduce((s, n) => s + n.valor, 0),
      acum: fases.reduce((s, n) => s + n.acumulado, 0),
      saldo: fases.reduce((s, n) => s + n.saldo, 0),
      agrups: tree.filter(n => n.nivel.includes("Agrupamento")).length,
    };
  }, [tree]);

  if (loadingTree) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
        </div>
      </div>
    );
  }

  if (!tree || tree.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center h-64 gap-4">
        <FileUp className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">Importe o Cronograma Financeiro (CR-5290)</p>
        <Button asChild><Link to="/import">Ir para Importação</Link></Button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cronograma EAP — Acompanhamento Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Árvore EAP hierárquica com valores por BM
          {ultimoBm ? ` — Último BM com realizado: BM-${String(ultimoBm).padStart(2, "0")}` : ""}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {[
          { label: "Contrato", value: totals.contrato, color: "text-foreground" },
          { label: "Acumulado", value: totals.acum, color: "text-chart-3" },
          { label: "Saldo", value: totals.saldo, color: "text-chart-2" },
          { label: "Agrupamentos", value: totals.agrups, isCount: true },
          { label: "Último BM", value: ultimoBm || 0, isBm: true },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{item.label}</p>
              <p className={`font-mono text-sm font-bold mt-1 ${(item as any).color || "text-foreground"}`}>
                {(item as any).isCount ? item.value
                  : (item as any).isBm ? (item.value ? `BM-${String(item.value).padStart(2, "0")}` : "—")
                  : formatCompact(item.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={expandAll} className="gap-1.5">
          <Expand className="h-3.5 w-3.5" /> Expandir
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll} className="gap-1.5">
          <Shrink className="h-3.5 w-3.5" /> Colapsar
        </Button>
        <Select value={bmFilter} onValueChange={setBmFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Filtro BM" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos BMs</SelectItem>
            {bmNumbers.map(n => (
              <SelectItem key={n} value={String(n)}>BM-{String(n).padStart(2, "0")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {bmFilter && bmFilter !== "all" && (
          <Badge variant="secondary" className="gap-1 text-xs">
            BM-{String(bmFilter).padStart(2, "0")}
            <button onClick={() => setBmFilter("")}><X className="h-3 w-3" /></button>
          </Badge>
        )}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar iPPU ou nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 w-[220px] text-xs"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tree" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tree">Tree Grid</TabsTrigger>
          <TabsTrigger value="curvas">Curva S</TabsTrigger>
          <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="tree" className="space-y-4">
          <CronogramaTreeGrid
            tree={tree}
            expanded={expanded}
            onToggle={(key) => setExpanded(prev => {
              const next = new Set(prev);
              next.has(key) ? next.delete(key) : next.add(key);
              return next;
            })}
            search={search}
            bmFilter={bmFilter && bmFilter !== "all" ? parseInt(bmFilter) : null}
            bmFilterValues={bmFilterValues}
            onSelectNode={setSelectedNode}
          />
        </TabsContent>

        <TabsContent value="curvas">
          {curvaS && curvaS.length > 0 ? (
            <CurvaSCharts data={curvaS} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">Nenhum dado de Curva S disponível</p>
          )}
        </TabsContent>

        <TabsContent value="comparativo">
          <ComparativoTab />
        </TabsContent>

        <TabsContent value="forecast">
          <ForecastTab />
        </TabsContent>
      </Tabs>

      {/* Detail Sheet */}
      <CronogramaDetailSheet
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
      />
    </motion.div>
  );
}
