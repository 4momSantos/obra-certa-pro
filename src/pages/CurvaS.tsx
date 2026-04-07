import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Pencil, Save, X, RotateCcw, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CurvaSEditTable } from "@/components/curva-s/CurvaSEditTable";

const fmt = (v: number) =>
  v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v.toFixed(0);

interface CurvaSRow {
  id: string;
  label: string;
  col_index: number;
  previsto_mensal: number;
  projetado_mensal: number;
  realizado_mensal: number;
  previsto_acum: number;
  projetado_acum: number;
  realizado_acum: number;
}

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
      return (data || []).map((d: any): CurvaSRow => ({
        id: d.id,
        label: d.label,
        col_index: Number(d.col_index),
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
  const { role, user, profile } = useAuth();
  const queryClient = useQueryClient();

  const canEdit = role === "admin" || role === "gestor";

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CurvaSRow[]>([]);
  const [saving, setSaving] = useState(false);

  const startEdit = useCallback(() => {
    if (points) {
      setDraft(points.map((p) => ({ ...p })));
      setEditing(true);
    }
  }, [points]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setDraft([]);
  }, []);

  const handleChange = useCallback((index: number, value: number) => {
    setDraft((prev) => {
      const next = prev.map((p) => ({ ...p }));
      next[index].projetado_acum = value;
      // Enforce monotonicity forward
      for (let i = index + 1; i < next.length; i++) {
        if (next[i].projetado_acum < next[i - 1].projetado_acum) {
          next[i].projetado_acum = next[i - 1].projetado_acum;
        }
      }
      // Recalc projetado_mensal
      for (let i = 0; i < next.length; i++) {
        next[i].projetado_mensal = i === 0
          ? next[i].projetado_acum
          : Math.max(0, next[i].projetado_acum - next[i - 1].projetado_acum);
      }
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    if (!points) return;
    setDraft(points.map((p) => ({
      ...p,
      projetado_acum: p.previsto_acum,
      projetado_mensal: p.previsto_mensal,
    })));
  }, [points]);

  const handleSave = useCallback(async () => {
    if (!points) return;
    const changed = draft.filter((d, i) =>
      d.projetado_acum !== points[i].projetado_acum ||
      d.projetado_mensal !== points[i].projetado_mensal
    );
    if (changed.length === 0) {
      toast.info("Nenhuma alteração detectada");
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      for (const row of changed) {
        const { error } = await supabase
          .from("curva_s")
          .update({
            projetado_acum: row.projetado_acum,
            projetado_mensal: row.projetado_mensal,
          })
          .eq("id", row.id);
        if (error) throw error;
      }

      // Audit log
      await supabase.from("audit_log").insert({
        user_id: user?.id,
        user_nome: profile?.full_name || "",
        acao: "editar_curva_s",
        entidade: "curva_s",
        referencia: `${changed.length} períodos`,
        detalhes: {
          alterados: changed.map((c) => ({
            label: c.label,
            projetado_acum: c.projetado_acum,
            projetado_mensal: c.projetado_mensal,
          })),
        },
      } as any);

      await queryClient.invalidateQueries({ queryKey: ["curva-s-data"] });
      toast.success(`${changed.length} período(s) atualizado(s)`);
      setEditing(false);
      setDraft([]);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "Tente novamente"));
    } finally {
      setSaving(false);
    }
  }, [draft, points, user, profile, queryClient]);

  const displayData = editing ? draft : points;
  const hasData = displayData && displayData.length > 0;

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
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Curva S
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualização acumulada e mensal — {displayData.length} períodos
          </p>
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Resetar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Resetar Projetado?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Todos os valores de "Projetado" serão igualados ao "Previsto". Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>Confirmar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Salvar
              </Button>
            </>
          ) : (
            canEdit && (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="h-4 w-4 mr-1" />
                Editar Curva
              </Button>
            )
          )}
        </div>
      </div>

      <div className={editing ? "grid grid-cols-1 lg:grid-cols-3 gap-4" : ""}>
        {/* Charts column */}
        <div className={editing ? "lg:col-span-2 space-y-4" : "space-y-4"}>
          {/* Acumulado */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Acumulado (R$) {editing && <span className="text-xs font-normal text-muted-foreground ml-2">— modo edição</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={displayData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip formatter={(v: number) => `R$ ${fmt(v)}`} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="previsto_acum" name="Previsto" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line
                    type="monotone"
                    dataKey="projetado_acum"
                    name="Projetado"
                    stroke={editing ? "hsl(var(--destructive))" : "hsl(210 80% 60%)"}
                    strokeWidth={editing ? 3 : 2}
                    strokeDasharray={editing ? undefined : "5 5"}
                    dot={editing ? { r: 5, fill: "hsl(var(--destructive))", stroke: "hsl(var(--background))", strokeWidth: 2 } : false}
                  />
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
                <BarChart data={displayData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip formatter={(v: number) => `R$ ${fmt(v)}`} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="previsto_mensal" name="Previsto" fill="hsl(var(--primary))" opacity={0.7} />
                  <Bar dataKey="projetado_mensal" name="Projetado" fill={editing ? "hsl(var(--destructive))" : "hsl(210 80% 60%)"} opacity={editing ? 0.8 : 0.5} />
                  <Bar dataKey="realizado_mensal" name="Realizado" fill="hsl(142 76% 46%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Edit sidebar */}
        {editing && (
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Editar Projetado (Acumulado)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <CurvaSEditTable data={draft} onChange={handleChange} />
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
  );
}
