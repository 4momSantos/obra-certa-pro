import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

const fmt = (v: number) =>
  v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v.toFixed(0);

function useCurvaSData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["curva-s-data", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("curva_s")
        .select("*")
        .order("col_index");
      if (error) throw error;
      return (data || []).map((d: any) => ({
        label: d.label,
        previsto_mensal: Number(d.previsto_mensal) || 0,
        projetado_mensal: Number(d.projetado_mensal) || 0,
        realizado_mensal: Number(d.realizado_mensal) || 0,
        previsto_acum: Number(d.previsto_acum) || 0,
        projetado_acum: Number(d.projetado_acum) || 0,
        realizado_acum: Number(d.realizado_acum) || 0,
      }));
    },
  });
}

export default function CurvaS() {
  const { data: points, isLoading } = useCurvaSData();

  const hasData = points && points.length > 0;

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Curva S</h1>
          <p className="text-sm text-muted-foreground mt-1">Visualização acumulada e mensal do cronograma</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
            <TrendingUp className="h-16 w-16 text-muted-foreground/30" />
            <p className="text-muted-foreground">Importe o Cronograma CR-5290 para visualizar a Curva S</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Curva S
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualização acumulada e mensal — {points.length} períodos
        </p>
      </div>

      {/* Acumulado */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Acumulado (R$)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={points} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={(v: number) => `R$ ${fmt(v)}`} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="previsto_acum" name="Previsto" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="projetado_acum" name="Projetado" stroke="hsl(210 80% 60%)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="realizado_acum" name="Realizado" stroke="hsl(142 76% 46%)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Mensal */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Mensal (R$)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={points} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={(v: number) => `R$ ${fmt(v)}`} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="previsto_mensal" name="Previsto" fill="hsl(var(--primary))" opacity={0.7} />
              <Bar dataKey="projetado_mensal" name="Projetado" fill="hsl(210 80% 60%)" opacity={0.5} />
              <Bar dataKey="realizado_mensal" name="Realizado" fill="hsl(142 76% 46%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
