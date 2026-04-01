import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useBoletim(bmName: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["boletim", bmName, user?.id],
    enabled: !!user && !!bmName,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boletins_medicao")
        .select("*")
        .eq("bm_name", bmName)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useBoletimItens(boletimId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["boletim-itens", boletimId, user?.id],
    enabled: !!user && !!boletimId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boletim_itens")
        .select("*")
        .eq("boletim_id", boletimId!)
        .order("valor_previsto", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useGerarBoletim() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bmName }: { bmName: string }) => {
      // 1. Fetch confirmed/previsioned items
      const { data: previsoes, error: errP } = await supabase
        .from("previsao_medicao")
        .select("*")
        .eq("bm_name", bmName)
        .in("status", ["previsto", "confirmado"]);
      if (errP) throw errP;
      if (!previsoes || previsoes.length === 0) throw new Error("Nenhum item confirmado para gerar boletim");

      const bmNum = bmName.replace("BM-", "");
      const year = new Date().getFullYear();
      const numero = `BM-${year}-${bmNum}`;
      const valorTotal = previsoes.reduce((s, p) => s + (Number(p.valor_previsto) || 0), 0);

      // 2. Create boletim
      const { data: boletim, error: errB } = await supabase
        .from("boletins_medicao")
        .insert({
          bm_name: bmName,
          numero,
          status: "rascunho",
          valor_total: valorTotal,
          qtd_itens: previsoes.length,
          gerado_por: user?.id,
          gerado_em: new Date().toISOString(),
          observacoes: "",
        } as any)
        .select()
        .single();
      if (errB) throw errB;

      // 3. Create boletim_itens
      const itens = previsoes.map((p) => ({
        boletim_id: (boletim as any).id,
        ippu: p.ippu,
        descricao: "",
        valor_previsto: Number(p.valor_previsto) || 0,
        valor_executado_scon: 0,
        valor_postado_sigem: 0,
        valor_medido_gitec: 0,
        valor_aprovado: 0,
        observacao: "",
      }));

      const { error: errI } = await supabase.from("boletim_itens").insert(itens as any);
      if (errI) throw errI;

      // 4. Audit
      await supabase.from("audit_log").insert({
        user_id: user?.id,
        user_nome: profile?.full_name || "",
        acao: "gerar_boletim",
        entidade: "boletim",
        referencia: numero,
        detalhes: { bm_name: bmName, qtd_itens: previsoes.length, valor_total: valorTotal },
      } as any);

      return { bmName, boletimId: (boletim as any).id };
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["boletim", vars.bmName] });
    },
  });
}

export function useUpdateBoletimItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, valor_aprovado, observacao }: { id: string; valor_aprovado?: number; observacao?: string }) => {
      const update: any = {};
      if (valor_aprovado !== undefined) update.valor_aprovado = valor_aprovado;
      if (observacao !== undefined) update.observacao = observacao;
      const { error } = await supabase.from("boletim_itens").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boletim-itens"] });
    },
  });
}

export function useUpdateBoletimStatus() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ boletimId, bmName, novoStatus }: { boletimId: string; bmName: string; novoStatus: string }) => {
      const update: any = { status: novoStatus };
      if (novoStatus === "finalizado") update.finalizado_em = new Date().toISOString();
      if (novoStatus === "enviado") update.enviado_em = new Date().toISOString();
      if (novoStatus === "aprovado") update.aprovado_em = new Date().toISOString();

      // Recalculate total from approved values
      if (novoStatus === "finalizado") {
        const { data: itens } = await supabase
          .from("boletim_itens")
          .select("valor_aprovado")
          .eq("boletim_id", boletimId);
        const total = (itens || []).reduce((s, i) => s + (Number(i.valor_aprovado) || 0), 0);
        update.valor_total = total;
      }

      const { error } = await supabase.from("boletins_medicao").update(update).eq("id", boletimId);
      if (error) throw error;

      await supabase.from("audit_log").insert({
        user_id: user?.id,
        user_nome: profile?.full_name || "",
        acao: `boletim_${novoStatus}`,
        entidade: "boletim",
        referencia: bmName,
        detalhes: { boletim_id: boletimId, status: novoStatus },
      } as any);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["boletim", vars.bmName] });
    },
  });
}
