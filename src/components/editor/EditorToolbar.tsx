import { useRef, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, PlusCircle, Maximize, Share2, Move,
  MoreHorizontal, Copy, Download, Trash2, Check, Loader2, Lock, Eye, Edit3, Image,
} from "lucide-react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterPanel } from "@/components/editor/FilterPanel";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface Props {
  dashboardId: string;
  name: string;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onNameChange: (name: string) => void;
  onAddWidget: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isEditingLayout?: boolean;
  onToggleEditLayout?: () => void;
  onShare?: () => void;
  permission?: "owner" | "view" | "edit";
  exportTargetRef?: React.RefObject<HTMLDivElement | null>;
}

export function EditorToolbar({
  dashboardId, name, saveStatus, onNameChange, onAddWidget, onDuplicate, onDelete,
  isEditingLayout, onToggleEditLayout, onShare, permission = "owner", exportTargetRef,
}: Props) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(name);
  const [exporting, setExporting] = useState(false);

  const handleExportPNG = useCallback(async () => {
    if (!exportTargetRef?.current) return;
    setExporting(true);
    try {
      const hideEls = exportTargetRef.current.querySelectorAll("[data-export-hide]");
      hideEls.forEach((el) => (el as HTMLElement).style.display = "none");
      const dataUrl = await toPng(exportTargetRef.current, {
        backgroundColor: "hsl(220, 20%, 97%)",
        pixelRatio: 2,
        cacheBust: true,
      });
      hideEls.forEach((el) => (el as HTMLElement).style.display = "");
      const link = document.createElement("a");
      link.download = `${name || "dashboard"}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Dashboard exportado como PNG");
    } catch {
      toast.error("Falha ao exportar dashboard");
      exportTargetRef.current?.querySelectorAll("[data-export-hide]").forEach((el) => (el as HTMLElement).style.display = "");
    } finally {
      setExporting(false);
    }
  }, [exportTargetRef, name]);

  const isOwner = permission === "owner";
  const canEdit = isOwner || permission === "edit";
  const readOnly = !canEdit;

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

      {/* Center: Name + permission badge */}
      <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
        {!isOwner && (
          <Badge variant={canEdit ? "secondary" : "outline"} className="gap-1 text-[10px] shrink-0">
            {canEdit ? <><Edit3 className="h-2.5 w-2.5" /> Pode editar</> : <><Eye className="h-2.5 w-2.5" /> Somente leitura</>}
          </Badge>
        )}
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
          readOnly={readOnly}
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
        {canEdit && (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Adicionar Widget" onClick={onAddWidget}>
            <PlusCircle className="h-4 w-4" />
          </Button>
        )}
        {canEdit && onToggleEditLayout && (
          <Button
            variant={isEditingLayout ? "default" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onToggleEditLayout}
            title={isEditingLayout ? "Travar Layout" : "Editar Layout"}
          >
            {isEditingLayout ? <Lock className="h-3.5 w-3.5" /> : <Move className="h-3.5 w-3.5" />}
            {isEditingLayout ? "Travar" : "Layout"}
          </Button>
        )}
        {readOnly && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-40 cursor-not-allowed" disabled>
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Somente leitura</TooltipContent>
          </Tooltip>
        )}
        <FilterPanel />
        <Button
          variant="ghost" size="sm" className="h-8 w-8 p-0" title="Tela Cheia"
          onClick={() => navigate(`/dashboards/${dashboardId}/view`)}
        >
          <Maximize className="h-4 w-4" />
        </Button>
        {isOwner && (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Compartilhar" onClick={onShare}>
            <Share2 className="h-4 w-4" />
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-3.5 w-3.5 mr-2" /> {isOwner ? "Duplicar" : "Duplicar para Mim"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPNG} disabled={exporting}>
              {exporting ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Image className="h-3.5 w-3.5 mr-2" />}
              {exporting ? "Exportando..." : "Exportar PNG"}
            </DropdownMenuItem>
            {isOwner && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
