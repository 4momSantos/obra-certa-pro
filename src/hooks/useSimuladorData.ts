import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SimuladorItem {
  ippu: string;
  nome: string;
  valor_contrato: number;
  valor_realizado: number;
  valor_previsto_bm: number;
  valor_projetado_bm: number;
  saldo: number;
  /** Previsto for the next BM specifically */
  previsto_proximo_bm: number;
  /** Projetado for the next BM specifically */
  projetado_proximo_bm: number;
  /** GITEC approved value */
  gitec_aprovado: number;
  gitec_pendente: number;
  gitec_eventos: number;
}

export interface SimuladorKPIs {
  totalContrato: number;
  totalRealizado: number;
  totalSaldo: number;
  proximoBmName: string;
  proximoBmNum: number;
  ultimoBmNum: number;
}

export function useSimuladorData() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["simulador-data", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [treeRes, bmRes, gitecRes] = await Promise.all([
        supabase
          .from("vw_cronograma_tree_completo" as any)
          .select("ippu, nome, valor, total_previsto_bm, total_projetado_bm, total_realizado_bm"),
        supabase
          .from("cronograma_bm_values")
          .select("ippu, bm_name, bm_number, tipo, valor"),
        supabase
          .from("vw_gitec_por_ppu" as any)
          .select("*"),
      ]);
      if (treeRes.error) throw treeRes.error;
      if (bmRes.error) throw bmRes.error;
      return {
        tree: (treeRes.data || []) as any[],
        bmValues: (bmRes.data || []) as any[],
        gitec: (gitecRes.data || []) as any[],
      };
    },
  });

  return useMemo(() => {
    if (!query.data) {
      return {
        items: [] as SimuladorItem[],
        kpis: null as SimuladorKPIs | null,
        isLoading: query.isLoading,
      };
    }

    const { tree, bmValues, gitec } = query.data;

    // Find ultimo BM realizado
    let ultimoBmNum = 0;
    bmValues.forEach((v: any) => {
      if (v.tipo === "Realizado" && Number(v.valor) > 0 && v.bm_number > ultimoBmNum) {
        ultimoBmNum = v.bm_number;
      }
    });
    const proximoBmNum = ultimoBmNum + 1;
    const proximoBmName = `BM-${String(proximoBmNum).padStart(2, "0")}`;

    // Build BM values map for proximo BM: ippu -> { previsto, projetado }
    const bmNextMap = new Map<string, { previsto: number; projetado: number }>();
    bmValues.forEach((v: any) => {
      if (v.bm_number !== proximoBmNum || !v.ippu) return;
      const existing = bmNextMap.get(v.ippu) || { previsto: 0, projetado: 0 };
      if (v.tipo === "Previsto") existing.previsto += Number(v.valor) || 0;
      if (v.tipo === "Projetado") existing.projetado += Number(v.valor) || 0;
      bmNextMap.set(v.ippu, existing);
    });

    // GITEC map
    const gitecMap = new Map<string, any>();
    gitec.forEach((g: any) => {
      if (g.item_ppu) gitecMap.set(g.item_ppu, g);
    });

    let totalContrato = 0;
    let totalRealizado = 0;
    let totalSaldo = 0;

    const items: SimuladorItem[] = tree
      .filter((t: any) => t.ippu && String(t.ippu).trim() !== "" && Number(t.valor) > 0)
      .map((t: any) => {
        const valor = Number(t.valor) || 0;
        const realizado = Number(t.total_realizado_bm) || 0;
        const saldo = valor - realizado;
        const bm = bmNextMap.get(t.ippu);
        const g = gitecMap.get(t.ippu);

        totalContrato += valor;
        totalRealizado += realizado;
        totalSaldo += Math.max(saldo, 0);

        return {
          ippu: t.ippu,
          nome: t.nome || "",
          valor_contrato: valor,
          valor_realizado: realizado,
          valor_previsto_bm: Number(t.total_previsto_bm) || 0,
          valor_projetado_bm: Number(t.total_projetado_bm) || 0,
          saldo: Math.max(saldo, 0),
          previsto_proximo_bm: bm?.previsto || 0,
          projetado_proximo_bm: bm?.projetado || 0,
          gitec_aprovado: Number(g?.valor_aprovado) || 0,
          gitec_pendente: Number(g?.valor_pendente) || 0,
          gitec_eventos: Number(g?.total_eventos) || 0,
        };
      })
      .filter((item: SimuladorItem) => item.saldo > 0);

    return {
      items,
      kpis: { totalContrato, totalRealizado, totalSaldo, proximoBmName, proximoBmNum, ultimoBmNum },
      isLoading: query.isLoading,
    };
  }, [query.data, query.isLoading]);
}
