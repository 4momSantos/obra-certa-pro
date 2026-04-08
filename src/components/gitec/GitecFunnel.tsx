import React from "react";
import type { GitecStats } from "@/hooks/useGitec";

const fmt = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(0)}K` : `R$ ${v.toFixed(0)}`;

export const GitecFunnel: React.FC<{ stats: GitecStats | undefined }> = ({ stats }) => {
  if (!stats || stats.total === 0) return null;

  const stages = [
    { label: "Aprovado", value: stats.valAprovado, count: stats.aprovados, cls: "bg-emerald-500 text-white" },
    { label: "Pend. Aprovação", value: stats.valPendAprov, count: stats.pendAprov, cls: "bg-orange-500 text-white" },
    { label: "Pend. Verificação", value: stats.valPendVerif, count: stats.pendVerif, cls: "bg-amber-500 text-white" },
  ];

  if (stats.outros > 0) {
    stages.push({ label: "Outros", value: stats.valOutros, count: stats.outros, cls: "bg-muted-foreground text-white" });
  }

  const total = stages.reduce((s, st) => s + st.value, 0);
  if (total === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Funil de Aprovação (base completa — {stats.total.toLocaleString("pt-BR")} eventos)</p>
      <div className="flex h-8 rounded-lg overflow-hidden">
        {stages.filter(s => s.value > 0).map(s => {
          const pct = (s.value / total) * 100;
          return (
            <div key={s.label} className={`${s.cls} flex items-center justify-center text-xs font-medium`} style={{ width: `${pct}%` }}>
              {pct > 8 && `${pct.toFixed(0)}%`}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {stages.map(s => (
          <span key={s.label} className="flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-full ${s.cls.split(" ")[0]}`} />
            {s.label}: {fmt(s.value)} ({s.count.toLocaleString("pt-BR")})
          </span>
        ))}
      </div>
    </div>
  );
};
