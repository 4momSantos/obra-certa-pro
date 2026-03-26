import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, PlusCircle, Maximize, Share2,
  MoreHorizontal, Copy, Download, Trash2, Check, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { FilterPanel } from "@/components/editor/FilterPanel";

interface Props {
  dashboardId: string;
  name: string;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onNameChange: (name: string) => void;
  onAddWidget: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function EditorToolbar({
  dashboardId, name, saveStatus, onNameChange, onAddWidget, onDuplicate, onDelete,
}: Props) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(name);
  const [showPlaceholder, setShowPlaceholder] = useState<string | null>(null);

  useEffect(() => {
    setEditingName(name);
  }, [name]);

  const commitName = () => {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== name) {
      onNameChange(trimmed);
    } else {
      setEditingName(name);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border bg-card/80 backdrop-blur-sm px-4 py-2 sticky top-0 z-30">
        {/* Left: Back */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-muted-foreground"
          onClick={() => navigate("/dashboards")}
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        {/* Center: Name */}
        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          <input
            ref={inputRef}
            className="bg-transparent text-center font-semibold text-foreground text-base outline-none border-b border-transparent focus:border-primary transition-colors max-w-[300px] w-full"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") { commitName(); inputRef.current?.blur(); }
              if (e.key === "Escape") { setEditingName(name); inputRef.current?.blur(); }
            }}
          />
          {/* Save status indicator */}
          <span className="text-xs text-muted-foreground flex items-center gap-1 min-w-[60px]">
            {saveStatus === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /> Salvando...</>}
            {saveStatus === "saved" && <><Check className="h-3 w-3 text-green-500" /> Salvo</>}
            {saveStatus === "error" && <span className="text-destructive">Erro</span>}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Adicionar Widget" onClick={onAddWidget}>
            <PlusCircle className="h-4 w-4" />
          </Button>
          <FilterPanel />
          <Button
            variant="ghost" size="sm" className="h-8 w-8 p-0" title="Tela Cheia"
            onClick={() => navigate(`/dashboards/${dashboardId}/view`)}
          >
            <Maximize className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Compartilhar" onClick={() => setShowPlaceholder("Compartilhar")}>
            <Share2 className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-3.5 w-3.5 mr-2" /> Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Download className="h-3.5 w-3.5 mr-2" /> Exportar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Placeholder dialogs */}
      <Dialog open={!!showPlaceholder} onOpenChange={() => setShowPlaceholder(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{showPlaceholder}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4 text-center">
            Em breve — esta funcionalidade será implementada em uma próxima versão.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
