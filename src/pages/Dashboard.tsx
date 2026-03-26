import { useState, useCallback, useMemo } from "react";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import type { Layout, Layouts } from "react-grid-layout";
import { motion } from "framer-motion";
import {
  LayoutGrid, RotateCcw, Save, Lock, Unlock,
  PanelLeftOpen, PanelLeftClose, Plus, FunctionSquare, Code2,
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
import { FieldPicker } from "@/components/dashboard/FieldPicker";
import { FormulaBar } from "@/components/dashboard/FormulaBar";
import { WidgetConfigurator } from "@/components/dashboard/WidgetConfigurator";
import type { WidgetConfig } from "@/components/dashboard/WidgetConfigurator";
import { HtmlVisualImporter } from "@/components/dashboard/HtmlVisualImporter";
import { CustomWidgetRenderer, HtmlWidgetRenderer } from "@/components/dashboard/CustomWidgetRenderer";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const STORAGE_KEY = "dashboard-layouts";
const CUSTOM_WIDGETS_KEY = "dashboard-custom-widgets";
const HTML_WIDGETS_KEY = "dashboard-html-widgets";

/* ─── Default Grid Layouts ─── */

const builtInWidgets = ["curvaS", "periodBar", "donut", "gauge", "waterfall", "table"];

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

function loadCustomWidgets(): WidgetConfig[] {
  try {
    const saved = localStorage.getItem(CUSTOM_WIDGETS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function loadHtmlWidgets(): { id: string; title: string; html: string; css: string }[] {
  try {
    const saved = localStorage.getItem(HTML_WIDGETS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

/* ─── Built-in Widget Map ─── */

const builtInComponents: Record<string, React.FC> = {
  curvaS: CurvaSWidget,
  periodBar: PeriodBarWidget,
  donut: DonutWidget,
  gauge: GaugeWidget,
  waterfall: WaterfallWidget,
  table: DataTableWidget,
};

/* ─── Builder Panel Types ─── */

type BuilderPanel = "none" | "fields" | "newWidget" | "formula" | "html";

/* ─── Dashboard Content ─── */

function DashboardContent() {
  const { state } = useCronograma();
  const { width, containerRef } = useContainerWidth();
  const [layouts, setLayouts] = useState<Layouts>(loadLayouts);
  const [isLocked, setIsLocked] = useState(true);
  const [builderPanel, setBuilderPanel] = useState<BuilderPanel>("none");
  const [customWidgets, setCustomWidgets] = useState<WidgetConfig[]>(loadCustomWidgets);
  const [htmlWidgets, setHtmlWidgets] = useState<{ id: string; title: string; html: string; css: string }[]>(loadHtmlWidgets);

  const handleLayoutChange = useCallback((_: Layout[], allLayouts: Layouts) => {
    setLayouts(allLayouts);
  }, []);

  const handleSaveLayout = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
    localStorage.setItem(CUSTOM_WIDGETS_KEY, JSON.stringify(customWidgets));
    localStorage.setItem(HTML_WIDGETS_KEY, JSON.stringify(htmlWidgets));
  }, [layouts, customWidgets, htmlWidgets]);

  const handleResetLayout = useCallback(() => {
    setLayouts(defaultLayouts);
    setCustomWidgets([]);
    setHtmlWidgets([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CUSTOM_WIDGETS_KEY);
    localStorage.removeItem(HTML_WIDGETS_KEY);
  }, []);

  const handleCreateWidget = useCallback((config: WidgetConfig) => {
    setCustomWidgets((prev) => {
      const next = [...prev, config];
      // Add layout entry for the new widget
      setLayouts((prevLayouts) => {
        const newItem: Layout = { i: config.id, x: 0, y: Infinity, w: 6, h: 8, minW: 3, minH: 5 };
        return {
          lg: [...(prevLayouts.lg || []), newItem],
          md: [...(prevLayouts.md || []), newItem],
          sm: [...(prevLayouts.sm || []), { ...newItem, w: 6 }],
        };
      });
      return next;
    });
    setBuilderPanel("none");
  }, []);

  const handleImportHtml = useCallback((config: { id: string; title: string; html: string; css: string }) => {
    setHtmlWidgets((prev) => {
      const next = [...prev, config];
      setLayouts((prevLayouts) => {
        const newItem: Layout = { i: config.id, x: 0, y: Infinity, w: 4, h: 7, minW: 3, minH: 5 };
        return {
          lg: [...(prevLayouts.lg || []), newItem],
          md: [...(prevLayouts.md || []), newItem],
          sm: [...(prevLayouts.sm || []), { ...newItem, w: 6 }],
        };
      });
      return next;
    });
    setBuilderPanel("none");
  }, []);

  const removeCustomWidget = useCallback((id: string) => {
    setCustomWidgets((prev) => prev.filter((w) => w.id !== id));
    setLayouts((prev) => ({
      lg: (prev.lg || []).filter((l) => l.i !== id),
      md: (prev.md || []).filter((l) => l.i !== id),
      sm: (prev.sm || []).filter((l) => l.i !== id),
    }));
  }, []);

  const removeHtmlWidget = useCallback((id: string) => {
    setHtmlWidgets((prev) => prev.filter((w) => w.id !== id));
    setLayouts((prev) => ({
      lg: (prev.lg || []).filter((l) => l.i !== id),
      md: (prev.md || []).filter((l) => l.i !== id),
      sm: (prev.sm || []).filter((l) => l.i !== id),
    }));
  }, []);

  // All widget keys for the grid
  const allWidgetKeys = useMemo(() => [
    ...builtInWidgets,
    ...customWidgets.map((w) => w.id),
    ...htmlWidgets.map((w) => w.id),
  ], [customWidgets, htmlWidgets]);

  const togglePanel = (panel: BuilderPanel) => {
    setBuilderPanel((prev) => (prev === panel ? "none" : panel));
  };

  const showSidebar = builderPanel !== "none";

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
        <div className="flex items-center gap-2 flex-wrap">
          {/* Builder tools */}
          <Button
            variant={builderPanel === "fields" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => togglePanel("fields")}
          >
            {builderPanel === "fields" ? <PanelLeftClose className="h-3 w-3" /> : <PanelLeftOpen className="h-3 w-3" />}
            Campos
          </Button>
          <Button
            variant={builderPanel === "newWidget" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => togglePanel("newWidget")}
          >
            <Plus className="h-3 w-3" />
            Novo Visual
          </Button>
          <Button
            variant={builderPanel === "formula" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => togglePanel("formula")}
          >
            <FunctionSquare className="h-3 w-3" />
            DAX
          </Button>
          <Button
            variant={builderPanel === "html" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => togglePanel("html")}
          >
            <Code2 className="h-3 w-3" />
            HTML5
          </Button>

          <div className="w-px h-6 bg-border/50 mx-1 hidden sm:block" />

          {/* Layout controls */}
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

      {/* Main layout: sidebar + content */}
      <div className="flex gap-4">
        {/* Builder Sidebar */}
        {showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="shrink-0 overflow-hidden"
          >
            <div className="w-[280px] glass-card rounded-xl p-3 sticky top-20 max-h-[calc(100vh-6rem)] overflow-auto">
              {builderPanel === "fields" && (
                <FieldPicker onFieldSelect={() => {}} />
              )}
              {builderPanel === "newWidget" && (
                <WidgetConfigurator
                  onCreateWidget={handleCreateWidget}
                  onClose={() => setBuilderPanel("none")}
                />
              )}
              {builderPanel === "formula" && (
                <FormulaBar />
              )}
              {builderPanel === "html" && (
                <HtmlVisualImporter
                  onImport={handleImportHtml}
                  onClose={() => setBuilderPanel("none")}
                />
              )}
            </div>
          </motion.div>
        )}

        {/* Dashboard Content */}
        <div className="flex-1 min-w-0 space-y-4">
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
                {allWidgetKeys.map((key) => {
                  // Built-in widgets
                  const BuiltIn = builtInComponents[key];
                  if (BuiltIn) {
                    return (
                      <div key={key} className={!isLocked ? "ring-1 ring-dashed ring-border/50 rounded-xl" : ""}>
                        <BuiltIn />
                      </div>
                    );
                  }

                  // Custom chart widgets
                  const customWidget = customWidgets.find((w) => w.id === key);
                  if (customWidget) {
                    return (
                      <div key={key} className={!isLocked ? "ring-1 ring-dashed ring-border/50 rounded-xl" : ""}>
                        <CustomWidgetRenderer config={customWidget} onRemove={() => removeCustomWidget(key)} />
                      </div>
                    );
                  }

                  // HTML widgets
                  const htmlWidget = htmlWidgets.find((w) => w.id === key);
                  if (htmlWidget) {
                    return (
                      <div key={key} className={!isLocked ? "ring-1 ring-dashed ring-border/50 rounded-xl" : ""}>
                        <HtmlWidgetRenderer config={htmlWidget} onRemove={() => removeHtmlWidget(key)} />
                      </div>
                    );
                  }

                  return <div key={key} />;
                })}
              </ResponsiveGridLayout>
            )}
          </div>
        </div>
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
