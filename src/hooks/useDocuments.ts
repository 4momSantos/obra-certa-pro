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
}

export function useDocumentStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [DOCS_KEY, "stats", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<DocStats> => {
      const [docsRes, gitecRes] = await Promise.all([
        supabase.from("sigem_documents").select("id, status_correto, documento"),
        supabase.from("rel_eventos").select("numero_evidencias, valor"),
      ]);
      if (docsRes.error) throw docsRes.error;
      const docs = docsRes.data ?? [];
      const gitecEvents = gitecRes.data ?? [];

      // Status counts
      const statusMap = new Map<string, number>();
      for (const d of docs) {
        const s = d.status_correto || "Sem Status";
        statusMap.set(s, (statusMap.get(s) ?? 0) + 1);
      }
      const byStatus = [...statusMap.entries()]
        .map(([status, count]) => ({ status, count, pct: docs.length ? Math.round((count / docs.length) * 100) : 0 }))
        .sort((a, b) => b.count - a.count);

      // Recusados com GITEC
      const recusadoDocs = new Set(docs.filter(d => d.status_correto === "Recusado").map(d => d.documento));
      let recusadosComGitec = 0;
      let valorGitecImpactado = 0;
      for (const ge of gitecEvents) {
        const evids = (ge.numero_evidencias ?? "").split(";").map((s: string) => s.trim()).filter(Boolean);
        for (const ev of evids) {
          if (recusadoDocs.has(ev)) {
            recusadosComGitec++;
            valorGitecImpactado += Number(ge.valor) || 0;
            break;
          }
        }
      }

      return { total: docs.length, byStatus, recusadosComGitec, valorGitecImpactado };
    },
  });
}

export interface DocumentRow {
  id: string;
  documento: string;
  revisao: string;
  titulo: string;
  status: string;
  up: string;
  ppu: string;
  status_gitec: string;
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
      let q = supabase.from("sigem_documents").select("*").order("documento").limit(limit);
      if (filters.status !== "all") q = q.eq("status_correto", filters.status);
      if (filters.search) q = q.or(`documento.ilike.%${filters.search}%,titulo.ilike.%${filters.search}%`);

      const { data, error } = await q;
      if (error) throw error;

      const docs: DocumentRow[] = (data ?? []).map(d => ({
        id: d.id,
        documento: d.documento,
        revisao: d.revisao ?? "",
        titulo: d.titulo ?? "",
        status: d.status_correto ?? "",
        up: d.up ?? "",
        ppu: d.ppu ?? "",
        status_gitec: d.status_gitec ?? "",
        hasRecusa: d.status_correto === "Recusado",
      }));

      // Enrich with GITEC info via rel_eventos
      const docNums = docs.map(d => d.documento);
      const { data: gitecData } = await supabase.from("rel_eventos").select("numero_evidencias");

      const gitecMap = new Map<string, number>();
      for (const ge of gitecData ?? []) {
        const evids = (ge.numero_evidencias ?? "").split(";").map((s: string) => s.trim()).filter(Boolean);
        for (const ev of evids) {
          if (docNums.includes(ev)) gitecMap.set(ev, (gitecMap.get(ev) ?? 0) + 1);
        }
      }

      for (const d of docs) {
        d.hasGitec = gitecMap.has(d.documento);
        d.gitecCount = gitecMap.get(d.documento) ?? 0;
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
  up: string;
  ppu: string;
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
      const { data: recusados, error } = await supabase
        .from("sigem_documents")
        .select("*")
        .eq("status_correto", "Recusado")
        .order("documento");
      if (error) throw error;
      if (!recusados || recusados.length === 0) return [];

      const { data: gitecEvents } = await supabase.from("rel_eventos").select("numero_evidencias, valor");
      const gitecMap = new Map<string, { count: number; valor: number }>();
      for (const ge of gitecEvents ?? []) {
        const evids = (ge.numero_evidencias ?? "").split(";").map((s: string) => s.trim()).filter(Boolean);
        for (const ev of evids) {
          const cur = gitecMap.get(ev) ?? { count: 0, valor: 0 };
          cur.count++;
          cur.valor += Number(ge.valor) || 0;
          gitecMap.set(ev, cur);
        }
      }

      return recusados.map(r => ({
        id: r.id,
        documento: r.documento,
        revisao: r.revisao ?? "",
        titulo: r.titulo ?? "",
        up: r.up ?? "",
        ppu: r.ppu ?? "",
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
      const [docRes, gitecRes] = await Promise.all([
        supabase.from("sigem_documents").select("*").eq("documento", documento!).order("revisao", { ascending: false }),
        supabase.from("rel_eventos").select("*").ilike("numero_evidencias", `%${documento!}%`).limit(50),
      ]);
      const allRevisions = docRes.data ?? [];
      return {
        doc: allRevisions[0] ?? null,
        revisions: allRevisions,
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
      const { data, error } = await supabase.from("sigem_documents").select("status_correto");
      if (error) throw error;
      return [...new Set((data ?? []).map(d => d.status_correto).filter(Boolean))].sort();
    },
  });
}
