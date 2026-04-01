import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useUpdatePrevisaoStatus } from "@/hooks/usePrevisao";
import { toast } from "sonner";
import { formatCompact } from "@/lib/format";

interface Props {
  open: boolean;
  onClose: () => void;
  item: { id: string; ippu: string; descricao?: string; valor_previsto: number };
  bmName: string;
  type: "postergar" | "cancelar" | "reativar";
}

const CONFIG = {
  postergar: {
    title: "Postergar Item",
    newStatus: "postergado",
    placeholder: "Ex: Relatório enviado pela qualidade em período posterior à medição",
    warning: "Este item será migrado automaticamente para o próximo BM quando este BM for fechado.",
    buttonLabel: "Postergar Item",
    buttonClass: "bg-amber-600 hover:bg-amber-700 text-white",
    successMsg: (ippu: string) => `${ippu} postergado — motivo registrado`,
  },
  cancelar: {
    title: "Cancelar Item",
    newStatus: "cancelado",
    placeholder: "Ex: Componente removido do escopo por decisão da Petrobras",
    warning: "Itens cancelados NÃO são migrados para o próximo BM.",
    buttonLabel: "Cancelar Item",
    buttonClass: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
    successMsg: (ippu: string) => `${ippu} cancelado — motivo registrado`,
  },
  reativar: {
    title: "Reativar Item",
    newStatus: "previsto",
    placeholder: "",
    warning: "",
    buttonLabel: "Sim, reativar",
    buttonClass: "",
    successMsg: (ippu: string) => `${ippu} reativado como previsto`,
  },
};

export function StatusChangeDialog({ open, onClose, item, bmName, type }: Props) {
  const [justificativa, setJustificativa] = useState("");
  const mutation = useUpdatePrevisaoStatus();
  const cfg = CONFIG[type];

  const handleClose = () => {
    setJustificativa("");
    onClose();
  };

  const handleConfirm = () => {
    mutation.mutate(
      {
        id: item.id,
        ippu: item.ippu,
        bmName,
        novoStatus: cfg.newStatus,
        justificativa: type === "reativar" ? "Reativado" : justificativa,
      },
      {
        onSuccess: () => {
          toast.success(cfg.successMsg(item.ippu));
          handleClose();
        },
        onError: (err: any) => toast.error("Erro: " + (err.message || "desconhecido")),
      }
    );
  };

  // Reativar uses simple AlertDialog
  if (type === "reativar") {
    return (
      <AlertDialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reativar Item</AlertDialogTitle>
            <AlertDialogDescription>
              Reativar <span className="font-mono font-bold">{item.ippu}</span> como item previsto?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Sim, reativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Postergar / Cancelar use Dialog with textarea
  const isValid = justificativa.trim().length >= 10;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{cfg.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-0">
              {item.ippu}
            </Badge>
            <span className="text-xs text-muted-foreground truncate flex-1">{item.descricao || ""}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Valor: <span className="font-medium text-foreground">{formatCompact(item.valor_previsto)}</span>
          </p>

          <div>
            <label className="text-sm font-medium">
              {type === "postergar" ? "Motivo do postergamento" : "Motivo do cancelamento"} *
            </label>
            <Textarea
              value={justificativa}
              onChange={e => setJustificativa(e.target.value)}
              placeholder={cfg.placeholder}
              className="mt-1.5 min-h-[80px] text-sm"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              {justificativa.trim().length < 10
                ? `${justificativa.trim().length}/10 mín.`
                : `${justificativa.trim().length} caracteres`
              }
            </p>
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">{cfg.warning}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || mutation.isPending}
            className={cfg.buttonClass}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {cfg.buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
