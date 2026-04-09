import { Card, CardContent } from "@/components/ui/card";
import { formatCompact } from "@/lib/format";
import { TrendingUp, TrendingDown, DollarSign, Target, BarChart3, CheckCircle2, AlertTriangle, Wallet } from "lucide-react";

interface ConsolidatedKPIsProps {
  valor: number;
  previsto: number;
  projetado: number;
  realizado: number;
  gitec?: number;
}

export function ConsolidatedKPIs({ valor, previsto, projetado, realizado, gitec }: ConsolidatedKPIsProps) {
  const saldo = valor - realizado;
  const avanco = valor > 0 ? (realizado / valor) * 100 : 0;
  const aderencia = previsto > 0 ? (realizado / previsto) * 100 : 0;

  const cards = [
    {
      label: "Valor Contrato",
      value: valor > 0 ? formatCompact(valor) : "—",
      icon: DollarSign,
      color: "text-foreground",
      bg: "bg-muted/50",
    },
    {
      label: "Total Previsto",
      value: previsto > 0 ? formatCompact(previsto) : "—",
      subtitle: previsto === 0 ? "Sem dados de cronograma" : undefined,
      icon: Target,
      color: "text-blue-600",
      bg: "bg-blue-500/10",
    },
    {
      label: "Total Realizado",
      value: realizado > 0 ? formatCompact(realizado) : "—",
      subtitle: realizado === 0 ? "Sem dados de cronograma" : undefined,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-500/10",
    },
    {
      label: "GITEC Aprovado",
      value: (gitec ?? 0) > 0 ? formatCompact(gitec!) : "—",
      icon: BarChart3,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Saldo",
      value: valor > 0 ? formatCompact(saldo) : "—",
      icon: saldo > 0 ? Wallet : AlertTriangle,
      color: saldo > 0 ? "text-foreground" : "text-destructive",
      bg: saldo > 0 ? "bg-muted/50" : "bg-destructive/10",
    },
    {
      label: "% Avanço",
      value: valor > 0 && realizado > 0 ? `${avanco.toFixed(1)}%` : "—",
      icon: avanco >= 50 ? TrendingUp : TrendingDown,
      color: avanco >= 80 ? "text-green-600" : avanco >= 50 ? "text-amber-600" : "text-destructive",
      bg: avanco >= 80 ? "bg-green-500/10" : avanco >= 50 ? "bg-amber-500/10" : "bg-destructive/10",
      subtitle: aderencia > 0 ? `Aderência: ${aderencia.toFixed(1)}%` : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {cards.map((c) => (
        <Card key={c.label} className={`${c.bg} border-none shadow-sm`}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <c.icon className={`h-4 w-4 ${c.color}`} />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{c.label}</span>
            </div>
            <p className={`text-sm md:text-base font-bold ${c.color}`}>{c.value}</p>
            {c.subtitle && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{c.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
