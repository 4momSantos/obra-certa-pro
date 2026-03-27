import React from "react";
import type { GitecStats } from "@/hooks/useGitec";

const fmt = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(0)}K` : `R$ ${v.toFixed(0)}`;

export const GitecFunnel: React.FC<{ stats: GitecStats | undefined }> = ({ stats }) => {
  if (!stats || stats.total === 0) return null;

  const total = stats.valAprovado + stats.valPendVerif + stats.valPendAprov;
  if (total === 0) return null;

  const pAprov = (stats.valAprovado / total) * 100;
  const pVerif = (stats.valPendVerif / total) * 100;
  const pAprovacao = (stats.valPendAprov / total) * 100;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Funil de Aprovação</p>
      <div className="flex h-8 rounded-lg overflow-hidden">
        {pAprov > 0 && (
          <div className="bg-primary flex items-center justify-center text-xs font-medium text-primary-foreground" style={{ width: `${pAprov}%` }}>
            {pAprov > 8 && `${pAprov.toFixed(0)}%`}
          </div>
        )}
        {pVerif > 0 && (
          <div className="bg-secondary flex items-center justify-center text-xs font-medium text-secondary-foreground" style={{ width: `${pVerif}%` }}>
            {pVerif > 8 && `${pVerif.toFixed(0)}%`}
          </div>
        )}
        {pAprovacao > 0 && (
          <div className="bg-accent flex items-center justify-center text-xs font-medium text-accent-foreground" style={{ width: `${pAprovacao}%` }}>
            {pAprovacao > 8 && `${pAprovacao.toFixed(0)}%`}
          </div>
        )}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>✓ Aprovado: {fmt(stats.valAprovado)}</span>
        <span>⏳ Pend. Verif.: {fmt(stats.valPendVerif)}</span>
        <span>⏳ Pend. Aprov.: {fmt(stats.valPendAprov)}</span>
      </div>
    </div>
  );
};
