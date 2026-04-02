import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2 } from "lucide-react";
import { formatCompact } from "@/lib/format";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  bmName: string;
}

export function FecharBMDialog({ open, onClose, bmName }: Props) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [observacoes, setObservacoes] = useState("");
  const [confirmado, setConfirmado] = useState(false);

  const { data: previsoes } = useQuery({
    queryKey: ["previsao-fechar", bmName],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("previsao_medicao")
        .select("*")
        .eq("bm_name", bmName);
      if (error) throw error;
      return data || [];
    },
  });

  const confirmados = (previsoes || []).filter((p: any) => p.status === "confirmado" || p.status === "previsto");
  const postergados = (previsoes || []).filter((p: any) => p.status === "postergado");
  const cancelados = (previsoes || []).filter((p: any) => p.status === "cancelado");
  const valorConfirmado = confirmados.reduce((s: number, p: any) => s + (Number(p.valor_previsto) || 0), 0);
  const valorPostergado = postergados.reduce((s: number, p: any) => s + (Number(p.valor_previsto) || 0), 0);
  const valorCancelado = cancelados.reduce((s: number, p: any) => s + (Number(p.valor_previsto) || 0), 0);

  const nextBMNumber = parseInt(bmName.replace("BM-", "")) + 1;
  const nextBM = "BM-" + String(nextBMNumber).padStart(2, "0");

  const isValid = observacoes.trim().length >= 10 && confirmado;

  const fecharMutation = useMutation({
    mutationFn: async () => {
      // 1. Fechar BM
      const { error: errBm } = await supabase
        .from("bm_periodos")
        .update({
          status: "fechado",
          data_fechamento: new Date().toISOString(),
          fechado_por: user?.id,
          valor_medido: valorConfirmado,
          observacoes: observacoes.trim(),
        } as any)
        .eq("bm_name", bmName);
      if (errBm) throw errBm;

      // 2. Mark confirmados/previstos as medido
      for (const p of confirmados) {
        await supabase
          .from("previsao_medicao")
          .update({ status: "medido" } as any)
          .eq("id", (p as any).id);
      }

      // 3. Migrate postergados
      for (const p of postergados) {
        const pm = p as any;
        const { data: newPrev, error: errNew } = await supabase
          .from("previsao_medicao")
          .insert({
            bm_name: nextBM,
            ippu: pm.ippu,
            responsavel_id: pm.responsavel_id,
            responsavel_nome: pm.responsavel_nome || "",
            disciplina: pm.disciplina || "",
            status: "previsto",
            qtd_prevista: pm.qtd_prevista || 0,
            valor_previsto: pm.valor_previsto || 0,
            justificativa: `Migrado do ${bmName}: ${pm.justificativa || ""}`,
          } as any)
          .select()
          .single();
        if (errNew) throw errNew;

        await supabase.from("previsao_historico").insert({
          previsao_id: (newPrev as any).id,
          bm_name: nextBM,
          ippu: pm.ippu,
          status_anterior: "",
          status_novo: "previsto",
          justificativa: `Migrado automaticamente do ${bmName} (postergado)`,
          alterado_por: user?.id,
          alterado_por_nome: profile?.full_name || "",
        } as any);
      }

      // 4. Open next BM if futuro
      await supabase
        .from("bm_periodos")
        .update({ status: "aberto", data_abertura: new Date().toISOString() } as any)
        .eq("bm_name", nextBM)
        .eq("status", "futuro");

      // 5. Audit log
      await supabase.from("audit_log").insert({
        user_id: user?.id,
        user_nome: profile?.full_name || "",
        acao: "fechar_bm",
        entidade: "bm",
        referencia: bmName,
        detalhes: {
          valor_medido: valorConfirmado,
          itens_confirmados: confirmados.length,
          itens_postergados: postergados.length,
          postergados_migrados_para: nextBM,
          observacoes: observacoes.trim(),
        },
      } as any);
    },
    onSuccess: () => {
      toast.success(`${bmName} fechado com sucesso`);
      queryClient.invalidateQueries({ queryKey: ["bm-periodo"] });
      queryClient.invalidateQueries({ queryKey: ["bm-periodos"] });
      queryClient.invalidateQueries({ queryKey: ["previsao"] });
      queryClient.invalidateQueries({ queryKey: ["ultimo-bm"] });
      handleClose();
    },
    onError: (err: any) => toast.error("Erro ao fechar: " + (err.message || "desconhecido")),
  });

  const handleClose = () => {
    setObservacoes("");
    setConfirmado(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fechar {bmName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo */}
          <div className="rounded-md border p-3 space-y-1.5 bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resumo da medição</p>
            <div className="flex justify-between text-sm">
              <span>Itens confirmados:</span>
              <span className="font-medium tabular-nums">{confirmados.length} · {formatCompact(valorConfirmado)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Itens postergados:</span>
              <span className="font-medium tabular-nums text-amber-600">{postergados.length} · {formatCompact(valorPostergado)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Itens cancelados:</span>
              <span className="font-medium tabular-nums text-destructive">{cancelados.length} · {formatCompact(valorCancelado)}</span>
            </div>
          </div>

          {/* Postergados list */}
          {postergados.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-xs font-medium">{postergados.length} itens postergados serão migrados para {nextBM}:</p>
              </div>
              <ul className="space-y-1 pl-5 max-h-[120px] overflow-y-auto">
                {postergados.map((p: any) => (
                  <li key={p.id} className="text-xs text-muted-foreground flex gap-1">
                    <Badge variant="outline" className="font-mono text-[9px] shrink-0 h-4">{p.ippu}</Badge>
                    <span className="truncate">— "{p.justificativa || "sem justificativa"}"</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Valor total medido */}
          <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 p-2.5">
            <p className="text-sm">
              Valor total medido: <strong className="text-emerald-700 dark:text-emerald-400">{formatCompact(valorConfirmado)}</strong>
            </p>
          </div>

          {/* Observações */}
          <div>
            <label className="text-sm font-medium">Observações do fechamento *</label>
            <Textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              className="mt-1.5 min-h-[80px] text-sm"
              placeholder="Descreva o contexto do fechamento deste BM..."
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              {observacoes.trim().length < 10
                ? `${observacoes.trim().length}/10 mín.`
                : `${observacoes.trim().length} caracteres`}
            </p>
          </div>

          {/* Checkbox */}
          <div className="flex items-start gap-2">
            <Checkbox
              id="confirm-fechar"
              checked={confirmado}
              onCheckedChange={v => setConfirmado(!!v)}
              className="mt-0.5"
            />
            <label htmlFor="confirm-fechar" className="text-xs text-muted-foreground leading-snug cursor-pointer">
              Confirmo que os valores estão corretos e foram validados com a equipe de medição.
            </label>
          </div>

          {/* No previsoes warning */}
          {(previsoes || []).length === 0 && (
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Nenhuma previsão cadastrada neste BM. Deseja fechar mesmo assim?
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button
            onClick={() => fecharMutation.mutate()}
            disabled={!isValid || fecharMutation.isPending}
            variant="destructive"
          >
            {fecharMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Fechar BM Definitivamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
