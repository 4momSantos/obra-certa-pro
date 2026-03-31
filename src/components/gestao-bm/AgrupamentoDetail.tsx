import { useState, useMemo } from "react";
import { useCronogramaComponents, useCronogramaBmByIppu, useGitecEventosByIppu, GitecEventRow } from "@/hooks/useCronogramaData";
import { useCriterioMedicao, getEtapasByAgrupamento, CriterioMedicaoRow } from "@/hooks/useCriterioMedicao";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Loader2, FileText, AlertCircle } from "lucide-react";

interface Props {
  ippu: string;
  onComponentClick?: (ppu: string) => void;
}

/* ── Format currency ── */
function fmtVal(v: number) {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(1)}k`;
  return `R$${v.toFixed(0)}`;
}

/* ── Status badges ── */
function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  if (s.includes("aprov"))
    return <Badge variant="outline" className="text-[9px] border-green-500 text-green-700 px-1 py-0">Aprovado</Badge>;
  if (s.includes("pend") && s.includes("verif"))
    return <Badge variant="outline" className="text-[9px] border-amber-500 text-amber-700 px-1 py-0">Pend Verif</Badge>;
  if (s.includes("pend") && s.includes("aprov"))
    return <Badge variant="outline" className="text-[9px] border-purple-500 text-purple-700 px-1 py-0">Pend Aprov</Badge>;
  if (s.includes("pend"))
    return <Badge variant="outline" className="text-[9px] border-amber-500 text-amber-700 px-1 py-0">Pendente</Badge>;
  if (s.includes("recus"))
    return <Badge variant="outline" className="text-[9px] border-red-500 text-red-700 px-1 py-0">Recusado</Badge>;
  if (!s) return null;
  return <Badge variant="outline" className="text-[9px] px-1 py-0">{status}</Badge>;
}

function SigemBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  if (s.includes("sem coment") || s === "sc") return <Badge variant="outline" className="text-[9px] border-green-500 text-green-700 px-1 py-0">SC</Badge>;
  if (s.includes("para constru") || s === "pc") return <Badge variant="outline" className="text-[9px] border-blue-500 text-blue-700 px-1 py-0">PC</Badge>;
  if (s.includes("com coment") || s === "cc") return <Badge variant="outline" className="text-[9px] border-amber-500 text-amber-700 px-1 py-0">CC</Badge>;
  if (s.includes("recus") || s === "rec") return <Badge variant="outline" className="text-[9px] border-red-500 text-red-700 px-1 py-0">Rec</Badge>;
  return null;
}

function GitecBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  if (s.includes("aprov")) return <Badge variant="outline" className="text-[9px] border-green-500 text-green-700 px-1 py-0">Aprov</Badge>;
  if (s.includes("pend")) return <Badge variant="outline" className="text-[9px] border-purple-500 text-purple-700 px-1 py-0">Pend</Badge>;
  if (!s || s === "0") return null;
  return <Badge variant="outline" className="text-[9px] px-1 py-0">{status}</Badge>;
}

/* ── GITEC Event row inside a BM card ── */
function GitecEventRow({ event }: { event: GitecEventRow }) {
  const isApproved = (event.status || "").toLowerCase().includes("aprov");
  const isPending = (event.status || "").toLowerCase().includes("pend");
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/40 text-[10px] md:text-[11px]">
      <div className="shrink-0">
        {isApproved ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : isPending ? <Loader2 className="h-3 w-3 text-amber-500" /> : <AlertCircle className="h-3 w-3 text-red-500" />}
      </div>
      <span className="font-mono truncate min-w-0 flex-1" title={event.tag}>{event.tag || "—"}</span>
      <span className="hidden sm:inline text-[9px] text-muted-foreground truncate max-w-[100px]">{event.etapa || ""}</span>
      <StatusBadge status={event.status} />
      <span className="text-[9px] font-mono shrink-0 text-right w-16">{fmtVal(event.valor)}</span>
    </div>
  );
}

/* ── BM Card (collapsible) with GITEC events ── */
function BmCard({ bmName, events, previsto, realizado }: {
  bmName: string;
  events: GitecEventRow[];
  previsto: number;
  realizado: number;
}) {
  const [open, setOpen] = useState(false);
  const aprovados = events.filter(e => (e.status || "").toLowerCase().includes("aprov")).length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-2 px-2 md:px-3 py-2 rounded-md border bg-card hover:bg-accent/30 cursor-pointer transition-colors">
          {open ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
          <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="text-[11px] md:text-xs font-semibold">{bmName}</span>
          <div className="flex-1" />
          {previsto > 0 && <span className="text-[9px] text-muted-foreground hidden sm:inline">Prev: {fmtVal(previsto)}</span>}
          {realizado > 0 && <span className="text-[9px] text-green-700 hidden sm:inline">Real: {fmtVal(realizado)}</span>}
          <Badge variant="outline" className={`text-[9px] px-1 py-0 shrink-0 ${aprovados === events.length && events.length > 0 ? "border-green-500 text-green-700" : "border-muted-foreground"}`}>
            {aprovados}/{events.length}
          </Badge>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-6 md:ml-8 mt-1 mb-2 space-y-1">
          {events.map(e => <GitecEventRow key={e.id} event={e} />)}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ── TAG row inside an Etapa ── */
function TagRow({ component }: { component: any }) {
  const av = Math.min((Number(component.avanco_ponderado) || 0) * 100, 100);
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/40 text-[10px] md:text-[11px]">
      <div className="shrink-0">
        {av >= 100 ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : av > 0 ? <Loader2 className="h-3 w-3 text-amber-500" /> : <Circle className="h-3 w-3 text-muted-foreground" />}
      </div>
      <span className="font-mono truncate min-w-0 flex-1">{component.tag || component.tag_id_proj || "—"}</span>
      <span className="hidden sm:inline text-[9px] text-muted-foreground truncate max-w-[80px]">{component.disciplina || ""}</span>
      <div className="flex items-center gap-1 shrink-0">
        <Progress value={av} className={`h-1.5 w-10 md:w-14 ${av >= 100 ? "[&>div]:bg-green-500" : av > 0 ? "[&>div]:bg-amber-500" : "[&>div]:bg-muted"}`} />
        <span className="text-[9px] w-7 text-right font-mono">{av.toFixed(0)}%</span>
      </div>
      <div className="hidden sm:flex items-center gap-1 shrink-0">
        <SigemBadge status={component.status_sigem || ""} />
        <GitecBadge status={component.status_gitec || ""} />
      </div>
    </div>
  );
}

/* ── Etapa card (collapsible) with child TAGs ── */
function EtapaCard({ etapa, components }: { etapa: CriterioMedicaoRow; components: any[] }) {
  const [open, setOpen] = useState(false);
  const concluidos = components.filter((c) => (Number(c.avanco_ponderado) || 0) >= 1).length;
  const total = components.length;
  const allDone = total > 0 && concluidos === total;
  const someDone = concluidos > 0 && concluidos < total;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-2 px-2 md:px-3 py-2 rounded-md border bg-card hover:bg-accent/30 cursor-pointer transition-colors">
          {total > 0 ? (
            open ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          ) : <div className="w-3" />}
          <div className="shrink-0">
            {allDone ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : someDone ? <Loader2 className="h-3.5 w-3.5 text-amber-500" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] md:text-[11px] font-medium truncate block">{etapa.nome || etapa.identificador}</span>
            {etapa.dicionario_etapa && (
              <p className="text-[9px] text-muted-foreground line-clamp-1 leading-relaxed">{etapa.dicionario_etapa}</p>
            )}
          </div>
          <span className="text-[9px] text-muted-foreground shrink-0">Peso: {etapa.peso_absoluto}</span>
          {total > 0 && (
            <Badge variant="outline" className={`text-[9px] px-1 py-0 shrink-0 ${allDone ? "border-green-500 text-green-700" : someDone ? "border-amber-500 text-amber-700" : "border-muted-foreground"}`}>
              {concluidos}/{total}
            </Badge>
          )}
        </div>
      </CollapsibleTrigger>
      {total > 0 && (
        <CollapsibleContent>
          <div className="ml-6 md:ml-8 mt-1 mb-2 space-y-1">
            {components.map((c: any) => <TagRow key={c.id} component={c} />)}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

/* ── Main Component ── */
export function AgrupamentoDetail({ ippu, onComponentClick }: Props) {
  const { data: components, isLoading: loadingComps } = useCronogramaComponents(ippu);
  const { data: criterios, isLoading: loadingCrit } = useCriterioMedicao();
  const { data: bmValues, isLoading: loadingBmVal } = useCronogramaBmByIppu(ippu);
  const { data: gitecEvents, isLoading: loadingGitec } = useGitecEventosByIppu(ippu);

  const etapas = useMemo(() => {
    if (!criterios) return [];
    return getEtapasByAgrupamento(criterios, ippu);
  }, [criterios, ippu]);

  const comps = components || [];
  const events = gitecEvents || [];

  // Group GITEC events by BM
  const bmGroups = useMemo(() => {
    const byBm = new Map<string, GitecEventRow[]>();
    events.forEach(e => {
      const bm = e.bm_name || "Sem BM";
      if (!byBm.has(bm)) byBm.set(bm, []);
      byBm.get(bm)!.push(e);
    });

    // BM financial values map
    const bmFinMap = new Map<string, { previsto: number; realizado: number }>();
    (bmValues || []).forEach((v: any) => {
      const key = v.bm_name;
      if (!bmFinMap.has(key)) bmFinMap.set(key, { previsto: 0, realizado: 0 });
      const entry = bmFinMap.get(key)!;
      if (v.tipo === "Previsto") entry.previsto += Number(v.valor) || 0;
      if (v.tipo === "Realizado") entry.realizado += Number(v.valor) || 0;
    });

    return Array.from(byBm.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([bmName, evts]) => ({
        bmName,
        events: evts,
        previsto: bmFinMap.get(bmName)?.previsto || 0,
        realizado: bmFinMap.get(bmName)?.realizado || 0,
      }));
  }, [events, bmValues]);

  // Group components by etapa
  const { etapaGroups, orphans } = useMemo(() => {
    const groups = etapas.map((et) => ({
      etapa: et,
      components: comps.filter((c: any) => c.item_criterio === et.identificador),
    }));
    const matchedIds = new Set(etapas.map((e) => e.identificador));
    const orphans = comps.filter((c: any) => !c.item_criterio || !matchedIds.has(c.item_criterio));
    return { etapaGroups: groups, orphans };
  }, [etapas, comps]);

  const concluidos = comps.filter((c: any) => Number(c.avanco_ponderado) >= 1).length;
  const parciais = comps.filter((c: any) => { const a = Number(c.avanco_ponderado); return a > 0 && a < 1; }).length;
  const naoIniciados = comps.length - concluidos - parciais;

  const isLoading = loadingComps || loadingCrit || loadingBmVal || loadingGitec;

  if (isLoading) {
    return (
      <div className="p-3 md:p-4 space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="p-2 md:p-3 space-y-3 bg-muted/30 border-t">
      {/* Summary */}
      <p className="text-[10px] md:text-[11px] text-muted-foreground px-1">
        <span className="font-semibold text-foreground">{bmGroups.filter(g => g.bmName !== "Sem BM").length}</span> BMs com medição
        {" · "}
        <span className="font-semibold text-foreground">{events.length}</span> eventos GITEC
        {" · "}
        <span className="font-semibold text-foreground">{etapas.length}</span> etapa{etapas.length !== 1 ? "s" : ""}
        {" · "}
        <span className="font-semibold text-foreground">{comps.length}</span> TAGs
        {" · "}
        <span className="text-green-700">{concluidos} concluídos</span>
        {" · "}
        <span className="text-amber-600">{parciais} parciais</span>
        {" · "}
        <span className="text-red-600">{naoIniciados} não iniciados</span>
      </p>

      {/* Section: Medição por BM */}
      {bmGroups.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-[10px] md:text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1">Medição por BM</h4>
          {bmGroups.map(g => (
            <BmCard key={g.bmName} bmName={g.bmName} events={g.events} previsto={g.previsto} realizado={g.realizado} />
          ))}
        </div>
      )}

      {/* Section: Etapas do Critério */}
      {(etapas.length > 0 || comps.length > 0) && (
        <div className="space-y-1">
          <h4 className="text-[10px] md:text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1">Etapas do Critério</h4>
          {etapaGroups.map((g) => (
            <EtapaCard key={g.etapa.id} etapa={g.etapa} components={g.components} />
          ))}
          {orphans.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 px-2 md:px-3 py-2 rounded-md border border-dashed bg-card hover:bg-accent/30 cursor-pointer transition-colors">
                  <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="text-[10px] md:text-[11px] text-muted-foreground">Sem etapa vinculada ({orphans.length} TAGs)</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-6 md:ml-8 mt-1 mb-2 space-y-1">
                  {orphans.map((c: any) => <TagRow key={c.id} component={c} />)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}

      {bmGroups.length === 0 && etapas.length === 0 && comps.length === 0 && (
        <p className="text-xs text-muted-foreground px-1">Nenhum critério, componente ou evento GITEC encontrado</p>
      )}
    </div>
  );
}
