import { useState, useCallback, useMemo } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";

const ResponsiveGrid = WidthProvider(Responsive);
type Layouts = Record<string, Layout[]>;
import { motion } from "framer-motion";
import {
  LayoutGrid, RotateCcw, Save, Lock, Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

const defaultLayouts: Layouts = {
  lg: [
    { i: "curvaS", x: 0, y: 0, w: 6, h: 8, minW: 4, minH: 6 },
    { i: "periodBar", x: 6, y: 0, w: 6, h: 8, minW: 4, minH: 6 },
    { i: "donut", x: 0, y: 8, w: 4, h: 8, minW: 3, minH: 6 },
    { i: "gauge", x: 4, y: 8, w: 4, h: 8, minW: 3, minH: 6 },
    { i: "waterfall", x: 8, y: 8, w: 4, h: 8, minW: 4, minH: 6 },
    { i: "table", x: 0, y: 16, w: 12, h: 9, minW: 6, minH: 6 },
  ],
  md: [
    { i: "curvaS", x: 0, y: 0, w: 6, h: 8, minW: 4, minH: 6 },
    { i: "periodBar", x: 6, y: 0, w: 6, h: 8, minW: 4, minH: 6 },
    { i: "donut", x: 0, y: 8, w: 4, h: 8, minW: 3, minH: 6 },
    { i: "gauge", x: 4, y: 8, w: 4, h: 8, minW: 3, minH: 6 },
    { i: "waterfall", x: 8, y: 8, w: 4, h: 8, minW: 4, minH: 6 },
    { i: "table", x: 0, y: 16, w: 12, h: 9, minW: 6, minH: 6 },
  ],
  sm: [
    { i: "curvaS", x: 0, y: 0, w: 6, h: 7 },
    { i: "periodBar", x: 0, y: 7, w: 6, h: 7 },
    { i: "donut", x: 0, y: 14, w: 3, h: 7 },
    { i: "gauge", x: 3, y: 14, w: 3, h: 7 },
    { i: "waterfall", x: 0, y: 21, w: 6, h: 7 },
    { i: "table", x: 0, y: 28, w: 6, h: 9 },
  ],
};

function loadLayouts(): Layouts {
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
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(containerRef);
  const [layouts, setLayouts] = useState<Layouts>(loadLayouts);
  const [isLocked, setIsLocked] = useState(true);

  const handleLayoutChange = useCallback((_: Layout[], allLayouts: Layouts) => {
    setLayouts(allLayouts);
  }, []);

  const handleSaveLayout = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
  }, [layouts]);

  const handleResetLayout = useCallback(() => {
    setLayouts(defaultLayouts);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const widgetKeys = useMemo(() => Object.keys(widgetComponents), []);

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
        {width > 0 && (
          <ResponsiveGridLayout
            className="layout"
            width={width}
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 0 }}
            cols={{ lg: 12, md: 12, sm: 6 }}
            rowHeight={40}
            isDraggable={!isLocked}
            isResizable={!isLocked}
            draggableHandle=".drag-handle"
            onLayoutChange={handleLayoutChange}
            compactType="vertical"
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
