import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useContrato } from "@/contexts/ContratoContext";
import { toast } from "sonner";

// ── Types ──

export interface ConfigDisciplina {
  id: string;
  contrato_id: string;
  codigo: string;
  nome: string;
  nome_scon: string;
  sigla_documento: string;
  cor: string;
  icone: string;
  ativa: boolean;
  ordem: number;
}

export interface ConfigStatusMap {
  id: string;
  contrato_id: string;
  sistema: string;
  status_original: string;
  classificacao: string;
  cor: string;
  descricao: string;
}

export interface ConfigFiltroDoc {
  id: string;
  contrato_id: string;
  tipo: string;
  valor: string;
  acao: string;
  ativo: boolean;
  descricao: string;
}

export interface ConfigRegra {
  id: string;
  contrato_id: string;
  regra: string;
  valor: string;
  tipo: string;
  descricao: string;
}

export interface ConfigAlerta {
  id: string;
  contrato_id: string;
  tipo_alerta: string;
  ativo: boolean;
  severidade: string;
  threshold_valor: number;
  descricao: string;
}

// ── Hook ──

export function useContratoConfig() {
  const { contratoAtivo } = useContrato();
  const cid = contratoAtivo?.id;

  const disciplinas = useQuery({
    queryKey: ["config-disciplinas", cid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_disciplinas")
        .select("*")
        .eq("contrato_id", cid!)
        .order("ordem");
      if (error) throw error;
      return (data || []) as unknown as ConfigDisciplina[];
    },
    enabled: !!cid,
    staleTime: 10 * 60_000,
  });

  const statusMap = useQuery({
    queryKey: ["config-status", cid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_mapeamento_status")
        .select("*")
        .eq("contrato_id", cid!);
      if (error) throw error;
      return (data || []) as unknown as ConfigStatusMap[];
    },
    enabled: !!cid,
    staleTime: 10 * 60_000,
  });

  const filtros = useQuery({
    queryKey: ["config-filtros", cid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_filtro_documentos")
        .select("*")
        .eq("contrato_id", cid!);
      if (error) throw error;
      return (data || []) as unknown as ConfigFiltroDoc[];
    },
    enabled: !!cid,
    staleTime: 10 * 60_000,
  });

  const regras = useQuery({
    queryKey: ["config-regras", cid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_regras_medicao")
        .select("*")
        .eq("contrato_id", cid!);
      if (error) throw error;
      return (data || []) as unknown as ConfigRegra[];
    },
    enabled: !!cid,
    staleTime: 10 * 60_000,
  });

  const alertas = useQuery({
    queryKey: ["config-alertas", cid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_alertas")
        .select("*")
        .eq("contrato_id", cid!);
      if (error) throw error;
      return (data || []) as unknown as ConfigAlerta[];
    },
    enabled: !!cid,
    staleTime: 10 * 60_000,
  });

  // ── Helper functions ──

  const classifyStatus = useCallback(
    (sistema: string, statusOriginal: string) => {
      const map = (statusMap.data || []).find(
        (s) => s.sistema === sistema && s.status_original === statusOriginal
      );
      return map
        ? { classificacao: map.classificacao, cor: map.cor }
        : { classificacao: "pendente", cor: "gray" };
    },
    [statusMap.data]
  );

  const mapDisciplina = useCallback(
    (nomeSCON: string) => {
      return (disciplinas.data || []).find((d) => d.nome_scon === nomeSCON) || null;
    },
    [disciplinas.data]
  );

  const getRegra = useCallback(
    (regra: string): string => {
      return (regras.data || []).find((r) => r.regra === regra)?.valor || "";
    },
    [regras.data]
  );

  const getRegraNum = useCallback(
    (regra: string): number => parseFloat(getRegra(regra)) || 0,
    [getRegra]
  );

  const getRegraBool = useCallback(
    (regra: string): boolean => getRegra(regra) === "true",
    [getRegra]
  );

  const shouldIncludeDoc = useCallback(
    (documento: string): boolean => {
      const activeFilters = (filtros.data || []).filter((f) => f.ativo);
      if (activeFilters.length === 0) return true;

      const excludes = activeFilters.filter((f) => f.acao === "excluir");
      if (excludes.some((e) => documento.includes(e.valor))) return false;

      const prefixos = activeFilters.filter((f) => f.tipo === "prefixo" && f.acao === "incluir");
      if (prefixos.length > 0 && !prefixos.some((p) => documento.startsWith(p.valor)))
        return false;

      if (documento.startsWith("C1N_")) {
        const match = documento.match(/C1N_\w+_\w+_[\d.]+_(\w+)_(\w+)/);
        if (match) {
          const docDisc = match[1];
          const docTipo = match[2];
          const discFiltros = activeFilters.filter(
            (f) => f.tipo === "disciplina_doc" && f.acao === "incluir"
          );
          if (discFiltros.length > 0 && !discFiltros.some((d) => d.valor === docDisc))
            return false;
          const tipoFiltros = activeFilters.filter(
            (f) => f.tipo === "tipo_doc" && f.acao === "incluir"
          );
          if (tipoFiltros.length > 0 && !tipoFiltros.some((t) => t.valor === docTipo))
            return false;
        }
      }

      return true;
    },
    [filtros.data]
  );

  return {
    contratoId: cid,
    disciplinas: disciplinas.data || [],
    statusMap: statusMap.data || [],
    filtros: filtros.data || [],
    regras: regras.data || [],
    alertas: alertas.data || [],
    classifyStatus,
    mapDisciplina,
    getRegra,
    getRegraNum,
    getRegraBool,
    shouldIncludeDoc,
    isLoading:
      disciplinas.isLoading ||
      statusMap.isLoading ||
      filtros.isLoading ||
      regras.isLoading ||
      alertas.isLoading,
  };
}

// ── Mutation hooks ──

export function useSaveDisciplinas() {
  const qc = useQueryClient();
  const { contratoAtivo } = useContrato();

  return useMutation({
    mutationFn: async (rows: Partial<ConfigDisciplina>[]) => {
      if (!contratoAtivo) throw new Error("Sem contrato ativo");
      const mapped = rows.map((r) => ({ ...r, contrato_id: contratoAtivo.id }));
      const { error } = await supabase.from("config_disciplinas").upsert(mapped as any, {
        onConflict: "id",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["config-disciplinas"] });
      toast.success("Disciplinas salvas");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useSaveStatusMap() {
  const qc = useQueryClient();
  const { contratoAtivo } = useContrato();

  return useMutation({
    mutationFn: async (rows: Partial<ConfigStatusMap>[]) => {
      if (!contratoAtivo) throw new Error("Sem contrato ativo");
      const mapped = rows.map((r) => ({ ...r, contrato_id: contratoAtivo.id }));
      const { error } = await supabase.from("config_mapeamento_status").upsert(mapped as any, {
        onConflict: "id",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["config-status"] });
      toast.success("Mapeamento de status salvo");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useSaveFiltros() {
  const qc = useQueryClient();
  const { contratoAtivo } = useContrato();

  return useMutation({
    mutationFn: async (rows: Partial<ConfigFiltroDoc>[]) => {
      if (!contratoAtivo) throw new Error("Sem contrato ativo");
      const mapped = rows.map((r) => ({ ...r, contrato_id: contratoAtivo.id }));
      const { error } = await supabase.from("config_filtro_documentos").upsert(mapped as any, {
        onConflict: "id",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["config-filtros"] });
      toast.success("Filtros de documentos salvos");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useSaveRegras() {
  const qc = useQueryClient();
  const { contratoAtivo } = useContrato();

  return useMutation({
    mutationFn: async (rows: Partial<ConfigRegra>[]) => {
      if (!contratoAtivo) throw new Error("Sem contrato ativo");
      const mapped = rows.map((r) => ({ ...r, contrato_id: contratoAtivo.id }));
      const { error } = await supabase.from("config_regras_medicao").upsert(mapped as any, {
        onConflict: "id",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["config-regras"] });
      toast.success("Regras de medição salvas");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useSaveAlertas() {
  const qc = useQueryClient();
  const { contratoAtivo } = useContrato();

  return useMutation({
    mutationFn: async (rows: Partial<ConfigAlerta>[]) => {
      if (!contratoAtivo) throw new Error("Sem contrato ativo");
      const mapped = rows.map((r) => ({ ...r, contrato_id: contratoAtivo.id }));
      const { error } = await supabase.from("config_alertas").upsert(mapped as any, {
        onConflict: "id",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["config-alertas"] });
      toast.success("Alertas salvos");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}
