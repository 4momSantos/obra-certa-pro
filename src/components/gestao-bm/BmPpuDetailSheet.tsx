import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { bmRange, allBMs } from "@/lib/bm-utils";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Clock } from "lucide-react";
import { TagCriterioSection } from "./TagCriterioSection";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

const statusColor = (s: string) => {
  if (s.includes("Aprovado")) return { border: "border-l-emerald-500", badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" };
  if (s.includes("Verificação")) return { border: "border-l-amber-500", badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400", dot: "bg-amber-500" };
  if (s.includes("Aprovação")) return { border: "border-l-orange-500", badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400", dot: "bg-orange-500" };
  if (s.includes("Recusado")) return { border: "border-l-destructive", badge: "bg-destructive/15 text-destructive", dot: "bg-destructive" };
  return { border: "border-l-muted-foreground", badge: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" };
};

interface Props {
  open: boolean;
  onClose: () => void;
  itemPpu: string;
  bmName: string;
}

export function BmPpuDetailSheet({ open, onClose, itemPpu, bmName }: Props) {
  const range = bmRange(bmName);
  const startStr = range.start.toISOString().split("T")[0];
  const endStr = range.end.toISOString().split("T")[0];

  // PPU item info
  const { data: ppuInfo, isLoading: ppuLoading } = useQuery({
    queryKey: ["ppu-detail", itemPpu],
    enabled: open && !!itemPpu,
    queryFn: async () => {
      const { data } = await supabase
        .from("ppu_items")
        .select("item_ppu, descricao, disc, valor_total")
        .eq("item_ppu", itemPpu)
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 120_000,
  });

  // Cronograma BM data for this PPU
  const { data: cronoBm, isLoading: cronoLoading } = useQuery({
    queryKey: ["ppu-crono-bm", itemPpu, bmName],
    enabled: open && !!itemPpu,
    queryFn: async () => {
      const { data } = await supabase
        .from("vw_cronograma_bm_por_ippu")
        .select("previsto, projetado, realizado")
        .eq("ippu", itemPpu)
        .eq("bm_name", bmName)
        .maybeSingle();
      return data;
    },
    staleTime: 30_000,
  });

  // GITEC events for this PPU in this BM
  const { data: gitecEvents, isLoading: gitecLoading } = useQuery({
    queryKey: ["ppu-gitec-events", itemPpu, bmName],
    enabled: open && !!itemPpu,
    queryFn: async () => {
      const { data } = await supabase
        .from("gitec_events")
        .select("*")
        .eq("ippu", itemPpu)
        .gte("data_execucao", startStr)
        .lte("data_execucao", endStr)
        .order("data_execucao", { ascending: false });
      return data ?? [];
    },
    staleTime: 30_000,
  });

  // Evidence IDs from gitec events
  const evidenceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of gitecEvents ?? []) {
      if (e.evidencias) {
        for (const id of e.evidencias.split(";")) {
          const trimmed = id.trim();
          if (trimmed) ids.add(trimmed);
        }
      }
    }
    return Array.from(ids);
  }, [gitecEvents]);

  // Evidences from sigem_documents
  const { data: evidencias, isLoading: evidLoading } = useQuery({
    queryKey: ["ppu-evidencias", evidenceIds],
    enabled: open && evidenceIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("sigem_documents")
        .select("documento, titulo, status_correto, revisao, incluido_em, status_gitec")
        .in("documento", evidenceIds);
      return data ?? [];
    },
    staleTime: 60_000,
  });

  // History: all BMs for this PPU
  const { data: history, isLoading: histLoading } = useQuery({
    queryKey: ["ppu-history", itemPpu],
    enabled: open && !!itemPpu,
    queryFn: async () => {
      const { data } = await supabase
        .from("vw_cronograma_bm_por_ippu")
        .select("bm_name, bm_number, previsto, projetado, realizado")
        .eq("ippu", itemPpu)
        .order("bm_number", { ascending: false });
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const gitecApproved = (gitecEvents ?? [])
    .filter((e) => e.status === "Aprovado")
    .reduce((s, e) => s + (e.valor ?? 0), 0);

  const previsto = cronoBm?.previsto ?? 0;
  const projetado = cronoBm?.projetado ?? 0;
  const executado = cronoBm?.realizado ?? 0;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[680px] p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="text-left space-y-1">
            {ppuLoading ? (
              <Skeleton className="h-6 w-40" />
            ) : (
              <>
                <span className="text-lg font-mono font-bold">{itemPpu}</span>
                <p className="text-sm font-normal text-muted-foreground leading-snug">
                  {ppuInfo?.descricao || "—"}
                </p>
                <div className="flex gap-2 flex-wrap pt-1">
                  {ppuInfo?.disc && <Badge variant="secondary" className="text-[10px]">{ppuInfo.disc}</Badge>}
                  <Badge variant="outline" className="text-[10px] font-mono">{bmName}</Badge>
                  {ppuInfo?.valor_total != null && (
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Contrato: {fmtBRL(ppuInfo.valor_total)}
                    </Badge>
                  )}
                </div>
              </>
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            {/* B — Resumo Financeiro */}
            <Section title="Resumo Financeiro" loading={cronoLoading}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <MiniCard label="Previsto" value={fmtBRL(previsto)} color="text-blue-500" />
                <MiniCard label="Projetado" value={fmtBRL(projetado)} color="text-purple-500" />
                <MiniCard label="Executado SCON" value={fmtBRL(executado)} color="text-emerald-500" />
                <MiniCard label="Medido GITEC" value={fmtBRL(gitecApproved)} color="text-emerald-600" />
              </div>
              {projetado > 0 && (
                <div className="space-y-1 mt-2">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Medido / Projetado</span>
                    <span>{((gitecApproved / projetado) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={(gitecApproved / projetado) * 100} className="h-1.5" />
                </div>
              )}
            </Section>

            <Separator />

            {/* C — Eventos GITEC */}
            <Section title={`Eventos GITEC (${(gitecEvents ?? []).length})`} loading={gitecLoading}>
              {(gitecEvents ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Nenhum evento GITEC neste BM.</p>
              ) : (
                <div className="space-y-2">
                  {(gitecEvents ?? []).map((ev) => {
                    const sc = statusColor(ev.status);
                    const evIds = ev.evidencias?.split(";").map((e: string) => e.trim()).filter(Boolean) ?? [];
                    return (
                      <Card key={ev.id} className={cn("border-l-4", sc.border)}>
                        <CardContent className="p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Badge className={cn("text-[10px] border-0", sc.badge)}>{ev.status}</Badge>
                            <span className="font-mono text-sm font-bold">{fmtBRL(ev.valor ?? 0)}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                            <span>Tag: <b className="text-foreground">{ev.tag || "—"}</b></span>
                            <span>Etapa: <b className="text-foreground">{ev.etapa || "—"}</b></span>
                            <span>Fiscal: <b className="text-foreground">{ev.fiscal || "—"}</b></span>
                          </div>
                          <div className="flex gap-3 text-[10px] text-muted-foreground">
                            <span>Exec: {fmtDate(ev.data_execucao)}</span>
                            {ev.data_aprovacao && <span>Aprov: {fmtDate(ev.data_aprovacao)}</span>}
                          </div>
                          {evIds.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {evIds.map((id) => (
                                <Badge key={id} variant="outline" className="text-[9px] font-mono">{id}</Badge>
                              ))}
                            </div>
                          )}
                          {ev.comentario && (
                            <div className="flex items-start gap-1.5 bg-amber-500/10 rounded p-2 mt-1">
                              <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-[10px] text-amber-700 dark:text-amber-300">{ev.comentario}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </Section>

            <Separator />

            {/* D — Evidências */}
            <Section title={`Evidências (${evidenceIds.length})`} loading={evidLoading && evidenceIds.length > 0}>
              {evidenceIds.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma evidência vinculada.</p>
              ) : (
                <div className="rounded border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Documento</TableHead>
                        <TableHead className="text-[10px]">Título</TableHead>
                        <TableHead className="text-[10px]">Status</TableHead>
                        <TableHead className="text-[10px]">Rev.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(evidencias ?? []).map((ev) => (
                        <TableRow key={ev.documento}>
                          <TableCell className="text-[10px] font-mono">{ev.documento}</TableCell>
                          <TableCell className="text-[10px] whitespace-normal">{ev.titulo || "—"}</TableCell>
                          <TableCell>
                            <Badge className={cn("text-[9px] border-0",
                              ev.status_correto === "Aprovado" ? "bg-emerald-500/15 text-emerald-600" :
                              ev.status_correto === "Recusado" ? "bg-destructive/15 text-destructive" :
                              "bg-amber-500/15 text-amber-600"
                            )}>
                              {ev.status_correto || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[10px] font-mono">{ev.revisao || "—"}</TableCell>
                        </TableRow>
                      ))}
                      {evidenceIds.filter((id) => !(evidencias ?? []).some((e) => e.documento === id)).map((id) => (
                        <TableRow key={id}>
                          <TableCell className="text-[10px] font-mono text-muted-foreground">{id}</TableCell>
                          <TableCell colSpan={3} className="text-[10px] text-muted-foreground italic">Não encontrado no SIGEM</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Section>

            <Separator />

            {/* E — Tags & Critérios */}
            <TagCriterioSection itemPpu={itemPpu} />

            <Separator />

            {/* F — Histórico */}
            <Section title="Histórico por BM" loading={histLoading}>
              {(history ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Sem histórico disponível.</p>
              ) : (
                <div className="space-y-1.5">
                  {(history ?? []).map((h) => {
                    const isCurrent = h.bm_name === bmName;
                    const hasData = (h.realizado ?? 0) > 0;
                    return (
                      <div
                        key={h.bm_name}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-[11px] border",
                          isCurrent
                            ? "border-primary bg-primary/5"
                            : hasData
                              ? "border-border"
                              : "border-border/50 opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-1.5 w-16 shrink-0">
                          {hasData && !isCurrent && <Check className="h-3 w-3 text-emerald-500" />}
                          {isCurrent && <Clock className="h-3 w-3 text-primary" />}
                          <span className={cn("font-mono font-semibold", isCurrent && "text-primary")}>
                            {h.bm_name}
                          </span>
                        </div>
                        <div className="flex-1 flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground font-mono">
                          <span>Prev: {fmtBRL(h.previsto ?? 0)}</span>
                          <span>Exec: {fmtBRL(h.realizado ?? 0)}</span>
                        </div>
                        {isCurrent && (
                          <Badge variant="outline" className="text-[8px] shrink-0">ATUAL</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// Helpers
function Section({ title, loading, children }: { title: string; loading: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">{title}</h4>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : children}
    </div>
  );
}

function MiniCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="p-2.5">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className={cn("text-sm font-bold font-mono", color)}>{value}</p>
      </CardContent>
    </Card>
  );
}
