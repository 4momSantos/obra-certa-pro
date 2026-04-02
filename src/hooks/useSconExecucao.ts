import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SconExecucaoRow {
  scon_prog_id: string;
  componente: string;
  item_wbs: string;
  disciplina: string;
  classe: string;
  tipo: string;
  data_inicio: string | null;
  data_fim: string | null;
  total_exec_semana: number;
  total_exec_geral: number;
  unit_valor: number;
  indice_rop: number;
  semana: string;
  equipe: string;
  equipe_desc: string;
  scon_etapa: string;
  // Campos diários
  plan_segunda: number; plan_terca: number; plan_quarta: number; plan_quinta: number;
  plan_sexta: number; plan_sabado: number; plan_domingo: number;
  exec_segunda: number; exec_terca: number; exec_quarta: number; exec_quinta: number;
  exec_sexta: number; exec_sabado: number; exec_domingo: number;
  valor_exec_semana: number;
  // Cruzamento
  item_criterio: string | null;
  avanco_ponderado: number;
  tag: string | null;
  tag_desc: string | null;
  status_gitec: string | null;
  criterio_nome: string | null;
  dicionario_etapa: string | null;
  peso_absoluto: number;
  peso_fisico_fin: number;
  bm_name_calc: string | null;
}

export function useSconExecucaoBM(bmName: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["scon-execucao-bm", bmName, user?.id],
    enabled: !!user && !!bmName,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SconExecucaoRow[]> => {
      const rows: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("vw_scon_execucao_por_bm" as any)
          .select("*")
          .eq("bm_name_calc", bmName)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return rows.map((r: any) => ({
        scon_prog_id: r.scon_prog_id,
        componente: r.componente || "",
        item_wbs: r.item_wbs || "",
        disciplina: r.disciplina || "",
        classe: r.classe || "",
        tipo: r.tipo || "",
        data_inicio: r.data_inicio,
        data_fim: r.data_fim,
        total_exec_semana: Number(r.total_exec_semana) || 0,
        total_exec_geral: Number(r.total_exec_geral) || 0,
        unit_valor: Number(r.unit_valor) || 0,
        indice_rop: Number(r.indice_rop) || 0,
        semana: r.semana || "",
        equipe: r.equipe || "",
        equipe_desc: r.equipe_desc || "",
        scon_etapa: r.scon_etapa || "",
        plan_segunda: Number(r.plan_segunda) || 0,
        plan_terca: Number(r.plan_terca) || 0,
        plan_quarta: Number(r.plan_quarta) || 0,
        plan_quinta: Number(r.plan_quinta) || 0,
        plan_sexta: Number(r.plan_sexta) || 0,
        plan_sabado: Number(r.plan_sabado) || 0,
        plan_domingo: Number(r.plan_domingo) || 0,
        exec_segunda: Number(r.exec_segunda) || 0,
        exec_terca: Number(r.exec_terca) || 0,
        exec_quarta: Number(r.exec_quarta) || 0,
        exec_quinta: Number(r.exec_quinta) || 0,
        exec_sexta: Number(r.exec_sexta) || 0,
        exec_sabado: Number(r.exec_sabado) || 0,
        exec_domingo: Number(r.exec_domingo) || 0,
        valor_exec_semana: Number(r.valor_exec_semana) || 0,
        item_criterio: r.item_criterio,
        avanco_ponderado: Number(r.avanco_ponderado) || 0,
        tag: r.tag,
        tag_desc: r.tag_desc,
        status_gitec: r.status_gitec,
        criterio_nome: r.criterio_nome,
        dicionario_etapa: r.dicionario_etapa,
        peso_absoluto: Number(r.peso_absoluto) || 0,
        peso_fisico_fin: Number(r.peso_fisico_fin) || 0,
        bm_name_calc: r.bm_name_calc,
      }));
    },
  });
}

export interface ItemNaoMedido {
  item_wbs: string;
  componente: string;
  disciplina: string;
  bm_name_calc: string;
  criterio_nome: string | null;
  item_criterio: string | null;
  tag: string | null;
  tag_desc: string | null;
  total_exec_geral: number;
  avanco_ponderado: number;
  unit_valor: number;
  dicionario_etapa: string | null;
}

export function useItensNaoMedidos(bmName: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["itens-nao-medidos", bmName, user?.id],
    enabled: !!user && !!bmName,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ItemNaoMedido[]> => {
      const rows: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("vw_itens_nao_medidos" as any)
          .select("*")
          .neq("bm_name_calc", bmName) // passivos = BMs anteriores
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return rows.map((r: any) => ({
        item_wbs: r.item_wbs || "",
        componente: r.componente || "",
        disciplina: r.disciplina || "",
        bm_name_calc: r.bm_name_calc || "",
        criterio_nome: r.criterio_nome,
        item_criterio: r.item_criterio,
        tag: r.tag,
        tag_desc: r.tag_desc,
        total_exec_geral: Number(r.total_exec_geral) || 0,
        avanco_ponderado: Number(r.avanco_ponderado) || 0,
        unit_valor: Number(r.unit_valor) || 0,
        dicionario_etapa: r.dicionario_etapa,
      }));
    },
  });
}
