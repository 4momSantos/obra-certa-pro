import React, { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle } from "lucide-react";
import type { MedicaoPPU, Semaforo } from "@/hooks/useMedicao";
import { usePPUDetail } from "@/hooks/usePPUDetail";
import { ComponentDetailPanel } from "./ComponentDetailPanel";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtPct(v: number) { return `${v.toFixed(1)}%`; }

function aging(dateStr: string | null): { days: number; color: string } {
  if (!dateStr) return { days: 0, color: "" };
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  return { days: diff, color: diff > 60 ? "text-destructive" : diff > 30 ? "text-amber-600" : "text-foreground" };
}

const semLabel: Record<Semaforo, { label: string; variant: "default" | "secondary" | "outline" }> = {
  medido: { label: "Medido", variant: "default" },
  executado: { label: "Executado", variant: "secondary" },
  previsto: { label: "Previsto", variant: "outline" },
  futuro: { label: "Futuro", variant: "outline" },
};

function Val({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-semibold ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status, variant }: { status: string; variant?: "sigem" | "gitec" }) {
  const colors: Record<string, string> = {
    "Sem Comentários": "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    "Para Construção": "bg-primary/10 text-primary border-primary/30",
    "Com Comentários": "bg-amber-500/10 text-amber-700 border-amber-500/30",
    "Recusado": "bg-destructive/10 text-destructive border-destructive/30",
    "Em Workflow": "bg-blue-500/10 text-blue-700 border-blue-500/30",
    "Aprovado": "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    "Concluída": "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  };
  const c = colors[status] || "bg-muted text-muted-foreground border-muted-foreground/20";
  return <span className={`inline-flex text-[10px] px-1.5 py-0.5 rounded border ${c}`}>{status || "-"}</span>;
}

function HistogramBar({ items }: { items: { label: string; count: number; color: string }[] }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  if (total === 0) return null;
  return (
    <div className="space-y-1">
      <div className="flex h-4 rounded-full overflow-hidden">
        {items.filter(i => i.count > 0).map(i => (
          <div key={i.label} className={i.color} style={{ width: `${(i.count / total) * 100}%` }} title={`${i.label}: ${i.count}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        {items.filter(i => i.count > 0).map(i => (
          <span key={i.label} className="flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-full ${i.color}`} />
            {i.label}: {i.count}
          </span>
        ))}
      </div>
    </div>
  );
}

interface Props {
  item: MedicaoPPU | null;
  onClose: () => void;
}

export function PPUDetailSheet({ item, onClose }: Props) {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const { scon, rel, sigem, criterio, eac, isLoading } = usePPUDetail(
    item?.item_ppu ?? null,
    item?.item_gitec ?? null
  );

  const sconSorted = useMemo(() => [...scon].sort((a, b) => (b.avanco_ponderado ?? 0) - (a.avanco_ponderado ?? 0)), [scon]);
  const relSorted = useMemo(() => [...rel].sort((a, b) => (b.quantidade_ponderada ?? 0) - (a.quantidade_ponderada ?? 0)), [rel]);

  const relSummary = useMemo(() => {
    const concluidos = rel.filter((r: any) => r.etapa === "Concluída").length;
    const pendentes = rel.length - concluidos;
    const valorTotal = rel.reduce((s: number, r: any) => s + (Number(r.valor) || 0), 0);
    return { concluidos, pendentes, valorTotal };
  }, [rel]);

  const sigemSummary = useMemo(() => {
    const ok = sigem.filter((d: any) => ["Sem Comentários", "Para Construção"].includes(d.status_correto)).length;
    const recusados = sigem.filter((d: any) => d.status_correto === "Recusado").length;
    const workflow = sigem.filter((d: any) => d.status_correto === "Em Workflow").length;
    return { ok, recusados, workflow };
  }, [sigem]);

  const sconHistogram = useMemo(() => {
    const zero = scon.filter((c: any) => (c.avanco_ponderado ?? 0) === 0).length;
    const low = scon.filter((c: any) => (c.avanco_ponderado ?? 0) > 0 && (c.avanco_ponderado ?? 0) <= 50).length;
    const mid = scon.filter((c: any) => (c.avanco_ponderado ?? 0) > 50 && (c.avanco_ponderado ?? 0) < 100).length;
    const done = scon.filter((c: any) => (c.avanco_ponderado ?? 0) >= 100).length;
    return [
      { label: "100%", count: done, color: "bg-emerald-500" },
      { label: "51-99%", count: mid, color: "bg-amber-500" },
      { label: "1-50%", count: low, color: "bg-orange-500" },
      { label: "0%", count: zero, color: "bg-muted-foreground/40" },
    ];
  }, [scon]);

  // Criterio with completion status from SCON
  const criterioEnriched = useMemo(() => {
    const sconEtapas = new Set(scon.filter((c: any) => (c.avanco_ponderado ?? 0) >= 100).map((c: any) => c.item_criterio));
    return criterio.map((c: any) => ({
      ...c,
      concluido: sconEtapas.has(c.identificador),
    }));
  }, [criterio, scon]);

  if (!item) return null;
  const sem = semLabel[item.semaforo];

  return (
    <Sheet open={!!item} onOpenChange={() => { setSelectedComponent(null); onClose(); }}>
      <SheetContent className="w-[740px] max-w-full overflow-y-auto p-0">
        {selectedComponent ? (
          <div className="p-6">
            <ComponentDetailPanel
              componente={selectedComponent}
              itemWbs={item.item_ppu}
              onBack={() => setSelectedComponent(null)}
              onSelectComponent={(c) => setSelectedComponent(c)}
            />
          </div>
        ) : (
        <>
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <SheetTitle className="font-mono text-xl">{item.item_ppu}</SheetTitle>
            <Badge variant={sem.variant}>{sem.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{item.descricao}</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            {item.fase && <span>{item.fase}</span>}
            {item.subfase && <><span>›</span><span>{item.subfase}</span></>}
            {item.disciplina && <><span>›</span><span className="font-medium text-foreground">{item.disciplina}</span></>}
          </div>
        </SheetHeader>

        <div className="p-6 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={["financeiro", "pipeline", "scon", "gitec", "sigem", "criterio"]}>
              {/* Seção 1 — Resumo Financeiro */}
              <AccordionItem value="financeiro">
                <AccordionTrigger className="text-sm font-semibold">Resumo Financeiro</AccordionTrigger>
                <AccordionContent>
                  <Card><CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                    <Val label="Valor Total" value={fmtBRL(item.valor_total)} mono />
                    <Val label="Valor Medido" value={fmtBRL(item.gitec_valor_aprovado)} mono />
                    <Val label="Saldo" value={fmtBRL(item.valor_total - item.gitec_valor_aprovado)} mono />
                    <Val label="% Medido" value={item.valor_total > 0 ? fmtPct((item.gitec_valor_aprovado / item.valor_total) * 100) : "0%"} />
                    <Val label="SCON Avanço" value={fmtPct(item.scon_avg_avanco)} />
                    <Val label="Gap (Exec - Medido)" value={
                      <span className={item.gap > 0 ? "text-emerald-600" : item.gap < 0 ? "text-destructive" : ""}>{fmtBRL(item.gap)}</span>
                    } mono />
                    <Val label="EAC Previsto" value={fmtPct(item.eac_previsto * 100)} />
                    <Val label="EAC Realizado" value={fmtPct(item.eac_realizado * 100)} />
                  </CardContent></Card>
                </AccordionContent>
              </AccordionItem>

              {/* Seção 2 — Pipeline */}
              <AccordionItem value="pipeline">
                <AccordionTrigger className="text-sm font-semibold">Pipeline de Medição</AccordionTrigger>
                <AccordionContent>
                  <div className="flex gap-2">
                    {[
                      { label: "Previsto", value: item.valor_total, color: "bg-blue-500" },
                      { label: "Executado", value: item.scon_valor_estimado, color: "bg-amber-500" },
                      { label: "Postado", value: item.sigem_ok, color: "bg-purple-500", isCount: true },
                      { label: "Medido", value: item.gitec_valor_aprovado, color: "bg-emerald-500" },
                    ].map(s => (
                      <div key={s.label} className="flex-1 text-center">
                        <div className={`h-8 rounded ${s.color} flex items-center justify-center text-white text-[10px] font-bold`}>
                          {(s as any).isCount ? `${s.value} docs` : fmtBRL(s.value)}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Seção 3 — SCON */}
              <AccordionItem value="scon">
                <AccordionTrigger className="text-sm font-semibold">
                  Componentes SCON ({scon.length})
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <HistogramBar items={sconHistogram} />
                  {sconSorted.length > 0 ? (
                    <div className="rounded-md border overflow-auto max-h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">TAG</TableHead>
                            <TableHead className="text-xs">Disciplina</TableHead>
                            <TableHead className="text-xs">Classe</TableHead>
                            <TableHead className="text-xs text-right">Qtd</TableHead>
                            <TableHead className="text-xs text-right">Exec</TableHead>
                            <TableHead className="text-xs text-center">Avanço</TableHead>
                            <TableHead className="text-xs">SIGEM</TableHead>
                            <TableHead className="text-xs">GITEC</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sconSorted.map((c: any, i: number) => {
                            const av = Number(c.avanco_ponderado) || 0;
                            return (
                              <TableRow key={i} className="cursor-pointer hover:bg-muted/60" onClick={() => setSelectedComponent(c.tag_id_proj || c.tag || "")}>
                                <TableCell className="text-[10px] font-mono">{c.tag || "-"}</TableCell>
                                <TableCell className="text-[10px]">{c.disciplina || "-"}</TableCell>
                                <TableCell className="text-[10px]">{c.classe || "-"}</TableCell>
                                <TableCell className="text-[10px] text-right font-mono">{Number(c.qtde_etapa || 0).toLocaleString("pt-BR")}</TableCell>
                                <TableCell className="text-[10px] text-right font-mono">{Number(c.qtde_etapa_exec_acum || 0).toLocaleString("pt-BR")}</TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center gap-1">
                                    <Progress value={av} className={`h-1.5 w-12 ${av >= 100 ? "[&>div]:bg-emerald-500" : av > 0 ? "[&>div]:bg-amber-500" : "[&>div]:bg-muted-foreground/30"}`} />
                                    <span className="text-[9px] font-mono w-8 text-right">{av.toFixed(0)}%</span>
                                  </div>
                                </TableCell>
                                <TableCell><StatusBadge status={c.status_sigem || ""} variant="sigem" /></TableCell>
                                <TableCell><StatusBadge status={c.status_gitec || ""} variant="gitec" /></TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : <p className="text-xs text-muted-foreground">Nenhum componente SCON encontrado</p>}
                </AccordionContent>
              </AccordionItem>

              {/* Seção 4 — GITEC */}
              <AccordionItem value="gitec">
                <AccordionTrigger className="text-sm font-semibold">
                  Eventos GITEC ({rel.length})
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="flex gap-4 text-xs">
                    <span className="text-emerald-600 font-medium">{relSummary.concluidos} concluídos</span>
                    <span className="text-amber-600 font-medium">{relSummary.pendentes} pendentes</span>
                    <span className="font-mono font-medium">{fmtBRL(relSummary.valorTotal)}</span>
                  </div>
                  {relSorted.length > 0 ? (
                    <div className="rounded-md border overflow-auto max-h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">TAG</TableHead>
                            <TableHead className="text-xs">Etapa</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs text-right">Qtd Pond.</TableHead>
                            <TableHead className="text-xs text-right">Valor</TableHead>
                            <TableHead className="text-xs">Fiscal</TableHead>
                            <TableHead className="text-xs text-right">Aging</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {relSorted.map((r: any, i: number) => {
                            const ag = aging(r.data_inf_execucao);
                            return (
                              <TableRow key={i}>
                                <TableCell className="text-[10px] font-mono">{r.tag || "-"}</TableCell>
                                <TableCell><StatusBadge status={r.etapa || ""} /></TableCell>
                                <TableCell><StatusBadge status={r.status || ""} /></TableCell>
                                <TableCell className="text-[10px] text-right font-mono">{Number(r.quantidade_ponderada || 0).toFixed(2)}</TableCell>
                                <TableCell className="text-[10px] text-right font-mono">{fmtBRL(Number(r.valor) || 0)}</TableCell>
                                <TableCell className="text-[10px]">{r.fiscal_responsavel || "-"}</TableCell>
                                <TableCell className={`text-[10px] text-right font-mono ${ag.color}`}>
                                  {ag.days > 0 ? `${ag.days}d` : "-"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : <p className="text-xs text-muted-foreground">Nenhum evento GITEC encontrado</p>}
                </AccordionContent>
              </AccordionItem>

              {/* Seção 5 — SIGEM */}
              <AccordionItem value="sigem">
                <AccordionTrigger className="text-sm font-semibold">
                  Documentos SIGEM ({sigem.length})
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="flex gap-4 text-xs">
                    <span className="text-emerald-600 font-medium">{sigemSummary.ok} OK</span>
                    {sigemSummary.recusados > 0 && <span className="text-destructive font-medium">{sigemSummary.recusados} recusados</span>}
                    {sigemSummary.workflow > 0 && <span className="text-blue-600 font-medium">{sigemSummary.workflow} em workflow</span>}
                  </div>
                  {sigem.length > 0 ? (
                    <div className="rounded-md border overflow-auto max-h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Documento</TableHead>
                            <TableHead className="text-xs">Revisão</TableHead>
                            <TableHead className="text-xs">Título</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs">Status GITEC</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sigem.map((d: any, i: number) => (
                            <TableRow key={i} className={d.status_correto === "Recusado" ? "bg-destructive/5" : ""}>
                              <TableCell className="text-[10px] font-mono">{d.documento}</TableCell>
                              <TableCell className="text-[10px]">{d.revisao || "-"}</TableCell>
                              <TableCell className="text-[10px] max-w-[160px] truncate">{d.titulo || "-"}</TableCell>
                              <TableCell><StatusBadge status={d.status_correto || d.status || ""} variant="sigem" /></TableCell>
                              <TableCell><StatusBadge status={d.status_gitec || ""} variant="gitec" /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : <p className="text-xs text-muted-foreground">Nenhum documento SIGEM encontrado</p>}
                </AccordionContent>
              </AccordionItem>

              {/* Seção 6 — Critério de Medição */}
              <AccordionItem value="criterio">
                <AccordionTrigger className="text-sm font-semibold">
                  Critério de Medição ({criterio.length})
                </AccordionTrigger>
                <AccordionContent className="space-y-2">
                  {criterioEnriched.length > 0 ? (
                    criterioEnriched.map((c: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 rounded-md border p-3">
                        {c.concluido ? (
                          <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 mt-0.5 text-muted-foreground/40 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{c.nome || c.identificador}</p>
                          {c.dicionario_etapa && <p className="text-[10px] text-muted-foreground mt-0.5">{c.dicionario_etapa}</p>}
                          <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                            <span>Peso Abs: {Number(c.peso_absoluto || 0).toFixed(4)}</span>
                            <span>Peso Fís/Fin: {Number(c.peso_fisico_fin || 0).toFixed(4)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : <p className="text-xs text-muted-foreground">Nenhum critério encontrado para este PPU</p>}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
        </>
        )}
      </SheetContent>
    </Sheet>
  );
}
