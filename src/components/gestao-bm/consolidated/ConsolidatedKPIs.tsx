import { Card, CardContent } from "@/components/ui/card";
import { formatCompact } from "@/lib/format";
import { TrendingUp, TrendingDown, DollarSign, Target, BarChart3, CheckCircle2, AlertTriangle, Wallet } from "lucide-react";

interface ConsolidatedKPIsProps {
  valor: number;
  previsto: number;
  projetado: number;
  realizado: number;
}

export function ConsolidatedKPIs({ valor, previsto, projetado, realizado }: ConsolidatedKPIsProps) {
  const saldo = valor - realizado;
  const avanco = valor > 0 ? (realizado / valor) * 100 : 0;
  const aderencia = previsto > 0 ? (realizado / previsto) * 100 : 0;

  const cards = [
    {
      label: "Valor Contrato",
      value: formatCompact(valor),
      icon: DollarSign,
      color: "text-foreground",
      bg: "bg-muted/50",
    },
    {
      label: "Total Previsto",
      value: formatCompact(previsto),
      icon: Target,
      color: "text-blue-600",
      bg: "bg-blue-500/10",
    },
    {
      label: "Total Projetado",
      value: formatCompact(projetado),
      icon: BarChart3,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
    },
    {
      label: "Total Realizado",
      value: formatCompact(realizado),
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-500/10",
    },
    {
      label: "Saldo",
      value: formatCompact(saldo),
      icon: saldo > 0 ? Wallet : AlertTriangle,
      color: saldo > 0 ? "text-foreground" : "text-destructive",
      bg: saldo > 0 ? "bg-muted/50" : "bg-destructive/10",
    },
    {
      label: "% Avanço",
      value: `${avanco.toFixed(1)}%`,
      icon: avanco >= 50 ? TrendingUp : TrendingDown,
      color: avanco >= 80 ? "text-green-600" : avanco >= 50 ? "text-amber-600" : "text-destructive",
      bg: avanco >= 80 ? "bg-green-500/10" : avanco >= 50 ? "bg-amber-500/10" : "bg-destructive/10",
      subtitle: `Aderência: ${aderencia.toFixed(1)}%`,
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
