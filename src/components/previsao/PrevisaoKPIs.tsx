import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCompact } from "@/lib/format";
import { TrendingUp, TrendingDown, ClipboardList, DollarSign, ArrowRightLeft, BarChart3, CheckCircle } from "lucide-react";

interface Props {
  itensAtivos: number;
  valorAtivo: number;
  postergados: number;
  valorPostergado: number;
  projetado: number;
  preenchidos: number;
  totalElegiveis: number;
}

export function PrevisaoKPIs({ itensAtivos, valorAtivo, postergados, valorPostergado, projetado, preenchidos, totalElegiveis }: Props) {
  const diff = projetado > 0 ? ((valorAtivo - projetado) / projetado) * 100 : 0;
  const diffPositive = diff >= 0;
  const pctPreenchimento = totalElegiveis > 0 ? (preenchidos / totalElegiveis) * 100 : 0;

  const cards = [
    {
      label: "Itens Previstos",
      value: itensAtivos,
      icon: ClipboardList,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Valor Previsto",
      value: formatCompact(valorAtivo),
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Postergados",
      value: postergados,
      sub: formatCompact(valorPostergado),
      icon: ArrowRightLeft,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      label: "vs Projetado",
      value: projetado > 0 ? `${diffPositive ? "+" : ""}${diff.toFixed(1)}%` : "—",
      icon: diffPositive ? TrendingUp : TrendingDown,
      color: diffPositive ? "text-emerald-600" : "text-red-600",
      bg: diffPositive ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30",
    },
    {
      label: "Preenchimento",
      value: `${preenchidos} de ${totalElegiveis}`,
      icon: CheckCircle,
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-950/30",
      progress: pctPreenchimento,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="p-3 space-y-1">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${c.bg}`}>
              <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{c.label}</span>
          </div>
          <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
          {c.sub && <p className="text-xs text-muted-foreground">{c.sub}</p>}
          {c.progress !== undefined && (
            <Progress value={c.progress} className="h-1.5 mt-1" />
          )}
        </Card>
      ))}
    </div>
  );
}
