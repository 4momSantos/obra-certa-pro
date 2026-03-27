import React from "react";
import type { Semaforo } from "@/hooks/useMedicao";

const config: Record<Semaforo, { label: string; color: string; bg: string }> = {
  medido: { label: "Medido", color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/30" },
  executado: { label: "Executado", color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/30" },
  previsto: { label: "Previsto", color: "text-blue-600", bg: "bg-blue-500/10 border-blue-500/30" },
  futuro: { label: "Futuro", color: "text-muted-foreground", bg: "bg-muted/50 border-muted-foreground/20" },
};

function fmt(v: number) {
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

interface Props {
  counts: Record<Semaforo, { count: number; valor: number }>;
  active: Semaforo | "";
  onSelect: (s: Semaforo) => void;
}

export function SemaforoCards({ counts, active, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {(["medido", "executado", "previsto", "futuro"] as Semaforo[]).map(s => {
        const c = config[s];
        const d = counts[s];
        const isActive = active === s;
        return (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className={`rounded-lg border p-3 text-left transition-all ${c.bg} ${isActive ? "ring-2 ring-primary shadow-md" : "hover:shadow-sm"}`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${s === "medido" ? "bg-emerald-500" : s === "executado" ? "bg-amber-500" : s === "previsto" ? "bg-blue-500" : "bg-muted-foreground/40"}`} />
              <span className={`text-xs font-medium ${c.color}`}>{c.label}</span>
            </div>
            <p className={`text-lg font-bold mt-1 ${c.color}`}>{d.count}</p>
            <p className="text-[10px] text-muted-foreground">{fmt(d.valor)}</p>
          </button>
        );
      })}
    </div>
  );
}
