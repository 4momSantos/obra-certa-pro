import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Monitor, Play, Pause, SkipBack, SkipForward, X,
  LayoutDashboard, Clock, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { WidgetRenderer } from "@/components/editor/WidgetRenderer";
import { useDashboards } from "@/hooks/useDashboards";
import { useDashboard } from "@/hooks/useDashboard";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Config Screen ─── */
function TVConfig({ onStart }: { onStart: (ids: string[], interval: number) => void }) {
  const navigate = useNavigate();
  const { data: dashboards, isLoading } = useDashboards();
  const [selected, setSelected] = useState<string[]>([]);
  const [interval, setInterval] = useState(30);

  const own = (dashboards ?? []).filter((d) => d.permission === "owner" || d.permission === "edit");

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="max-w-lg mx-auto py-12 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Monitor className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-xl font-bold">TV Mode</h1>
          <p className="text-sm text-muted-foreground">Rotação automática entre dashboards</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Dashboards para rotação</Label>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-md" />)}
          </div>
        ) : own.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum dashboard disponível</p>
        ) : (
          <div className="border rounded-md p-2 space-y-1 max-h-[300px] overflow-y-auto">
            {own.map((d) => (
              <label
                key={d.id}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <Checkbox checked={selected.includes(d.id)} onCheckedChange={() => toggle(d.id)} />
                <span className="text-sm">{d.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">{d.widget_count ?? 0} widgets</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Intervalo de rotação (segundos)</Label>
        <Input
          type="number"
          min={5}
          max={300}
          value={interval}
          onChange={(e) => setInterval(Math.max(5, Number(e.target.value)))}
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate("/dashboards")}>Voltar</Button>
        <Button
          className="flex-1 gap-1.5"
          disabled={selected.length === 0}
          onClick={() => onStart(selected, interval)}
        >
          <Play className="h-4 w-4" /> Iniciar
        </Button>
      </div>

      {selected.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">Selecione pelo menos 1 dashboard</p>
      )}
    </div>
  );
}

/* ─── Single dashboard renderer for TV ─── */
function TVDashboardSlide({ dashboardId }: { dashboardId: string }) {
  const { data: dashboard, isLoading, isError } = useDashboard(dashboardId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-white/30" />
      </div>
    );
  }

  if (isError || !dashboard || dashboard.widgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <LayoutDashboard className="h-12 w-12 text-white/10" />
        <p className="text-white/30 text-sm">
          {isError ? "Erro ao carregar. Pulando para o próximo..." : "Dashboard vazio"}
        </p>
      </div>
    );
  }

  return (
    <div className="pt-12 pb-6 px-6 h-full overflow-auto">
      <div className="grid grid-cols-12 gap-4 auto-rows-[80px]">
        {dashboard.widgets.map((widget) => (
          <div
            key={widget.id}
            className="[&_.bg-card]:bg-[hsl(222,30%,12%)] [&_.border-border\\/50]:border-white/5 [&_.text-foreground]:text-white [&_.text-muted-foreground]:text-white/50 [&_.text-sm]:text-white/80"
            style={{
              gridColumn: `span ${Math.min(widget.position.w, 12)}`,
              gridRow: `span ${widget.position.h}`,
            }}
          >
            <WidgetRenderer widget={widget} onDelete={() => {}} readOnly />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── TV Fullscreen Player ─── */
function TVPlayer({ dashboardIds, interval, onExit }: { dashboardIds: string[]; interval: number; onExit: () => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const progressRef = useRef<ReturnType<typeof setInterval>>();

  const total = dashboardIds.length;

  // Fullscreen
  useEffect(() => {
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    }
    const onFsChange = () => {
      if (!document.fullscreenElement) onExit();
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [onExit]);

  // Clock
  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  // Auto-advance timer
  useEffect(() => {
    if (paused || total <= 1) {
      setProgress(0);
      return;
    }

    const step = 100;
    const tickMs = (interval * 1000) / step;
    let tick = 0;

    progressRef.current = setInterval(() => {
      tick++;
      setProgress((tick / step) * 100);
      if (tick >= step) {
        setCurrentIdx((prev) => (prev + 1) % total);
        tick = 0;
        setProgress(0);
      }
    }, tickMs);

    return () => clearInterval(progressRef.current);
  }, [paused, interval, total, currentIdx]);

  // Mouse controls visibility
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => () => clearTimeout(hideTimerRef.current), []);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else onExit();
      }
      if (e.key === " ") { e.preventDefault(); setPaused((p) => !p); }
      if (e.key === "ArrowRight") setCurrentIdx((p) => (p + 1) % total);
      if (e.key === "ArrowLeft") setCurrentIdx((p) => (p - 1 + total) % total);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [total, onExit]);

  return (
    <div
      className="fixed inset-0 z-[100]"
      style={{ background: "hsl(222, 47%, 6%)" }}
      onMouseMove={handleMouseMove}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-3 z-20">
        <span className="text-white/30 text-xs font-medium">TV Mode</span>
        <span className="text-white/30 text-xs font-mono flex items-center gap-1">
          <Clock className="h-3 w-3" /> {clock}
        </span>
      </div>

      {/* Dashboard slide */}
      <AnimatePresence mode="wait">
        <motion.div
          key={dashboardIds[currentIdx]}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="h-full"
        >
          <TVDashboardSlide dashboardId={dashboardIds[currentIdx]} />
        </motion.div>
      </AnimatePresence>

      {/* Bottom bar — always visible */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        {/* Progress bar */}
        {total > 1 && !paused && (
          <div className="px-6">
            <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/60 transition-[width] duration-300 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Indicator */}
        <div className="flex items-center justify-center py-2">
          <span className="text-white/20 text-[10px]">{currentIdx + 1} de {total}</span>
        </div>
      </div>

      {/* Paused indicator */}
      {paused && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 animate-pulse">
            <Pause className="h-3 w-3 text-white/60" />
            <span className="text-white/60 text-xs">Pausado</span>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ${
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setCurrentIdx((p) => (p - 1 + total) % total)}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setCurrentIdx((p) => (p + 1) % total)}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
          <div className="w-px h-5 bg-white/20 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => {
              if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
              else onExit();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function TVMode() {
  const [mode, setMode] = useState<"config" | "playing">("config");
  const [config, setConfig] = useState<{ ids: string[]; interval: number }>({ ids: [], interval: 30 });

  if (mode === "playing" && config.ids.length > 0) {
    return (
      <TVPlayer
        dashboardIds={config.ids}
        interval={config.interval}
        onExit={() => setMode("config")}
      />
    );
  }

  return (
    <TVConfig
      onStart={(ids, interval) => {
        setConfig({ ids, interval });
        setMode("playing");
      }}
    />
  );
}
