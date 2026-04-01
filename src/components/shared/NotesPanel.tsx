import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnotacoes, useAddAnotacao } from "@/hooks/useAnotacoes";
import { cn } from "@/lib/utils";

const CATEGORIAS: Record<string, { label: string; className: string }> = {
  geral:    { label: "Geral",    className: "bg-muted text-muted-foreground" },
  bloqueio: { label: "Bloqueio", className: "bg-destructive/10 text-destructive" },
  acao:     { label: "Ação",     className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  risco:    { label: "Risco",    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  decisao:  { label: "Decisão",  className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `há ${days}d`;
}

function Initials({ name }: { name: string }) {
  const initials = (name || "?")
    .split(" ")
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase();
  return (
    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
      {initials}
    </div>
  );
}

function NoteItem({ nota }: { nota: any }) {
  const cat = CATEGORIAS[nota.categoria] || CATEGORIAS.geral;
  return (
    <div className="flex gap-2 py-2">
      <Initials name={nota.autor_nome || ""} />
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium">{nota.autor_nome || "Anônimo"}</span>
          <span className="text-[10px] text-muted-foreground">{timeAgo(nota.created_at)}</span>
          <Badge className={cn("text-[9px] border-0 px-1.5 py-0", cat.className)}>{cat.label}</Badge>
        </div>
        <p className="text-xs text-foreground leading-relaxed">{nota.texto}</p>
      </div>
    </div>
  );
}

function NoteInput({ contexto, referencia }: { contexto: string; referencia: string }) {
  const [texto, setTexto] = useState("");
  const [categoria, setCategoria] = useState("geral");
  const addNote = useAddAnotacao();

  const handleSend = () => {
    if (!texto.trim()) return;
    addNote.mutate(
      { contexto, referencia, texto: texto.trim(), categoria },
      { onSuccess: () => { setTexto(""); setCategoria("geral"); } }
    );
  };

  return (
    <div className="space-y-2 pt-2 border-t">
      <Textarea
        value={texto}
        onChange={e => setTexto(e.target.value)}
        placeholder="Escreva uma anotação..."
        className="min-h-[52px] text-xs resize-none"
        onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend(); }}
      />
      <div className="flex items-center gap-2">
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="w-28 h-7 text-[10px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORIAS).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!texto.trim() || addNote.isPending}
          className="h-7 gap-1 text-xs ml-auto"
        >
          <Send className="h-3 w-3" /> Enviar
        </Button>
      </div>
    </div>
  );
}

interface NotesPanelProps {
  contexto: "previsao" | "ippu" | "bm" | "documento" | "gitec_evento" | "componente";
  referencia: string;
  compact?: boolean;
}

export function NotesPanel({ contexto, referencia, compact }: NotesPanelProps) {
  const { data: notas, isLoading } = useAnotacoes(contexto, referencia);
  const count = notas?.length || 0;

  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button className="relative inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
            <MessageSquare className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-3.5 min-w-[14px] rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-0.5">
                {count}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="end">
          <p className="text-xs font-semibold mb-2">Anotações ({count})</p>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : (
            <ScrollArea className="max-h-[280px]">
              {count === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma anotação.</p>
              ) : (
                <div className="divide-y">
                  {notas!.map((n: any) => <NoteItem key={n.id} nota={n} />)}
                </div>
              )}
            </ScrollArea>
          )}
          <NoteInput contexto={contexto} referencia={referencia} />
        </PopoverContent>
      </Popover>
    );
  }

  // Full mode
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <p className="text-sm font-semibold">Anotações ({count})</p>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : (
        <ScrollArea className="max-h-[320px]">
          {count === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma anotação ainda.</p>
          ) : (
            <div className="divide-y">
              {notas!.map((n: any) => <NoteItem key={n.id} nota={n} />)}
            </div>
          )}
        </ScrollArea>
      )}
      <NoteInput contexto={contexto} referencia={referencia} />
    </div>
  );
}
