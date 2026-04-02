import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { agingBadge } from "@/hooks/useGitec";
import type { GitecEvent } from "@/hooks/useGitec";

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "Aprovado") return "default";
  if (s === "Pendente de Verificação") return "secondary";
  if (s === "Pendente de Aprovação") return "outline";
  return "secondary";
};

interface Props {
  events: GitecEvent[] | undefined;
  loading: boolean;
  onSelect: (id: string) => void;
}

export const GitecEventsTable: React.FC<Props> = ({ events, loading, onSelect }) => {
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!events || events.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento encontrado para os filtros atuais</p>;
  }

  return (
    <div className="rounded-lg border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">TAG</TableHead>
            <TableHead className="text-xs">Item PPU</TableHead>
            <TableHead className="text-xs">Etapa</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs text-right">Valor</TableHead>
            <TableHead className="text-xs text-right">Qtd Pond.</TableHead>
            <TableHead className="text-xs">Data Inf. Exec.</TableHead>
            <TableHead className="text-xs">Aging</TableHead>
            <TableHead className="text-xs">Fiscal</TableHead>
            <TableHead className="text-xs">Evidências</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((ev) => {
            const ab = agingBadge(ev.aging);
            return (
              <TableRow key={ev.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(ev.id)}>
                <TableCell className="text-xs font-mono">{ev.tag || "-"}</TableCell>
                <TableCell className="text-xs font-mono">{ev.item_ppu || "-"}</TableCell>
                <TableCell className="text-xs">{ev.etapa || "-"}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(ev.status)} className="text-[10px]">{ev.status || "-"}</Badge>
                </TableCell>
                <TableCell className="text-right text-xs font-mono">{fmtBRL(ev.valor)}</TableCell>
                <TableCell className="text-right text-xs font-mono">{ev.quantidade_ponderada.toFixed(2)}</TableCell>
                <TableCell className="text-xs">{ev.data_inf_execucao ?? "-"}</TableCell>
                <TableCell>
                  {ev.data_inf_execucao ? (
                    <Badge variant={ab.variant} className={`text-[10px] ${ev.aging > 60 ? "animate-pulse" : ""}`}>{ab.label}</Badge>
                  ) : "-"}
                </TableCell>
                <TableCell className="text-xs">{ev.fiscal_responsavel || "-"}</TableCell>
                <TableCell className="text-xs font-mono">{ev.numero_evidencias || "-"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
