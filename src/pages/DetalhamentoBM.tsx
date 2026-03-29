import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { allBMs, bmRange, diasRestantes } from "@/lib/bm-utils";
import { useAllBMValues, useAllRelEventos, useAllSigemDocs, useBMSummary, useBMEvents, useBMDocs } from "@/hooks/useBMData";
import { useCronogramaTree } from "@/hooks/useCronogramaData";
import { formatCompact } from "@/lib/format";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    "Sem Comentários": "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    "Para Construção": "bg-primary/10 text-primary border-primary/30",
    "Com Comentários": "bg-amber-500/10 text-amber-700 border-amber-500/30",
    "Recusado": "bg-destructive/10 text-destructive border-destructive/30",
    "Aprovado": "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    "Concluída": "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  };
  const c = colors[status] || "bg-muted text-muted-foreground border-muted-foreground/20";
  return <span className={`inline-flex text-[10px] px-1.5 py-0.5 rounded border ${c}`}>{status || "-"}</span>;
}

export default function DetalhamentoBM() {
  const { data: bmValues, isLoading: loadingBM } = useAllBMValues();
  const { data: relEventos } = useAllRelEventos();
  const { data: sigemDocs } = useAllSigemDocs();
  const { data: tree } = useCronogramaTree();
  const summary = useBMSummary(bmValues);

  const bms = allBMs();
  const [selectedBMNum, setSelectedBMNum] = useState<number | null>(null);
  const activeBMNum = selectedBMNum ?? summary.bmAtualNum;
  const selectedBM = `BM-${String(activeBMNum).padStart(2, "0")}`;
  const range = bmRange(selectedBM);

  // BM-specific values
  const bmSpecific = useMemo(() => {
    if (!bmValues) return { previsto: 0, projetado: 0, realizado: 0 };
    let previsto = 0, projetado = 0, realizado = 0;
    bmValues.forEach((v) => {
      if (v.bm_name !== selectedBM) return;
      if (v.tipo === "Previsto") previsto += v.valor;
      else if (v.tipo === "Projetado") projetado += v.valor;
      else if (v.tipo === "Realizado") realizado += v.valor;
    });
    return { previsto, projetado, realizado };
  }, [bmValues, selectedBM]);

  // Agrupamentos for this BM
  const agrupamentos = useMemo(() => {
    if (!bmValues) return [];
    const map = new Map<string, { previsto: number; projetado: number; realizado: number }>();
    bmValues
      .filter((v) => v.bm_name === selectedBM && v.ippu)
      .forEach((v) => {
        if (!map.has(v.ippu)) map.set(v.ippu, { previsto: 0, projetado: 0, realizado: 0 });
        const entry = map.get(v.ippu)!;
        if (v.tipo === "Previsto") entry.previsto += v.valor;
        else if (v.tipo === "Projetado") entry.projetado += v.valor;
        else if (v.tipo === "Realizado") entry.realizado += v.valor;
      });

    const treeMap = new Map<string, string>();
    tree?.forEach((n) => { if (n.ippu) treeMap.set(n.ippu, n.nome); });

    return [...map.entries()]
      .map(([ippu, vals]) => ({ ippu, nome: treeMap.get(ippu) || "", ...vals }))
      .sort((a, b) => b.previsto - a.previsto);
  }, [bmValues, selectedBM, tree]);

  // Events & Docs
  const eventsInBM = useBMEvents(relEventos, selectedBM);
  const docsInBM = useBMDocs(sigemDocs, selectedBM);

  const eventsSummary = useMemo(() => {
    const concluidos = eventsInBM.filter((e: any) => e.etapa === "Concluída").length;
    const valor = eventsInBM.reduce((s: number, e: any) => s + (Number(e.valor) || 0), 0);
    return { total: eventsInBM.length, concluidos, pendentes: eventsInBM.length - concluidos, valor };
  }, [eventsInBM]);

  const docsSummary = useMemo(() => {
    const ok = docsInBM.filter((d: any) => ["Sem Comentários", "Para Construção"].includes(d.status_correto)).length;
    const recusados = docsInBM.filter((d: any) => d.status_correto === "Recusado").length;
    const comentarios = docsInBM.filter((d: any) => d.status_correto === "Com Comentários").length;
    return { total: docsInBM.length, ok, recusados, comentarios };
  }, [docsInBM]);

  const [showAllEvents, setShowAllEvents] = useState(false);
  const visibleEvents = showAllEvents ? eventsInBM : eventsInBM.slice(0, 200);

  if (loadingBM) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Detalhamento por Período de Medição</h1>
        <p className="text-sm text-muted-foreground mt-1">Análise detalhada por Boletim de Medição (BM)</p>
      </div>

      {/* Global KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          { label: "BM Atual", value: `BM-${String(summary.bmAtualNum).padStart(2, "0")}`, icon: Calendar },
          { label: "Dias Restantes", value: `${diasRestantes(`BM-${String(summary.bmAtualNum).padStart(2, "0")}`)}d`, icon: Clock },
          { label: "Total Medido", value: formatCompact(summary.totalMedido), icon: TrendingUp },
          { label: "Total Previsto", value: formatCompact(summary.totalPrevisto), icon: Wallet },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <kpi.icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{kpi.label}</p>
                <p className="font-mono text-sm font-bold mt-0.5">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* BM Tabs */}
      <ScrollArea className="w-full">
        <div className="flex gap-1.5 pb-2">
          {bms.map((bm) => {
            const status = summary.bmStatusMap.get(bm.number) || "futuro";
            const isActive = bm.number === activeBMNum;
            return (
              <button
                key={bm.number}
                onClick={() => setSelectedBMNum(bm.number)}
                className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : status === "realizado"
                    ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
                    : status === "atual"
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {bm.name}
                {status === "atual" && !isActive && (
                  <Badge variant="secondary" className="ml-1 text-[8px] px-1 py-0">ATUAL</Badge>
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* BM Sub-header */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">{selectedBM}</h2>
        <span className="text-sm text-muted-foreground">{range.label}</span>
        {summary.bmStatusMap.get(activeBMNum) === "atual" && (
          <Badge variant="outline" className="text-xs">{diasRestantes(selectedBM)}d restantes</Badge>
        )}
      </div>

      {/* BM KPIs */}
      <div className="grid gap-3 grid-cols-3">
        {[
          { label: "Previsto", value: bmSpecific.previsto, color: "text-primary" },
          { label: "Projetado", value: bmSpecific.projetado, color: "text-purple-600" },
          { label: "Realizado", value: bmSpecific.realizado, color: "text-emerald-600" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.label}</p>
              <p className={`font-mono text-sm font-bold mt-1 ${k.color}`}>{formatCompact(k.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section 1: Agrupamentos */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Agrupamentos neste BM ({agrupamentos.length})</h3>
        {agrupamentos.length > 0 ? (
          <div className="rounded-md border overflow-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">iPPU</TableHead>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs text-right">Previsto</TableHead>
                  <TableHead className="text-xs text-right">Projetado</TableHead>
                  <TableHead className="text-xs text-right">Realizado</TableHead>
                  <TableHead className="text-xs text-center">Semáforo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agrupamentos.map((a) => (
                  <TableRow key={a.ippu} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="text-[10px] font-mono">{a.ippu}</TableCell>
                    <TableCell className="text-[10px] max-w-[200px] truncate">{a.nome}</TableCell>
                    <TableCell className="text-[10px] text-right font-mono">{fmtBRL(a.previsto)}</TableCell>
                    <TableCell className="text-[10px] text-right font-mono">{fmtBRL(a.projetado)}</TableCell>
                    <TableCell className="text-[10px] text-right font-mono">{fmtBRL(a.realizado)}</TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                        a.realizado > 0 ? "bg-emerald-500" : a.previsto > 0 ? "bg-primary" : "bg-muted-foreground/30"
                      }`} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-8 text-center">Nenhum dado para este período</p>
        )}
      </div>

      {/* Section 2: GITEC Events */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Eventos GITEC neste período</h3>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>{eventsSummary.total} eventos</span>
          <span className="text-emerald-600 font-medium">{eventsSummary.concluidos} concluídos</span>
          <span className="text-amber-600 font-medium">{eventsSummary.pendentes} pendentes</span>
          <span className="font-mono font-medium text-foreground">{fmtBRL(eventsSummary.valor)}</span>
        </div>
        {eventsInBM.length > 0 ? (
          <>
            <div className="rounded-md border overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">TAG</TableHead>
                    <TableHead className="text-xs">Item PPU</TableHead>
                    <TableHead className="text-xs">Etapa</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Valor</TableHead>
                    <TableHead className="text-xs text-right">Qtd Pond.</TableHead>
                    <TableHead className="text-xs">Fiscal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleEvents
                    .sort((a: any, b: any) => (Number(b.valor) || 0) - (Number(a.valor) || 0))
                    .map((e: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="text-[10px] font-mono">{e.tag || "-"}</TableCell>
                        <TableCell className="text-[10px] font-mono">{e.item_ppu || "-"}</TableCell>
                        <TableCell><StatusBadge status={e.etapa || ""} /></TableCell>
                        <TableCell><StatusBadge status={e.status || ""} /></TableCell>
                        <TableCell className="text-[10px] text-right font-mono">{fmtBRL(Number(e.valor) || 0)}</TableCell>
                        <TableCell className="text-[10px] text-right font-mono">{Number(e.quantidade_ponderada || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-[10px]">{e.fiscal_responsavel || "-"}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
            {eventsInBM.length > 200 && !showAllEvents && (
              <button onClick={() => setShowAllEvents(true)} className="text-xs text-primary hover:underline">
                Carregar mais ({eventsInBM.length - 200} restantes)
              </button>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground py-4 text-center">Nenhum evento neste período</p>
        )}
      </div>

      {/* Section 3: SIGEM Docs */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Documentos SIGEM neste período</h3>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>{docsSummary.total} docs</span>
          <span className="text-emerald-600 font-medium">{docsSummary.ok} OK</span>
          {docsSummary.comentarios > 0 && <span className="text-amber-600 font-medium">{docsSummary.comentarios} Com Comentários</span>}
          {docsSummary.recusados > 0 && <span className="text-destructive font-medium">{docsSummary.recusados} Recusados</span>}
        </div>
        {docsInBM.length > 0 ? (
          <div className="rounded-md border overflow-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Documento</TableHead>
                  <TableHead className="text-xs">Revisão</TableHead>
                  <TableHead className="text-xs">Título</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">PPU</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docsInBM.map((d: any, i: number) => (
                  <TableRow key={i} className={d.status_correto === "Recusado" ? "border-l-2 border-l-destructive" : ""}>
                    <TableCell className="text-[10px] font-mono">{d.documento}</TableCell>
                    <TableCell className="text-[10px]">{d.revisao || "-"}</TableCell>
                    <TableCell className="text-[10px] max-w-[200px] truncate">{d.titulo || "-"}</TableCell>
                    <TableCell><StatusBadge status={d.status_correto || d.status || ""} /></TableCell>
                    <TableCell className="text-[10px] font-mono">{d.ppu || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-4 text-center">Nenhum documento neste período</p>
        )}
      </div>
    </motion.div>
  );
}
