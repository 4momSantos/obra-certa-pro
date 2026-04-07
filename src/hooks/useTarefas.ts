import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useContrato } from "@/contexts/ContratoContext";
import { toast } from "sonner";

export interface SplanTarefa {
  id: string;
  boletim: string;
  titulo: string;
  descricao?: string;
  tipo: "checklist" | "acao" | "cobranca" | "risco";
  status: "aberta" | "em_andamento" | "concluida" | "cancelada";
  prioridade: "alta" | "normal" | "baixa";
  responsavel_id?: string;
  responsavel_nome?: string;
  item_ppu?: string;
  prazo?: string;
  concluida_em?: string;
  concluida_por?: string;
  created_at: string;
  updated_at?: string;
}

export function useTarefas(bmName: string) {
  const { user, profile } = useAuth();
  const { contratoAtivo } = useContrato();
  const queryClient = useQueryClient();
  const contratoId = contratoAtivo?.id;

  const queryKey = ["splan-tarefas", bmName, contratoId];

  const { data: tarefas = [], isLoading, error } = useQuery({
    queryKey,
    enabled: !!bmName,
    queryFn: async () => {
      let q = supabase
        .from("splan_tarefas" as any)
        .select("*")
        .eq("boletim", bmName)
        .order("created_at", { ascending: true });
      if (contratoId) q = q.eq("contrato_id", contratoId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as SplanTarefa[];
    },
  });

  const criarTarefa = useMutation({
    mutationFn: async (input: {
      titulo: string;
      descricao?: string;
      tipo: string;
      prioridade: string;
      responsavel_id?: string;
      responsavel_nome?: string;
      item_ppu?: string;
      prazo?: string;
    }) => {
      const { error } = await supabase.from("splan_tarefas" as any).insert({
        boletim: bmName,
        titulo: input.titulo,
        descricao: input.descricao || "",
        tipo: input.tipo,
        prioridade: input.prioridade,
        responsavel_id: input.responsavel_id || user?.id,
        responsavel_nome: input.responsavel_nome || profile?.full_name || "",
        item_ppu: input.item_ppu || "",
        prazo: input.prazo || null,
        contrato_id: contratoId || null,
        created_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarefa criada");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => toast.error("Erro ao criar tarefa: " + (err.message || "")),
  });

  const concluirTarefa = useMutation({
    mutationFn: async (tarefaId: string) => {
      const { error } = await supabase
        .from("splan_tarefas" as any)
        .update({
          status: "concluida",
          concluida_em: new Date().toISOString(),
          concluida_por: user?.id,
        } as any)
        .eq("id", tarefaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => toast.error("Erro: " + (err.message || "")),
  });

  const reabrirTarefa = useMutation({
    mutationFn: async (tarefaId: string) => {
      const { error } = await supabase
        .from("splan_tarefas" as any)
        .update({
          status: "aberta",
          concluida_em: null,
          concluida_por: null,
        } as any)
        .eq("id", tarefaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => toast.error("Erro: " + (err.message || "")),
  });

  const total = tarefas.length;
  const concluidas = tarefas.filter((t) => t.status === "concluida").length;
  const checklistPendentes = tarefas.filter(
    (t) => t.tipo === "checklist" && t.status !== "concluida" && t.status !== "cancelada"
  );

  return {
    tarefas,
    isLoading,
    error,
    criarTarefa,
    concluirTarefa,
    reabrirTarefa,
    total,
    concluidas,
    checklistPendentes,
  };
}
