import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAllBMValues, useAllRelEventos, useBMSummary } from "@/hooks/useBMData";
import { bmRange } from "@/lib/bm-utils";
import { formatCompact } from "@/lib/format";

function getISOWeek(d: Date): number {
  const tmp = new Date(d.getTime());
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  return 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function fmtM(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return `R$ ${v.toFixed(0)}`;
}

export function ForecastTab() {
  const { data: bmValues, isLoading: loadingBM } = useAllBMValues();
  const { data: relEventos, isLoading: loadingEvents } = useAllRelEventos();
  const summary = useBMSummary(bmValues);

  const forecast = useMemo(() => {
    if (!bmValues || !relEventos) return null;

    // Weekly rhythm from rel_eventos
    const recentEvents = relEventos
      .filter((e: any) => e.etapa === "Concluída" && e.data_execucao)
      .sort((a: any, b: any) => new Date(b.data_execucao).getTime() - new Date(a.data_execucao).getTime());

    const weeklyExec: Record<string, number> = {};
    recentEvents.forEach((e: any) => {
      const d = new Date(e.data_execucao);
      const key = `${d.getFullYear()}-W${String(getISOWeek(d)).padStart(2, "0")}`;
      weeklyExec[key] = (weeklyExec[key] || 0) + (Number(e.quantidade_ponderada) || Number(e.valor) || 0);
    });

    const weeks = Object.keys(weeklyExec).sort().slice(-6);
    const avgWeekly = weeks.length > 0 ? weeks.reduce((s, w) => s + weeklyExec[w], 0) / weeks.length : 0;
    const monthlyForecast = avgWeekly * 4.3;

    // Accumulate previsto, projetado, realizado by BM
    const bmAccum: Record<string, { previsto: number; projetado: number; realizado: number }> = {};
    for (let i = 1; i <= 22; i++) {
      const name = `BM-${String(i).padStart(2, "0")}`;
      bmAccum[name] = { previsto: 0, projetado: 0, realizado: 0 };
    }
    bmValues.forEach((v) => {
      if (bmAccum[v.bm_name]) {
        if (v.tipo === "Previsto") bmAccum[v.bm_name].previsto += v.valor;
        else if (v.tipo === "Projetado") bmAccum[v.bm_name].projetado += v.valor;
        else if (v.tipo === "Realizado") bmAccum[v.bm_name].realizado += v.valor;
      }
    });

    // Build chart data with accumulated values
    let prevAccum = 0, projAccum = 0, realAccum = 0, forecastAccum = summary.totalMedido;
    const chartData = [];
    const forecastRows = [];

    // Contract total from previsto
    const totalContrato = Object.values(bmAccum).reduce((s, v) => s + v.previsto, 0);
    let completionBM: string | null = null;

    for (let i = 1; i <= 22; i++) {
      const name = `BM-${String(i).padStart(2, "0")}`;
      const bm = bmAccum[name];
      prevAccum += bm.previsto;
      projAccum += bm.projetado;

      const point: any = { bm: name, previstoAcum: prevAccum, projetadoAcum: projAccum };

      if (i <= summary.ultimoBM) {
        realAccum += bm.realizado;
        point.realizadoAcum = realAccum;
      } else {
        forecastAccum += monthlyForecast;
        point.forecastAcum = forecastAccum;

        if (!completionBM && forecastAccum >= totalContrato && totalContrato > 0) {
          completionBM = name;
        }

        forecastRows.push({
          bm: name,
          range: bmRange(name),
          previsto: bm.previsto,
          projetado: bm.projetado,
          forecastMonth: monthlyForecast,
          forecastAccum,
          deltaVsProj: forecastAccum - projAccum,
        });
      }

      chartData.push(point);
    }

    return {
      avgWeekly,
      monthlyForecast,
      bmsRestantes: 22 - summary.ultimoBM,
      completionBM,
      chartData,
      forecastRows,
      weeksUsed: weeks.length,
    };
  }, [bmValues, relEventos, summary]);

  if (loadingBM || loadingEvents) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;

  if (!forecast || forecast.weeksUsed === 0) {
    return <p className="text-sm text-muted-foreground text-center py-12">Sem dados suficientes para projeção</p>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Ritmo Semanal", value: formatCompact(forecast.avgWeekly) },
          { label: "Projeção Mensal", value: formatCompact(forecast.monthlyForecast) },
          { label: "BMs Restantes", value: String(forecast.bmsRestantes) },
          { label: "Previsão Conclusão", value: forecast.completionBM || "Além do BM-22" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.label}</p>
              <p className="font-mono text-sm font-bold mt-1">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={forecast.chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="bm" tick={{ fontSize: 9 }} interval={1} />
              <YAxis tickFormatter={(v) => fmtM(v)} tick={{ fontSize: 9 }} />
              <Tooltip formatter={(v: number) => fmtM(v)} labelFormatter={(l) => `${l}`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="previstoAcum" name="Previsto" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="projetadoAcum" name="Projetado" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 3" dot={false} />
              <Line type="monotone" dataKey="realizadoAcum" name="Realizado" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} connectNulls={false} />
              <Line type="monotone" dataKey="forecastAcum" name="Forecast SCON" stroke="#f97316" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Projection Table */}
      {forecast.forecastRows.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Projeção de BMs Futuros</h3>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">BM</TableHead>
                  <TableHead className="text-xs">Período</TableHead>
                  <TableHead className="text-xs text-right">Previsto</TableHead>
                  <TableHead className="text-xs text-right">Projetado</TableHead>
                  <TableHead className="text-xs text-right">Forecast Mensal</TableHead>
                  <TableHead className="text-xs text-right">Forecast Acum</TableHead>
                  <TableHead className="text-xs text-right">vs Projetado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecast.forecastRows.map((r) => (
                  <TableRow key={r.bm}>
                    <TableCell className="text-[10px] font-mono font-semibold">{r.bm}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">{r.range.label}</TableCell>
                    <TableCell className="text-[10px] text-right font-mono">{formatCompact(r.previsto)}</TableCell>
                    <TableCell className="text-[10px] text-right font-mono">{formatCompact(r.projetado)}</TableCell>
                    <TableCell className="text-[10px] text-right font-mono">{formatCompact(r.forecastMonth)}</TableCell>
                    <TableCell className="text-[10px] text-right font-mono">{formatCompact(r.forecastAccum)}</TableCell>
                    <TableCell className={`text-[10px] text-right font-mono font-semibold ${r.deltaVsProj >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {r.deltaVsProj >= 0 ? "+" : ""}{formatCompact(r.deltaVsProj)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
