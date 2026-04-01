import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Lock, Unlock, Calendar, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { bmRange, diasRestantes } from "@/lib/bm-utils";
import { formatCompact } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FecharBMDialog } from "./FecharBMDialog";
import { NotesPanel } from "@/components/shared/NotesPanel";

interface Props {
  bmName: string;
}

export function BMStatusBanner({ bmName }: Props) {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [fecharOpen, setFecharOpen] = useState(false);
  const [obsExpanded, setObsExpanded] = useState(false);

  const canAct = role === "admin" || role === "gestor";
  const range = bmRange(bmName);
  const fmtDate = (d: Date) => d.toLocaleDateString("pt-BR");

  const { data: periodo } = useQuery({
    queryKey: ["bm-periodo-banner", bmName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bm_periodos")
        .select("*")
        .eq("bm_name", bmName)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: resumo } = useQuery({
    queryKey: ["previsao-resumo-banner", bmName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_previsao_por_bm" as any)
        .select("*")
        .eq("bm_name", bmName)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: totalElegiveis } = useQuery({
    queryKey: ["total-elegiveis-banner"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("ppu_items")
        .select("*", { count: "exact", head: true })
        .gt("valor_total", 0);
      if (error) throw error;
      return count || 0;
    },
  });

  const abrirMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("bm_periodos")
        .update({ status: "aberto", data_abertura: new Date().toISOString() } as any)
        .eq("bm_name", bmName);
      if (error) throw error;

      await supabase.from("audit_log").insert({
        user_id: user?.id,
        user_nome: "",
        acao: "abrir_bm",
        entidade: "bm",
        referencia: bmName,
        detalhes: {},
      } as any);
    },
    onSuccess: () => {
      toast.success(`${bmName} aberto para previsão`);
      queryClient.invalidateQueries({ queryKey: ["bm-periodo-banner", bmName] });
      queryClient.invalidateQueries({ queryKey: ["bm-periodos"] });
      queryClient.invalidateQueries({ queryKey: ["ultimo-bm"] });
      setOpenDialog(false);
    },
    onError: (err: any) => toast.error("Erro: " + (err.message || "desconhecido")),
  });

  if (!periodo) return null;

  const status = periodo.status || "futuro";
  const dias = diasRestantes(bmName);

  // ── FUTURO ──
  if (status === "futuro") {
    return (
      <>
        <div className="rounded-lg border bg-muted/40 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{bmName}</span>
              <Badge variant="outline" className="text-[10px]">FUTURO</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <Calendar className="h-3 w-3 inline mr-1" />
              Período: {fmtDate(range.start)} → {fmtDate(range.end)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Este BM ainda não foi aberto para previsão.</p>
          </div>
          {canAct && (
            <Button variant="outline" size="sm" onClick={() => setOpenDialog(true)} className="gap-1.5 shrink-0">
              <Unlock className="h-3.5 w-3.5" /> Abrir BM
            </Button>
          )}
        </div>
        <AlertDialog open={openDialog} onOpenChange={setOpenDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Abrir {bmName} para previsão?</AlertDialogTitle>
              <AlertDialogDescription>
                Ao abrir, o PCP poderá cadastrar itens de previsão de medição para este boletim.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => abrirMutation.mutate()} disabled={abrirMutation.isPending}>
                {abrirMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Abrir BM
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // ── ABERTO ──
  if (status === "aberto") {
    const itensAtivos = Number(resumo?.previstos || 0) + Number(resumo?.confirmados || 0);
    const valorAtivo = Number(resumo?.valor_ativo || 0);
    const postergados = Number(resumo?.postergados || 0);
    const totalItens = Number(resumo?.total_itens || 0);
    const preenchimento = totalElegiveis ? Math.round((totalItens / totalElegiveis) * 100) : 0;

    const diasColor = dias > 10 ? "text-emerald-600" : dias >= 5 ? "text-amber-600" : "text-destructive";

    return (
      <>
        <div className="rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50/60 dark:bg-blue-950/20 p-4 space-y-2.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm">{bmName}</span>
              <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0">ABERTO</Badge>
              <span className={cn("text-xs font-medium", diasColor)}>
                {dias} {dias === 1 ? "dia restante" : "dias restantes"}
              </span>
            </div>
            {canAct && (
              <Button variant="outline" size="sm" onClick={() => setFecharOpen(true)} className="gap-1.5 shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10">
                <Lock className="h-3.5 w-3.5" /> Fechar BM
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 inline mr-1" />
            Período: {fmtDate(range.start)} → {fmtDate(range.end)}
          </p>
          <p className="text-xs text-foreground">
            <strong>{itensAtivos}</strong> itens previstos · <strong>{formatCompact(valorAtivo)}</strong> · <strong>{postergados}</strong> postergados
          </p>
          <div className="flex items-center gap-2 max-w-sm">
            <Progress value={preenchimento} className="h-2 flex-1" />
            <span className="text-[11px] tabular-nums text-muted-foreground">{preenchimento}% preenchido</span>
          </div>
        </div>
        <NotesPanel contexto="bm" referencia={bmName} />
        <FecharBMDialog open={fecharOpen} onClose={() => setFecharOpen(false)} bmName={bmName} />
      </>
    );
  }

  // ── FECHADO / EM_ANALISE ──
  const fechadoEm = periodo.data_fechamento ? new Date(periodo.data_fechamento).toLocaleDateString("pt-BR") : "";
  const obs = periodo.observacoes || "";
  const valorMedido = Number(periodo.valor_medido || 0);
  const totalItens = Number(resumo?.total_itens || 0);

  return (
    <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-bold text-sm">{bmName}</span>
        <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">FECHADO</Badge>
        {fechadoEm && <span className="text-xs text-muted-foreground">em {fechadoEm}</span>}
      </div>
      <p className="text-xs text-muted-foreground">
        <Calendar className="h-3 w-3 inline mr-1" />
        Período: {fmtDate(range.start)} → {fmtDate(range.end)}
      </p>
      <p className="text-xs text-foreground">
        Valor medido: <strong>{formatCompact(valorMedido)}</strong> · {totalItens} itens
      </p>
      {obs && (
        <div>
          <button onClick={() => setObsExpanded(!obsExpanded)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            {obsExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Observações
          </button>
          {obsExpanded && (
            <p className="text-xs text-foreground mt-1 pl-4 border-l-2 border-emerald-300 dark:border-emerald-700">
              {obs}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
