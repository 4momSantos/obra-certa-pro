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
  concluidos: number;
  valConcluidos: number;
  pendentes: number;
  valPendentes: number;
  aprovados: number;
  valAprovado: number;
  pendVerif: number;
  valPendVerif: number;
  pendAprov: number;
  valPendAprov: number;
  outros: number;
  valOutros: number;
  agingMedio: number;
  agingMaximo: number;
}

function normalizeStatus(s: string): string {
  const low = (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  if (low.includes("aprovado") && !low.includes("pendente")) return "Aprovado";
  if (low.includes("pendente") && (low.includes("verificac") || low.includes("verific"))) return "Pendente de Verificação";
  if (low.includes("pendente") && low.includes("aprovac")) return "Pendente de Aprovação";
  return s || "Outros";
}

export function useGitecStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [GITEC_KEY, "stats", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<GitecStats> => {
      const rows: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("gitec_events")
          .select("etapa, status, valor, data_inf_execucao")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }

      if (rows.length === 0)
        return { total: 0, concluidos: 0, valConcluidos: 0, pendentes: 0, valPendentes: 0, aprovados: 0, valAprovado: 0, pendVerif: 0, valPendVerif: 0, pendAprov: 0, valPendAprov: 0, outros: 0, valOutros: 0, agingMedio: 0, agingMaximo: 0 };

      let concluidos = 0, valConcluidos = 0, pendentes = 0, valPendentes = 0;
      let aprovados = 0, valAprovado = 0, pendVerif = 0, valPendVerif = 0, pendAprov = 0, valPendAprov = 0;
      let outros = 0, valOutros = 0;
      const agings: number[] = [];

      for (const r of rows) {
        const v = Number(r.valor) || 0;
        const etapaLow = ((r.etapa || "") as string).toLowerCase();
        if (etapaLow.includes("conclu")) { concluidos++; valConcluidos += v; }
        else { pendentes++; valPendentes += v; }

        const ns = normalizeStatus(r.status);
        if (ns === "Aprovado") { aprovados++; valAprovado += v; }
        else if (ns === "Pendente de Verificação") {
          pendVerif++; valPendVerif += v;
          if (r.data_inf_execucao) agings.push(calcAging(r.data_inf_execucao));
        } else if (ns === "Pendente de Aprovação") {
          pendAprov++; valPendAprov += v;
          if (r.data_inf_execucao) agings.push(calcAging(r.data_inf_execucao));
        } else {
          outros++; valOutros += v;
        }
      }

      return {
        total: rows.length,
        concluidos, valConcluidos,
        pendentes, valPendentes,
        aprovados, valAprovado,
        pendVerif, valPendVerif,
        pendAprov, valPendAprov,
        outros, valOutros,
        agingMedio: agings.length ? Math.round(agings.reduce((a, b) => a + b, 0) / agings.length) : 0,
        agingMaximo: agings.length ? Math.max(...agings) : 0,
      };
    },
  });
}

export function useGitecFiscais() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [GITEC_KEY, "fiscais-list", user?.id],
    enabled: !!user,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("vw_fiscais").select("fiscal_responsavel");
      if (error) throw error;
      return (data ?? []).map(r => r.fiscal_responsavel).filter(Boolean).sort() as string[];
    },
  });
}

export interface GitecEvent {
  id: string;
  item_ppu: string;
  tag: string;
  etapa: string;
  status: string;
  valor: number;
  quantidade_ponderada: number;
  data_execucao: string | null;
  data_inf_execucao: string | null;
  data_aprovacao: string | null;
  executado_por: string;
  fiscal_responsavel: string;
  numero_evidencias: string;
  aging: number;
}

export function useGitecEvents(filters: GitecFilters, limit = 100) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [GITEC_KEY, "events", filters, limit, user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<GitecEvent[]> => {
      let q = supabase
        .from("gitec_events")
        .select("id, ippu, tag, etapa, status, valor, data_execucao, data_inf_execucao, data_aprovacao, executado_por, fiscal, evidencias")
        .order("valor", { ascending: false })
        .limit(limit);

      if (filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.fiscal !== "all") q = q.eq("fiscal", filters.fiscal);
      if (filters.search) {
        q = q.or(`tag.ilike.%${filters.search}%,ippu.ilike.%${filters.search}%,fiscal.ilike.%${filters.search}%`);
      }

      const { data, error } = await q;
      if (error) throw error;

      let rows = (data ?? []).map(r => ({
        ...r,
        item_ppu: r.ippu || "",
        valor: Number(r.valor) || 0,
        quantidade_ponderada: 0,
        fiscal_responsavel: r.fiscal || "",
        numero_evidencias: r.evidencias || "",
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
  fiscal_responsavel: string;
  total: number;
  aprovados: number;
  pendentes: number;
  valor_pendente: number;
  valor_aprovado: number;
}

export function useGitecByFiscal() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [GITEC_KEY, "by-fiscal", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<GitecFiscalRow[]> => {
      const { data, error } = await supabase.from("vw_fiscais").select("*");
      if (error) throw error;
      return ((data ?? []) as any[])
        .map(r => ({
          fiscal_responsavel: r.fiscal_responsavel ?? "",
          total: Number(r.total) || 0,
          aprovados: Number(r.aprovados) || 0,
          pendentes: Number(r.pendentes) || 0,
          valor_pendente: Number(r.valor_pendente) || 0,
          valor_aprovado: Number(r.valor_aprovado) || 0,
        }))
        .sort((a, b) => b.valor_pendente - a.valor_pendente);
    },
  });
}

export interface GitecIPPURow {
  item_ppu: string;
  total_eventos: number;
  eventos_concluidos: number;
  eventos_pendentes: number;
  valor_total: number;
  valor_aprovado: number;
  valor_pendente: number;
}

export function useGitecByIPPU() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [GITEC_KEY, "by-ippu", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<GitecIPPURow[]> => {
      const { data, error } = await supabase.from("vw_gitec_por_ppu").select("*");
      if (error) throw error;
      return ((data ?? []) as any[])
        .map(r => ({
          item_ppu: r.item_ppu ?? "",
          total_eventos: Number(r.total_eventos) || 0,
          eventos_concluidos: Number(r.eventos_concluidos) || 0,
          eventos_pendentes: Number(r.eventos_pendentes) || 0,
          valor_total: Number(r.valor_total) || 0,
          valor_aprovado: Number(r.valor_aprovado) || 0,
          valor_pendente: Number(r.valor_pendente) || 0,
        }))
        .sort((a, b) => b.valor_pendente - a.valor_pendente);
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
        // Map gitec_events fields to expected interface
        agrupamento_ippu: event.ippu || "",
        fiscal_responsavel: event.fiscal || "",
        numero_evidencias: event.evidencias || "",
        valor: Number(event.valor) || 0,
        aging: calcAging(event.data_inf_execucao),
        evidenceNums,
        documents,
        revisions,
      };
    },
  });
}
