import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AlertSeverity = "alta" | "media" | "baixa";

export interface AlertItem {
  id: string;
  label: string;
  sublabel?: string;
  valor?: number;
  aging?: number;
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
  return useQuery({
    queryKey: [ALERTS_KEY, user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<AlertRule[]> => {
      const rules: AlertRule[] = [];

      // R1 — Aging Crítico (>60 dias)
      const cutoff60 = new Date(Date.now() - 60 * 86400000).toISOString().split("T")[0];
      const { data: r1Data } = await supabase
        .from("gitec_events")
        .select("id, tag, ippu, valor, data_inf_execucao, fiscal, status")
        .in("status", ["Pendente de Verificação", "Pendente de Aprovação"])
        .lt("data_inf_execucao", cutoff60);
      const r1Items: AlertItem[] = (r1Data ?? []).map((e) => {
        const aging = e.data_inf_execucao
          ? Math.round((Date.now() - new Date(e.data_inf_execucao).getTime()) / 86400000)
          : 0;
        return {
          id: e.id,
          label: e.tag || e.ippu || "-",
          sublabel: `Fiscal: ${e.fiscal || "-"} · ${e.status}`,
          valor: Number(e.valor) || 0,
          aging,
          link: "/gitec",
        };
      });
      rules.push({
        type: "aging_critico",
        code: "R1",
        severity: "alta",
        label: "Aging Crítico (>60 dias)",
        items: r1Items,
        count: r1Items.length,
      });

      // R2 — Documento Recusado com GITEC Ativo
      const [revsRes, gitecRes] = await Promise.all([
        supabase.from("document_revisions").select("id, documento, titulo, texto_consolidacao").eq("status", "Recusado"),
        supabase.from("gitec_events").select("evidencias, valor"),
      ]);
      const gitecEvidMap = new Map<string, { count: number; valor: number }>();
      for (const ge of gitecRes.data ?? []) {
        const evids = (ge.evidencias ?? "").split(";").map((s: string) => s.trim()).filter(Boolean);
        for (const ev of evids) {
          const cur = gitecEvidMap.get(ev) ?? { count: 0, valor: 0 };
          cur.count++;
          cur.valor += Number(ge.valor) || 0;
          gitecEvidMap.set(ev, cur);
        }
      }
      const r2Items: AlertItem[] = [];
      for (const rev of revsRes.data ?? []) {
        const match = gitecEvidMap.get(rev.documento);
        if (match) {
          r2Items.push({
            id: rev.id,
            label: rev.documento,
            sublabel: (rev.texto_consolidacao ?? "").slice(0, 80),
            valor: match.valor,
            gitecCount: match.count,
            link: "/documentos",
          });
        }
      }
      rules.push({
        type: "recusa_gitec",
        code: "R2",
        severity: "alta",
        label: "Documento Recusado com GITEC Ativo",
        items: r2Items,
        count: r2Items.length,
      });

      // R3 — Valor Alto Pendente de Verificação (>R$500k por iPPU)
      const { data: ippuData } = await supabase.from("gitec_by_ippu").select("*");
      const r3Items: AlertItem[] = (ippuData ?? [])
        .filter((r) => Number(r.val_pend_verif) > 500000)
        .map((r) => ({
          id: r.ippu ?? "-",
          label: r.ippu ?? "-",
          sublabel: `${Number(r.pend_verificacao) || 0} eventos pendentes`,
          valor: Number(r.val_pend_verif) || 0,
          link: "/gitec",
        }));
      rules.push({
        type: "valor_alto_pend",
        code: "R3",
        severity: "media",
        label: "Valor Alto Pendente de Verificação (>R$500k)",
        items: r3Items,
        count: r3Items.length,
      });

      // R4 — Fiscal com Acúmulo (>20 eventos pendentes)
      const { data: fiscalData } = await supabase.from("gitec_by_fiscal").select("*");
      const r4Items: AlertItem[] = (fiscalData ?? [])
        .filter((r) => (Number(r.pend_verif) || 0) + (Number(r.pend_aprov) || 0) > 20)
        .map((r) => ({
          id: r.fiscal ?? "-",
          label: r.fiscal ?? "-",
          sublabel: `Pend: ${Number(r.pend_verif) || 0} verif + ${Number(r.pend_aprov) || 0} aprov`,
          valor: (Number(r.val_pend_verif) || 0) + (Number(r.val_pend_aprov) || 0),
          link: "/gitec",
        }));
      rules.push({
        type: "fiscal_acumulo",
        code: "R4",
        severity: "media",
        label: "Fiscal com Acúmulo (>20 pendentes)",
        items: r4Items,
        count: r4Items.length,
      });

      // R5 — Documento em Workflow > 45 dias
      const { data: docsWf } = await supabase
        .from("documents")
        .select("id, documento, dias_corridos_wf, status, tipo")
        .gt("dias_corridos_wf", 45)
        .not("status", "in", '("Certificado","Para Construção")');
      const r5Items: AlertItem[] = (docsWf ?? []).map((d) => ({
        id: d.id,
        label: d.documento,
        sublabel: `${d.status} · ${d.tipo || "-"}`,
        aging: d.dias_corridos_wf ?? 0,
        link: "/documentos",
      }));
      rules.push({
        type: "workflow_longo",
        code: "R5",
        severity: "baixa",
        label: "Documento em Workflow > 45 dias",
        items: r5Items,
        count: r5Items.length,
      });

      // R6 — skipped (requires cronograma cross-reference not available via supabase)
      rules.push({
        type: "ippu_sem_gitec",
        code: "R6",
        severity: "media",
        label: "iPPU sem GITEC (verificação manual)",
        items: [],
        count: 0,
      });

      return rules.filter((r) => r.count > 0 || r.code === "R6");
    },
  });
}

export function useAlertCounts() {
  const { data } = useAlerts();
  const alta = (data ?? []).filter((r) => r.severity === "alta").reduce((s, r) => s + r.count, 0);
  const media = (data ?? []).filter((r) => r.severity === "media").reduce((s, r) => s + r.count, 0);
  const baixa = (data ?? []).filter((r) => r.severity === "baixa").reduce((s, r) => s + r.count, 0);
  return { alta, media, baixa, total: alta + media + baixa };
}
