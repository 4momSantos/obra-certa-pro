import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import type { GitecStats } from "@/hooks/useGitec";

const fmt = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(0)}K` : `R$ ${v.toFixed(0)}`;

interface Props {
  stats: GitecStats | undefined;
  loading: boolean;
  valorContratual?: number;
}

const kpis = (s: GitecStats, valorContratual?: number) => {
  const base = [
    { label: "Total Eventos", value: s.total.toLocaleString("pt-BR"), sub: "" },
    { label: "Concluídos", value: s.concluidos.toLocaleString("pt-BR"), sub: fmt(s.valConcluidos) },
    { label: "Pendentes", value: s.pendentes.toLocaleString("pt-BR"), sub: fmt(s.valPendentes) },
    { label: "Aprovados", value: fmt(s.valAprovado), sub: `${s.aprovados} eventos` },
    { label: "Pend. Verif. / Aprov.", value: `${s.pendVerif} / ${s.pendAprov}`, sub: `${fmt(s.valPendVerif)} / ${fmt(s.valPendAprov)}` },
    { label: "Aging Médio / Máx", value: `${s.agingMedio}d / ${s.agingMaximo}d`, sub: "pendentes" },
  ];
  if (valorContratual && valorContratual > 0) {
    const pct = ((s.valAprovado / valorContratual) * 100).toFixed(1);
    base.push(
      { label: "Valor Contratual", value: fmt(valorContratual), sub: "" },
      { label: "% Medido (Aprovado)", value: `${pct}%`, sub: `${fmt(s.valAprovado)} / ${fmt(valorContratual)}` },
    );
  }
  return base;
};

export const GitecKPIs: React.FC<Props> = ({ stats, loading, valorContratual }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }
  if (!stats) return null;

  const items = kpis(stats, valorContratual);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((k, i) => (
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
