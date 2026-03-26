import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ResponsiveGridLayout, useContainerWidth, verticalCompactor } from "react-grid-layout";
import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout";
import { LayoutDashboard, PlusCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { WidgetRenderer } from "@/components/editor/WidgetRenderer";
import { VisualBuilder, type VisualBuilderResult } from "@/components/editor/VisualBuilder";
import { ShareDialog } from "@/components/editor/ShareDialog";
import { useDashboard, useDeleteWidget, useBatchUpdateWidgetPositions, useCreateWidget, useUpdateWidget } from "@/hooks/useDashboard";
import { useUpdateDashboard, useDeleteDashboard, useDuplicateDashboard } from "@/hooks/useDashboards";
import { EditorFilterProvider, type EditorFilterState } from "@/contexts/EditorFilterContext";
import { useAuth } from "@/contexts/AuthContext";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

type SaveStatus = "idle" | "saving" | "saved" | "error";

function DashboardEditorInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: dashboard, isLoading, isError } = useDashboard(id);
  const updateMut = useUpdateDashboard();
  const deleteDashMut = useDeleteDashboard();
  const duplicateMut = useDuplicateDashboard();
  const deleteWidgetMut = useDeleteWidget();
  const batchPositionsMut = useBatchUpdateWidgetPositions();
  const createWidgetMut = useCreateWidget();
  const updateWidgetMut = useUpdateWidget();

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showDeleteDash, setShowDeleteDash] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [editingWidget, setEditingWidget] = useState<{ id: string; type: string; title: string; config: Record<string, unknown> } | null>(null);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const widgetAreaRef = useRef<HTMLDivElement>(null);

  // Determine permission
  const permission = useMemo((): "owner" | "view" | "edit" => {
    if (!dashboard || !user) return "view";
    if (dashboard.owner_id === user.id) return "owner";
    return "view";
  }, [dashboard, user]);
  const isOwner = permission === "owner";
  const canEdit = isOwner || permission === "edit";
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const positionDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  const { width, mounted, containerRef } = useContainerWidth();

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
      clearTimeout(positionDebounceRef.current);
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

  const handleAddWidget = useCallback((result: VisualBuilderResult) => {
    if (!id) return;
    createWidgetMut.mutate(
      {
        dashboard_id: id,
        type: result.type,
        title: result.title,
        config: result.config,
        position: { x: 0, y: 100, w: result.type === "kpi" ? 3 : result.type === "table" ? 12 : 4, h: result.type === "table" ? 5 : 3 },
      },
      { onSuccess: () => setShowAddWidget(false) }
    );
  }, [id, createWidgetMut]);

  const handleEditWidget = useCallback((result: VisualBuilderResult) => {
    if (!id || !editingWidget) return;
    updateWidgetMut.mutate(
      { id: editingWidget.id, dashboardId: id, updates: { type: result.type, title: result.title, config: result.config } },
      { onSuccess: () => setEditingWidget(null) }
    );
  }, [id, editingWidget, updateWidgetMut]);

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

  // Build layouts from widget positions
  const widgets = dashboard?.widgets ?? [];

  const layouts = useMemo<ResponsiveLayouts>(() => {
    if (widgets.length === 0) return { lg: [], md: [], sm: [] };

    const lg: LayoutItem[] = widgets.map((w) => ({
      i: w.id,
      x: w.position.x,
      y: w.position.y,
      w: w.position.w,
      h: w.position.h,
      minW: 2,
      minH: 2,
    }));

    const md: LayoutItem[] = widgets.map((w) => ({
      i: w.id,
      x: Math.min(w.position.x, 6 - Math.min(w.position.w, 6)),
      y: w.position.y,
      w: Math.min(w.position.w, 6),
      h: w.position.h,
      minW: 2,
      minH: 2,
    }));

    const sm: LayoutItem[] = widgets.map((w, idx) => ({
      i: w.id,
      x: 0,
      y: idx * 4,
      w: 1,
      h: w.position.h,
      minH: 2,
    }));

    return { lg, md, sm };
  }, [widgets]);

  const widgetMap = useMemo(
    () => new Map(widgets.map((w) => [w.id, w])),
    [widgets]
  );

  const handleLayoutChange = useCallback((_current: Layout, allLayouts: ResponsiveLayouts) => {
    if (!isEditingLayout || !id) return;

    // Debounce position save
    clearTimeout(positionDebounceRef.current);
    setSaveStatus("saving");

    positionDebounceRef.current = setTimeout(() => {
      const lgLayout = allLayouts.lg ?? _current;
      const positions = lgLayout
        .filter((item) => widgetMap.has(item.i))
        .map((item) => ({
          id: item.i,
          position: { x: item.x, y: item.y, w: item.w, h: item.h },
        }));

      if (positions.length === 0) return;

      batchPositionsMut.mutate(
        { dashboardId: id, positions },
        {
          onSuccess: () => {
            setSaveStatus("saved");
            clearTimeout(savedTimerRef.current);
            savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
          },
          onError: () => {
            setSaveStatus("error");
            toast.error("Erro ao salvar posições.");
          },
        }
      );
    }, 1000);
  }, [isEditingLayout, id, widgetMap, batchPositionsMut]);

  const dragConfig = useMemo(() => ({
    enabled: isEditingLayout,
    handle: ".drag-handle",
  }), [isEditingLayout]);

  const resizeConfig = useMemo(() => ({
    enabled: isEditingLayout,
  }), [isEditingLayout]);

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
          isEditingLayout={isEditingLayout}
          onToggleEditLayout={() => setIsEditingLayout(!isEditingLayout)}
          onShare={() => setShowShare(true)}
          permission={permission}
          exportTargetRef={widgetAreaRef}
        />

        <div className="flex-1 p-4" ref={widgetAreaRef}>
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
            <div ref={containerRef}>
              {mounted && width > 0 && (
                <ResponsiveGridLayout
                  className="layout"
                  width={width}
                  layouts={layouts}
                  breakpoints={{ lg: 1200, md: 768, sm: 0 }}
                  cols={{ lg: 12, md: 6, sm: 1 }}
                  rowHeight={80}
                  dragConfig={dragConfig}
                  resizeConfig={resizeConfig}
                  onLayoutChange={handleLayoutChange}
                  compactor={verticalCompactor}
                  margin={[16, 16]}
                >
                  {widgets.map((widget) => (
                    <div
                      key={widget.id}
                      className={isEditingLayout ? "ring-1 ring-dashed ring-primary/40 rounded-xl" : ""}
                    >
                      {isEditingLayout && (
                        <div className="drag-handle absolute top-0 left-0 right-0 h-8 cursor-grab active:cursor-grabbing z-10 flex items-center justify-center">
                          <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
                        </div>
                      )}
                      <WidgetRenderer widget={widget} onDelete={handleDeleteWidget} onEdit={(w) => setEditingWidget({ id: w.id, type: w.type, title: w.title, config: w.config })} />
                    </div>
                  ))}
                </ResponsiveGridLayout>
              )}
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

        <VisualBuilder
          open={showAddWidget}
          onOpenChange={setShowAddWidget}
          onSubmit={handleAddWidget}
          isPending={createWidgetMut.isPending}
          widgetCount={widgets.length}
        />

        <VisualBuilder
          open={!!editingWidget}
          onOpenChange={(v) => { if (!v) setEditingWidget(null); }}
          onSubmit={handleEditWidget}
          isPending={updateWidgetMut.isPending}
          widgetCount={widgets.length}
          editConfig={editingWidget}
        />

        {isOwner && dashboard && (
          <ShareDialog
            open={showShare}
            onOpenChange={setShowShare}
            dashboardId={dashboard.id}
            dashboardName={dashboard.name}
            ownerId={dashboard.owner_id}
          />
        )}
      </motion.div>
    </EditorFilterProvider>
  );
}

export default function DashboardEditor() {
  return <DashboardEditorInner />;
}
