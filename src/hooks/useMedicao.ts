import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

export type Semaforo = "medido" | "executado" | "previsto" | "futuro";

export interface MedicaoPPU {
  item_ppu: string;
  descricao: string;
  fase: string;
  subfase: string;
  agrupamento: string;
  disciplina: string;
  item_gitec: string;
  valor_total: number;
  valor_medido: number;
  // SCON
  scon_avg_avanco: number;
  scon_total: number;
  scon_concluidos: number;
  scon_andamento: number;
  scon_nao_iniciados: number;
  // SIGEM
  sigem_total: number;
  sigem_ok: number;
  sigem_recusados: number;
  sigem_workflow: number;
  sigem_comentarios: number;
  // GITEC
  gitec_total_eventos: number;
  gitec_valor_aprovado: number;
  gitec_valor_pendente: number;
  gitec_eventos_concluidos: number;
  // EAC
  eac_previsto: number;
  eac_realizado: number;
  // Calculated
  semaforo: Semaforo;
  scon_valor_estimado: number;
  gap: number;
}

export interface MedicaoKPIs {
  contrato: number;
  previsto: number;
  executadoScon: number;
  postadoSigem: number;
  medidoGitec: number;
  saldo: number;
}

async function fetchAll<T>(table: string, select = "*"): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase.from(table as any).select(select).range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

export function useMedicaoData() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["medicao-data", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [ppuRaw, classifRaw, eacRaw, sconView, sigemView, gitecView, sigemTotal, gitecCount, contratoRow] = await Promise.all([
        fetchAll<any>("ppu_items", "item_ppu,descricao,valor_total,valor_medido"),
        fetchAll<any>("classificacao_ppu", "item_ppu,item_gitec,fase,subfase,agrupamento,disciplina"),
        fetchAll<any>("eac_items", "ppu,previsto,realizado,valor_financeiro"),
        fetchAll<any>("vw_scon_por_ppu"),
        fetchAll<any>("vw_sigem_por_ppu"),
        fetchAll<any>("vw_gitec_por_ppu"),
        supabase.from("sigem_documents" as any).select("*", { count: "exact", head: true }).then(r => r.count || 0),
        supabase.from("gitec_events").select("*", { count: "exact", head: true }).then(r => r.count || 0),
        supabase.from("contratos").select("valor_contratual").limit(1).single().then(r => r.data),
      ]);
      return { ppuRaw, classifRaw, eacRaw, sconView, sigemView, gitecView, sigemTotal, gitecCount, contratoRow };
    },
  });

  const result = useMemo(() => {
    if (!query.data) return { items: [] as MedicaoPPU[], kpis: null as MedicaoKPIs | null, filters: { fases: [] as string[], subfases: [] as string[], disciplinas: [] as string[] } };

    const { ppuRaw, classifRaw, eacRaw, sconView, sigemView, gitecView, sigemTotal, contratoRow } = query.data;

    // Build lookup maps
    const classifMap = new Map<string, any>();
    classifRaw.forEach((c: any) => { if (c.item_ppu) classifMap.set(c.item_ppu, c); });

    const eacMap = new Map<string, { previsto: number; realizado: number; valor: number }>();
    eacRaw.forEach((e: any) => {
      if (!e.ppu) return;
      const prev = eacMap.get(e.ppu);
      if (prev) {
        prev.previsto += (e.previsto || 0);
        prev.realizado += (e.realizado || 0);
        prev.valor += (e.valor_financeiro || 0);
      } else {
        eacMap.set(e.ppu, { previsto: e.previsto || 0, realizado: e.realizado || 0, valor: e.valor_financeiro || 0 });
      }
    });

    const sconMap = new Map<string, any>();
    sconView.forEach((s: any) => { if (s.item_wbs) sconMap.set(s.item_wbs, s); });

    const sigemMap = new Map<string, any>();
    sigemView.forEach((s: any) => { if (s.ppu) sigemMap.set(s.ppu, s); });

    const gitecMap = new Map<string, any>();
    gitecView.forEach((g: any) => {
      const key = g.item_ppu || g.ppu;
      if (key) gitecMap.set(key, g);
    });

    let totalContrato = 0;
    let totalPrevisto = 0;
    let totalExecScon = 0;
    let totalPostado = 0;
    let totalMedido = 0;

    const faseSet = new Set<string>();
    const subfaseSet = new Set<string>();
    const discSet = new Set<string>();

    const items: MedicaoPPU[] = ppuRaw.map((p: any) => {
      const classif = classifMap.get(p.item_ppu);
      const eac = eacMap.get(p.item_ppu);
      const scon = sconMap.get(p.item_ppu);
      const sigem = sigemMap.get(p.item_ppu);
      const gitec = gitecMap.get(p.item_ppu);

      const valor_total = Number(p.valor_total) || 0;
      const valor_medido = Number(p.valor_medido) || 0;
      const scon_avg = Number(scon?.avg_avanco) || 0;
      const gitec_valor_aprovado = Number(gitec?.valor_aprovado) || 0;
      const scon_valor_estimado = valor_total * (scon_avg / 100);
      const gap = scon_valor_estimado - valor_medido;

      const fase = classif?.fase || "";
      const subfase = classif?.subfase || "";
      const disciplina = classif?.disciplina || "";

      if (fase) faseSet.add(fase);
      if (subfase) subfaseSet.add(subfase);
      if (disciplina) discSet.add(disciplina);

      totalContrato += valor_total;
      if (eac && eac.previsto > 0) totalPrevisto += valor_total;
      totalExecScon += scon_valor_estimado;
      totalPostado += Number(sigem?.docs_ok) || 0;
      totalMedido += gitec_valor_aprovado;

      let semaforo: Semaforo = "futuro";
      if (gitec_valor_aprovado > 0) semaforo = "medido";
      else if (scon_avg > 0) semaforo = "executado";
      else if (eac && eac.previsto > 0) semaforo = "previsto";

      return {
        item_ppu: p.item_ppu,
        descricao: p.descricao || "",
        fase, subfase, agrupamento: classif?.agrupamento || "", disciplina, item_gitec: classif?.item_gitec || "",
        valor_total, valor_medido,
        scon_avg_avanco: scon_avg,
        scon_total: Number(scon?.total_componentes) || 0,
        scon_concluidos: Number(scon?.concluidos) || 0,
        scon_andamento: Number(scon?.em_andamento) || 0,
        scon_nao_iniciados: Number(scon?.nao_iniciados) || 0,
        sigem_total: Number(sigem?.total_docs) || 0,
        sigem_ok: Number(sigem?.docs_ok) || 0,
        sigem_recusados: Number(sigem?.docs_recusados) || 0,
        sigem_workflow: Number(sigem?.docs_workflow) || 0,
        sigem_comentarios: Number(sigem?.docs_comentarios) || 0,
        gitec_total_eventos: Number(gitec?.total_eventos) || 0,
        gitec_valor_aprovado,
        gitec_valor_pendente: Number(gitec?.valor_pendente) || 0,
        gitec_eventos_concluidos: Number(gitec?.eventos_concluidos) || 0,
        eac_previsto: eac?.previsto || 0,
        eac_realizado: eac?.realizado || 0,
        semaforo,
        scon_valor_estimado,
        gap,
      };
    });

    const valorContratual = contratoRow?.valor_contratual ?? totalContrato;

    const kpis: MedicaoKPIs = {
      contrato: valorContratual,
      previsto: totalPrevisto,
      executadoScon: totalExecScon,
      postadoSigem: totalPostado > 0 ? totalPostado : (sigemTotal as number),
      medidoGitec: totalMedido,
      saldo: valorContratual - totalMedido,
    };

    return {
      items,
      kpis,
      filters: {
        fases: Array.from(faseSet).sort(),
        subfases: Array.from(subfaseSet).sort(),
        disciplinas: Array.from(discSet).sort(),
      },
      hasOperationalData: (query.data?.gitecCount as number) > 0,
    };
  }, [query.data]);

  return { ...result, isLoading: query.isLoading, error: query.error };
}
