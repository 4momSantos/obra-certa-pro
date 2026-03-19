import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, Wallet, CalendarCheck,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area,
} from "recharts";
import { useCronograma } from "@/contexts/CronogramaContext";
import { formatCompact, formatPercent, formatCurrency } from "@/lib/format";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function MetricCard({
  title, value, subtitle, icon: Icon, gradient, trend,
}: {
  title: string; value: string; subtitle?: string;
  icon: any; gradient: string; trend?: { value: string; positive: boolean };
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="glass-card overflow-hidden relative group hover:shadow-xl transition-shadow duration-300">
        <div className={`absolute inset-0 opacity-[0.06] ${gradient}`} />
        <CardContent className="p-6 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {title}
              </p>
              <p className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {value}
              </p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
              {trend && (
                <div className="flex items-center gap-1">
                  {trend.positive ? (
                    <ArrowUpRight className="h-3 w-3 text-chart-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-destructive" />
                  )}
                  <span className={`text-xs font-medium ${trend.positive ? 'text-chart-3' : 'text-destructive'}`}>
                    {trend.value}
                  </span>
                </div>
              )}
            </div>
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${gradient} shadow-lg`}>
              <Icon className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CurvaSChart() {
  const { getCurvaS } = useCronograma();
  const data = getCurvaS();

  const tooltipFormatter = (value: number) => formatCurrency(value);

  return (
    <motion.div variants={itemVariants}>
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Curva S — Avanço Acumulado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradBaseline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradRealizado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={tooltipFormatter}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area
                  type="monotone" dataKey="baselineAcum" name="Baseline"
                  stroke="hsl(var(--chart-1))" fill="url(#gradBaseline)"
                  strokeWidth={2} dot={false}
                />
                <Area
                  type="monotone" dataKey="previstoAcum" name="Previsto"
                  stroke="hsl(var(--chart-2))" fill="transparent"
                  strokeWidth={2} strokeDasharray="6 3" dot={false}
                />
                <Area
                  type="monotone" dataKey="projetadoAcum" name="Projetado"
                  stroke="hsl(var(--chart-5))" fill="transparent"
                  strokeWidth={2} strokeDasharray="3 3" dot={false}
                />
                <Area
                  type="monotone" dataKey="realizadoAcum" name="Realizado"
                  stroke="hsl(var(--chart-3))" fill="url(#gradRealizado)"
                  strokeWidth={2.5} dot={{ r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PeriodBarChart() {
  const { getCurvaS } = useCronograma();
  const data = getCurvaS();

  return (
    <motion.div variants={itemVariants}>
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Comparativo por Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="baseline" name="Baseline" stroke="hsl(var(--chart-1))" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="previsto" name="Previsto" stroke="hsl(var(--chart-2))" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="realizado" name="Realizado" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const { getMetrics, state } = useCronograma();
  const metrics = getMetrics();
  const lastFechado = state.periods.filter(p => p.fechado).pop();

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cronograma Financeiro — {state.projectName}
        </p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Valor Contratual"
          value={formatCompact(metrics.valorContratual)}
          icon={DollarSign}
          gradient="gradient-accent"
        />
        <MetricCard
          title="Avanço Financeiro"
          value={formatPercent(metrics.avancoFinanceiro)}
          subtitle={`Realizado: ${formatCompact(metrics.totalRealizado)}`}
          icon={TrendingUp}
          gradient="gradient-primary"
          trend={{ value: formatPercent(metrics.avancoFisico), positive: metrics.avancoFisico > 0.3 }}
        />
        <MetricCard
          title="Saldo"
          value={formatCompact(metrics.saldo)}
          icon={Wallet}
          gradient="gradient-success"
        />
        <MetricCard
          title="Último Fechamento"
          value={lastFechado?.label || "—"}
          subtitle={`Adiantamentos: ${formatCompact(metrics.totalAdiantamento)}`}
          icon={CalendarCheck}
          gradient="gradient-danger"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CurvaSChart />
        <PeriodBarChart />
      </div>
    </motion.div>
  );
}
