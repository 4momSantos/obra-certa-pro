import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { UseMutationResult } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onClose: () => void;
  bmName: string;
  criarTarefa: UseMutationResult<void, any, any>;
}

export function NovaTarefaDialog({ open, onClose, bmName, criarTarefa }: Props) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("checklist");
  const [prioridade, setPrioridade] = useState("normal");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState<Date | undefined>();

  const handleSubmit = () => {
    criarTarefa.mutate(
      {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        tipo,
        prioridade,
        prazo: prazo ? format(prazo, "yyyy-MM-dd") : undefined,
      },
      {
        onSuccess: () => {
          setTitulo("");
          setDescricao("");
          setTipo("checklist");
          setPrioridade("normal");
          setPrazo(undefined);
          onClose();
        },
      }
    );
  };

  const isValid = titulo.trim().length >= 3;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Tarefa — {bmName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Título *</label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Verificar documentação fiscal"
              autoFocus
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checklist">Checklist</SelectItem>
                  <SelectItem value="acao">Ação</SelectItem>
                  <SelectItem value="cobranca">Cobrança</SelectItem>
                  <SelectItem value="risco">Risco</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Prioridade</label>
              <Select value={prioridade} onValueChange={setPrioridade}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Prazo</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !prazo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {prazo ? format(prazo, "dd/MM/yyyy") : "Selecionar prazo"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={prazo}
                  onSelect={setPrazo}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-sm font-medium">Descrição</label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes opcionais..."
              className="mt-1 min-h-[60px] text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!isValid || criarTarefa.isPending}>
            {criarTarefa.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Criar Tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
