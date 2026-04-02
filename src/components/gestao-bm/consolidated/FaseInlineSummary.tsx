import { Badge } from "@/components/ui/badge";
import { formatCompact } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

interface SubfaseInfo {
  nome: string;
  previsto: number;
  projetado: number;
  realizado: number;
}

interface FaseInlineSummaryProps {
  previsto: number;
  projetado: number;
  realizado: number;
  subfases: SubfaseInfo[];
}

export function FaseInlineSummary({ previsto, projetado, realizado, subfases }: FaseInlineSummaryProps) {
  const barData = subfases
    .sort((a, b) => b.previsto - a.previsto)
    .slice(0, 8)
    .map((sf) => ({
      name: sf.nome.length > 15 ? sf.nome.slice(0, 13) + "…" : sf.nome,
      Previsto: sf.previsto,
      Realizado: sf.realizado,
    }));

  return (
    <div className="p-3 bg-muted/30 flex flex-wrap gap-4 items-start">
      {/* Mini KPIs */}
      <div className="flex gap-3">
        <Badge variant="secondary" className="text-[10px] gap-1">
          Prev: <span className="font-bold text-blue-600">{formatCompact(previsto)}</span>
        </Badge>
        <Badge variant="secondary" className="text-[10px] gap-1">
          Proj: <span className="font-bold text-amber-600">{formatCompact(projetado)}</span>
        </Badge>
        <Badge variant="secondary" className="text-[10px] gap-1">
          Real: <span className="font-bold text-green-600">{formatCompact(realizado)}</span>
        </Badge>
      </div>

      {/* Mini bar chart */}
      {barData.length > 0 && (
        <div className="flex-1 min-w-[250px] max-w-[500px]">
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={barData} layout="vertical" margin={{ left: 5, right: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis type="number" tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 8 }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 8 }} />
              <Tooltip formatter={(v: number) => formatCompact(v)} contentStyle={{ fontSize: 10 }} />
              <Bar dataKey="Previsto" fill="hsl(var(--chart-1))" barSize={5} radius={[0, 2, 2, 0]} />
              <Bar dataKey="Realizado" fill="hsl(var(--chart-3))" barSize={5} radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
