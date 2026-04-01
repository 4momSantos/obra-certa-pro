import { useAuth } from "@/contexts/AuthContext";
import { useUpdateBoletimStatus } from "@/hooks/useBoletim";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle, Send, ThumbsUp, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useBoletimItens } from "@/hooks/useBoletim";
import * as XLSX from "xlsx";

interface Props {
  boletim: any;
  bmName: string;
}

export function BoletimActions({ boletim, bmName }: Props) {
  const { role } = useAuth();
  const updateStatus = useUpdateBoletimStatus();
  const { data: itens } = useBoletimItens(boletim.id);
  const canAct = role === "admin" || role === "gestor";
  const status = boletim.status || "rascunho";

  const handleStatusChange = (novoStatus: string, msg: string) => {
    updateStatus.mutate(
      { boletimId: boletim.id, bmName, novoStatus },
      { onSuccess: () => toast.success(msg) }
    );
  };

  const handleExport = () => {
    if (!itens || itens.length === 0) return;
    const rows = itens.map((i: any) => ({
      iPPU: i.ippu,
      Descrição: i.descricao || "",
      "Valor Previsto": Number(i.valor_previsto) || 0,
      "Executado SCON": Number(i.valor_executado_scon) || 0,
      "Postado SIGEM": Number(i.valor_postado_sigem) || 0,
      "Medido GITEC": Number(i.valor_medido_gitec) || 0,
      "Valor Aprovado": Number(i.valor_aprovado) || 0,
      Observação: i.observacao || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, bmName);
    XLSX.writeFile(wb, `Boletim_${boletim.numero || bmName}.xlsx`);
    toast.success("Excel exportado");
  };

  return (
    <div className="flex flex-wrap gap-2">
      {status === "rascunho" && canAct && (
        <ConfirmAction
          trigger={
            <Button size="sm" className="gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" /> Finalizar
            </Button>
          }
          title="Finalizar boletim?"
          description="Após finalizar, os itens não poderão mais ser editados."
          onConfirm={() => handleStatusChange("finalizado", "Boletim finalizado")}
          loading={updateStatus.isPending}
        />
      )}
      {status === "finalizado" && canAct && (
        <ConfirmAction
          trigger={
            <Button size="sm" variant="outline" className="gap-1.5">
              <Send className="h-3.5 w-3.5" /> Marcar Enviado
            </Button>
          }
          title="Marcar como enviado?"
          description="Registra a data de envio do boletim."
          onConfirm={() => handleStatusChange("enviado", "Boletim marcado como enviado")}
          loading={updateStatus.isPending}
        />
      )}
      {status === "enviado" && canAct && (
        <ConfirmAction
          trigger={
            <Button size="sm" variant="outline" className="gap-1.5">
              <ThumbsUp className="h-3.5 w-3.5" /> Marcar Aprovado
            </Button>
          }
          title="Marcar como aprovado?"
          description="Registra a aprovação final do boletim."
          onConfirm={() => handleStatusChange("aprovado", "Boletim aprovado")}
          loading={updateStatus.isPending}
        />
      )}
      <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5">
        <FileSpreadsheet className="h-3.5 w-3.5" /> Exportar Excel
      </Button>
    </div>
  );
}

function ConfirmAction({ trigger, title, description, onConfirm, loading }: {
  trigger: React.ReactNode; title: string; description: string; onConfirm: () => void; loading: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
