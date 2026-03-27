import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MedicaoPPU, Semaforo } from "@/hooks/useMedicao";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const semaforoColors: Record<Semaforo, string> = {
  medido: "bg-emerald-500",
  executado: "bg-amber-500",
  previsto: "bg-blue-500",
  futuro: "bg-muted-foreground/40",
};

interface Props {
  items: MedicaoPPU[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onSelect: (item: MedicaoPPU) => void;
}

export function MedicaoTable({ items, total, page, totalPages, onPageChange, onSelect }: Props) {
  if (total === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum item encontrado para os filtros atuais
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Item PPU</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Disciplina</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead className="text-center">SCON %</TableHead>
              <TableHead className="text-center">SIGEM</TableHead>
              <TableHead className="text-center">GITEC</TableHead>
              <TableHead className="text-right">Medido</TableHead>
              <TableHead className="text-right">Gap</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow
                key={item.item_ppu}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSelect(item)}
              >
                <TableCell>
                  <span className={`inline-block h-3 w-3 rounded-full ${semaforoColors[item.semaforo]}`} />
                </TableCell>
                <TableCell className="font-mono text-xs font-bold whitespace-nowrap">{item.item_ppu}</TableCell>
                <TableCell className="text-xs max-w-[180px] truncate">{item.descricao || "-"}</TableCell>
                <TableCell className="text-xs">{item.disciplina || "-"}</TableCell>
                <TableCell className="text-right font-mono text-xs">{fmtBRL(item.valor_total)}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center gap-1.5">
                    <Progress
                      value={item.scon_avg_avanco}
                      className={`h-2 w-16 ${item.scon_avg_avanco >= 100 ? "[&>div]:bg-emerald-500" : item.scon_avg_avanco > 0 ? "[&>div]:bg-amber-500" : "[&>div]:bg-muted-foreground/30"}`}
                    />
                    <span className="text-[10px] font-mono w-10 text-right">{item.scon_avg_avanco.toFixed(0)}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {item.sigem_total > 0 ? (
                    <div className="flex items-center justify-center gap-1 text-[10px]">
                      <span className="text-emerald-600">{item.sigem_ok}</span>
                      {item.sigem_recusados > 0 && <span className="text-destructive">/{item.sigem_recusados}r</span>}
                      <span className="text-muted-foreground">/{item.sigem_total}</span>
                    </div>
                  ) : <span className="text-muted-foreground text-xs">-</span>}
                </TableCell>
                <TableCell className="text-center">
                  {item.gitec_total_eventos > 0 ? (
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {item.gitec_eventos_concluidos}/{item.gitec_total_eventos}
                    </Badge>
                  ) : <span className="text-muted-foreground text-xs">-</span>}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {item.gitec_valor_aprovado > 0 ? fmtBRL(item.gitec_valor_aprovado) : "-"}
                </TableCell>
                <TableCell className={`text-right font-mono text-xs font-medium ${item.gap > 0 ? "text-emerald-600" : item.gap < 0 ? "text-destructive" : ""}`}>
                  {item.gap !== 0 ? fmtBRL(item.gap) : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total.toLocaleString("pt-BR")} itens • Página {page + 1} de {totalPages}</span>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
