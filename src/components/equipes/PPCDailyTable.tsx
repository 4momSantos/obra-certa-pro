import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

const DAYS = [
  { plan: "plan_segunda", exec: "exec_segunda", label: "Seg" },
  { plan: "plan_terca", exec: "exec_terca", label: "Ter" },
  { plan: "plan_quarta", exec: "exec_quarta", label: "Qua" },
  { plan: "plan_quinta", exec: "exec_quinta", label: "Qui" },
  { plan: "plan_sexta", exec: "exec_sexta", label: "Sex" },
  { plan: "plan_sabado", exec: "exec_sabado", label: "Sáb" },
  { plan: "plan_domingo", exec: "exec_domingo", label: "Dom" },
];

function ppc(exec: number, plan: number): string {
  if (plan === 0) return "—";
  const v = (exec / plan) * 100;
  return `${v.toFixed(0)}%`;
}

function ppcColor(exec: number, plan: number): string {
  if (plan === 0) return "text-muted-foreground";
  const v = (exec / plan) * 100;
  if (v >= 100) return "text-green-600 font-semibold";
  if (v >= 80) return "text-yellow-600";
  return "text-red-600";
}

interface Props {
  equipe: string;
}

export function PPCDailyTable({ equipe }: Props) {
  const [selectedSemana, setSelectedSemana] = useState<string>("all");

  const { data: rows, isLoading } = useQuery({
    queryKey: ["ppc-daily", equipe],
    enabled: !!equipe,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const all: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("scon_programacao")
          .select("semana, componente, etapa, plan_segunda, plan_terca, plan_quarta, plan_quinta, plan_sexta, plan_sabado, plan_domingo, exec_segunda, exec_terca, exec_quarta, exec_quinta, exec_sexta, exec_sabado, exec_domingo, total_exec_semana, programado_componente")
          .eq("equipe", equipe)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
  });

  const semanas = useMemo(() => {
    if (!rows) return [];
    const set = new Set(rows.map((r: any) => r.semana).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const aggregated = useMemo(() => {
    if (!rows) return [];
    const filtered = selectedSemana === "all" ? rows : rows.filter((r: any) => r.semana === selectedSemana);

    // Group by semana
    const map = new Map<string, { plan: number[]; exec: number[]; count: number; totalPlan: number; totalExec: number }>();
    for (const r of filtered) {
      const key = r.semana || "—";
      if (!map.has(key)) map.set(key, { plan: Array(7).fill(0), exec: Array(7).fill(0), count: 0, totalPlan: 0, totalExec: 0 });
      const g = map.get(key)!;
      g.count++;
      DAYS.forEach((d, i) => {
        g.plan[i] += Number(r[d.plan]) || 0;
        g.exec[i] += Number(r[d.exec]) || 0;
      });
      g.totalPlan += Number(r.programado_componente) || 0;
      g.totalExec += Number(r.total_exec_semana) || 0;
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([semana, g]) => ({
        semana,
        ...g,
        planTotal: g.plan.reduce((a, b) => a + b, 0),
        execTotal: g.exec.reduce((a, b) => a + b, 0),
      }));
  }, [rows, selectedSemana]);

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>;

  if (!rows || rows.length === 0) {
    return <p className="text-xs text-muted-foreground italic py-4">Nenhum dado de programação para esta equipe.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PPC Diário — Plan × Exec</p>
        <Select value={selectedSemana} onValueChange={setSelectedSemana}>
          <SelectTrigger className="w-36 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas semanas</SelectItem>
            {semanas.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border overflow-auto max-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] sticky left-0 bg-background z-10">Semana</TableHead>
              <TableHead className="text-[10px]">Tipo</TableHead>
              {DAYS.map((d) => (
                <TableHead key={d.label} className="text-[10px] text-center w-12">{d.label}</TableHead>
              ))}
              <TableHead className="text-[10px] text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aggregated.map((g) => (
              <>
                {/* Plan row */}
                <TableRow key={`${g.semana}-plan`} className="border-b-0">
                  <TableCell rowSpan={3} className="text-[10px] font-mono font-semibold align-top sticky left-0 bg-background">
                    {g.semana}
                    <br />
                    <span className="text-[9px] text-muted-foreground">{g.count} comp.</span>
                  </TableCell>
                  <TableCell className="text-[10px]">
                    <Badge variant="outline" className="text-[9px]">Plan</Badge>
                  </TableCell>
                  {g.plan.map((v, i) => (
                    <TableCell key={i} className="text-[10px] text-center font-mono">{v > 0 ? v.toFixed(1) : "0"}</TableCell>
                  ))}
                  <TableCell className="text-[10px] text-right font-mono font-semibold">{g.planTotal.toFixed(1)}</TableCell>
                </TableRow>
                {/* Exec row */}
                <TableRow key={`${g.semana}-exec`} className="border-b-0">
                  <TableCell className="text-[10px]">
                    <Badge variant="secondary" className="text-[9px]">Exec</Badge>
                  </TableCell>
                  {g.exec.map((v, i) => (
                    <TableCell key={i} className="text-[10px] text-center font-mono">{v > 0 ? v.toFixed(1) : "0"}</TableCell>
                  ))}
                  <TableCell className="text-[10px] text-right font-mono font-semibold">{g.execTotal.toFixed(1)}</TableCell>
                </TableRow>
                {/* PPC row */}
                <TableRow key={`${g.semana}-ppc`}>
                  <TableCell className="text-[10px]">
                    <Badge className="text-[9px] bg-primary/10 text-primary border-primary/30 border">PPC</Badge>
                  </TableCell>
                  {g.plan.map((planV, i) => (
                    <TableCell key={i} className={`text-[10px] text-center font-mono ${ppcColor(g.exec[i], planV)}`}>
                      {ppc(g.exec[i], planV)}
                    </TableCell>
                  ))}
                  <TableCell className={`text-[10px] text-right font-mono ${ppcColor(g.execTotal, g.planTotal)}`}>
                    {ppc(g.execTotal, g.planTotal)}
                  </TableCell>
                </TableRow>
              </>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
