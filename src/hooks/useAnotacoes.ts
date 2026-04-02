import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAnotacoes(contexto: string, referencia: string) {
  return useQuery({
    queryKey: ["anotacoes", contexto, referencia],
    enabled: !!referencia,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anotacoes")
        .select("*")
        .eq("contexto", contexto)
        .eq("referencia", referencia)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAddAnotacao() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contexto,
      referencia,
      texto,
      categoria,
    }: {
      contexto: string;
      referencia: string;
      texto: string;
      categoria: string;
    }) => {
      const { error } = await supabase.from("anotacoes").insert({
        contexto,
        referencia,
        texto,
        categoria,
        autor_id: user!.id,
        autor_nome: profile?.full_name || "",
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["anotacoes", vars.contexto, vars.referencia] });
    },
  });
}
