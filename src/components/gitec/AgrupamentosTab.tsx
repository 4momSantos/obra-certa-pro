import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { GitecIPPURow } from "@/hooks/useGitec";

const fmt = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(0)}K` : `R$ ${v.toFixed(0)}`;

interface Props {
  data: GitecIPPURow[] | undefined;
  loading: boolean;
  onSelect: (ippu: string) => void;
}

export const AgrupamentosTab: React.FC<Props> = ({ data, loading, onSelect }) => {
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado de agrupamento encontrado</p>;
  }

  return (
    <div className="rounded-lg border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>iPPU</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Aprovados</TableHead>
            <TableHead className="text-right">Pend. Verif.</TableHead>
            <TableHead className="text-right">Pend. Aprov.</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
            <TableHead>% Aprovado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((r) => {
            const pct = r.val_total > 0 ? (r.val_aprovado / r.val_total) * 100 : 0;
            return (
              <TableRow key={r.ippu} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(r.ippu)}>
                <TableCell className="font-mono text-xs font-medium">{r.ippu}</TableCell>
                <TableCell className="text-right text-xs">{r.total_eventos}</TableCell>
                <TableCell className="text-right text-xs">{r.aprovados}</TableCell>
                <TableCell className="text-right text-xs">{r.pend_verificacao}</TableCell>
                <TableCell className="text-right text-xs">{r.pend_aprovacao}</TableCell>
                <TableCell className="text-right text-xs font-mono">{fmt(r.val_total)}</TableCell>
                <TableCell className="w-32">
                  <div className="flex items-center gap-2">
                    <Progress value={pct} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-10 text-right">{pct.toFixed(0)}%</span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
