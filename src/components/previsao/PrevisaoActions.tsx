import { useState } from "react";
import { MoreHorizontal, CheckCircle, Clock, XCircle, RotateCcw, Pencil } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { StatusChangeDialog } from "./StatusChangeDialog";
import { EditPrevisaoDialog } from "./EditPrevisaoDialog";
import { useUpdatePrevisaoStatus, useEditPrevisao } from "@/hooks/usePrevisao";
import { toast } from "sonner";

interface PrevisaoRow {
  id: string;
  ippu: string;
  status: string;
  descricao?: string;
  valor_previsto: number;
  qtd_prevista: number;
  justificativa: string;
}

interface Props {
  item: PrevisaoRow;
  bmName: string;
  readonly: boolean;
}

const ACTIONS_BY_STATUS: Record<string, { key: string; label: string; icon: any; color: string; newStatus?: string }[]> = {
  previsto: [
    { key: "confirmar", label: "Confirmar", icon: CheckCircle, color: "text-green-600", newStatus: "confirmado" },
    { key: "postergar", label: "Postergar", icon: Clock, color: "text-amber-600" },
    { key: "cancelar", label: "Cancelar", icon: XCircle, color: "text-red-600" },
    { key: "editar", label: "Editar", icon: Pencil, color: "text-foreground" },
  ],
  confirmado: [
    { key: "postergar", label: "Postergar", icon: Clock, color: "text-amber-600" },
    { key: "cancelar", label: "Cancelar", icon: XCircle, color: "text-red-600" },
    { key: "editar", label: "Editar", icon: Pencil, color: "text-foreground" },
  ],
  postergado: [
    { key: "reativar", label: "Reativar", icon: RotateCcw, color: "text-blue-600", newStatus: "previsto" },
    { key: "cancelar", label: "Cancelar", icon: XCircle, color: "text-red-600" },
  ],
  cancelado: [
    { key: "reativar", label: "Reativar", icon: RotateCcw, color: "text-blue-600", newStatus: "previsto" },
  ],
  medido: [],
};

export function PrevisaoActions({ item, bmName, readonly }: Props) {
  const [dialog, setDialog] = useState<"postergar" | "cancelar" | "reativar" | "editar" | null>(null);
  const updateStatus = useUpdatePrevisaoStatus();
  const editMutation = useEditPrevisao();

  const actions = ACTIONS_BY_STATUS[item.status] || [];
  if (readonly || actions.length === 0) return null;

  const handleAction = (key: string, newStatus?: string) => {
    if (key === "confirmar" && newStatus) {
      updateStatus.mutate(
        { id: item.id, ippu: item.ippu, bmName, novoStatus: newStatus, justificativa: "" },
        { onSuccess: () => toast.success(`${item.ippu} confirmado para medição`) }
      );
    } else if (key === "postergar" || key === "cancelar" || key === "reativar" || key === "editar") {
      setDialog(key);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {actions.map(a => (
            <DropdownMenuItem
              key={a.key}
              onClick={() => handleAction(a.key, a.newStatus)}
              className={`gap-2 text-xs ${a.color}`}
              disabled={updateStatus.isPending}
            >
              <a.icon className="h-3.5 w-3.5" />
              {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <StatusChangeDialog
        open={dialog === "postergar"}
        onClose={() => setDialog(null)}
        item={item}
        bmName={bmName}
        type="postergar"
      />
      <StatusChangeDialog
        open={dialog === "cancelar"}
        onClose={() => setDialog(null)}
        item={item}
        bmName={bmName}
        type="cancelar"
      />
      <StatusChangeDialog
        open={dialog === "reativar"}
        onClose={() => setDialog(null)}
        item={item}
        bmName={bmName}
        type="reativar"
      />
      <EditPrevisaoDialog
        open={dialog === "editar"}
        onClose={() => setDialog(null)}
        item={item}
        bmName={bmName}
      />
    </>
  );
}
