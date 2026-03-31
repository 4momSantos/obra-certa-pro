import { useState, useMemo } from "react";
import { useCronogramaComponents } from "@/hooks/useCronogramaData";
import { useCriterioMedicao, getEtapasByAgrupamento, CriterioMedicaoRow } from "@/hooks/useCriterioMedicao";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info, ChevronDown, ChevronUp, CheckCircle2, Circle, Loader2 } from "lucide-react";

interface Props {
  ippu: string;
  onComponentClick?: (ppu: string) => void;
}

function normalizePpu(v: string) {
  return (v || "").replace(/_/g, "-").trim();
}

/* ── Etapa status logic ── */
interface EtapaStatus {
  icon: React.ReactNode;
  label: string;
  color: string;
}

function getEtapaStatus(
  etapa: CriterioMedicaoRow,
  components: any[]
): EtapaStatus {
  const etapaNum = etapa.identificador?.split(".").pop() || "";

  const comps = components.filter((c) => {
    const critRef = c.item_criterio || "";
    return critRef.split(".").pop() === etapaNum;
  });

  // If no components matched by etapa, try using all components (single-etapa case)
  const effectiveComps = comps.length > 0 ? comps : components;
  const total = effectiveComps.length;

  if (total === 0) {
    return { icon: <Circle className="h-4 w-4 text-muted-foreground" />, label: "Sem componentes SCON", color: "border-muted" };
  }

  const concluidos = effectiveComps.filter((c: any) => Number(c.avanco_ponderado) >= 100).length;
  const parciais = effectiveComps.filter((c: any) => {
    const av = Number(c.avanco_ponderado);
    return av > 0 && av < 100;
  }).length;

  if (concluidos === total) {
    return { icon: <CheckCircle2 className="h-4 w-4 text-green-600" />, label: `Concluída (${concluidos}/${total})`, color: "border-green-500" };
  }
  if (concluidos + parciais > 0) {
    return { icon: <Loader2 className="h-4 w-4 text-amber-500" />, label: `Parcial (${concluidos}/${total} concluídos)`, color: "border-amber-500" };
  }
  return { icon: <Circle className="h-4 w-4 text-red-500" />, label: `Não iniciada (0/${total})`, color: "border-red-500" };
}

/* ── Etapa Card ── */
function EtapaCard({ etapa, components }: { etapa: CriterioMedicaoRow; components: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const status = getEtapaStatus(etapa, components);
  const text = etapa.dicionario_etapa || "";
  const isLong = text.length > 500;

  return (
    <div className={`border-l-4 ${status.color} rounded-md border bg-card p-3 space-y-2`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {status.icon}
          <span className="font-semibold text-xs truncate">{etapa.nome || etapa.identificador}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
          <span>Peso: {etapa.peso_absoluto}</span>
        </div>
      </div>
      {text && (
        <div className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line">
          {isLong && !expanded ? text.slice(0, 500) + "..." : text}
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="ml-1 text-primary hover:underline inline-flex items-center gap-0.5"
            >
              {expanded ? (
                <>Ocultar <ChevronUp className="h-3 w-3" /></>
              ) : (
                <>Ver texto completo <ChevronDown className="h-3 w-3" /></>
              )}
            </button>
          )}
        </div>
      )}
      <div className="text-[10px] font-medium">{status.label}</div>
    </div>
  );
}

/* ── SIGEM / GITEC badges ── */
function SigemBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  if (s.includes("sem coment") || s === "sc") return <Badge variant="outline" className="text-[9px] border-green-500 text-green-700">SC</Badge>;
  if (s.includes("para constru") || s === "pc") return <Badge variant="outline" className="text-[9px] border-blue-500 text-blue-700">PC</Badge>;
  if (s.includes("com coment") || s === "cc") return <Badge variant="outline" className="text-[9px] border-amber-500 text-amber-700">CC</Badge>;
  if (s.includes("recus") || s === "rec") return <Badge variant="outline" className="text-[9px] border-red-500 text-red-700">Rec</Badge>;
  return <span className="text-[9px] text-muted-foreground">—</span>;
}

function GitecBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  if (s.includes("aprov")) return <Badge variant="outline" className="text-[9px] border-green-500 text-green-700">Aprov</Badge>;
  if (s.includes("pend")) return <Badge variant="outline" className="text-[9px] border-purple-500 text-purple-700">Pend</Badge>;
  if (!s || s === "0") return <span className="text-[9px] text-muted-foreground">—</span>;
  return <Badge variant="outline" className="text-[9px]">{status}</Badge>;
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
  const concluidos = comps.filter((c: any) => Number(c.avanco_ponderado) >= 100).length;
  const parciais = comps.filter((c: any) => { const a = Number(c.avanco_ponderado); return a > 0 && a < 100; }).length;
  const naoIniciados = comps.length - concluidos - parciais;

  const visibleComps = showAll ? comps : comps.slice(0, 20);

  if (loadingComps || loadingCrit) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="p-3 space-y-4 bg-muted/30 border-t">
      {/* SEÇÃO A — Critério de Medição */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          📐 CRITÉRIO DE MEDIÇÃO — {ippu}
        </h4>
        {etapas.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Info className="h-4 w-4" />
            Critério de medição não cadastrado para este agrupamento
          </div>
        ) : (
          <div className="space-y-2">
            {etapas.map((et) => (
              <EtapaCard key={et.id} etapa={et} components={comps} />
            ))}
          </div>
        )}
      </div>

      {/* SEÇÃO B — Componentes SCON */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-foreground">
          Componentes SCON ({comps.length})
        </h4>
        {comps.length > 0 && (
          <p className="text-[10px] text-muted-foreground">
            {comps.length} componentes · {concluidos} concluídos · {parciais} parciais · {naoIniciados} não iniciados
          </p>
        )}
        {comps.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum componente SCON encontrado</p>
        ) : (
          <>
            <div className="rounded-md border overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] h-8">TAG</TableHead>
                    <TableHead className="text-[10px] h-8">Descrição</TableHead>
                    <TableHead className="text-[10px] h-8">Disciplina</TableHead>
                    <TableHead className="text-[10px] h-8">Classe</TableHead>
                    <TableHead className="text-[10px] h-8 w-[100px]">Avanço %</TableHead>
                    <TableHead className="text-[10px] h-8">SIGEM</TableHead>
                    <TableHead className="text-[10px] h-8">GITEC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleComps.map((c: any) => {
                    const av = Number(c.avanco_ponderado) || 0;
                    const avPct = Math.min(av * 100, 100);
                    return (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => onComponentClick?.(normalizePpu(c.item_wbs))}
                      >
                        <TableCell className="text-[10px] font-mono py-1.5">{c.tag || "—"}</TableCell>
                        <TableCell className="text-[10px] py-1.5 max-w-[200px] truncate">{c.tag_desc || c.obra_desc || "—"}</TableCell>
                        <TableCell className="text-[10px] py-1.5">{c.disciplina || "—"}</TableCell>
                        <TableCell className="text-[10px] py-1.5">{c.classe || "—"}</TableCell>
                        <TableCell className="py-1.5">
                          <div className="flex items-center gap-1.5">
                            <Progress
                              value={avPct}
                              className={`h-2 w-14 ${avPct >= 100 ? "[&>div]:bg-green-500" : avPct > 0 ? "[&>div]:bg-amber-500" : "[&>div]:bg-muted"}`}
                            />
                            <span className="text-[10px] w-8 text-right">{avPct.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5"><SigemBadge status={c.status_sigem || ""} /></TableCell>
                        <TableCell className="py-1.5"><GitecBadge status={c.status_gitec || ""} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {comps.length > 20 && !showAll && (
              <button
                onClick={() => setShowAll(true)}
                className="text-xs text-primary hover:underline"
              >
                Ver todos ({comps.length})
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
