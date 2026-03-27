import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const GITEC_KEY = "gitec";

export interface GitecFilters {
  status: string;
  fiscal: string;
  agingRange: string;
  search: string;
}

export const defaultFilters: GitecFilters = {
  status: "all",
  fiscal: "all",
  agingRange: "all",
  search: "",
};

function calcAging(dateStr: string | null): number {
  if (!dateStr) return 0;
  return Math.round((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export function agingColor(days: number): string {
  if (days <= 30) return "text-primary";
  if (days <= 60) return "text-accent-foreground";
  return "text-destructive";
}

export function agingBadge(days: number): { label: string; variant: "default" | "secondary" | "destructive" } {
  if (days <= 30) return { label: `${days}d`, variant: "default" };
  if (days <= 60) return { label: `${days}d`, variant: "secondary" };
  return { label: `${days}d CRÍTICO`, variant: "destructive" };
}

export interface GitecStats {
  total: number;
  aprovados: number;
  valAprovado: number;
  pendVerif: number;
  valPendVerif: number;
  pendAprov: number;
  valPendAprov: number;
  agingMedio: number;
  agingMaximo: number;
}

export function useGitecStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [GITEC_KEY, "stats", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<GitecStats> => {
      const { data, error } = await supabase.from("gitec_events").select("status, valor, data_inf_execucao");
      if (error) throw error;
      if (!data || data.length === 0) return { total: 0, aprovados: 0, valAprovado: 0, pendVerif: 0, valPendVerif: 0, pendAprov: 0, valPendAprov: 0, agingMedio: 0, agingMaximo: 0 };

      let aprovados = 0, valAprovado = 0, pendVerif = 0, valPendVerif = 0, pendAprov = 0, valPendAprov = 0;
      const agings: number[] = [];

      for (const r of data) {
        const v = Number(r.valor) || 0;
        if (r.status === "Aprovado") { aprovados++; valAprovado += v; }
        else if (r.status === "Pendente de Verificação") {
          pendVerif++; valPendVerif += v;
          if (r.data_inf_execucao) agings.push(calcAging(r.data_inf_execucao));
        } else if (r.status === "Pendente de Aprovação") {
          pendAprov++; valPendAprov += v;
          if (r.data_inf_execucao) agings.push(calcAging(r.data_inf_execucao));
        }
      }

      return {
        total: data.length,
        aprovados, valAprovado,
        pendVerif, valPendVerif,
        pendAprov, valPendAprov,
        agingMedio: agings.length ? Math.round(agings.reduce((a, b) => a + b, 0) / agings.length) : 0,
        agingMaximo: agings.length ? Math.max(...agings) : 0,
      };
    },
  });
}

export function useGitecFiscais() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [GITEC_KEY, "fiscais", user?.id],
    enabled: !!user,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("gitec_events").select("fiscal");
      if (error) throw error;
      const unique = [...new Set((data ?? []).map(r => r.fiscal).filter(Boolean))].sort();
      return unique;
    },
  });
}

export interface GitecEvent {
  id: string;
  agrupamento: string;
  ippu: string | null;
  tag: string;
  etapa: string;
  status: string;
  valor: number;
  data_execucao: string | null;
  data_inf_execucao: string | null;
  data_aprovacao: string | null;
  executado_por: string;
  fiscal: string;
  evidencias: string;
  comentario: string;
  aging: number;
}

export function useGitecEvents(filters: GitecFilters, limit = 100) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [GITEC_KEY, "events", filters, limit, user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<GitecEvent[]> => {
      let q = supabase.from("gitec_events").select("*").order("valor", { ascending: false }).limit(limit);

      if (filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.fiscal !== "all") q = q.eq("fiscal", filters.fiscal);
      if (filters.search) {
        q = q.or(`tag.ilike.%${filters.search}%,ippu.ilike.%${filters.search}%,fiscal.ilike.%${filters.search}%`);
      }

      const { data, error } = await q;
      if (error) throw error;

      let rows = (data ?? []).map(r => ({
        ...r,
        valor: Number(r.valor) || 0,
        aging: calcAging(r.data_inf_execucao),
      }));

      if (filters.agingRange === "30") rows = rows.filter(r => r.aging <= 30);
      else if (filters.agingRange === "60") rows = rows.filter(r => r.aging > 30 && r.aging <= 60);
      else if (filters.agingRange === "60+") rows = rows.filter(r => r.aging > 60);

      return rows;
    },
  });
}

export interface GitecFiscalRow {
  fiscal: string;
  total: number;
  aprovados: number;
  pend_verif: number;
  pend_aprov: number;
  val_pend_verif: number;
  val_pend_aprov: number;
}

export function useGitecByFiscal() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [GITEC_KEY, "by-fiscal", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<GitecFiscalRow[]> => {
      const { data, error } = await supabase.from("gitec_by_fiscal").select("*");
      if (error) throw error;
      return ((data ?? []) as any[])
        .map(r => ({
          ...r,
          total: Number(r.total) || 0,
          aprovados: Number(r.aprovados) || 0,
          pend_verif: Number(r.pend_verif) || 0,
          pend_aprov: Number(r.pend_aprov) || 0,
          val_pend_verif: Number(r.val_pend_verif) || 0,
          val_pend_aprov: Number(r.val_pend_aprov) || 0,
        }))
        .sort((a, b) => (b.val_pend_verif + b.val_pend_aprov) - (a.val_pend_verif + a.val_pend_aprov));
    },
  });
}

export interface GitecIPPURow {
  ippu: string;
  total_eventos: number;
  aprovados: number;
  pend_verificacao: number;
  pend_aprovacao: number;
  val_aprovado: number;
  val_pend_verif: number;
  val_pend_aprov: number;
  val_total: number;
}

export function useGitecByIPPU() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [GITEC_KEY, "by-ippu", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<GitecIPPURow[]> => {
      const { data, error } = await supabase.from("gitec_by_ippu").select("*");
      if (error) throw error;
      return ((data ?? []) as any[])
        .map(r => ({
          ...r,
          val_aprovado: Number(r.val_aprovado) || 0,
          val_pend_verif: Number(r.val_pend_verif) || 0,
          val_pend_aprov: Number(r.val_pend_aprov) || 0,
          val_total: Number(r.val_total) || 0,
        }))
        .sort((a, b) => (b.val_pend_verif + b.val_pend_aprov) - (a.val_pend_verif + a.val_pend_aprov));
    },
  });
}

export function useGitecEventDetail(eventId: string | null) {
  return useQuery({
    queryKey: [GITEC_KEY, "detail", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data: event, error } = await supabase.from("gitec_events").select("*").eq("id", eventId!).maybeSingle();
      if (error) throw error;
      if (!event) return null;

      // Parse evidence numbers
      const evidenceNums = (event.evidencias ?? "")
        .split(";")
        .map((s: string) => s.trim())
        .filter(Boolean);

      let documents: any[] = [];
      let revisions: any[] = [];

      if (evidenceNums.length > 0) {
        const orFilters = evidenceNums.map((n: string) => `documento.ilike.%${n}%`).join(",");
        const [docsRes, revsRes] = await Promise.all([
          supabase.from("documents").select("*").or(orFilters).limit(50),
          supabase.from("document_revisions").select("*").or(orFilters).limit(50),
        ]);
        documents = docsRes.data ?? [];
        revisions = revsRes.data ?? [];
      }

      return {
        ...event,
        valor: Number(event.valor) || 0,
        aging: calcAging(event.data_inf_execucao),
        evidenceNums,
        documents,
        revisions,
      };
    },
  });
}
