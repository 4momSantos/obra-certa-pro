import { useMemo } from "react";
import { usePPUDetail } from "@/hooks/usePPUDetail";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Check, Clock, Tag, Weight } from "lucide-react";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

const statusStyle = (s: string) => {
  if (s.includes("Aprovado") || s === "Concluída") return { badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", done: true };
  if (s.includes("Verificação")) return { badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400", done: false };
  if (s.includes("Aprovação")) return { badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400", done: false };
  if (s.includes("Recusado")) return { badge: "bg-destructive/15 text-destructive", done: false };
  return { badge: "bg-muted text-muted-foreground", done: false };
};

interface Props {
  itemPpu: string;
}

export function TagCriterioSection({ itemPpu }: Props) {
  const { rel, criterio, isLoading } = usePPUDetail(itemPpu, null);

  const { byTag, criterioMap, tagKeys } = useMemo(() => {
    const byTag = new Map<string, any[]>();
    for (const ev of rel) {
      const tag = ev.tag || "Sem TAG";
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag)!.push(ev);
    }
    const criterioMap = new Map<string, any>();
    for (const c of criterio) {
      if (c.nome) criterioMap.set(c.nome.toLowerCase().trim(), c);
    }
    const tagKeys = Array.from(byTag.keys()).sort();
    return { byTag, criterioMap, tagKeys };
  }, [rel, criterio]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">Tags & Critérios</h4>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (rel.length === 0) {
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">Tags & Critérios</h4>
        <p className="text-xs text-muted-foreground py-4 text-center">Nenhum evento de rel. encontrado para este PPU.</p>
      </div>
    );
  }

  const totalCriterios = criterio.length;
  const criteriosCumpridos = new Set<string>();
  for (const ev of rel) {
    if (ev.etapa && statusStyle(ev.status || "").done) {
      criteriosCumpridos.add(ev.etapa.toLowerCase().trim());
    }
  }
  const cumpridos = totalCriterios > 0
    ? criterio.filter(c => c.nome && criteriosCumpridos.has(c.nome.toLowerCase().trim())).length
    : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Tags & Critérios ({tagKeys.length} tags, {rel.length} eventos)
        </h4>
        {totalCriterios > 0 && (
          <Badge variant="outline" className="text-[9px] font-mono">
            {cumpridos}/{totalCriterios} critérios
          </Badge>
        )}
      </div>

      <Accordion type="multiple" className="space-y-1">
        {tagKeys.map((tag) => {
          const events = byTag.get(tag)!;
          const approvedCount = events.filter(e => statusStyle(e.status || "").done).length;
          return (
            <AccordionItem key={tag} value={tag} className="border rounded-md px-1">
              <AccordionTrigger className="py-2 text-xs hover:no-underline">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="font-mono font-semibold truncate">{tag}</span>
                  <Badge variant="secondary" className="text-[9px] shrink-0">
                    {approvedCount}/{events.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-2 space-y-1.5">
                {events.map((ev, idx) => {
                  const ss = statusStyle(ev.status || "");
                  const etapaKey = ev.etapa?.toLowerCase().trim() || "";
                  const crit = criterioMap.get(etapaKey);
                  return (
                    <Card key={ev.id || idx} className="border-l-2 border-l-muted-foreground/30">
                      <CardContent className="p-2.5 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {ss.done
                              ? <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                              : <Clock className="h-3 w-3 text-amber-500 shrink-0" />}
                            <span className="text-[11px] font-medium truncate">{ev.etapa || "—"}</span>
                          </div>
                          <Badge className={cn("text-[9px] border-0 shrink-0", ss.badge)}>
                            {ev.status || "—"}
                          </Badge>
                        </div>
                        <div className="flex gap-3 text-[10px] text-muted-foreground flex-wrap">
                          {ev.valor != null && ev.valor > 0 && (
                            <span className="font-mono">{fmtBRL(ev.valor)}</span>
                          )}
                          <span>Exec: {fmtDate(ev.data_execucao)}</span>
                          {ev.fiscal_responsavel && (
                            <span>Fiscal: {ev.fiscal_responsavel}</span>
                          )}
                        </div>
                        {crit && (
                          <div className="flex items-center gap-2 bg-muted/50 rounded p-1.5 mt-0.5">
                            <Weight className="h-3 w-3 text-primary shrink-0" />
                            <div className="text-[10px] space-x-2 min-w-0">
                              <span className="font-medium text-foreground">{crit.nome}</span>
                              {crit.peso_fisico_fin != null && (
                                <span className="text-muted-foreground">
                                  Peso: {(crit.peso_fisico_fin * 100).toFixed(2)}%
                                </span>
                              )}
                              {crit.dicionario_etapa && (
                                <span className="text-muted-foreground italic truncate">
                                  ({crit.dicionario_etapa})
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
