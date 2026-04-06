import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AcompanhamentoRow {
  ippu: string;
  descricao: string;
  disciplina: string;
  qtd_prevista: number;
  valor_previsto: number;
  status_previsao: string;
  // SCON
  scon_exec_total: number;
  scon_valor: number;
  pct_scon: number;
  // GITEC
  gitec_valor_aprovado: number;
  gitec_eventos_total: number;
  gitec_aprovados: number;
  gitec_status: string;
  pct_gitec: number;
  // SIGEM
  sigem_docs_total: number;
  sigem_docs_ok: number;
  sigem_status: string;
  pct_sigem: number;
  // Semáforo
  semaforo: "verde" | "amarelo" | "vermelho" | "cinza";
}

/**
 * Saldo por iPPU: qtd contratada (PPU) - qtd já medida (GITEC aprovado de todos os BMs)
 */
export function useSaldoPPU() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["saldo-ppu-global", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      // Fetch total contratado per PPU
      const ppuRows: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("ppu_items")
          .select("item_ppu, qtd, valor_total")
          .gt("valor_total", 0)
          .range(from, from + 999);
        if (error) throw error;
        if (!data || data.length === 0) break;
        ppuRows.push(...data);
        if (data.length < 1000) break;
        from += 1000;
      }

      // Fetch total medido (aprovado) per PPU from gitec
      const { data: gitecAgg, error: gErr } = await supabase
        .from("vw_gitec_por_ppu")
        .select("item_ppu, valor_aprovado");
      if (gErr) throw gErr;

      const medidoMap = new Map<string, number>();
      (gitecAgg || []).forEach((r: any) => {
        if (r.item_ppu) medidoMap.set(String(r.item_ppu), Number(r.valor_aprovado) || 0);
      });

      const saldoMap = new Map<string, { qtd_contratada: number; valor_contratado: number; valor_medido: number; saldo: number }>();
      ppuRows.forEach((p: any) => {
        const key = String(p.item_ppu).replace(/_/g, "-");
        const contratado = Number(p.valor_total) || 0;
        const medido = medidoMap.get(key) || 0;
        saldoMap.set(key, {
          qtd_contratada: Number(p.qtd) || 0,
          valor_contratado: contratado,
          valor_medido: medido,
          saldo: contratado - medido,
        });
      });

      return saldoMap;
    },
  });
}

/**
 * Acompanhamento completo de um BM: cruza previsão × SCON × GITEC × SIGEM
 */
export function useAcompanhamentoBM(bmName: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["acompanhamento-bm", bmName, user?.id],
    enabled: !!user && !!bmName,
    staleTime: 2 * 60_000,
    queryFn: async (): Promise<AcompanhamentoRow[]> => {
      // 1) Fetch previsão items for this BM
      const { data: previsaoData, error: pErr } = await supabase
        .from("previsao_medicao")
        .select("*")
        .eq("bm_name", bmName);
      if (pErr) throw pErr;
      if (!previsaoData || previsaoData.length === 0) return [];

      const ippus = previsaoData.map((p: any) => String(p.ippu));

      // 2) Fetch PPU metadata
      const { data: ppuData } = await supabase
        .from("ppu_items")
        .select("item_ppu, descricao, disc, preco_unit, qtd, valor_total")
        .in("item_ppu", ippus);
      const ppuMap = new Map<string, any>();
      (ppuData || []).forEach((p: any) => ppuMap.set(String(p.item_ppu).replace(/_/g, "-"), p));

      // 3) Fetch SCON execution for this BM
      const sconRows: any[] = [];
      let sFrom = 0;
      while (true) {
        const { data, error } = await supabase
          .from("vw_scon_execucao_por_bm" as any)
          .select("item_wbs, total_exec_geral, unit_valor, valor_exec_semana")
          .eq("bm_name_calc", bmName)
          .range(sFrom, sFrom + 999);
        if (error) break;
        if (!data || data.length === 0) break;
        sconRows.push(...data);
        if (data.length < 1000) break;
        sFrom += 1000;
      }
      // Aggregate SCON by item_wbs
      const sconAgg = new Map<string, { exec: number; valor: number }>();
      sconRows.forEach((r: any) => {
        const key = String(r.item_wbs || "").replace(/_/g, "-");
        if (!key) return;
        const prev = sconAgg.get(key) || { exec: 0, valor: 0 };
        prev.exec += Number(r.total_exec_geral) || 0;
        prev.valor += Number(r.valor_exec_semana) || 0;
        sconAgg.set(key, prev);
      });

      // 4) Fetch GITEC events for these iPPUs
      const { data: gitecData } = await supabase
        .from("gitec_events")
        .select("ippu, status, valor")
        .in("ippu", ippus);
      // Aggregate GITEC by ippu
      const gitecAgg = new Map<string, { total: number; aprovados: number; valor_aprovado: number; lastStatus: string }>();
      (gitecData || []).forEach((r: any) => {
        const key = String(r.ippu);
        const prev = gitecAgg.get(key) || { total: 0, aprovados: 0, valor_aprovado: 0, lastStatus: "" };
        prev.total++;
        if (r.status === "Aprovado") {
          prev.aprovados++;
          prev.valor_aprovado += Number(r.valor) || 0;
        }
        prev.lastStatus = r.status || prev.lastStatus;
        gitecAgg.set(key, prev);
      });

      // 5) Fetch SIGEM docs linked via gitec tags
      const { data: gitecTags } = await supabase
        .from("gitec_events")
        .select("ippu, tag")
        .in("ippu", ippus)
        .not("tag", "is", null);
      // Collect all tags
      const tags: string[] = [];
      const tagToIppu = new Map<string, string>();
      (gitecTags || []).forEach((r: any) => {
        if (r.tag) {
          String(r.tag).split(";").forEach(t => {
            const trimmed = t.trim();
            if (trimmed) {
              tags.push(trimmed);
              tagToIppu.set(trimmed, r.ippu);
            }
          });
        }
      });

      // Query SIGEM for those tags (documents)
      const sigemAgg = new Map<string, { total: number; ok: number; lastStatus: string }>();
      if (tags.length > 0) {
        const uniqueTags = [...new Set(tags)].slice(0, 500);
        const { data: sigemData } = await supabase
          .from("sigem_documents")
          .select("documento, status_correto")
          .in("documento", uniqueTags);
        (sigemData || []).forEach((r: any) => {
          const ippu = tagToIppu.get(r.documento) || "";
          if (!ippu) return;
          const prev = sigemAgg.get(ippu) || { total: 0, ok: 0, lastStatus: "" };
          prev.total++;
          if (r.status_correto === "Sem Comentários" || r.status_correto === "Para Construção") prev.ok++;
          prev.lastStatus = r.status_correto || prev.lastStatus;
          sigemAgg.set(ippu, prev);
        });
      }

      // 6) Build result rows
      return previsaoData.map((prev: any) => {
        const ippu = String(prev.ippu);
        const ppu = ppuMap.get(ippu);
        const qtdPrev = Number(prev.qtd_prevista) || 0;
        const valorPrev = Number(prev.valor_previsto) || 0;

        const scon = sconAgg.get(ippu);
        const gitec = gitecAgg.get(ippu);
        const sigem = sigemAgg.get(ippu);

        const pctScon = valorPrev > 0 && scon ? Math.min((scon.valor / valorPrev) * 100, 100) : 0;
        const pctGitec = valorPrev > 0 && gitec ? Math.min((gitec.valor_aprovado / valorPrev) * 100, 100) : 0;
        const pctSigem = sigem && sigem.total > 0 ? (sigem.ok / sigem.total) * 100 : 0;

        // Semáforo
        let semaforo: AcompanhamentoRow["semaforo"] = "cinza";
        if (prev.status === "medido" || prev.status === "cancelado") {
          semaforo = "cinza";
        } else if (pctGitec >= 90) {
          semaforo = "verde";
        } else if (pctGitec >= 50 || (sigem && sigem.total > 0 && !gitec)) {
          semaforo = "amarelo";
        } else if (scon || sigem || gitec) {
          semaforo = "amarelo";
        } else {
          semaforo = "vermelho";
        }

        return {
          ippu,
          descricao: ppu?.descricao || "",
          disciplina: prev.disciplina || ppu?.disc || "",
          qtd_prevista: qtdPrev,
          valor_previsto: valorPrev,
          status_previsao: prev.status || "previsto",
          scon_exec_total: scon?.exec || 0,
          scon_valor: scon?.valor || 0,
          pct_scon: pctScon,
          gitec_valor_aprovado: gitec?.valor_aprovado || 0,
          gitec_eventos_total: gitec?.total || 0,
          gitec_aprovados: gitec?.aprovados || 0,
          gitec_status: gitec?.lastStatus || "",
          pct_gitec: pctGitec,
          sigem_docs_total: sigem?.total || 0,
          sigem_docs_ok: sigem?.ok || 0,
          sigem_status: sigem?.lastStatus || "",
          pct_sigem: pctSigem,
          semaforo,
        };
      });
    },
  });
}
