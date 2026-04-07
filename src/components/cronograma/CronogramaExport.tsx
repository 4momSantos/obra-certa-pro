import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { CronoTreeNode, CronoBmRow, CurvaSRow } from "@/hooks/useCronogramaData";

interface Props {
  tree: CronoTreeNode[];
  bmData: CronoBmRow[];
  curvaS: CurvaSRow[];
  ultimoBm: number;
}

export function CronogramaExport({ tree, bmData, curvaS, ultimoBm }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const ExcelJS = await import("exceljs");
      const wb = new ExcelJS.Workbook();

      // Collect BM numbers
      const bmNums = [...new Set(bmData.map(b => b.bm_number))].sort((a, b) => a - b);

      // Build BM lookup: ippu -> bmNum -> {prev,proj,real}
      const bmMap = new Map<string, Map<number, { previsto: number; projetado: number; realizado: number }>>();
      bmData.forEach(b => {
        if (!bmMap.has(b.ippu)) bmMap.set(b.ippu, new Map());
        bmMap.get(b.ippu)!.set(b.bm_number, b);
      });

      // --- Aba Cronograma ---
      const ws = wb.addWorksheet("Cronograma");
      const headerFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF1E3A5F" } };
      const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      const greyFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF0F0F0" } };
      const borderThin = {
        top: { style: "thin" as const }, bottom: { style: "thin" as const },
        left: { style: "thin" as const }, right: { style: "thin" as const },
      };
      const moneyFmt = '#,##0.00';

      // Headers
      const fixedHeaders = ["IPPU", "Nome", "Fase", "Valor Total", "Acumulado", "Saldo"];
      const bmHeaders: string[] = [];
      bmNums.forEach(n => {
        const label = `BM-${String(n).padStart(2, "0")}`;
        bmHeaders.push(`${label} Prev`, `${label} Proj`, `${label} Real`);
      });
      const allHeaders = [...fixedHeaders, ...bmHeaders];

      const headerRow = ws.addRow(allHeaders);
      headerRow.eachCell(cell => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.border = borderThin;
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      headerRow.height = 22;

      // Data rows
      tree.forEach(node => {
        const isGroup = node.nivel.includes("Fase") || node.nivel.includes("Subfase");
        const indent = node.nivel.includes("Subfase") ? "  " : node.nivel.includes("Agrupamento") ? "    " : "";
        const vals: (string | number)[] = [
          node.ippu,
          indent + node.nome,
          node.fase_nome,
          node.valor,
          node.acumulado,
          node.saldo,
        ];
        bmNums.forEach(n => {
          const bm = bmMap.get(node.ippu)?.get(n);
          vals.push(bm?.previsto ?? 0, bm?.projetado ?? 0, bm?.realizado ?? 0);
        });
        const row = ws.addRow(vals);
        row.eachCell((cell, colNumber) => {
          cell.border = borderThin;
          if (colNumber >= 4) cell.numFmt = moneyFmt;
        });
        if (isGroup) {
          row.eachCell(cell => {
            cell.fill = greyFill;
            cell.font = { bold: true, size: 10 };
          });
        }
      });

      // Auto-width
      ws.columns.forEach(col => {
        let max = 10;
        col.eachCell?.({ includeEmpty: false }, cell => {
          const len = String(cell.value ?? "").length;
          if (len > max) max = len;
        });
        col.width = Math.min(max + 2, 30);
      });

      // --- Aba Curva S ---
      if (curvaS.length > 0) {
        const ws2 = wb.addWorksheet("Curva S");
        const csHeaders = ["Período", "Previsto Acum", "Projetado Acum", "Realizado Acum", "Previsto Mensal", "Projetado Mensal", "Realizado Mensal"];
        const hRow = ws2.addRow(csHeaders);
        hRow.eachCell(cell => {
          cell.fill = headerFill;
          cell.font = headerFont;
          cell.border = borderThin;
          cell.alignment = { horizontal: "center" };
        });
        curvaS.forEach(r => {
          const row = ws2.addRow([r.label, r.previsto_acum, r.projetado_acum, r.realizado_acum, r.previsto_mensal, r.projetado_mensal, r.realizado_mensal]);
          row.eachCell((cell, colNumber) => {
            cell.border = borderThin;
            if (colNumber >= 2) cell.numFmt = moneyFmt;
          });
        });
        ws2.columns.forEach(col => {
          let max = 12;
          col.eachCell?.({ includeEmpty: false }, cell => {
            const len = String(cell.value ?? "").length;
            if (len > max) max = len;
          });
          col.width = Math.min(max + 2, 25);
        });
      }

      // Download
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const bmLabel = ultimoBm ? `BM${String(ultimoBm).padStart(2, "0")}` : "ALL";
      a.download = `SPLAN_Cronograma_${bmLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Cronograma exportado com sucesso");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Falha ao exportar cronograma");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="h-8 text-xs gap-1.5">
      {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      Exportar Excel
    </Button>
  );
}
