import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, PieChart as PieIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { formatCompact } from "@/lib/format";

interface FaseData {
  nome: string;
  valor: number;
  previsto: number;
  projetado: number;
  realizado: number;
}

interface ConsolidatedChartsProps {
  fases: FaseData[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#8b5cf6",
];

export function ConsolidatedCharts({ fases }: ConsolidatedChartsProps) {
  const [open, setOpen] = useState(false);

  const donutData = fases
    .filter((f) => f.realizado > 0)
    .sort((a, b) => b.realizado - a.realizado)
    .slice(0, 8)
    .map((f) => ({ name: f.nome, value: f.realizado }));

  const barData = fases
    .sort((a, b) => b.previsto - a.previsto)
    .slice(0, 10)
    .map((f) => ({
      name: f.nome.length > 20 ? f.nome.slice(0, 18) + "…" : f.nome,
      Previsto: f.previsto,
      Projetado: f.projetado,
      Realizado: f.realizado,
    }));

  if (fases.length === 0) return null;

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="text-xs gap-1 text-muted-foreground"
      >
        <PieIcon className="h-3.5 w-3.5" />
        {open ? "Ocultar gráficos" : "Ver gráficos"}
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </Button>

      {open && (
        <div className="grid md:grid-cols-2 gap-4 mt-2">
          {/* Donut */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Realizado por Fase</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatCompact(v)}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 px-2">
                {donutData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-[9px] text-muted-foreground">{d.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bar chart */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Previsto × Projetado × Realizado</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v: number) => formatCompact(v)} contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="Previsto" fill="hsl(var(--chart-1))" radius={[0, 2, 2, 0]} barSize={8} />
                  <Bar dataKey="Projetado" fill="hsl(var(--chart-2))" radius={[0, 2, 2, 0]} barSize={8} />
                  <Bar dataKey="Realizado" fill="hsl(var(--chart-3))" radius={[0, 2, 2, 0]} barSize={8} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
