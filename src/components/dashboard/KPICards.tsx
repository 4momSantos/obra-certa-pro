import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { useCronograma } from "@/contexts/CronogramaContext";
import { Card, CardContent } from "@/components/ui/card";
import {
  DollarSign, TrendingUp, Wallet, CalendarCheck,
  ArrowUpRight, ArrowDownRight, Lock, Unlock,
} from "lucide-react";
import { formatCompact, formatPercent } from "@/lib/format";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  gradient: string;
  trend?: { value: string; positive: boolean };
  onClick?: () => void;
  active?: boolean;
}

function KPICard({ title, value, subtitle, icon: Icon, gradient, trend, onClick, active }: KPICardProps) {
  return (
    <Card
      className={`glass-card overflow-hidden relative group hover:shadow-xl transition-all duration-300 cursor-pointer ${
        active ? "ring-2 ring-primary" : ""
      }`}
      onClick={onClick}
    >
      <div className={`absolute inset-0 opacity-[0.06] ${gradient}`} />
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{title}</p>
            <p className="text-xl font-bold font-mono tracking-tight text-foreground">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
            {trend && (
              <div className="flex items-center gap-1">
                {trend.positive
                  ? <ArrowUpRight className="h-3 w-3 text-chart-3" />
                  : <ArrowDownRight className="h-3 w-3 text-destructive" />}
                <span className={`text-[10px] font-medium ${trend.positive ? "text-chart-3" : "text-destructive"}`}>
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
  const { filteredMetrics } = useDashboardFilters();
  const { state } = useCronograma();
  const lastFechado = state.periods.filter(p => p.fechado).pop();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      <KPICard
        title="Valor Contratual"
        value={formatCompact(filteredMetrics.valorContratual)}
        icon={DollarSign}
        gradient="gradient-accent"
      />
      <KPICard
        title="Avanço Financeiro"
        value={formatPercent(filteredMetrics.avancoFinanceiro)}
        subtitle={`Realizado: ${formatCompact(filteredMetrics.totalRealizado)}`}
        icon={TrendingUp}
        gradient="gradient-primary"
        trend={{
          value: formatPercent(filteredMetrics.avancoFisico),
          positive: filteredMetrics.avancoFisico > 0.3,
        }}
      />
      <KPICard
        title="Saldo"
        value={formatCompact(filteredMetrics.saldo)}
        icon={Wallet}
        gradient="gradient-success"
      />
      <KPICard
        title="Último Fechamento"
        value={lastFechado?.label || "—"}
        icon={CalendarCheck}
        gradient="gradient-danger"
      />
      <KPICard
        title="Períodos Fechados"
        value={`${filteredMetrics.closedCount}`}
        subtitle={`de ${filteredMetrics.periodCount} filtrados`}
        icon={Lock}
        gradient="gradient-primary"
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
