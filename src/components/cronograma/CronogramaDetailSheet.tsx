import React, { useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { usePPUDetail } from "@/hooks/usePPUDetail";
import { useCronogramaBmByIppu } from "@/hooks/useCronogramaData";
import { formatCompact, formatCurrency } from "@/lib/format";
import type { CronoTreeNode } from "@/hooks/useCronogramaData";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const semaforoConfig: Record<string, { label: string; color: string }> = {
  medido: { label: "Medido", color: "bg-emerald-500" },
  executado: { label: "Executado", color: "bg-amber-500" },
  previsto: { label: "Previsto", color: "bg-blue-500" },
  futuro: { label: "Futuro", color: "bg-muted-foreground/30" },
};

interface Props {
  node: CronoTreeNode | null;
  onClose: () => void;
}

export function CronogramaDetailSheet({ node, onClose }: Props) {
  const ippu = node?.ippu || null;
  const { scon, rel, sigem, criterio, isLoading } = usePPUDetail(ippu, null);
  const { data: bmValues } = useCronogramaBmByIppu(ippu);

  // Group BM values by bm_number
  const bmGrouped = useMemo(() => {
    if (!bmValues) return [];
    const map = new Map<number, { bm_name: string; previsto: number; projetado: number; realizado: number }>();
    bmValues.forEach(bv => {
      if (!map.has(bv.bm_number)) map.set(bv.bm_number, { bm_name: bv.bm_name, previsto: 0, projetado: 0, realizado: 0 });
      const entry = map.get(bv.bm_number)!;
      const tipo = bv.tipo.toLowerCase();
      if (tipo.includes("previst")) entry.previsto += Number(bv.valor) || 0;
      else if (tipo.includes("projetad")) entry.projetado += Number(bv.valor) || 0;
      else if (tipo.includes("realizad")) entry.realizado += Number(bv.valor) || 0;
    });
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([n, v]) => ({ ...v, bm_number: n }));
  }, [bmValues]);

  const relSummary = useMemo(() => {
    const concluidos = rel.filter((r: any) => r.etapa === "Concluída").length;
    return { concluidos, pendentes: rel.length - concluidos, valorTotal: rel.reduce((s: number, r: any) => s + (Number(r.valor) || 0), 0) };
  }, [rel]);

  if (!node) return null;
  const sem = semaforoConfig[node.semaforo || "futuro"];

  return (
    <Sheet open={!!node} onOpenChange={() => onClose()}>
      <SheetContent className="w-[740px] max-w-full overflow-y-auto p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <SheetTitle className="font-mono text-xl">{node.ippu || node.nome}</SheetTitle>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${sem.color} text-white`}>
              {sem.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{node.nome}</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            {node.fase_nome && <span>{node.fase_nome}</span>}
            {node.subfase_nome && <><span>›</span><span>{node.subfase_nome}</span></>}
          </div>
        </SheetHeader>

        <div className="p-6 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={["financeiro", "bm", "scon", "gitec", "sigem"]}>
              {/* Resumo Financeiro */}
              <AccordionItem value="financeiro">
                <AccordionTrigger className="text-sm font-semibold">Resumo Financeiro</AccordionTrigger>
                <AccordionContent>
                  <Card><CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase">Valor</p>
                      <p className="text-sm font-semibold font-mono">{fmtBRL(node.valor)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase">Acumulado</p>
                      <p className="text-sm font-semibold font-mono">{fmtBRL(node.acumulado)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase">Saldo</p>
                      <p className="text-sm font-semibold font-mono">{fmtBRL(node.saldo)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase">SCON Avanço</p>
                      <p className="text-sm font-semibold">{node.scon_avg_avanco !== undefined ? `${node.scon_avg_avanco.toFixed(1)}%` : "—"}</p>
                    </div>
                  </CardContent></Card>
                </AccordionContent>
              </AccordionItem>

              {/* BMs */}
              {bmGrouped.length > 0 && (
                <AccordionItem value="bm">
                  <AccordionTrigger className="text-sm font-semibold">Detalhamento por BM ({bmGrouped.length})</AccordionTrigger>
                  <AccordionContent>
                    <div className="rounded-md border overflow-auto max-h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">BM</TableHead>
                            <TableHead className="text-xs text-right">Previsto</TableHead>
                            <TableHead className="text-xs text-right">Projetado</TableHead>
                            <TableHead className="text-xs text-right">Realizado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bmGrouped.map(bm => (
                            <TableRow key={bm.bm_number}>
                              <TableCell className="text-[10px] font-mono font-medium">{bm.bm_name}</TableCell>
                              <TableCell className="text-[10px] text-right font-mono">{bm.previsto ? formatCompact(bm.previsto) : "—"}</TableCell>
                              <TableCell className="text-[10px] text-right font-mono">{bm.projetado ? formatCompact(bm.projetado) : "—"}</TableCell>
                              <TableCell className="text-[10px] text-right font-mono text-chart-3">{bm.realizado ? formatCompact(bm.realizado) : "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* SCON */}
              <AccordionItem value="scon">
                <AccordionTrigger className="text-sm font-semibold">Componentes SCON ({scon.length})</AccordionTrigger>
                <AccordionContent>
                  {scon.length > 0 ? (
                    <div className="rounded-md border overflow-auto max-h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">TAG</TableHead>
                            <TableHead className="text-xs">Disciplina</TableHead>
                            <TableHead className="text-xs text-right">Qtd</TableHead>
                            <TableHead className="text-xs text-center">Avanço</TableHead>
                            <TableHead className="text-xs">SIGEM</TableHead>
                            <TableHead className="text-xs">GITEC</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {scon.map((c: any, i: number) => {
                            const av = Number(c.avanco_ponderado) || 0;
                            return (
                              <TableRow key={i}>
                                <TableCell className="text-[10px] font-mono">{c.tag || "-"}</TableCell>
                                <TableCell className="text-[10px]">{c.disciplina || "-"}</TableCell>
                                <TableCell className="text-[10px] text-right font-mono">{Number(c.qtde_etapa || 0)}</TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center gap-1">
                                    <Progress value={av} className={`h-1.5 w-12 ${av >= 100 ? "[&>div]:bg-emerald-500" : av > 0 ? "[&>div]:bg-amber-500" : "[&>div]:bg-muted-foreground/30"}`} />
                                    <span className="text-[9px] font-mono w-8 text-right">{av.toFixed(0)}%</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-[10px]">{c.status_sigem || "-"}</TableCell>
                                <TableCell className="text-[10px]">{c.status_gitec || "-"}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : <p className="text-xs text-muted-foreground">Nenhum componente SCON encontrado</p>}
                </AccordionContent>
              </AccordionItem>

              {/* GITEC */}
              <AccordionItem value="gitec">
                <AccordionTrigger className="text-sm font-semibold">Eventos GITEC ({rel.length})</AccordionTrigger>
                <AccordionContent>
                  <div className="flex gap-4 text-xs mb-2">
                    <span className="text-emerald-600 font-medium">{relSummary.concluidos} concluídos</span>
                    <span className="text-amber-600 font-medium">{relSummary.pendentes} pendentes</span>
                    <span className="font-mono font-medium">{fmtBRL(relSummary.valorTotal)}</span>
                  </div>
                  {rel.length > 0 ? (
                    <div className="rounded-md border overflow-auto max-h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">TAG</TableHead>
                            <TableHead className="text-xs">Etapa</TableHead>
                            <TableHead className="text-xs text-right">Valor</TableHead>
                            <TableHead className="text-xs">Fiscal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rel.map((r: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="text-[10px] font-mono">{r.tag || "-"}</TableCell>
                              <TableCell className="text-[10px]">{r.etapa || "-"}</TableCell>
                              <TableCell className="text-[10px] text-right font-mono">{fmtBRL(Number(r.valor) || 0)}</TableCell>
                              <TableCell className="text-[10px]">{r.fiscal_responsavel || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : <p className="text-xs text-muted-foreground">Nenhum evento GITEC encontrado</p>}
                </AccordionContent>
              </AccordionItem>

              {/* SIGEM */}
              <AccordionItem value="sigem">
                <AccordionTrigger className="text-sm font-semibold">Documentos SIGEM ({sigem.length})</AccordionTrigger>
                <AccordionContent>
                  {sigem.length > 0 ? (
                    <div className="rounded-md border overflow-auto max-h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Documento</TableHead>
                            <TableHead className="text-xs">Revisão</TableHead>
                            <TableHead className="text-xs">Título</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sigem.map((d: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="text-[10px] font-mono">{d.documento}</TableCell>
                              <TableCell className="text-[10px]">{d.revisao || "-"}</TableCell>
                              <TableCell className="text-[10px] max-w-[160px] truncate">{d.titulo || "-"}</TableCell>
                              <TableCell className="text-[10px]">{d.status_correto || d.status || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : <p className="text-xs text-muted-foreground">Nenhum documento SIGEM encontrado</p>}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
