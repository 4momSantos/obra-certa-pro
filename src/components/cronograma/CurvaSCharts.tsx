import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CurvaSRow } from "@/hooks/useCronogramaData";

function fmtM(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
}

function fmtTooltip(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.5rem",
  fontSize: "11px",
};

interface Props {
  data: CurvaSRow[];
}

export function CurvaSCharts({ data }: Props) {
  // For acumulada: don't show realizado where value is 0 (future periods)
  const acumData = data.map(d => ({
    label: d.label,
    Previsto: d.previsto_acum,
    Projetado: d.projetado_acum,
    Realizado: d.realizado_acum > 0 ? d.realizado_acum : null,
  }));

  const mensalData = data.map(d => ({
    label: d.label,
    Previsto: d.previsto_mensal,
    Projetado: d.projetado_mensal,
    Realizado: d.realizado_mensal,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Acumulada */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Curva S — Acumulada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={acumData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={50} />
                <YAxis tickFormatter={fmtM} tick={{ fontSize: 9 }} />
                <Tooltip formatter={(v: number) => fmtTooltip(v)} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <Line type="monotone" dataKey="Previsto" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Projetado" stroke="hsl(var(--chart-5))" strokeWidth={2} strokeDasharray="6 3" dot={false} />
                <Line type="monotone" dataKey="Realizado" stroke="hsl(var(--chart-3))" strokeWidth={3} dot={{ r: 3 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Mensal */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Curva S — Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mensalData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={50} />
                <YAxis tickFormatter={fmtM} tick={{ fontSize: 9 }} />
                <Tooltip formatter={(v: number) => fmtTooltip(v)} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <Bar dataKey="Previsto" fill="hsl(var(--chart-1))" opacity={0.6} />
                <Bar dataKey="Projetado" fill="hsl(var(--chart-5))" opacity={0.6} />
                <Bar dataKey="Realizado" fill="hsl(var(--chart-3))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
