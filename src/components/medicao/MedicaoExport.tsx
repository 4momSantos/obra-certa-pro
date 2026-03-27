import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

async function fetchAll(table: string, select = "*") {
  const rows: any[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase.from(table as any).select(select).range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

export function MedicaoExport() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const [ppu, scon, relEv, sigem] = await Promise.all([
        fetchAll("ppu_items"),
        fetchAll("scon_components"),
        fetchAll("rel_eventos"),
        fetchAll("sigem_documents", "documento,revisao,titulo,ppu,status,status_correto,status_gitec,incluido_em"),
      ]);

      const wb = XLSX.utils.book_new();

      const ws1 = XLSX.utils.json_to_sheet(ppu);
      XLSX.utils.book_append_sheet(wb, ws1, "Medição por PPU");

      const ws2 = XLSX.utils.json_to_sheet(scon);
      XLSX.utils.book_append_sheet(wb, ws2, "Componentes SCON");

      const ws3 = XLSX.utils.json_to_sheet(relEv);
      XLSX.utils.book_append_sheet(wb, ws3, "Eventos GITEC");

      const ws4 = XLSX.utils.json_to_sheet(sigem);
      XLSX.utils.book_append_sheet(wb, ws4, "Documentos SIGEM");

      const date = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `SPLAN_Medicao_${date}.xlsx`);
      toast.success("Arquivo exportado com sucesso");
    } catch (err: any) {
      toast.error("Erro ao exportar: " + (err.message || "desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {loading ? "Gerando arquivo..." : "Exportar"}
    </Button>
  );
}
