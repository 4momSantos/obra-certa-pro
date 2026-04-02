import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Users, Info, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

function dateToBM(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const m = d.getMonth(); // 0-based
  const y = d.getFullYear();
  // BM convention: month number in the project year
  return `BM${String(m + 1).padStart(2, "0")}/${y}`;
}

function fmtPct(v: number) { return `${v.toFixed(1)}%`; }

interface EtapaGroup {
  etapa: string;
  atividade: string;
  equipe: string;
  semanas: any[];
  programado: number;
  execTotal: number;
  bm: string;
}

interface Props {
  componente: string;
  itemWbs: string;
  onBack: () => void;
  onSelectComponent?: (comp: string) => void;
}

export function ComponentDetailPanel({ componente, itemWbs, onBack, onSelectComponent }: Props) {
  // Fetch scon_programacao for this component
  const { data: rows, isLoading } = useQuery({
    queryKey: ["scon-prog-comp", componente],
    enabled: !!componente,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const all: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("scon_programacao")
          .select("*")
          .eq("componente", componente)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
  });

  // Fetch siblings (same item_wbs, different componente)
  const { data: siblings } = useQuery({
    queryKey: ["scon-siblings", itemWbs, componente],
    enabled: !!itemWbs,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_scon_componentes" as any)
        .select("componente, avanco, disciplina, total_etapas")
        .eq("item_wbs", itemWbs)
        .neq("componente", componente)
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Group by etapa
  const etapas = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    const map = new Map<string, any[]>();
    for (const r of rows) {
      const key = r.etapa || "Sem etapa";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    const groups: EtapaGroup[] = [];
    for (const [etapa, items] of map) {
      const first = items[0];
      const programado = Math.max(...items.map((i: any) => Number(i.programado_componente) || 0));
      const execTotal = Math.max(...items.map((i: any) => Number(i.total_exec_geral) || 0));
      groups.push({
        etapa,
        atividade: first.atividade || "",
        equipe: first.equipe_desc || first.equipe || "",
        semanas: items.sort((a: any, b: any) => (a.semana || "").localeCompare(b.semana || "")),
        programado,
        execTotal,
        bm: dateToBM(first.data_inicio),
      });
    }
    return groups.sort((a, b) => a.etapa.localeCompare(b.etapa));
  }, [rows]);

  // Extract identification data from first row
  const info = rows?.[0];

  if (isLoading) {
    return (
      <div className="space-y-3 p-2">
        <Button variant="ghost" size="sm" onClick={onBack}><ChevronLeft className="h-4 w-4 mr-1" />Voltar</Button>
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0">
          <ChevronLeft className="h-4 w-4 mr-1" />Voltar
        </Button>
        <h3 className="text-sm font-semibold font-mono truncate">{componente}</h3>
      </div>

      {rows && rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum dado de programação encontrado para este componente.</p>
      ) : (
        <Accordion type="multiple" defaultValue={["etapas", "equipe", "ident", "irmaos"]}>
          {/* Etapas */}
          <AccordionItem value="etapas">
            <AccordionTrigger className="text-sm font-semibold">
              <div className="flex items-center gap-2"><Layers className="h-4 w-4" />Etapas ({etapas.length})</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {etapas.map((eg) => {
                const pct = eg.programado > 0 ? Math.min((eg.execTotal / eg.programado) * 100, 100) : 0;
                return (
                  <Card key={eg.etapa} className="border">
                    <CardHeader className="p-3 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-xs font-semibold">{eg.etapa}</CardTitle>
                          <p className="text-[10px] text-muted-foreground truncate">{eg.atividade}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="text-[10px]">{eg.equipe}</Badge>
                          <Badge variant="outline" className="text-[10px] font-mono">{eg.bm}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="text-[10px] font-mono w-16 text-right">
                          {eg.execTotal.toFixed(2)}/{eg.programado.toFixed(2)}
                        </span>
                        <span className="text-[10px] font-mono font-semibold w-10 text-right">{fmtPct(pct)}</span>
                      </div>
                    </CardHeader>
                    {eg.semanas.length > 1 && (
                      <CardContent className="p-3 pt-0">
                        <div className="rounded-md border overflow-auto max-h-[180px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-[10px]">Semana</TableHead>
                                <TableHead className="text-[10px]">Início</TableHead>
                                <TableHead className="text-[10px]">Fim</TableHead>
                                <TableHead className="text-[10px]">Equipe</TableHead>
                                <TableHead className="text-[10px] text-right">Exec Sem</TableHead>
                                <TableHead className="text-[10px] text-right">Exec Total</TableHead>
                                <TableHead className="text-[10px] text-right">Programado</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {eg.semanas.map((s: any, si: number) => (
                                <TableRow key={si}>
                                  <TableCell className="text-[10px] font-mono">{s.semana || "—"}</TableCell>
                                  <TableCell className="text-[10px]">{s.data_inicio ? new Date(s.data_inicio).toLocaleDateString("pt-BR") : "—"}</TableCell>
                                  <TableCell className="text-[10px]">{s.data_fim ? new Date(s.data_fim).toLocaleDateString("pt-BR") : "—"}</TableCell>
                                  <TableCell className="text-[10px]">{s.equipe_desc || s.equipe || "—"}</TableCell>
                                  <TableCell className="text-[10px] text-right font-mono">{Number(s.total_exec_semana || 0).toFixed(3)}</TableCell>
                                  <TableCell className="text-[10px] text-right font-mono">{Number(s.total_exec_geral || 0).toFixed(3)}</TableCell>
                                  <TableCell className="text-[10px] text-right font-mono">{Number(s.programado_componente || 0).toFixed(3)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </AccordionContent>
          </AccordionItem>

          {/* Equipe Responsável */}
          {info && (
            <AccordionItem value="equipe">
              <AccordionTrigger className="text-sm font-semibold">
                <div className="flex items-center gap-2"><Users className="h-4 w-4" />Equipe Responsável</div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="grid grid-cols-2 gap-3 p-4">
                    {[
                      { label: "Encarregado", value: info.encarregado },
                      { label: "Supervisor", value: info.supervisor },
                      { label: "Engenheiro", value: info.engenheiro },
                      { label: "Gerente", value: info.gerente },
                    ].map((f) => (
                      <div key={f.label} className="space-y-0.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{f.label}</p>
                        <p className="text-xs font-medium">{f.value || "—"}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Identificação Extra */}
          {info && (
            <AccordionItem value="ident">
              <AccordionTrigger className="text-sm font-semibold">
                <div className="flex items-center gap-2"><Info className="h-4 w-4" />Dados de Identificação</div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="grid grid-cols-3 gap-3 p-4">
                    {[
                      { label: "CWP", value: info.cwp },
                      { label: "Classe", value: info.classe },
                      { label: "Tipo", value: info.tipo },
                      { label: "Documento", value: info.documento },
                      { label: "Pacote", value: info.pacote },
                      { label: "ID Primavera", value: info.id_primavera },
                      { label: "Valor Unitário", value: Number(info.unit_valor || 0).toFixed(2), mono: true },
                      { label: "Índice ROP", value: Number(info.indice_rop || 0).toFixed(4), mono: true },
                      { label: "Peso Custo", value: Number(info.peso_custcode || 0).toFixed(4), mono: true },
                    ].map((f) => (
                      <div key={f.label} className="space-y-0.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{f.label}</p>
                        <p className={`text-xs font-medium ${(f as any).mono ? "font-mono" : ""}`}>{f.value || "—"}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Componentes Irmãos */}
          {siblings && siblings.length > 0 && (
            <AccordionItem value="irmaos">
              <AccordionTrigger className="text-sm font-semibold">
                Componentes Irmãos ({siblings.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                  {siblings.map((s: any) => {
                    const av = (Number(s.avanco) || 0) * 100;
                    return (
                      <div
                        key={s.componente}
                        className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/60 transition-colors"
                        onClick={() => onSelectComponent?.(s.componente)}
                      >
                        <span className="text-[10px] font-mono flex-1 truncate">{s.componente}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">{s.disciplina}</Badge>
                        <Badge variant="secondary" className="text-[10px] shrink-0">{s.total_etapas} etapas</Badge>
                        <div className="flex items-center gap-1 shrink-0">
                          <Progress value={av} className="h-1.5 w-10" />
                          <span className="text-[9px] font-mono w-8 text-right">{av.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      )}
    </div>
  );
}
