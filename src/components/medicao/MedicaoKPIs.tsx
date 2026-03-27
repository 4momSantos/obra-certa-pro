import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { MedicaoKPIs as KPIType } from "@/hooks/useMedicao";

function fmt(v: number) {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

const cards = [
  { key: "contrato" as const, label: "Contrato", color: "text-foreground" },
  { key: "previsto" as const, label: "Previsto", color: "text-blue-500" },
  { key: "executadoScon" as const, label: "Executado SCON", color: "text-amber-500" },
  { key: "postadoSigem" as const, label: "Postado SIGEM", color: "text-purple-500" },
  { key: "medidoGitec" as const, label: "Medido GITEC", color: "text-emerald-500" },
  { key: "saldo" as const, label: "Saldo", color: "text-foreground" },
];

export function MedicaoKPIs({ kpis }: { kpis: KPIType }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      {cards.map(c => (
        <Card key={c.key}>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{c.label}</p>
            <p className={`text-xl font-bold ${c.color} mt-1`}>
              {c.key === "postadoSigem" ? kpis[c.key].toLocaleString("pt-BR") + " docs" : fmt(kpis[c.key])}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
