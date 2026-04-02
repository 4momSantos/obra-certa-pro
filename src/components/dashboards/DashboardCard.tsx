import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MoreHorizontal, ExternalLink, Maximize, Copy, Pencil, Trash2,
  Lock, Edit3, LayoutDashboard,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { DashboardRow } from "@/hooks/useDashboards";

interface Props {
  dashboard: DashboardRow;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DashboardCard({ dashboard, onRename, onDuplicate, onDelete }: Props) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(dashboard.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOwner = dashboard.permission === "owner";
  const canEdit = isOwner || dashboard.permission === "edit";
  const relativeTime = formatDistanceToNow(new Date(dashboard.updated_at), { addSuffix: true, locale: ptBR });

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== dashboard.name) {
      onRename(dashboard.id, trimmed);
    } else {
      setEditName(dashboard.name);
    }
    setEditing(false);
  };

  return (
    <>
      <Card
        className="group relative cursor-pointer border border-border/50 bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200"
        onClick={() => navigate(`/dashboards/${dashboard.id}`)}
      >
        <CardContent className="p-5 space-y-3">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {editing ? (
                <input
                  ref={inputRef}
                  className="w-full bg-transparent border-b border-primary text-foreground font-semibold text-base outline-none"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") { setEditName(dashboard.name); setEditing(false); }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <h3
                  className="font-semibold text-foreground truncate text-base"
                  onDoubleClick={(e) => {
                    if (isOwner) { e.stopPropagation(); setEditing(true); }
                  }}
                >
                  {dashboard.name}
                </h3>
              )}
              {dashboard.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{dashboard.description}</p>
              )}
            </div>

            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => navigate(`/dashboards/${dashboard.id}`)}>
                  <ExternalLink className="h-3.5 w-3.5 mr-2" /> Abrir
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/dashboards/${dashboard.id}/view`)}>
                  <Maximize className="h-3.5 w-3.5 mr-2" /> Tela Cheia
                </DropdownMenuItem>
                {(isOwner || canEdit) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDuplicate(dashboard.id)}>
                      <Copy className="h-3.5 w-3.5 mr-2" />
                      {isOwner ? "Duplicar" : "Duplicar para Mim"}
                    </DropdownMenuItem>
                  </>
                )}
                {isOwner && (
                  <>
                    <DropdownMenuItem onClick={() => setEditing(true)}>
                      <Pencil className="h-3.5 w-3.5 mr-2" /> Renomear
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            {!isOwner && (
              <span className="flex items-center gap-1">
                {dashboard.permission === "edit" ? (
                  <><Edit3 className="h-3 w-3" /> Pode editar</>
                ) : (
                  <><Lock className="h-3 w-3" /> Somente leitura</>
                )}
              </span>
            )}
            {!isOwner && dashboard.owner_name && (
              <span>• {dashboard.owner_name}</span>
            )}
            {isOwner && <span>Você</span>}
            <span>• {relativeTime}</span>
          </div>

          {/* Footer badges */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs gap-1">
              <LayoutDashboard className="h-3 w-3" />
              {dashboard.widget_count ?? 0} widgets
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir dashboard</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? O dashboard "{dashboard.name}" e todos os seus widgets serão excluídos permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDelete(dashboard.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
