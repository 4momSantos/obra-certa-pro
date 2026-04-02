import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, RefreshCw, Upload, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAlerts, useAlertCounts, type AlertSeverity, type AlertRule } from "@/hooks/useAlerts";
import { useQueryClient } from "@tanstack/react-query";

const fmt = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(0)}K` : `R$ ${v.toFixed(0)}`;

const sevColor: Record<AlertSeverity, string> = {
  alta: "bg-destructive text-destructive-foreground",
  media: "bg-orange-500 text-white",
};

const AlertsPage: React.FC = () => {
  const { data: rules, isLoading, dataUpdatedAt } = useAlerts();
  const counts = useAlertCounts();
  const qc = useQueryClient();
  const [sevFilter, setSevFilter] = useState("all");

  const isEmpty = !isLoading && counts.total === 0;

  const filtered = (rules ?? []).filter(r => {
    if (sevFilter !== "all" && r.severity !== sevFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 py-6 px-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <h1 className="text-2xl font-bold">Alertas</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {dataUpdatedAt > 0 && (
            <span>Calculado em {new Date(dataUpdatedAt).toLocaleString("pt-BR")}</span>
          )}
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["alerts"] })}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Recalcular
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-12" /></CardContent></Card>)}
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <CheckCircle2 className="h-16 w-16 text-primary" />
          <p className="text-lg font-semibold">Tudo sob controle</p>
          <p className="text-sm text-muted-foreground">Nenhum alerta ativo.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <KPICard label="Alta" value={counts.alta} color="text-destructive" />
            <KPICard label="Média" value={counts.media} color="text-orange-500" />
            <KPICard label="Total" value={counts.total} color="text-foreground" />
          </div>

          <div className="flex items-center gap-3">
            <Select value={sevFilter} onValueChange={setSevFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Severidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filtered.map(rule => (
              <AlertCard key={rule.type} rule={rule} />
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum alerta para o filtro selecionado</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

function KPICard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">Alertas {label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function AlertCard({ rule }: { rule: AlertRule }) {
  const [open, setOpen] = useState(rule.severity === "alta");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={rule.severity === "alta" ? "border-destructive/30" : ""}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-4 w-4 ${rule.severity === "alta" ? "text-destructive" : "text-orange-500"}`} />
              <span className="font-medium text-sm">{rule.code} — {rule.label}</span>
              <Badge className={`${sevColor[rule.severity]} text-[10px]`}>{rule.count}</Badge>
            </div>
            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4">
            <div className="rounded-lg border overflow-auto max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Item</TableHead>
                    <TableHead className="text-xs">Detalhe</TableHead>
                    {rule.items.some(i => i.valor !== undefined) && <TableHead className="text-xs text-right">Valor</TableHead>}
                    {rule.items.some(i => i.aging !== undefined) && <TableHead className="text-xs text-right">Aging</TableHead>}
                    <TableHead className="text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rule.items.map((item, i) => (
                    <TableRow key={item.id + i}>
                      <TableCell className="font-mono text-xs">{item.label}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">{item.sublabel || "-"}</TableCell>
                      {rule.items.some(i => i.valor !== undefined) && (
                        <TableCell className="text-xs text-right font-mono">{item.valor ? fmt(item.valor) : "-"}</TableCell>
                      )}
                      {rule.items.some(i => i.aging !== undefined) && (
                        <TableCell className="text-xs text-right">
                          {item.aging !== undefined ? (
                            <Badge variant={item.aging > 60 ? "destructive" : "secondary"} className="text-[10px]">
                              {item.aging}d{item.aging > 60 ? " CRÍTICO" : ""}
                            </Badge>
                          ) : "-"}
                        </TableCell>
                      )}
                      <TableCell>
                        {item.link && (
                          <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-xs">
                            <Link to={item.link}>Ver →</Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default AlertsPage;
