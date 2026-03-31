import { useState, useMemo } from "react";
import { useCronogramaComponents } from "@/hooks/useCronogramaData";
import { useCriterioMedicao, getEtapasByAgrupamento, CriterioMedicaoRow } from "@/hooks/useCriterioMedicao";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Loader2 } from "lucide-react";

interface Props {
  ippu: string;
  onComponentClick?: (ppu: string) => void;
}

function normalizePpu(v: string) {
  return (v || "").replace(/_/g, "-").trim();
}

/* ── Status badges ── */
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

/* ── Etapa status icon ── */
function EtapaStatusIcon({ component }: { component: any }) {
  const av = Number(component.avanco_ponderado) || 0;
  if (av >= 1) return <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />;
  if (av > 0) return <Loader2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
  return <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
}

/* ── TAG Card with nested etapas ── */
function TagCard({
  component,
  etapas,
  onComponentClick,
}: {
  component: any;
  etapas: CriterioMedicaoRow[];
  onComponentClick?: (ppu: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const av = Number(component.avanco_ponderado) || 0;
  const avPct = Math.min(av * 100, 100);

  // Match etapas to this component via item_criterio
  const compCriterioNum = component.item_criterio?.split(".").pop() || "";
  const matchedEtapas = etapas.filter((et) => {
    const etNum = et.identificador?.split(".").pop() || "";
    return etNum === compCriterioNum;
  });
  // If no specific match, show all etapas (single-etapa agrupamento)
  const displayEtapas = matchedEtapas.length > 0 ? matchedEtapas : (etapas.length <= 3 ? etapas : []);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div
          className="flex items-center gap-2 px-2 md:px-3 py-2 rounded-md border bg-card hover:bg-accent/30 cursor-pointer transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {displayEtapas.length > 0 ? (
            open ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          ) : (
            <div className="w-3" />
          )}

          <EtapaStatusIcon component={component} />

          {/* TAG name */}
          <span className="text-[10px] md:text-[11px] font-mono truncate min-w-0 flex-1">
            {component.tag || component.tag_id_proj || "—"}
          </span>

          {/* Discipline */}
          <span className="hidden sm:inline text-[9px] text-muted-foreground truncate max-w-[80px]">
            {component.disciplina || ""}
          </span>

          {/* Progress */}
          <div className="flex items-center gap-1 shrink-0">
            <Progress
              value={avPct}
              className={`h-1.5 w-10 md:w-14 ${avPct >= 100 ? "[&>div]:bg-green-500" : avPct > 0 ? "[&>div]:bg-amber-500" : "[&>div]:bg-muted"}`}
            />
            <span className="text-[9px] md:text-[10px] w-7 text-right font-mono">{avPct.toFixed(0)}%</span>
          </div>

          {/* SIGEM / GITEC badges */}
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <SigemBadge status={component.status_sigem || ""} />
            <GitecBadge status={component.status_gitec || ""} />
          </div>
        </div>
      </CollapsibleTrigger>

      {displayEtapas.length > 0 && (
        <CollapsibleContent>
          <div className="ml-6 md:ml-8 mt-1 mb-2 space-y-1">
            {displayEtapas.map((et) => (
              <div key={et.id} className="flex items-start gap-2 px-2 py-1.5 rounded bg-muted/40 text-[10px] md:text-[11px]">
                <div className="shrink-0 mt-0.5">
                  {av >= 1 ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : av > 0 ? (
                    <Loader2 className="h-3 w-3 text-amber-500" />
                  ) : (
                    <Circle className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{et.nome || et.identificador}</span>
                    <span className="text-muted-foreground">Peso: {et.peso_absoluto}</span>
                  </div>
                  {et.dicionario_etapa && (
                    <p className="text-[9px] md:text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                      {et.dicionario_etapa}
                    </p>
                  )}
                </div>
              </div>
            ))}
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
  const [showAll, setShowAll] = useState(false);

  const etapas = useMemo(() => {
    if (!criterios) return [];
    return getEtapasByAgrupamento(criterios, ippu);
  }, [criterios, ippu]);

  const comps = components || [];

  // Sort: GITEC status first (approved, pending), then by avanço desc
  const sortedComps = useMemo(() => {
    return [...comps].sort((a: any, b: any) => {
      const gitecA = (a.status_gitec || "").toLowerCase();
      const gitecB = (b.status_gitec || "").toLowerCase();
      const hasGitecA = gitecA.includes("aprov") || gitecA.includes("pend") ? 1 : 0;
      const hasGitecB = gitecB.includes("aprov") || gitecB.includes("pend") ? 1 : 0;
      if (hasGitecB !== hasGitecA) return hasGitecB - hasGitecA;
      return (Number(b.avanco_ponderado) || 0) - (Number(a.avanco_ponderado) || 0);
    });
  }, [comps]);

  const concluidos = comps.filter((c: any) => Number(c.avanco_ponderado) >= 1).length;
  const parciais = comps.filter((c: any) => { const a = Number(c.avanco_ponderado); return a > 0 && a < 1; }).length;
  const naoIniciados = comps.length - concluidos - parciais;

  const visibleComps = showAll ? sortedComps : sortedComps.slice(0, 20);

  if (loadingComps || loadingCrit) {
    return (
      <div className="p-3 md:p-4 space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="p-2 md:p-3 space-y-2 bg-muted/30 border-t">
      {/* Summary */}
      {comps.length > 0 && (
        <p className="text-[10px] md:text-[11px] text-muted-foreground px-1">
          <span className="font-semibold text-foreground">{comps.length}</span> TAGs
          {" · "}
          <span className="text-green-700">{concluidos} concluídos</span>
          {" · "}
          <span className="text-amber-600">{parciais} parciais</span>
          {" · "}
          <span className="text-red-600">{naoIniciados} não iniciados</span>
          {etapas.length > 0 && (
            <span className="ml-2 text-muted-foreground">
              · {etapas.length} etapa{etapas.length > 1 ? "s" : ""} no critério
            </span>
          )}
        </p>
      )}

      {comps.length === 0 ? (
        <p className="text-xs text-muted-foreground px-1">Nenhum componente SCON encontrado</p>
      ) : (
        <div className="space-y-1">
          {visibleComps.map((c: any) => (
            <TagCard
              key={c.id}
              component={c}
              etapas={etapas}
              onComponentClick={onComponentClick}
            />
          ))}
          {comps.length > 20 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="text-xs text-primary hover:underline px-2 py-1"
            >
              Ver todos ({comps.length})
            </button>
          )}
        </div>
      )}
    </div>
  );
}