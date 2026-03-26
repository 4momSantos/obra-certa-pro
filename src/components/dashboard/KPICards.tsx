import { useMemo } from "react";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { useCronograma } from "@/contexts/CronogramaContext";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign, TrendingUp, Wallet, CalendarCheck,
  ArrowUpRight, ArrowDownRight, Minus, Lock, Unlock,
} from "lucide-react";
import { formatCompact, formatPercent, formatCurrency } from "@/lib/format";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  gradient: string;
  trend?: { value: string; direction: "up" | "down" | "neutral" };
  progress?: number; // 0-100
}

function KPICard({ title, value, subtitle, icon: Icon, gradient, trend, progress }: KPICardProps) {
  return (
    <Card className="glass-card overflow-hidden relative group hover:shadow-xl transition-all duration-300">
      <div className={`absolute inset-0 opacity-[0.06] ${gradient}`} />
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{title}</p>
            <p className="text-xl font-bold font-mono tracking-tight text-foreground truncate">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>}
            {progress !== undefined && (
              <Progress value={Math.min(progress, 100)} className="h-1.5 mt-1" />
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-0.5">
                {trend.direction === "up" && <ArrowUpRight className="h-3 w-3 text-green-500" />}
                {trend.direction === "down" && <ArrowDownRight className="h-3 w-3 text-red-500" />}
                {trend.direction === "neutral" && <Minus className="h-3 w-3 text-muted-foreground" />}
                <span className={`text-[10px] font-medium ${
                  trend.direction === "up" ? "text-green-500" :
                  trend.direction === "down" ? "text-red-500" : "text-muted-foreground"
                }`}>
                  {trend.value}
                </span>
              </div>
            )}
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${gradient} shadow-lg`}>
            <Icon className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function KPICards() {
  const { filteredMetrics, filteredPeriods } = useDashboardFilters();
  const { state } = useCronograma();

  const lastFechado = useMemo(
    () => state.periods.filter(p => p.fechado).pop(),
    [state.periods]
  );

  // Variation vs previous closed period
  const variation = useMemo(() => {
    const closedPeriods = filteredPeriods.filter(p => p.fechado);
    if (closedPeriods.length < 2) return null;
    const last = closedPeriods[closedPeriods.length - 1];
    const prev = closedPeriods[closedPeriods.length - 2];
    if (prev.realizado === 0) return null;
    const pct = ((last.realizado - prev.realizado) / prev.realizado) * 100;
    return {
      value: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`,
      direction: pct > 0 ? "up" as const : pct < 0 ? "down" as const : "neutral" as const,
    };
  }, [filteredPeriods]);

  const progressPct = filteredMetrics.avancoFinanceiro * 100;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      <KPICard
        title="Valor Contratual"
        value={formatCompact(filteredMetrics.valorContratual)}
        subtitle={formatCurrency(filteredMetrics.valorContratual)}
        icon={DollarSign}
        gradient="gradient-accent"
      />
      <KPICard
        title="Avanço Financeiro"
        value={formatPercent(filteredMetrics.avancoFinanceiro)}
        subtitle={`Realizado: ${formatCompact(filteredMetrics.totalRealizado)}`}
        icon={TrendingUp}
        gradient="gradient-primary"
        progress={progressPct}
        trend={variation ?? undefined}
      />
      <KPICard
        title="Saldo Restante"
        value={formatCompact(filteredMetrics.saldo)}
        subtitle={`${formatPercent(filteredMetrics.saldo / (filteredMetrics.valorContratual || 1))} restante`}
        icon={Wallet}
        gradient="gradient-success"
      />
      <KPICard
        title="Último Fechamento"
        value={lastFechado ? formatCompact(lastFechado.realizado) : "—"}
        subtitle={lastFechado?.label ?? "Nenhum período fechado"}
        icon={CalendarCheck}
        gradient="gradient-danger"
        trend={variation ?? undefined}
      />
      <KPICard
        title="Períodos Fechados"
        value={`${filteredMetrics.closedCount}`}
        subtitle={`de ${filteredMetrics.periodCount} filtrados`}
        icon={Lock}
        gradient="gradient-primary"
        progress={(filteredMetrics.closedCount / (filteredMetrics.periodCount || 1)) * 100}
      />
      <KPICard
        title="Períodos Abertos"
        value={`${filteredMetrics.openCount}`}
        subtitle={`de ${filteredMetrics.periodCount} filtrados`}
        icon={Unlock}
        gradient="gradient-accent"
      />
    </div>
  );
}
