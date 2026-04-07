import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3, Upload, AlertTriangle, ArrowRight, TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useMedicaoData, type Semaforo } from "@/hooks/useMedicao";
import { useAlertCounts, useAlerts } from "@/hooks/useAlerts";

const fmt = (v: number) =>
  v >= 1e9 ? `R$ ${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(0)}K` : `R$ ${v.toFixed(0)}`;

const pct = (a: number, b: number) => (b > 0 ? ((a / b) * 100).toFixed(1) : "0") + "%";

export default function HomeDashboard() {
  const { items, kpis, isLoading, hasOperationalData } = useMedicaoData();
  const alertCounts = useAlertCounts();
  const { data: alertRules } = useAlerts();

  // Semáforo counts
  const semaforoCounts = useMemo(() => {
    const c = { medido: { count: 0, valor: 0 }, executado: { count: 0, valor: 0 }, previsto: { count: 0, valor: 0 }, futuro: { count: 0, valor: 0 } };
    items.forEach(i => { c[i.semaforo].count++; c[i.semaforo].valor += i.valor_total; });
    return c;
  }, [items]);

  // Top 5 Gaps
  const topGaps = useMemo(() =>
    [...items].sort((a, b) => b.gap - a.gap).slice(0, 5),
    [items]
  );

  // Top 5 critical alerts
  const topAlerts = useMemo(() => {
    const all = (alertRules ?? [])
      .filter(r => r.severity === "alta")
      .flatMap(r => r.items.map(i => ({ ...i, ruleLabel: r.label })));
    return all.slice(0, 5);
  }, [alertRules]);

  // Empty state
  if (!isLoading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Upload className="h-16 w-16 text-muted-foreground/30" />
        <p className="text-lg font-medium">Dados de medição não encontrados</p>
        <p className="text-sm text-muted-foreground max-w-md text-center">
          As tabelas <code className="bg-muted px-1 rounded text-xs">ppu_items</code> e <code className="bg-muted px-1 rounded text-xs">classificacao_ppu</code> estão vazias.
          Importe os dados mestres (PPU-PREV) em Configuração, ou dados operacionais (SIGEM, GITEC, SCON) em Importar.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to="/configuracao">Configuração</Link></Button>
          <Button asChild><Link to="/import"><Upload className="h-4 w-4 mr-2" /> Importar Dados</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-2 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Dashboard Executivo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Visão consolidada do contrato</p>
        </div>
      </div>

      {/* KPIs Row */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : kpis && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <KPICard label="Contrato" value={fmt(kpis.contrato)} color="text-foreground" link="/medicao" />
          <KPICard label="Executado SCON" value={fmt(kpis.executadoScon)} sub={pct(kpis.executadoScon, kpis.contrato)} color="text-amber-500" link="/medicao" />
          <KPICard label="Postado SIGEM" value={`${kpis.postadoSigem.toLocaleString("pt-BR")} docs`} color="text-purple-500" link="/medicao" />
          <KPICard label="Medido GITEC" value={fmt(kpis.medidoGitec)} sub={pct(kpis.medidoGitec, kpis.contrato)} color="text-emerald-500" link="/gitec" />
          <KPICard label="Saldo" value={fmt(kpis.saldo)} color="text-foreground" link="/medicao" />
          <KPICard label="Alertas" value={alertCounts.total.toString()} sub={`${alertCounts.alta} críticos`} color={alertCounts.alta > 0 ? "text-destructive" : "text-foreground"} link="/alertas" />
        </div>
      )}

      {/* Funnel */}
      {!isLoading && kpis && (
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Pipeline de Medição</p>
            <FunnelBar stages={[
              { label: "Contrato", value: kpis.contrato, color: "bg-muted-foreground" },
              { label: "Executado SCON", value: kpis.executadoScon, color: "bg-amber-500" },
              { label: "Postado SIGEM", value: kpis.postadoSigem, color: "bg-purple-500", isCount: true },
              { label: "Medido GITEC", value: kpis.medidoGitec, color: "bg-emerald-500" },
            ]} maxValue={kpis.contrato} />
          </CardContent>
        </Card>
      )}

      {/* Row 3: Semáforo + Top Gaps */}
      {!isLoading && (
        <div className="grid md:grid-cols-2 gap-4">
          <LinkCard to="/medicao" title="Semáforo PPU">
            <div className="grid grid-cols-2 gap-2">
              {(["medido", "executado", "previsto", "futuro"] as Semaforo[]).map(s => {
                const d = semaforoCounts[s];
                const colors: Record<Semaforo, string> = { medido: "text-emerald-500", executado: "text-amber-500", previsto: "text-blue-500", futuro: "text-muted-foreground" };
                const labels: Record<Semaforo, string> = { medido: "Medido", executado: "Executado", previsto: "Previsto", futuro: "Futuro" };
                return (
                  <div key={s} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <span className={`h-2.5 w-2.5 rounded-full ${s === "medido" ? "bg-emerald-500" : s === "executado" ? "bg-amber-500" : s === "previsto" ? "bg-blue-500" : "bg-muted-foreground/40"}`} />
                    <div>
                      <span className={`text-sm font-bold ${colors[s]}`}>{d.count}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">{labels[s]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </LinkCard>

          <LinkCard to="/medicao" title="Top 5 Gaps (Exec vs Medido)">
            {topGaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem gaps significativos</p>
            ) : (
              <div className="space-y-2">
                {topGaps.map(p => (
                  <div key={p.item_ppu} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs">{p.item_ppu}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">SCON {p.scon_avg_avanco.toFixed(0)}%</span>
                      <span className="font-mono text-xs font-bold text-destructive">{fmt(p.gap)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </LinkCard>
        </div>
      )}

      {/* Row 4: GITEC summary + Top alerts */}
      {!isLoading && kpis && (
        <div className="grid md:grid-cols-2 gap-4">
          <LinkCard to="/gitec" title="GITEC Resumo">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Aprovado</span>
                <span className="font-mono font-bold text-emerald-500">{fmt(kpis.medidoGitec)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pendente</span>
                <span className="font-mono font-bold text-amber-500">{fmt(kpis.saldo)}</span>
              </div>
              <Progress value={kpis.contrato > 0 ? (kpis.medidoGitec / kpis.contrato) * 100 : 0} className="h-2" />
              <p className="text-[10px] text-muted-foreground text-right">{pct(kpis.medidoGitec, kpis.contrato)} do contrato</p>
            </div>
          </LinkCard>

          <LinkCard to="/alertas" title="Top 5 Alertas Críticos">
            {topAlerts.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-emerald-500">✓</span> Nenhum alerta crítico
              </div>
            ) : (
              <div className="space-y-2">
                {topAlerts.map((a, i) => (
                  <div key={a.id + i} className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                    <span className="font-mono text-xs">{a.label}</span>
                    {a.valor ? <span className="ml-auto text-xs text-muted-foreground">{fmt(a.valor)}</span> : null}
                  </div>
                ))}
              </div>
            )}
          </LinkCard>
        </div>
      )}
    </motion.div>
  );
}

function KPICard({ label, value, sub, color, link }: { label: string; value: string; sub?: string; color: string; link: string }) {
  return (
    <Link to={link}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className={`text-xl font-bold ${color} mt-1`}>{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

function LinkCard({ to, title, children }: { to: string; title: string; children: React.ReactNode }) {
  return (
    <Link to={to}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            {title}
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">{children}</CardContent>
      </Card>
    </Link>
  );
}

function FunnelBar({ stages, maxValue }: { stages: { label: string; value: number; color: string; isCount?: boolean }[]; maxValue: number }) {
  return (
    <div className="space-y-2">
      {stages.map(s => (
        <div key={s.label} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-28 shrink-0 text-right">{s.label}</span>
          <div className="flex-1 h-7 bg-muted/30 rounded overflow-hidden relative">
            {!s.isCount && (
              <div
                className={`h-full ${s.color} rounded transition-all`}
                style={{ width: `${Math.min((s.value / maxValue) * 100, 100)}%` }}
              />
            )}
            <span className="absolute inset-0 flex items-center px-2 text-xs font-mono font-medium">
              {s.isCount ? `${s.value.toLocaleString("pt-BR")} docs` : fmt(s.value)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
