import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, PlusCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { WidgetRenderer } from "@/components/editor/WidgetRenderer";
import { useDashboard, useDeleteWidget } from "@/hooks/useDashboard";
import { useUpdateDashboard, useDeleteDashboard, useDuplicateDashboard } from "@/hooks/useDashboards";
import { EditorFilterProvider, type EditorFilterState } from "@/contexts/EditorFilterContext";

type SaveStatus = "idle" | "saving" | "saved" | "error";

function DashboardEditorInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: dashboard, isLoading, isError } = useDashboard(id);
  const updateMut = useUpdateDashboard();
  const deleteDashMut = useDeleteDashboard();
  const duplicateMut = useDuplicateDashboard();
  const deleteWidgetMut = useDeleteWidget();

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showDeleteDash, setShowDeleteDash] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const autoSave = useCallback(
    (updates: Record<string, unknown>) => {
      if (!id) return;
      clearTimeout(debounceRef.current);
      setSaveStatus("saving");

      debounceRef.current = setTimeout(() => {
        updateMut.mutate(
          { id, updates },
          {
            onSuccess: () => {
              setSaveStatus("saved");
              clearTimeout(savedTimerRef.current);
              savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
            },
            onError: () => {
              setSaveStatus("error");
              toast.error("Erro ao salvar. Tentando novamente...");
            },
          }
        );
      }, 2000);
    },
    [id, updateMut]
  );

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      clearTimeout(savedTimerRef.current);
    };
  }, []);

  const handleNameChange = useCallback(
    (name: string) => autoSave({ name }),
    [autoSave]
  );

  const handleFiltersChange = useCallback(
    (filters: EditorFilterState) => autoSave({ filters }),
    [autoSave]
  );

  const handleDeleteWidget = useCallback(
    (widgetId: string) => {
      if (!id) return;
      deleteWidgetMut.mutate({ id: widgetId, dashboardId: id });
    },
    [id, deleteWidgetMut]
  );

  const handleDeleteDashboard = useCallback(() => {
    if (!id) return;
    deleteDashMut.mutate(id, {
      onSuccess: () => navigate("/dashboards"),
    });
  }, [id, deleteDashMut, navigate]);

  const handleDuplicate = useCallback(() => {
    if (!id) return;
    duplicateMut.mutate(id, {
      onSuccess: (data) => navigate(`/dashboards/${data.id}`),
    });
  }, [id, duplicateMut, navigate]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <LayoutDashboard className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Dashboard não encontrado</p>
        <Button variant="outline" onClick={() => navigate("/dashboards")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const widgets = dashboard.widgets;
  const savedFilters = dashboard.filters as Partial<EditorFilterState> | undefined;

  return (
    <EditorFilterProvider initialFilters={savedFilters} onFiltersChange={handleFiltersChange}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col min-h-[calc(100vh-64px)]"
      >
        <EditorToolbar
          dashboardId={dashboard.id}
          name={dashboard.name}
          saveStatus={saveStatus}
          onNameChange={handleNameChange}
          onAddWidget={() => setShowAddWidget(true)}
          onDuplicate={handleDuplicate}
          onDelete={() => setShowDeleteDash(true)}
        />

        <div className="flex-1 p-4">
          {widgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <LayoutDashboard className="h-16 w-16 text-muted-foreground/30" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Dashboard vazio</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Adicione seu primeiro widget para começar
                </p>
              </div>
              <Button className="gap-1.5" onClick={() => setShowAddWidget(true)}>
                <PlusCircle className="h-4 w-4" /> Adicionar Widget
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  className={
                    widget.position.w >= 8
                      ? "lg:col-span-3 md:col-span-2"
                      : widget.position.w >= 6
                      ? "lg:col-span-2 md:col-span-2"
                      : ""
                  }
                >
                  <WidgetRenderer widget={widget} onDelete={handleDeleteWidget} />
                </div>
              ))}
            </div>
          )}
        </div>

        <AlertDialog open={showDeleteDash} onOpenChange={setShowDeleteDash}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir dashboard</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza? O dashboard "{dashboard.name}" e todos os seus widgets serão excluídos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDeleteDashboard}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={showAddWidget} onOpenChange={setShowAddWidget}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Adicionar Widget</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-4 text-center">
              Em breve — o Visual Builder será implementado na próxima versão.
            </p>
          </DialogContent>
        </Dialog>
      </motion.div>
    </EditorFilterProvider>
  );
}

export default function DashboardEditor() {
  return <DashboardEditorInner />;
}
