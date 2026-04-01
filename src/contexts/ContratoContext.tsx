import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ──

interface Contrato {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  numero_contrato: string;
  valor_contratual: number;
  unidade: string;
  bm_total: number;
  bm_mes_referencia: string;
  bm_dia_inicio: number;
  bm_dia_fim: number;
  alerta_aging_dias: number;
  alerta_scon_minimo: number;
  alerta_dados_desatualizados: number;
  logo_url: string;
  cor_primaria: string;
  ativo: boolean;
}

interface ContratoUsuario {
  contrato_id: string;
  role: string;
  disciplinas: string[];
  modulos_acesso: string[];
  ativo: boolean;
}

interface ModuloPermissao {
  pode_ver: boolean;
  pode_editar: boolean;
  pode_criar: boolean;
  pode_excluir: boolean;
  pode_exportar: boolean;
}

interface ContratoContextType {
  contratos: Contrato[];
  contratoAtivo: Contrato | null;
  roleNoContrato: string | null;
  disciplinasPermitidas: string[];
  permissoes: Record<string, ModuloPermissao>;
  setContratoAtivo: (id: string) => void;
  temPermissao: (modulo: string, acao: "ver" | "editar" | "criar" | "excluir" | "exportar") => boolean;
  loading: boolean;
}

const STORAGE_KEY = "splan_contrato_ativo";

const ContratoContext = createContext<ContratoContextType>({} as ContratoContextType);

export const useContrato = () => useContext(ContratoContext);

// ── Provider ──

export function ContratoProvider({ children }: { children: React.ReactNode }) {
  const { user, role: globalRole } = useAuth();
  const [contratoAtivoId, setContratoAtivoId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );

  // Fetch contratos do usuário via contrato_usuarios
  const { data: vinculos = [], isLoading: loadingVinculos } = useQuery({
    queryKey: ["contrato-vinculos", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      // Admin global vê todos os contratos
      if (globalRole === "admin") {
        const { data } = await supabase
          .from("contratos" as any)
          .select("*")
          .eq("ativo", true)
          .order("codigo");
        return (data || []).map((c: any) => ({
          contrato: c as Contrato,
          vinculo: {
            contrato_id: c.id,
            role: "admin_contrato",
            disciplinas: [],
            modulos_acesso: [],
            ativo: true,
          } as ContratoUsuario,
        }));
      }

      const { data: cuData } = await supabase
        .from("contrato_usuarios" as any)
        .select("contrato_id, role, disciplinas, modulos_acesso, ativo")
        .eq("user_id", user!.id)
        .eq("ativo", true);

      if (!cuData || cuData.length === 0) return [];

      const ids = (cuData as any[]).map((cu) => cu.contrato_id);
      const { data: contratosData } = await supabase
        .from("contratos" as any)
        .select("*")
        .in("id", ids)
        .eq("ativo", true);

      return (contratosData || []).map((c: any) => ({
        contrato: c as Contrato,
        vinculo: (cuData as any[]).find((cu) => cu.contrato_id === c.id) as ContratoUsuario,
      }));
    },
  });

  const contratos = useMemo(() => vinculos.map((v) => v.contrato), [vinculos]);

  // Auto-select contrato
  useEffect(() => {
    if (contratos.length === 0) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && contratos.some((c) => c.id === saved)) {
      setContratoAtivoId(saved);
    } else {
      setContratoAtivoId(contratos[0].id);
      localStorage.setItem(STORAGE_KEY, contratos[0].id);
    }
  }, [contratos]);

  const setContratoAtivo = useCallback((id: string) => {
    setContratoAtivoId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const vinculoAtivo = useMemo(
    () => vinculos.find((v) => v.contrato.id === contratoAtivoId) ?? null,
    [vinculos, contratoAtivoId]
  );

  const contratoAtivo = vinculoAtivo?.contrato ?? null;
  const roleNoContrato = vinculoAtivo?.vinculo.role ?? null;
  const disciplinasPermitidas = vinculoAtivo?.vinculo.disciplinas ?? [];

  // Fetch permissões do role ativo
  const { data: permissoesRaw = [] } = useQuery({
    queryKey: ["permissoes-modulo", roleNoContrato],
    enabled: !!roleNoContrato,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("permissoes_modulo" as any)
        .select("modulo, pode_ver, pode_editar, pode_criar, pode_excluir, pode_exportar")
        .eq("role", roleNoContrato!);
      return ((data || []) as unknown) as Array<{
        modulo: string;
        pode_ver: boolean;
        pode_editar: boolean;
        pode_criar: boolean;
        pode_excluir: boolean;
        pode_exportar: boolean;
      }>;
    },
  });

  const permissoes = useMemo(() => {
    const map: Record<string, ModuloPermissao> = {};
    for (const p of permissoesRaw) {
      map[p.modulo] = {
        pode_ver: p.pode_ver,
        pode_editar: p.pode_editar,
        pode_criar: p.pode_criar,
        pode_excluir: p.pode_excluir,
        pode_exportar: p.pode_exportar,
      };
    }
    return map;
  }, [permissoesRaw]);

  const temPermissao = useCallback(
    (modulo: string, acao: "ver" | "editar" | "criar" | "excluir" | "exportar"): boolean => {
      // Admin global tem tudo
      if (globalRole === "admin") return true;

      const perm = permissoes[modulo];
      if (!perm) return false;

      const acaoMap: Record<string, keyof ModuloPermissao> = {
        ver: "pode_ver",
        editar: "pode_editar",
        criar: "pode_criar",
        excluir: "pode_excluir",
        exportar: "pode_exportar",
      };

      return perm[acaoMap[acao]] ?? false;
    },
    [globalRole, permissoes]
  );

  return (
    <ContratoContext.Provider
      value={{
        contratos,
        contratoAtivo,
        roleNoContrato,
        disciplinasPermitidas,
        permissoes,
        setContratoAtivo,
        temPermissao,
        loading: loadingVinculos,
      }}
    >
      {children}
    </ContratoContext.Provider>
  );
}
