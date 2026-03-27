import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { MedicaoKPIs } from "@/hooks/useMedicao";

const COLORS = ["hsl(217,91%,60%)","hsl(38,92%,50%)","hsl(271,76%,53%)","hsl(142,71%,45%)"];

function fmtBRL(v: number) {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
  return `R$ ${(v / 1e3).toFixed(0)}k`;
}

export function MedicaoFunnel({ kpis }: { kpis: MedicaoKPIs }) {
  const data = [
    { name: "Previsto", value: kpis.previsto },
    { name: "Executado", value: kpis.executadoScon },
    { name: "Postado", value: kpis.postadoSigem * (kpis.contrato / Math.max(kpis.postadoSigem, 1)) * 0 || kpis.executadoScon * 0.85 },
    { name: "Medido", value: kpis.medidoGitec },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Pipeline de Medição</p>
        <ResponsiveContainer width="100%" height={80}>
          <BarChart layout="vertical" data={[{ previsto: kpis.previsto, executado: kpis.executadoScon, medido: kpis.medidoGitec }]}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip formatter={(v: number) => fmtBRL(v)} />
            <Bar dataKey="previsto" stackId="a" fill={COLORS[0]} name="Previsto" radius={[4,0,0,4]} />
            <Bar dataKey="executado" stackId="a" fill={COLORS[1]} name="Executado" />
            <Bar dataKey="medido" stackId="a" fill={COLORS[3]} name="Medido" radius={[0,4,4,0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 text-xs">
          {[
            { label: "Previsto", value: kpis.previsto, color: COLORS[0] },
            { label: "Executado", value: kpis.executadoScon, color: COLORS[1] },
            { label: "Medido", value: kpis.medidoGitec, color: COLORS[3] },
          ].map(i => (
            <span key={i.label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
              {i.label}: {fmtBRL(i.value)}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
