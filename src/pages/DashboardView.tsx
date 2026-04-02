import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LayoutDashboard, ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WidgetRenderer } from "@/components/editor/WidgetRenderer";
import { useDashboard } from "@/hooks/useDashboard";
import { useQueryClient } from "@tanstack/react-query";

export default function DashboardView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: dashboard, isLoading, isError } = useDashboard(id);
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  const containerRef = useRef<HTMLDivElement>(null);

  // Request fullscreen on mount
  useEffect(() => {
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    }

    const onFsChange = () => {
      if (!document.fullscreenElement) {
        navigate(`/dashboards/${id}`);
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [id, navigate]);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  // Auto-refresh
  useEffect(() => {
    const interval = (dashboard?.settings as Record<string, unknown>)?.refresh_interval as number | undefined;
    if (!interval || interval <= 0 || !id) return;
    const t = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["dashboard", id] });
    }, interval * 1000);
    return () => clearInterval(t);
  }, [dashboard, id, qc]);

  // ESC handler (backup)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) {
        navigate(`/dashboards/${id}`);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [id, navigate]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-[hsl(222,47%,6%)] flex items-center justify-center">
        <div className="grid grid-cols-3 gap-4 w-[80%]">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <div className="fixed inset-0 z-[100] bg-[hsl(222,47%,6%)] flex flex-col items-center justify-center gap-4">
        <LayoutDashboard className="h-12 w-12 text-white/20" />
        <p className="text-white/50">Dashboard não encontrado</p>
        <Button variant="outline" onClick={() => navigate("/dashboards")} className="border-white/20 text-white/70">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const widgets = dashboard.widgets;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] overflow-auto"
      style={{ background: "hsl(222, 47%, 6%)" }}
      onClick={() => {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }}
    >
      {/* Top bar — name & clock */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-3 z-10">
        <span className="text-white/30 text-xs font-medium tracking-wide">{dashboard.name}</span>
        <span className="text-white/30 text-xs font-mono flex items-center gap-1">
          <Clock className="h-3 w-3" /> {clock}
        </span>
      </div>

      {/* Widgets grid */}
      <div className="pt-12 pb-6 px-6" onClick={(e) => e.stopPropagation()}>
        {widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[80vh] gap-4 text-center">
            <LayoutDashboard className="h-16 w-16 text-white/10" />
            <p className="text-white/30">Dashboard vazio</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4 auto-rows-[80px]">
            {widgets.map((widget) => (
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
        )}
      </div>
    </div>
  );
}
