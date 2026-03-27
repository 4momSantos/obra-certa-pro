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

export const GitecRanking: React.FC<Props> = ({ data, loading, onSelect }) => {
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!data || data.length === 0) return null;

  const top = data.slice(0, 15);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Top Agrupamentos — Valor Pendente</p>
      <div className="rounded-lg border overflow-auto max-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>iPPU</TableHead>
              <TableHead className="text-right">Eventos</TableHead>
              <TableHead className="text-right">Aprovado</TableHead>
              <TableHead className="text-right">Pend. Verif.</TableHead>
              <TableHead className="text-right">Pend. Aprov.</TableHead>
              <TableHead>Progresso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {top.map((r) => {
              const pct = r.val_total > 0 ? (r.val_aprovado / r.val_total) * 100 : 0;
              return (
                <TableRow key={r.ippu} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(r.ippu)}>
                  <TableCell className="font-mono text-xs font-medium">{r.ippu}</TableCell>
                  <TableCell className="text-right text-xs">{r.total_eventos}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmt(r.val_aprovado)}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmt(r.val_pend_verif)}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmt(r.val_pend_aprov)}</TableCell>
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
    </div>
  );
};
