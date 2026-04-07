import { useState } from "react";
import { useTarefas, type SplanTarefa } from "@/hooks/useTarefas";
import { NovaTarefaDialog } from "./NovaTarefaDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ClipboardList, AlertTriangle, CalendarDays } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";

const TIPO_COLORS: Record<string, string> = {
  checklist: "bg-primary/10 text-primary border-primary/20",
  acao: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  cobranca: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  risco: "bg-destructive/10 text-destructive border-destructive/20",
};

const TIPO_LABELS: Record<string, string> = {
  checklist: "Checklist",
  acao: "Ação",
  cobranca: "Cobrança",
  risco: "Risco",
};

interface Props {
  bmName: string;
}

export function TarefasTab({ bmName }: Props) {
  const {
    tarefas,
    isLoading,
    total,
    concluidas,
    criarTarefa,
    concluirTarefa,
    reabrirTarefa,
  } = useTarefas(bmName);

  const [dialogOpen, setDialogOpen] = useState(false);
  const progress = total > 0 ? (concluidas / total) * 100 : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Bar */}
      <div className="flex items-center justify-between gap-4 rounded-lg border p-3 bg-muted/30">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ClipboardList className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {concluidas}/{total} concluídas
            </p>
            <Progress value={progress} className="h-2 mt-1" />
          </div>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova Tarefa
        </Button>
      </div>

      {/* Empty state */}
      {tarefas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma tarefa para este BM</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Criar primeira tarefa
          </Button>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2">
        {tarefas.map((t) => (
          <TarefaRow
            key={t.id}
            tarefa={t}
            onToggle={() => {
              if (t.status === "concluida") {
                reabrirTarefa.mutate(t.id);
              } else {
                concluirTarefa.mutate(t.id);
              }
            }}
          />
        ))}
      </div>

      <NovaTarefaDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        bmName={bmName}
        criarTarefa={criarTarefa}
      />
    </div>
  );
}

function TarefaRow({ tarefa, onToggle }: { tarefa: SplanTarefa; onToggle: () => void }) {
  const isConcluida = tarefa.status === "concluida";
  const prazoDate = tarefa.prazo ? parseISO(tarefa.prazo) : null;
  const isOverdue = prazoDate && !isConcluida && isPast(prazoDate);

  return (
    <div
      className={`flex items-start gap-3 rounded-md border p-3 transition-colors ${
        isConcluida ? "bg-muted/20 opacity-70" : "bg-card"
      }`}
    >
      <Checkbox
        checked={isConcluida}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0 space-y-1">
        <p className={`text-sm font-medium leading-snug ${isConcluida ? "line-through text-muted-foreground" : ""}`}>
          {tarefa.titulo}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${TIPO_COLORS[tarefa.tipo] || ""}`}
          >
            {TIPO_LABELS[tarefa.tipo] || tarefa.tipo}
          </Badge>
          {tarefa.prioridade === "alta" && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive border-destructive/20">
              <AlertTriangle className="h-3 w-3 mr-0.5" /> Alta
            </Badge>
          )}
          {tarefa.responsavel_nome && (
            <span className="text-[11px] text-muted-foreground">
              {tarefa.responsavel_nome}
            </span>
          )}
          {prazoDate && (
            <span
              className={`text-[11px] flex items-center gap-0.5 ${
                isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
              }`}
            >
              <CalendarDays className="h-3 w-3" />
              {format(prazoDate, "dd/MM")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
