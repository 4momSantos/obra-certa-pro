import { useState, useCallback, useMemo } from "react";
import { ResponsiveGridLayout, useContainerWidth, verticalCompactor } from "react-grid-layout";
import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout";
import { motion } from "framer-motion";
import {
  LayoutGrid, RotateCcw, Save, Lock, Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const STORAGE_KEY = "dashboard-layouts";

const mkLayout = (i: string, x: number, y: number, w: number, h: number, minW?: number, minH?: number): LayoutItem => ({
  i, x, y, w, h, ...(minW != null ? { minW } : {}), ...(minH != null ? { minH } : {}),
});

const defaultLayouts: ResponsiveLayouts = {
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
    mkLayout("donut", 0, 14, 3, 7),
    mkLayout("gauge", 3, 14, 3, 7),
    mkLayout("waterfall", 0, 21, 6, 7),
    mkLayout("table", 0, 28, 6, 9),
  ],
};

function loadLayouts(): ResponsiveLayouts {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return defaultLayouts;
}

const widgetComponents: Record<string, React.FC> = {
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
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(loadLayouts);
  const [isLocked, setIsLocked] = useState(true);

  const handleLayoutChange = useCallback((_: Layout, allLayouts: ResponsiveLayouts) => {
    setLayouts(allLayouts);
  }, []);

  const handleSaveLayout = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
    toast.success("Layout salvo com sucesso");
  }, [layouts]);

  const handleResetLayout = useCallback(() => {
    setLayouts(defaultLayouts);
    localStorage.removeItem(STORAGE_KEY);
    toast.info("Layout restaurado ao padrão");
  }, []);

  const widgetKeys = useMemo(() => Object.keys(widgetComponents), []);

  const dragConfig = useMemo(() => ({
    enabled: !isLocked,
    handle: ".drag-handle",
  }), [isLocked]);

  const resizeConfig = useMemo(() => ({
    enabled: !isLocked,
  }), [isLocked]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-accent" />
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cronograma Financeiro — {state.projectName}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Slicers + Series Toggle */}
      <DashboardSlicers />
      <SeriesToggle />

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
            {widgetKeys.map((key) => {
              const Widget = widgetComponents[key];
              return (
                <div key={key} className={!isLocked ? "ring-1 ring-dashed ring-border/50 rounded-xl" : ""}>
                  <Widget />
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
