import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const DOCS_KEY = "documents";

export interface DocFilters {
  search: string;
  status: string;
  vinculo: string; // all | gitec | recusa
}

export const defaultDocFilters: DocFilters = { search: "", status: "all", vinculo: "all" };

export interface DocStats {
  total: number;
  byStatus: { status: string; count: number; pct: number }[];
  recusadosComGitec: number;
  valorGitecImpactado: number;
  workflowLongo: number;
}

export function useDocumentStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [DOCS_KEY, "stats", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<DocStats> => {
      const [docsRes, revsRes, gitecRes] = await Promise.all([
        supabase.from("documents").select("id, status, dias_corridos_wf, documento"),
        supabase.from("document_revisions").select("documento, status"),
        supabase.from("gitec_events").select("evidencias, valor"),
      ]);
      if (docsRes.error) throw docsRes.error;
      const docs = docsRes.data ?? [];
      const revs = revsRes.data ?? [];
      const gitecEvents = gitecRes.data ?? [];

      // Status counts
      const statusMap = new Map<string, number>();
      for (const d of docs) {
        const s = d.status || "Sem Status";
        statusMap.set(s, (statusMap.get(s) ?? 0) + 1);
      }
      const byStatus = [...statusMap.entries()]
        .map(([status, count]) => ({ status, count, pct: docs.length ? Math.round((count / docs.length) * 100) : 0 }))
        .sort((a, b) => b.count - a.count);

      // Recusados com GITEC
      const recusadoDocs = new Set(revs.filter(r => r.status === "Recusado").map(r => r.documento));
      let recusadosComGitec = 0;
      let valorGitecImpactado = 0;
      for (const ge of gitecEvents) {
        const evids = (ge.evidencias ?? "").split(";").map((s: string) => s.trim()).filter(Boolean);
        for (const ev of evids) {
          if (recusadoDocs.has(ev)) {
            recusadosComGitec++;
            valorGitecImpactado += Number(ge.valor) || 0;
            break;
          }
        }
      }

      const workflowLongo = docs.filter(d => (d.dias_corridos_wf ?? 0) > 30).length;

      return { total: docs.length, byStatus, recusadosComGitec, valorGitecImpactado, workflowLongo };
    },
  });
}

export interface DocumentRow {
  id: string;
  documento: string;
  revisao: string;
  titulo: string;
  status: string;
  nivel2: string;
  nivel3: string;
  tipo: string;
  status_workflow: string;
  dias_corridos_wf: number;
  hasGitec?: boolean;
  gitecCount?: number;
  hasRecusa?: boolean;
}

export function useDocuments(filters: DocFilters, limit = 100) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [DOCS_KEY, "list", filters, limit, user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<DocumentRow[]> => {
      let q = supabase.from("documents").select("*").order("documento").limit(limit);
      if (filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.search) q = q.or(`documento.ilike.%${filters.search}%,titulo.ilike.%${filters.search}%`);

      const { data, error } = await q;
      if (error) throw error;

      const docs: DocumentRow[] = (data ?? []).map(d => ({
        ...d,
        dias_corridos_wf: d.dias_corridos_wf ?? 0,
      }));

      // Enrich with GITEC and recusa info
      const docNums = docs.map(d => d.documento);
      const [gitecRes, revsRes] = await Promise.all([
        supabase.from("gitec_events").select("evidencias"),
        supabase.from("document_revisions").select("documento, status").in("documento", docNums),
      ]);

      const gitecMap = new Map<string, number>();
      for (const ge of gitecRes.data ?? []) {
        const evids = (ge.evidencias ?? "").split(";").map((s: string) => s.trim()).filter(Boolean);
        for (const ev of evids) {
          if (docNums.includes(ev)) gitecMap.set(ev, (gitecMap.get(ev) ?? 0) + 1);
        }
      }

      const recusaSet = new Set((revsRes.data ?? []).filter(r => r.status === "Recusado").map(r => r.documento));

      for (const d of docs) {
        d.hasGitec = gitecMap.has(d.documento);
        d.gitecCount = gitecMap.get(d.documento) ?? 0;
        d.hasRecusa = recusaSet.has(d.documento);
      }

      // Client-side filter for vinculo
      if (filters.vinculo === "gitec") return docs.filter(d => d.hasGitec);
      if (filters.vinculo === "recusa") return docs.filter(d => d.hasRecusa);
      return docs;
    },
  });
}

export interface RecusadoRow {
  id: string;
  documento: string;
  revisao: string;
  titulo: string;
  nivel2: string;
  texto_consolidacao: string;
  gitecCount: number;
  gitecValor: number;
}

export function useRecusados() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [DOCS_KEY, "recusados", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<RecusadoRow[]> => {
      const { data: revs, error } = await supabase
        .from("document_revisions")
        .select("*")
        .eq("status", "Recusado")
        .order("documento");
      if (error) throw error;
      if (!revs || revs.length === 0) return [];

      const { data: gitecEvents } = await supabase.from("gitec_events").select("evidencias, valor");
      const gitecMap = new Map<string, { count: number; valor: number }>();
      for (const ge of gitecEvents ?? []) {
        const evids = (ge.evidencias ?? "").split(";").map((s: string) => s.trim()).filter(Boolean);
        for (const ev of evids) {
          const cur = gitecMap.get(ev) ?? { count: 0, valor: 0 };
          cur.count++;
          cur.valor += Number(ge.valor) || 0;
          gitecMap.set(ev, cur);
        }
      }

      return revs.map(r => ({
        id: r.id,
        documento: r.documento,
        revisao: r.revisao ?? "",
        titulo: r.titulo ?? "",
        nivel2: r.nivel2 ?? "",
        texto_consolidacao: r.texto_consolidacao ?? "",
        gitecCount: gitecMap.get(r.documento)?.count ?? 0,
        gitecValor: gitecMap.get(r.documento)?.valor ?? 0,
      }));
    },
  });
}

export function useDocumentDetail(documento: string | null) {
  return useQuery({
    queryKey: [DOCS_KEY, "detail", documento],
    enabled: !!documento,
    queryFn: async () => {
      const [docRes, revsRes, gitecRes] = await Promise.all([
        supabase.from("documents").select("*").eq("documento", documento!).limit(1),
        supabase.from("document_revisions").select("*").eq("documento", documento!).order("modificado_em", { ascending: false }),
        supabase.from("gitec_events").select("*").ilike("evidencias", `%${documento!}%`).limit(50),
      ]);
      return {
        doc: (docRes.data ?? [])[0] ?? null,
        revisions: revsRes.data ?? [],
        gitecEvents: (gitecRes.data ?? []).map((e: any) => ({ ...e, valor: Number(e.valor) || 0 })),
      };
    },
  });
}

export function useDocumentStatuses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [DOCS_KEY, "statuses", user?.id],
    enabled: !!user,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("status");
      if (error) throw error;
      return [...new Set((data ?? []).map(d => d.status).filter(Boolean))].sort();
    },
  });
}
