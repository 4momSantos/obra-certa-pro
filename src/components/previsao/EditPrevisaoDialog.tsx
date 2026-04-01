import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useEditPrevisao } from "@/hooks/usePrevisao";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  item: { id: string; ippu: string; descricao?: string; qtd_prevista: number; valor_previsto: number; justificativa: string };
  bmName: string;
}

export function EditPrevisaoDialog({ open, onClose, item, bmName }: Props) {
  const [qtd, setQtd] = useState(String(item.qtd_prevista || 0));
  const [valor, setValor] = useState(String(item.valor_previsto || 0));
  const [comentario, setComentario] = useState(item.justificativa || "");
  const mutation = useEditPrevisao();

  // Reset on open
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setQtd(String(item.qtd_prevista || 0));
      setValor(String(item.valor_previsto || 0));
      setComentario(item.justificativa || "");
    } else {
      onClose();
    }
  };

  const handleSave = () => {
    mutation.mutate(
      {
        id: item.id,
        ippu: item.ippu,
        bmName,
        qtd_prevista: Number(qtd) || 0,
        valor_previsto: Number(valor) || 0,
        justificativa: comentario,
      },
      {
        onSuccess: () => {
          toast.success(`${item.ippu} atualizado`);
          onClose();
        },
        onError: (err: any) => toast.error("Erro: " + (err.message || "desconhecido")),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Editar
            <Badge variant="outline" className="font-mono text-xs">{item.ippu}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Qtd Prevista</Label>
            <Input type="number" value={qtd} onChange={e => setQtd(e.target.value)} className="h-8 text-xs mt-0.5" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Valor Previsto (R$)</Label>
            <Input type="number" value={valor} onChange={e => setValor(e.target.value)} className="h-8 text-xs mt-0.5" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Comentário / Justificativa</Label>
            <Textarea
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              className="text-xs mt-0.5 min-h-[60px] resize-none"
              placeholder="Observação sobre este item..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
