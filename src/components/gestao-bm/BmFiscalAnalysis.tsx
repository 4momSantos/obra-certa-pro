import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { bmRange } from "@/lib/bm-utils";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from "lucide-react";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

interface Props {
  bmName: string;
  projetadoTotal?: number;
}

export function BmFiscalAnalysis({ bmName, projetadoTotal = 0 }: Props) {
  const range = bmRange(bmName);
  const startStr = range.start.toISOString().split("T")[0];
  const endStr = range.end.toISOString().split("T")[0];

  const { data: events, isLoading } = useQuery({
    queryKey: ["bm-fiscal-analysis", bmName],
    queryFn: async () => {
      const { data } = await supabase
        .from("gitec_events")
        .select("fiscal, status, valor, data_execucao, data_aprovacao")
        .gte("data_execucao", startStr)
        .lte("data_execucao", endStr);
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const { fiscais, alerts } = useMemo(() => {
    const map: Record<string, {
      total: number; aprovados: number; pendVerif: number; pendAprov: number;
      valorPendente: number; valorAprovado: number; ciclos: number[];
    }> = {};

    let pendVerifOld = 0;
    let pendAprovOld = 0;
    const now = Date.now();

    for (const e of events ?? []) {
      const f = e.fiscal || "Sem fiscal";
      if (!map[f]) map[f] = { total: 0, aprovados: 0, pendVerif: 0, pendAprov: 0, valorPendente: 0, valorAprovado: 0, ciclos: [] };
      map[f].total++;

      if (e.status === "Aprovado") {
        map[f].aprovados++;
        map[f].valorAprovado += e.valor ?? 0;
        if (e.data_execucao && e.data_aprovacao) {
          const diff = (new Date(e.data_aprovacao).getTime() - new Date(e.data_execucao).getTime()) / 86400000;
          if (diff >= 0) map[f].ciclos.push(diff);
        }
      } else if (e.status?.includes("Verificação")) {
        map[f].pendVerif++;
        map[f].valorPendente += e.valor ?? 0;
        if (e.data_execucao && (now - new Date(e.data_execucao).getTime()) > 7 * 86400000) pendVerifOld++;
      } else if (e.status?.includes("Aprovação")) {
        map[f].pendAprov++;
        map[f].valorPendente += e.valor ?? 0;
        if (e.data_execucao && (now - new Date(e.data_execucao).getTime()) > 5 * 86400000) pendAprovOld++;
      } else {
        map[f].valorPendente += e.valor ?? 0;
      }
    }

    const fiscais = Object.entries(map)
      .map(([nome, d]) => ({
        nome,
        ...d,
        pctAprovado: d.total > 0 ? (d.aprovados / d.total) * 100 : 0,
        cicloMedio: d.ciclos.length > 0 ? d.ciclos.reduce((a, b) => a + b, 0) / d.ciclos.length : null,
      }))
      .sort((a, b) => b.valorPendente - a.valorPendente);

    const totalAprovado = fiscais.reduce((s, f) => s + f.valorAprovado, 0);
    const pctAprovado = projetadoTotal > 0 ? (totalAprovado / projetadoTotal) * 100 : 0;

    const alerts: { icon: React.ReactNode; text: string; severity: "red" | "yellow" | "green" }[] = [];
    if (pendVerifOld > 0) alerts.push({ icon: <ShieldAlert className="h-4 w-4" />, text: `${pendVerifOld} evento(s) pendente(s) de verificação há mais de 7 dias`, severity: "red" });
    if (pendAprovOld > 0) alerts.push({ icon: <Clock className="h-4 w-4" />, text: `${pendAprovOld} evento(s) pendente(s) de aprovação há mais de 5 dias`, severity: "yellow" });
    if (pctAprovado >= 80) alerts.push({ icon: <CheckCircle2 className="h-4 w-4" />, text: `${pctAprovado.toFixed(1)}% do valor projetado já aprovado no GITEC`, severity: "green" });

    return { fiscais, alerts };
  }, [events, projetadoTotal]);

  const alertStyles = {
    red: "border-destructive/40 bg-destructive/5 text-destructive",
    yellow: "border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400",
    green: "border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
  };

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="fiscal" className="border rounded-lg">
        <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
          📋 Performance por Fiscal — {bmName}
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : fiscais.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum evento GITEC neste BM.</p>
          ) : (
            <>
              <div className="rounded border overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">Fiscal</TableHead>
                      <TableHead className="text-[11px] text-right">Total</TableHead>
                      <TableHead className="text-[11px] text-right">Aprovados</TableHead>
                      <TableHead className="text-[11px] text-right">Pend. Verif.</TableHead>
                      <TableHead className="text-[11px] text-right">Pend. Aprov.</TableHead>
                      <TableHead className="text-[11px] text-right">Valor Pend.</TableHead>
                      <TableHead className="text-[11px] text-right">Ciclo Médio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fiscais.map((f) => (
                      <TableRow key={f.nome}>
                        <TableCell className="text-xs font-medium">{f.nome}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{f.total}</TableCell>
                        <TableCell className="text-xs text-right font-mono">
                          <span className="text-emerald-500">{f.aprovados}</span>
                          <span className="text-muted-foreground ml-1">({f.pctAprovado.toFixed(0)}%)</span>
                        </TableCell>
                        <TableCell className={cn("text-xs text-right font-mono", f.pendVerif > 0 && "text-amber-500")}>{f.pendVerif}</TableCell>
                        <TableCell className={cn("text-xs text-right font-mono", f.pendAprov > 0 && "text-orange-500")}>{f.pendAprov}</TableCell>
                        <TableCell className={cn("text-xs text-right font-mono", f.valorPendente > 0 && "text-destructive font-semibold")}>{fmtBRL(f.valorPendente)}</TableCell>
                        <TableCell className="text-xs text-right font-mono text-muted-foreground">
                          {f.cicloMedio != null ? `${f.cicloMedio.toFixed(0)}d` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {alerts.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {alerts.map((a, i) => (
                    <Card key={i} className={cn("border", alertStyles[a.severity])}>
                      <CardContent className="p-3 flex items-center gap-2">
                        {a.icon}
                        <span className="text-xs font-medium">{a.text}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
