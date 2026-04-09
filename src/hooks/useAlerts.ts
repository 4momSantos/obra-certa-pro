import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMedicaoData } from "./useMedicao";

export type AlertSeverity = "alta" | "media";

export interface AlertItem {
  id: string;
  label: string;
  sublabel?: string;
  valor?: number;
  aging?: number;
  pct?: number;
  link?: string;
  [key: string]: any;
}

export interface AlertRule {
  type: string;
  code: string;
  severity: AlertSeverity;
  label: string;
  items: AlertItem[];
  count: number;
}

const ALERTS_KEY = "alerts";

export function useAlerts() {
  const { user } = useAuth();
  const { items: ppuItems, isLoading: medicaoLoading } = useMedicaoData();

  return useQuery({
    queryKey: [ALERTS_KEY, user?.id, ppuItems.length],
    enabled: !!user && !medicaoLoading && ppuItems.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<AlertRule[]> => {
      const rules: AlertRule[] = [];

      // R1 — SCON executado sem medição GITEC (Gap)
      const r1Items: AlertItem[] = ppuItems
        .filter(p => p.scon_avg_avanco > 50 && p.gitec_valor_aprovado === 0)
        .map(p => ({
          id: p.item_ppu,
          label: p.item_ppu,
          sublabel: `SCON ${p.scon_avg_avanco.toFixed(0)}% · Exec estimado: R$ ${(p.scon_valor_estimado / 1e3).toFixed(0)}K`,
          valor: p.valor_total,
          pct: p.scon_avg_avanco,
          link: "/medicao",
        }))
        .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0));

      rules.push({
        type: "gap_scon_gitec",
        code: "R1",
        severity: "alta",
        label: "SCON executado sem medição GITEC (Gap)",
        items: r1Items,
        count: r1Items.length,
      });

      // R2 — Documentos recusados no SIGEM
      const { data: recusados } = await supabase
        .from("sigem_documents")
        .select("id, documento, titulo, ppu, status_correto")
        .eq("status_correto", "Recusado") as any;
        .limit(500);

      const r2Items: AlertItem[] = (recusados ?? []).map(d => ({
        id: d.id,
        label: d.documento,
        sublabel: `${d.titulo?.slice(0, 60) || "-"} · PPU: ${d.ppu || "-"}`,
        link: "/medicao",
      }));

      rules.push({
        type: "docs_recusados",
        code: "R2",
        severity: "alta",
        label: "Documentos recusados no SIGEM",
        items: r2Items,
        count: r2Items.length,
      });

      // R3 — Eventos GITEC com aging > 60 dias
      const cutoff60 = new Date(Date.now() - 60 * 86400000).toISOString().split("T")[0];
      const { data: r3Data } = await supabase
        .from("gitec_events")
        .select("id, tag, ippu, valor, data_inf_execucao, fiscal")
        .neq("etapa", "Concluída")
        .lt("data_inf_execucao", cutoff60)
        .order("valor", { ascending: false })
        .limit(500);

      const r3Items: AlertItem[] = (r3Data ?? []).map(e => {
        const aging = e.data_inf_execucao
          ? Math.round((Date.now() - new Date(e.data_inf_execucao).getTime()) / 86400000)
          : 0;
        return {
          id: e.id,
          label: e.tag || e.ippu || "-",
          sublabel: `iPPU: ${e.ippu || "-"} · Fiscal: ${e.fiscal || "-"}`,
          valor: Number(e.valor) || 0,
          aging,
          link: "/gitec",
        };
      });

      rules.push({
        type: "aging_critico",
        code: "R3",
        severity: "alta",
        label: "Eventos GITEC com aging > 60 dias",
        items: r3Items,
        count: r3Items.length,
      });

      // R4 — Fiscal sobrecarregado (>20 pendentes)
      const { data: fiscalData } = await supabase.from("vw_fiscais").select("*");
      const r4Items: AlertItem[] = (fiscalData ?? [])
        .filter(r => (Number((r as any).pendentes) || 0) > 20)
        .map(r => ({
          id: r.fiscal_responsavel ?? "-",
          label: r.fiscal_responsavel ?? "-",
          sublabel: `${Number((r as any).pendentes) || 0} pendentes`,
          valor: Number((r as any).valor_pendente) || 0,
          link: "/gitec",
        }))
        .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0));

      rules.push({
        type: "fiscal_sobrecarregado",
        code: "R4",
        severity: "media",
        label: "Fiscal sobrecarregado (>20 pendentes)",
        items: r4Items,
        count: r4Items.length,
      });

      // R5 — PPU com valor previsto mas SCON = 0%
      const r5Items: AlertItem[] = ppuItems
        .filter(p => p.valor_total > 100000 && p.eac_previsto > 0 && p.scon_avg_avanco === 0)
        .map(p => ({
          id: p.item_ppu,
          label: p.item_ppu,
          sublabel: `${p.disciplina || "-"} · EAC Prev: ${(p.eac_previsto * 100).toFixed(1)}%`,
          valor: p.valor_total,
          link: "/medicao",
        }))
        .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0));

      rules.push({
        type: "previsto_sem_scon",
        code: "R5",
        severity: "media",
        label: "PPU com valor previsto mas SCON = 0%",
        items: r5Items,
        count: r5Items.length,
      });

      return rules.filter(r => r.count > 0);
    },
  });
}

export function useAlertCounts() {
  const { data } = useAlerts();
  const alta = (data ?? []).filter(r => r.severity === "alta").reduce((s, r) => s + r.count, 0);
  const media = (data ?? []).filter(r => r.severity === "media").reduce((s, r) => s + r.count, 0);
  return { alta, media, total: alta + media };
}
