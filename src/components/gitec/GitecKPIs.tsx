import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import type { GitecStats } from "@/hooks/useGitec";

const fmt = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(0)}K` : `R$ ${v.toFixed(0)}`;

interface Props {
  stats: GitecStats | undefined;
  loading: boolean;
}

const kpis = (s: GitecStats) => [
  { label: "Total Eventos", value: s.total.toLocaleString("pt-BR"), sub: "" },
  { label: "Aprovado", value: fmt(s.valAprovado), sub: `${s.aprovados} eventos` },
  { label: "Pend. Verificação", value: fmt(s.valPendVerif), sub: `${s.pendVerif} eventos` },
  { label: "Pend. Aprovação", value: fmt(s.valPendAprov), sub: `${s.pendAprov} eventos` },
  { label: "Aging Médio", value: `${s.agingMedio}d`, sub: "pendentes" },
  { label: "Aging Máximo", value: `${s.agingMaximo}d`, sub: "pendentes" },
];

export const GitecKPIs: React.FC<Props> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis(stats).map((k, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="text-xl font-bold mt-1">{k.value}</p>
            {k.sub && <p className="text-xs text-muted-foreground">{k.sub}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
