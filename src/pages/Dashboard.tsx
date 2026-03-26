import { useState, useCallback, useMemo, useRef } from "react";
import { ResponsiveGridLayout, useContainerWidth, verticalCompactor } from "react-grid-layout";
import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout";
import { motion } from "framer-motion";
import {
  LayoutGrid, RotateCcw, Save, Lock, Unlock, Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useCronograma } from "@/contexts/CronogramaContext";
import { DashboardFilterProvider } from "@/contexts/DashboardFilterContext";
import { DashboardSlicers } from "@/components/dashboard/DashboardSlicers";
import { KPICards } from "@/components/dashboard/KPICards";
import { CurvaSWidget } from "@/components/dashboard/CurvaSWidget";
import { PeriodBarWidget } from "@/components/dashboard/PeriodBarWidget";
import { DonutWidget } from "@/components/dashboard/DonutWidget";
import { GaugeWidget } from "@/components/dashboard/GaugeWidget";
import { WaterfallWidget } from "@/components/dashboard/WaterfallWidget";
import { DataTableWidget } from "@/components/dashboard/DataTableWidget";
import { SeriesToggle } from "@/components/dashboard/SeriesToggle";
import { FieldPicker } from "@/components/dashboard/FieldPicker";
import { FormulaBar } from "@/components/dashboard/FormulaBar";
import { VisualBuilder } from "@/components/dashboard/VisualBuilder";
import { CustomWidget } from "@/components/dashboard/CustomWidget";
import { DashboardExport } from "@/components/dashboard/DashboardExport";
import { loadCustomWidgets, saveCustomWidgets, type CustomWidgetConfig } from "@/lib/custom-widgets";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const STORAGE_KEY = "dashboard-layouts";

const mkLayout = (i: string, x: number, y: number, w: number, h: number, minW?: number, minH?: number): LayoutItem => ({
  i, x, y, w, h, ...(minW != null ? { minW } : {}), ...(minH != null ? { minH } : {}),
});

const NATIVE_KEYS = ["curvaS", "periodBar", "donut", "gauge", "waterfall", "table"];

const defaultNativeLayouts = {
  lg: [
    mkLayout("curvaS", 0, 0, 6, 8, 4, 6),
    mkLayout("periodBar", 6, 0, 6, 8, 4, 6),
    mkLayout("donut", 0, 8, 4, 8, 3, 6),
    mkLayout("gauge", 4, 8, 4, 8, 3, 6),
    mkLayout("waterfall", 8, 8, 4, 8, 4, 6),
    mkLayout("table", 0, 16, 12, 9, 6, 6),
  ],
  md: [
    mkLayout("curvaS", 0, 0, 6, 8, 4, 6),
    mkLayout("periodBar", 6, 0, 6, 8, 4, 6),
    mkLayout("donut", 0, 8, 4, 8, 3, 6),
    mkLayout("gauge", 4, 8, 4, 8, 3, 6),
    mkLayout("waterfall", 8, 8, 4, 8, 4, 6),
    mkLayout("table", 0, 16, 12, 9, 6, 6),
  ],
  sm: [
    mkLayout("curvaS", 0, 0, 6, 7),
    mkLayout("periodBar", 0, 7, 6, 7),
    mkLayout("donut", 0, 14, 6, 7),
    mkLayout("gauge", 0, 21, 6, 7),
    mkLayout("waterfall", 0, 28, 6, 7),
    mkLayout("table", 0, 35, 6, 9),
  ],
};

function loadLayouts(): ResponsiveLayouts {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return defaultNativeLayouts;
}

const nativeWidgets: Record<string, React.FC> = {
  curvaS: CurvaSWidget,
  periodBar: PeriodBarWidget,
  donut: DonutWidget,
  gauge: GaugeWidget,
  waterfall: WaterfallWidget,
  table: DataTableWidget,
};

function DashboardContent() {
  const { state } = useCronograma();
  const { width, mounted, containerRef } = useContainerWidth();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(loadLayouts);
  const [isLocked, setIsLocked] = useState(true);
  const [customWidgets, setCustomWidgets] = useState<CustomWidgetConfig[]>(loadCustomWidgets);

  const handleLayoutChange = useCallback((_: Layout, allLayouts: ResponsiveLayouts) => {
    setLayouts(allLayouts);
  }, []);

  const handleSaveLayout = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
    saveCustomWidgets(customWidgets);
    toast.success("Layout salvo com sucesso");
  }, [layouts, customWidgets]);

  const handleResetLayout = useCallback(() => {
    setLayouts(defaultNativeLayouts);
    localStorage.removeItem(STORAGE_KEY);
    toast.info("Layout restaurado ao padrão");
  }, []);

  const handleAddCustomWidget = useCallback((config: CustomWidgetConfig) => {
    setCustomWidgets((prev) => {
      const next = [...prev, config];
      saveCustomWidgets(next);
      return next;
    });
    setLayouts((prev) => {
      const newItem = mkLayout(config.id, 0, 100, 6, 8, 3, 6);
      const updated: ResponsiveLayouts = {};
      for (const bp of Object.keys(prev)) {
        updated[bp] = [...(prev[bp] ?? []), newItem];
      }
      return updated;
    });
    toast.success(`Widget "${config.title}" adicionado`);
  }, []);

  const handleRemoveCustomWidget = useCallback((id: string) => {
    setCustomWidgets((prev) => {
      const next = prev.filter((w) => w.id !== id);
      saveCustomWidgets(next);
      return next;
    });
    setLayouts((prev) => {
      const updated: ResponsiveLayouts = {};
      for (const bp of Object.keys(prev)) {
        updated[bp] = (prev[bp] ?? []).filter((item) => item.i !== id);
      }
      return updated;
    });
    toast.info("Widget removido");
  }, []);

  const allWidgetKeys = useMemo(
    () => [...NATIVE_KEYS, ...customWidgets.map((w) => w.id)],
    [customWidgets]
  );

  const customWidgetMap = useMemo(
    () => new Map(customWidgets.map((w) => [w.id, w])),
    [customWidgets]
  );

  const dragConfig = useMemo(() => ({
    enabled: !isLocked,
    handle: ".drag-handle",
  }), [isLocked]);

  const resizeConfig = useMemo(() => ({
    enabled: !isLocked,
  }), [isLocked]);

  return (
    <motion.div
      ref={dashboardRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" data-export-hide>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-accent" />
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cronograma Financeiro — {state.projectName}
          </p>
        </div>

        {/* Desktop toolbar */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap">
          <DashboardExport targetRef={dashboardRef} />
          <FieldPicker />
          <VisualBuilder customCount={customWidgets.length} onAdd={handleAddCustomWidget} />
          <Button
            variant={isLocked ? "outline" : "default"}
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setIsLocked(!isLocked)}
          >
            {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
            {isLocked ? "Editar Layout" : "Editando"}
          </Button>
          {!isLocked && (
            <>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleSaveLayout}>
                <Save className="h-3 w-3" /> Salvar
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={handleResetLayout}>
                <RotateCcw className="h-3 w-3" /> Reset
              </Button>
            </>
          )}
        </div>

        {/* Mobile toolbar — hamburger menu */}
        <div className="flex sm:hidden items-center gap-2">
          <DashboardExport targetRef={dashboardRef} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <div><FieldPicker /></div>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <div><VisualBuilder customCount={customWidgets.length} onAdd={handleAddCustomWidget} /></div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsLocked(!isLocked)}>
                {isLocked ? <Lock className="h-3 w-3 mr-2" /> : <Unlock className="h-3 w-3 mr-2" />}
                {isLocked ? "Editar Layout" : "Travar Layout"}
              </DropdownMenuItem>
              {!isLocked && (
                <>
                  <DropdownMenuItem onClick={handleSaveLayout}>
                    <Save className="h-3 w-3 mr-2" /> Salvar Layout
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleResetLayout}>
                    <RotateCcw className="h-3 w-3 mr-2" /> Resetar Layout
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Formula Bar */}
      <div data-export-hide>
        <FormulaBar />
      </div>

      {/* Slicers + Series Toggle */}
      <div data-export-hide>
        <DashboardSlicers />
      </div>
      <div data-export-hide>
        <SeriesToggle />
      </div>

      {/* KPI Cards */}
      <KPICards />

      {/* Draggable Grid */}
      <div ref={containerRef}>
        {mounted && width > 0 && (
          <ResponsiveGridLayout
            className="layout"
            width={width}
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 0 }}
            cols={{ lg: 12, md: 12, sm: 6 }}
            rowHeight={40}
            dragConfig={dragConfig}
            resizeConfig={resizeConfig}
            onLayoutChange={handleLayoutChange}
            compactor={verticalCompactor}
            margin={[16, 16]}
          >
            {allWidgetKeys.map((key) => {
              const NativeWidget = nativeWidgets[key];
              const customConfig = customWidgetMap.get(key);
              return (
                <div key={key} className={!isLocked ? "ring-1 ring-dashed ring-border/50 rounded-xl" : ""}>
                  {NativeWidget ? (
                    <NativeWidget />
                  ) : customConfig ? (
                    <CustomWidget config={customConfig} isEditing={!isLocked} onRemove={handleRemoveCustomWidget} />
                  ) : null}
                </div>
              );
            })}
          </ResponsiveGridLayout>
        )}
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  return (
    <DashboardFilterProvider>
      <DashboardContent />
    </DashboardFilterProvider>
  );
}
