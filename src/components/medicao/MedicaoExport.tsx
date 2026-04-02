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
      const [ppu, classif, scon, relEv, sigem, sconView, gitecView] = await Promise.all([
        fetchAll("ppu_items", "item_ppu,descricao,valor_total,valor_medido"),
        fetchAll("classificacao_ppu", "item_ppu,fase,subfase,agrupamento,disciplina"),
        fetchAll("scon_components"),
        fetchAll("rel_eventos"),
        fetchAll("sigem_documents", "documento,revisao,titulo,ppu,status_correto,status_gitec,incluido_em"),
        fetchAll("vw_scon_por_ppu"),
        fetchAll("vw_gitec_por_ppu"),
      ]);

      const classifMap = new Map<string, any>();
      classif.forEach((c: any) => { if (c.item_ppu) classifMap.set(c.item_ppu, c); });
      const sconMap = new Map<string, any>();
      sconView.forEach((s: any) => { if (s.item_wbs) sconMap.set(s.item_wbs, s); });
      const gitecMap = new Map<string, any>();
      gitecView.forEach((g: any) => { if (g.item_ppu) gitecMap.set(g.item_ppu, g); });

      const wb = XLSX.utils.book_new();

      // Sheet 1: Medição por PPU (enriched)
      const medicaoRows = ppu.map((p: any) => {
        const cl = classifMap.get(p.item_ppu);
        const sc = sconMap.get(p.item_ppu);
        const gi = gitecMap.get(p.item_ppu);
        return {
          "Item PPU": p.item_ppu,
          "Descrição": p.descricao || "",
          "Fase": cl?.fase || "",
          "Subfase": cl?.subfase || "",
          "Disciplina": cl?.disciplina || "",
          "Valor Total": Number(p.valor_total) || 0,
          "SCON %": Number(sc?.avg_avanco) || 0,
          "SCON Componentes": Number(sc?.total_componentes) || 0,
          "GITEC Eventos": Number(gi?.total_eventos) || 0,
          "Valor Medido": Number(gi?.valor_aprovado) || 0,
          "Valor Pendente": Number(gi?.valor_pendente) || 0,
          "Gap": (Number(p.valor_total) || 0) * (Number(sc?.avg_avanco) || 0) / 100 - (Number(gi?.valor_aprovado) || 0),
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(medicaoRows), "Medição por PPU");

      // Sheet 2: Componentes SCON
      const sconRows = scon.map((c: any) => ({
        "Item Critério": c.item_criterio || "",
        "Relatório": c.relatorio_esperado || "",
        "Status SIGEM": c.status_sigem || "",
        "Status GITEC": c.status_gitec || "",
        "Disciplina": c.disciplina || "",
        "Item WBS": c.item_wbs || "",
        "TAG": c.tag || "",
        "Descrição": c.tag_desc || "",
        "Qtde Etapa": c.qtde_etapa || 0,
        "Qtde Exec Acum": c.qtde_etapa_exec_acum || 0,
        "Avanço %": c.avanco_ponderado || 0,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sconRows), "Componentes SCON");

      // Sheet 3: Eventos GITEC
      const gitecRows = relEv.map((e: any) => ({
        "Item PPU": e.item_ppu || "",
        "TAG": e.tag || "",
        "Etapa": e.etapa || "",
        "Status": e.status || "",
        "Valor": Number(e.valor) || 0,
        "Qtd Ponderada": Number(e.quantidade_ponderada) || 0,
        "Data Execução": e.data_execucao || "",
        "Data Inf. Exec": e.data_inf_execucao || "",
        "Data Aprovação": e.data_aprovacao || "",
        "Fiscal": e.fiscal_responsavel || "",
        "Evidências": e.numero_evidencias || "",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(gitecRows), "Eventos GITEC");

      // Sheet 4: Documentos SIGEM (max 5000)
      const sigemRows = sigem.slice(0, 5000).map((d: any) => ({
        "Documento": d.documento || "",
        "Revisão": d.revisao || "",
        "Título": d.titulo || "",
        "Status": d.status_correto || "",
        "PPU": d.ppu || "",
        "Status GITEC": d.status_gitec || "",
        "Incluído em": d.incluido_em || "",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sigemRows), "Documentos SIGEM");

      const date = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `SPLAN_Medicao_${date}.xlsx`);
      toast.success(`Arquivo SPLAN_Medicao_${date}.xlsx exportado com sucesso`);
    } catch (err: any) {
      toast.error("Erro ao exportar: " + (err.message || "desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {loading ? "Gerando arquivo..." : "Exportar Excel"}
    </Button>
  );
}
