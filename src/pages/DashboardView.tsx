import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WidgetRenderer } from "@/components/editor/WidgetRenderer";
import { useDashboard } from "@/hooks/useDashboard";

export default function DashboardView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: dashboard, isLoading, isError } = useDashboard(id);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <LayoutDashboard className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Dashboard não encontrado</p>
        <Button variant="outline" onClick={() => navigate("/dashboards")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const widgets = dashboard.widgets;

  return (
    <div className="min-h-screen bg-background p-6">
      {widgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4 text-center">
          <LayoutDashboard className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">Dashboard vazio</p>
          <Button variant="outline" onClick={() => navigate(`/dashboards/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao editor
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
              <WidgetRenderer widget={widget} onDelete={() => {}} readOnly />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
