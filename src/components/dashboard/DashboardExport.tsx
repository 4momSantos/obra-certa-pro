import { useState, useCallback, useRef } from "react";
import { toPng } from "html-to-image";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download, Image, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DashboardExportProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
}

export function DashboardExport({ targetRef }: DashboardExportProps) {
  const [exporting, setExporting] = useState(false);

  const handleExportPNG = useCallback(async () => {
    if (!targetRef.current) return;
    setExporting(true);
    try {
      // Hide toolbar elements during capture
      const hideEls = targetRef.current.querySelectorAll("[data-export-hide]");
      hideEls.forEach((el) => (el as HTMLElement).style.display = "none");

      const dataUrl = await toPng(targetRef.current, {
        backgroundColor: "hsl(220, 20%, 97%)",
        pixelRatio: 2,
        cacheBust: true,
      });

      // Restore hidden elements
      hideEls.forEach((el) => (el as HTMLElement).style.display = "");

      // Download
      const link = document.createElement("a");
      link.download = `dashboard-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Dashboard exportado como PNG");
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Falha ao exportar dashboard");
      // Restore hidden elements on error
      const hideEls = targetRef.current?.querySelectorAll("[data-export-hide]");
      hideEls?.forEach((el) => (el as HTMLElement).style.display = "");
    } finally {
      setExporting(false);
    }
  }, [targetRef]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" disabled={exporting}>
          {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportPNG} className="text-xs gap-2">
          <Image className="h-3 w-3" /> Exportar como PNG
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
