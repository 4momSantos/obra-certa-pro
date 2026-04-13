/**
 * HOOKS DE DADOS COMPARTILHADOS
 * ==============================
 * Hooks canônicos para as tabelas/views mais acessadas.
 *
 * REGRAS:
 *  - Cada tabela/view com acesso multi-hook TEM um hook aqui.
 *  - Outros hooks NUNCA devem chamar .from("tabela") diretamente
 *    para essas tabelas — devem importar o hook canônico daqui e
 *    derivar via useMemo.
 *  - A mesma queryKey garante cache único no React Query: a tabela
 *    é buscada uma única vez, independente de quantos hooks chamam
 *    o canônico ao mesmo tempo.
 *
 * TABELAS/VIEWS COBERTAS:
 *  gitec_events         → useGitecEventsAll
 *  vw_gitec_por_ppu     → useGitecPorPpu
 *  vw_scon_por_ppu      → useSconPorPpu
 *  ppu_items            → usePpuItemsAll
 *  classificacao_ppu    → useClassificacaoPpuAll
 *  sigem_documents      → useSigemDocumentsAll
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SHARED_QUERY_KEYS } from "@/lib/query-keys";

// ─── Helpers internos ────────────────────────────────────────────────────────

async function fetchAllRows<T>(
  table: string,
  select = "*",
  extraFilter?: (q: ReturnType<typeof supabase.from>) => ReturnType<typeof supabase.from>
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    let q = (supabase.from(table as any) as any).select(select).range(from, from + PAGE - 1);
    if (extraFilter) q = extraFilter(q);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

// ─── gitec_events ─────────────────────────────────────────────────────────────

export interface GitecEventRaw {
  id: string;
  ippu: string | null;
  tag: string | null;
  etapa: string | null;
  status: string | null;
  valor: number | null;
  data_execucao: string | null;
  data_inf_execucao: string | null;
  data_aprovacao: string | null;
  executado_por: string | null;
  fiscal: string | null;
  evidencias: string | null;
  [key: string]: unknown;
}

/**
 * Hook canônico para gitec_events.
 * Todos os campos ("*") são retornados para permitir qualquer derivação.
 * queryKey: ["gitec-events-all", userId]
 */
export function useGitecEventsAll() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [SHARED_QUERY_KEYS.GITEC_EVENTS_ALL, user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: () => fetchAllRows<GitecEventRaw>("gitec_events"),
  });
}

// ─── vw_gitec_por_ppu ────────────────────────────────────────────────────────

export interface GitecPorPpuRaw {
  item_ppu: string | null;
  total_eventos: number | null;
  eventos_concluidos: number | null;
  eventos_pendentes: number | null;
  valor_total: number | null;
  valor_aprovado: number | null;
  valor_pendente: number | null;
  [key: string]: unknown;
}

/**
 * Hook canônico para vw_gitec_por_ppu.
 * queryKey: ["gitec-por-ppu", userId]
 */
export function useGitecPorPpu() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [SHARED_QUERY_KEYS.GITEC_POR_PPU, user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<GitecPorPpuRaw[]> => {
      const { data, error } = await supabase.from("vw_gitec_por_ppu" as any).select("*");
      if (error) throw error;
      return (data || []) as GitecPorPpuRaw[];
    },
  });
}

/** Utilitário: retorna um Map<item_ppu, GitecPorPpuRaw> a partir dos dados do hook canônico */
export function useGitecPorPpuMap() {
  const { data: rows = [], ...rest } = useGitecPorPpu();
  const map = useMemo(() => {
    const m = new Map<string, GitecPorPpuRaw>();
    rows.forEach(r => { if (r.item_ppu) m.set(String(r.item_ppu).replace(/_/g, "-"), r); });
    return m;
  }, [rows]);
  return { data: map, ...rest };
}

// ─── vw_scon_por_ppu ─────────────────────────────────────────────────────────

export interface SconPorPpuRaw {
  item_wbs: string | null;
  avg_avanco: number | null;
  total_componentes: number | null;
  concluidos: number | null;
  em_andamento: number | null;
  nao_iniciados: number | null;
  [key: string]: unknown;
}

/**
 * Hook canônico para vw_scon_por_ppu.
 * queryKey: ["scon-por-ppu", userId]
 */
export function useSconPorPpu() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [SHARED_QUERY_KEYS.SCON_POR_PPU, user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SconPorPpuRaw[]> => {
      const { data, error } = await supabase.from("vw_scon_por_ppu" as any).select("*");
      if (error) throw error;
      return (data || []) as SconPorPpuRaw[];
    },
  });
}

/** Utilitário: retorna um Map<item_wbs_normalizado, SconPorPpuRaw> */
export function useSconPorPpuMap() {
  const { data: rows = [], ...rest } = useSconPorPpu();
  const map = useMemo(() => {
    const m = new Map<string, SconPorPpuRaw>();
    rows.forEach(r => { if (r.item_wbs) m.set(String(r.item_wbs).replace(/_/g, "-"), r); });
    return m;
  }, [rows]);
  return { data: map, ...rest };
}

// ─── ppu_items ───────────────────────────────────────────────────────────────

export interface PpuItemRaw {
  item_ppu: string | null;
  descricao: string | null;
  fase: string | null;
  subfase: string | null;
  agrupamento: string | null;
  disc: string | null;
  valor_total: number | null;
  valor_medido: number | null;
  preco_unit: number | null;
  qtd: number | null;
  [key: string]: unknown;
}

/**
 * Hook canônico para ppu_items (todos os registros).
 * queryKey: ["ppu-items-all", userId]
 */
export function usePpuItemsAll() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [SHARED_QUERY_KEYS.PPU_ITEMS_ALL, user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: () => fetchAllRows<PpuItemRaw>("ppu_items"),
  });
}

// ─── classificacao_ppu ───────────────────────────────────────────────────────

export interface ClassificacaoPpuRaw {
  item_ppu: string | null;
  item_gitec: string | null;
  fase: string | null;
  subfase: string | null;
  agrupamento: string | null;
  disciplina: string | null;
  [key: string]: unknown;
}

/**
 * Hook canônico para classificacao_ppu.
 * queryKey: ["classificacao-ppu-all", userId]
 */
export function useClassificacaoPpuAll() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [SHARED_QUERY_KEYS.CLASSIFICACAO_PPU_ALL, user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: () => fetchAllRows<ClassificacaoPpuRaw>("classificacao_ppu"),
  });
}

/** Utilitário: retorna um Map<item_ppu, ClassificacaoPpuRaw> */
export function useClassificacaoPpuMap() {
  const { data: rows = [], ...rest } = useClassificacaoPpuAll();
  const map = useMemo(() => {
    const m = new Map<string, ClassificacaoPpuRaw>();
    rows.forEach(r => { if (r.item_ppu) m.set(String(r.item_ppu), r); });
    return m;
  }, [rows]);
  return { data: map, ...rest };
}

// ─── sigem_documents ─────────────────────────────────────────────────────────

export interface SigemDocumentRaw {
  id: string | null;
  documento: string | null;
  titulo: string | null;
  ppu: string | null;
  status_correto: string | null;
  incluido_em: string | null;
  [key: string]: unknown;
}

/**
 * Hook canônico para sigem_documents.
 * queryKey: ["sigem-docs-all", userId]
 */
export function useSigemDocumentsAll() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [SHARED_QUERY_KEYS.SIGEM_DOCUMENTS_ALL, user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SigemDocumentRaw[]> => {
      const { data, error } = await supabase.from("sigem_documents" as any).select("*");
      if (error) throw error;
      return (data || []) as SigemDocumentRaw[];
    },
  });
}
