import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useContrato } from "@/contexts/ContratoContext";
import { useCurvaS, useUltimoBm } from "@/hooks/useCronogramaData";
import { useGitecStats } from "@/hooks/useGitec";
import { useAlerts } from "@/hooks/useAlerts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CurvaSCharts } from "@/components/cronograma/CurvaSCharts";
import { GitecFunnel } from "@/components/gitec/GitecFunnel";
import { formatCompact } from "@/lib/format";
import {
  DollarSign, CalendarCheck, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Clock, ExternalLink,
} from "lucide-react";

// ── BM Resumo hook ─────────────────────────────────────────────────────────────
function useBmResumo() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["bm-resumo", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_bm_resumo" as any)
        .select("*")
        .order("bm_number", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

// ── Tarefas pendentes hook ──────────────────────────────────────────────────────
function useTarefasPendentes() {
  const { user } = useAuth();
  const { contratoAtivo } = useContrato();
  return useQuery({
    queryKey: ["tarefas-pendentes-cg", user?.id, contratoAtivo?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      try {
        let q = supabase
          .from("splan_tarefas" as any)
          .select("id, titulo, prioridade, boletim, prazo, status, created_at")
          .neq("status", "concluida")
          .neq("status", "cancelada")
          .order("created_at", { ascending: false })
          .limit(5);
        if (contratoAtivo?.id) q = q.eq("contrato_id", contratoAtivo.id);
        const { data, error } = await q;
        if (error) throw error;
        return (data || []) as any[];
      } catch {
        return null; // table may not exist
      }
    },
  });
}

// ── Page ────────────────────────────────────────────────────────────────────────
export default function ControleGerencial() {
  const navigate = useNavigate();
  const { contratoAtivo } = useContrato();
  const { data: curvaS } = useCurvaS();
  const { data: ultimoBm } = useUltimoBm();
  const { data: gitecStats } = useGitecStats();
  const { data: bmResumo, isLoading: loadingBm } = useBmResumo();
  const { data: alertRules } = useAlerts();
  const { data: tarefas } = useTarefasPendentes();

  // Compute KPIs from bmResumo
  const kpis = useMemo(() => {
    const valorContratual = contratoAtivo?.valor_contratual || 0;
    if (!bmResumo || bmResumo.length === 0) {
      return { valorContratual, pctExec: 0, bmAtual: ultimoBm || 0, bmStatus: "—", cpi: 0, spi: 0 };
    }
    const totalRealizado = bmResumo.reduce((s: number, r: any) => s + (Number(r.realizado) || 0), 0);
    const totalPrevisto = bmResumo.reduce((s: number, r: any) => s + (Number(r.previsto) || 0), 0);
    const totalProjetado = bmResumo.reduce((s: number, r: any) => s + (Number(r.projetado) || 0), 0);
    const pctExec = valorContratual > 0 ? totalRealizado / valorContratual : 0;
    const cpi = totalProjetado > 0 ? totalRealizado / totalProjetado : 0;
    const spi = totalPrevisto > 0 ? totalRealizado / totalPrevisto : 0;
    const lastBm = bmResumo[bmResumo.length - 1];
    return {
      valorContratual,
      pctExec,
      bmAtual: ultimoBm || 0,
      bmStatus: lastBm?.status || "aberto",
      cpi,
      spi,
    };
  }, [bmResumo, contratoAtivo, ultimoBm]);

  // Recent alerts (top 5)
  const recentAlerts = useMemo(() => {
    if (!alertRules) return [];
    const all: { code: string; severity: string; label: string; item: string }[] = [];
    alertRules.forEach(r => {
      r.items.slice(0, 3).forEach(i => {
        all.push({ code: r.code, severity: r.severity, label: r.label, item: i.label });
      });
    });
    return all.slice(0, 5);
  }, [alertRules]);

  const semaforoColor = (v: number) => {
    if (v >= 0.95) return "text-emerald-500";
    if (v >= 0.8) return "text-amber-500";
    return "text-destructive";
  };

  if (loadingBm) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Controle Gerencial</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão executiva integrada — {contratoAtivo?.nome || "Contrato"}
        </p>
      </div>

      {/* ── Linha 1: KPIs Macro ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={DollarSign}
          label="Valor Contratual"
          value={formatCompact(kpis.valorContratual)}
          sub={`${(kpis.pctExec * 100).toFixed(1)}% executado`}
        />
        <KpiCard
          icon={CalendarCheck}
          label="BM Atual"
          value={kpis.bmAtual ? `BM-${String(kpis.bmAtual).padStart(2, "0")}` : "—"}
          sub={kpis.bmStatus}
          badge={kpis.bmStatus}
        />
        <KpiCard
          icon={TrendingUp}
          label="CPI"
          value={kpis.cpi.toFixed(2)}
          sub="Cost Performance Index"
          valueClass={semaforoColor(kpis.cpi)}
        />
        <KpiCard
          icon={TrendingDown}
          label="SPI"
          value={kpis.spi.toFixed(2)}
          sub="Schedule Performance Index"
          valueClass={semaforoColor(kpis.spi)}
        />
      </div>

      {/* ── Linha 2: Curva S + Funil GITEC ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Curva S</CardTitle>
          </CardHeader>
          <CardContent>
            {curvaS && curvaS.length > 0 ? (
              <div className="h-[220px]">
                <CurvaSMini data={curvaS} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-12 text-center">Sem dados de Curva S</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Pipeline GITEC</CardTitle>
          </CardHeader>
          <CardContent>
            {gitecStats && gitecStats.total > 0 ? (
              <GitecFunnel stats={gitecStats} />
            ) : (
              <p className="text-xs text-muted-foreground py-12 text-center">Sem dados GITEC</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Linha 3: Tabela Resumo por BM ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Resumo por BM</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {bmResumo && bmResumo.length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-3 font-medium">BM</th>
                  <th className="text-left py-2 pr-3 font-medium">Status</th>
                  <th className="text-right py-2 pr-3 font-medium">Previsto</th>
                  <th className="text-right py-2 pr-3 font-medium">Realizado</th>
                  <th className="text-right py-2 pr-3 font-medium">Gap</th>
                  <th className="text-right py-2 pr-3 font-medium">GITEC %</th>
                  <th className="text-right py-2 pr-3 font-medium">SCON %</th>
                  <th className="text-center py-2 font-medium">Semáforo</th>
                </tr>
              </thead>
              <tbody>
                {bmResumo.map((bm: any) => {
                  const previsto = Number(bm.previsto) || 0;
                  const realizado = Number(bm.realizado) || 0;
                  const gap = previsto - realizado;
                  const gitecPct = Number(bm.gitec_pct) || 0;
                  const sconPct = Number(bm.scon_pct) || 0;
                  const status = bm.status || "aberto";
                  return (
                    <tr
                      key={bm.bm_name || bm.bm_number}
                      className="border-b border-border/40 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/gestao-bm?bm=${bm.bm_number || ""}`)}
                    >
                      <td className="py-2 pr-3 font-mono font-medium">{bm.bm_name || `BM-${String(bm.bm_number).padStart(2, "0")}`}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={status === "fechado" ? "secondary" : "outline"} className="text-[10px]">
                          {status}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-right font-mono">{formatCompact(previsto)}</td>
                      <td className="py-2 pr-3 text-right font-mono">{formatCompact(realizado)}</td>
                      <td className={`py-2 pr-3 text-right font-mono ${gap > 0 ? "text-destructive" : "text-emerald-500"}`}>
                        {formatCompact(Math.abs(gap))}
                      </td>
                      <td className="py-2 pr-3 text-right">{(gitecPct * 100).toFixed(1)}%</td>
                      <td className="py-2 pr-3 text-right">{(sconPct * 100).toFixed(1)}%</td>
                      <td className="py-2 text-center">
                        <SemaforoDot value={Math.min(gitecPct, sconPct)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhum BM encontrado</p>
          )}
        </CardContent>
      </Card>

      {/* ── Linha 4: Alertas + Tarefas ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Alertas Recentes</CardTitle>
              <button onClick={() => navigate("/alertas")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                Ver todos <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {recentAlerts.length > 0 ? (
              <div className="space-y-2">
                {recentAlerts.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs py-1.5 border-b border-border/30 last:border-0">
                    <AlertTriangle className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${a.severity === "alta" ? "text-destructive" : "text-amber-500"}`} />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{a.item}</p>
                      <p className="text-muted-foreground truncate">{a.code} — {a.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <CheckCircle className="h-6 w-6 text-emerald-500" />
                <p className="text-xs">Nenhum alerta ativo</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Tarefas Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            {tarefas === null ? (
              <p className="text-xs text-muted-foreground text-center py-8">Módulo de tarefas não configurado</p>
            ) : tarefas && tarefas.length > 0 ? (
              <div className="space-y-2">
                {tarefas.map((t: any) => (
                  <div key={t.id} className="flex items-start gap-2 text-xs py-1.5 border-b border-border/30 last:border-0">
                    <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{t.titulo}</p>
                      <p className="text-muted-foreground">{t.boletim} · {t.prioridade}</p>
                    </div>
                    <Badge variant={t.prioridade === "alta" ? "destructive" : "secondary"} className="text-[9px] shrink-0">
                      {t.prioridade}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <CheckCircle className="h-6 w-6 text-emerald-500" />
                <p className="text-xs">Nenhuma tarefa pendente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, badge, valueClass }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  badge?: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        </div>
        <p className={`font-mono text-lg font-bold ${valueClass || "text-foreground"}`}>{value}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-muted-foreground">{sub}</span>
          {badge && (
            <Badge variant="outline" className="text-[9px]">{badge}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SemaforoDot({ value }: { value: number }) {
  const color = value >= 0.95 ? "bg-chart-3" : value >= 0.7 ? "bg-chart-5" : "bg-destructive";
  return <span className={`inline-block h-3 w-3 rounded-full ${color}`} />;
}

// Inline compact curva S using recharts directly for smaller height
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import type { CurvaSRow } from "@/hooks/useCronogramaData";

function CurvaSMini({ data }: { data: CurvaSRow[] }) {
  const chartData = data.map(d => ({
    label: d.label,
    Previsto: d.previsto_acum,
    Projetado: d.projetado_acum,
    Realizado: d.realizado_acum > 0 ? d.realizado_acum : null,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
        <XAxis dataKey="label" tick={{ fontSize: 8 }} angle={-45} textAnchor="end" height={40} />
        <YAxis tickFormatter={(v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : `${(v / 1e3).toFixed(0)}K`} tick={{ fontSize: 8 }} />
        <Tooltip
          formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
            fontSize: "10px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "9px" }} />
        <Line type="monotone" dataKey="Previsto" stroke="hsl(var(--chart-1))" strokeWidth={1.5} dot={false} />
        <Line type="monotone" dataKey="Projetado" stroke="hsl(var(--chart-5))" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
        <Line type="monotone" dataKey="Realizado" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
