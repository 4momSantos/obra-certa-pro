import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Save, Loader2, Building2, Calendar, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ConfigRow {
  id: string;
  chave: string;
  valor: string;
  tipo: string | null;
  descricao: string | null;
}

interface FieldDef {
  chave: string;
  label: string;
  type: "text" | "number";
  prefix?: string;
  suffix?: string;
  placeholder?: string;
}

interface CategoryDef {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  fields: FieldDef[];
}

const CATEGORIES: CategoryDef[] = [
  {
    id: "contrato",
    title: "Contrato",
    description: "Dados gerais do contrato",
    icon: Building2,
    fields: [
      { chave: "contrato_numero", label: "Número do Contrato", type: "text", placeholder: "Ex: 59000130759252" },
      { chave: "contrato_valor", label: "Valor Total", type: "number", prefix: "R$" },
      { chave: "contrato_unidade", label: "Unidade", type: "text", placeholder: "Ex: U12" },
      { chave: "contrato_descricao", label: "Descrição", type: "text", placeholder: "Descrição do contrato" },
    ],
  },
  {
    id: "periodos",
    title: "Períodos",
    description: "Configuração de períodos de medição",
    icon: Calendar,
    fields: [
      { chave: "bm_inicio_referencia", label: "Mês Referência BM-01", type: "text", placeholder: "YYYY-MM" },
      { chave: "bm_total", label: "Total de BMs", type: "number" },
      { chave: "periodo_dia_inicio", label: "Dia Início Período", type: "number" },
      { chave: "periodo_dia_fim", label: "Dia Fim Período", type: "number" },
    ],
  },
  {
    id: "alertas",
    title: "Alertas",
    description: "Limiares para alertas do sistema",
    icon: AlertTriangle,
    fields: [
      { chave: "alerta_aging_dias", label: "Aging GITEC", type: "number", suffix: "dias" },
      { chave: "alerta_scon_minimo", label: "SCON Mínimo", type: "number", suffix: "%" },
      { chave: "alerta_dados_desatualizados", label: "Dados Desatualizados", type: "number", suffix: "dias" },
    ],
  },
];

function useConfiguracoes() {
  return useQuery({
    queryKey: ["configuracoes"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracoes").select("*");
      if (error) throw error;
      return (data || []) as ConfigRow[];
    },
  });
}

function useSaveConfiguracoes() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (updates: { chave: string; valor: string }[]) => {
      for (const u of updates) {
        const { error } = await supabase
          .from("configuracoes")
          .update({ valor: u.valor })
          .eq("chave", u.chave);
        if (error) throw error;
      }

      await supabase.from("audit_log").insert({
        user_id: user?.id,
        user_nome: profile?.full_name || "",
        acao: "atualizar_configuracoes",
        entidade: "configuracoes",
        referencia: updates.map(u => u.chave).join(", "),
        detalhes: Object.fromEntries(updates.map(u => [u.chave, u.valor])),
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["configuracoes"] });
      toast.success("Configurações salvas com sucesso");
    },
    onError: (err: any) => toast.error("Erro: " + (err.message || "desconhecido")),
  });
}

function CategoryCard({
  category,
  configs,
  readOnly,
}: {
  category: CategoryDef;
  configs: ConfigRow[];
  readOnly: boolean;
}) {
  const save = useSaveConfiguracoes();

  const getVal = useCallback(
    (chave: string) => configs.find((c) => c.chave === chave)?.valor || "",
    [configs]
  );

  const [values, setValues] = useState<Record<string, string>>({});

  // Sync from DB
  useEffect(() => {
    const v: Record<string, string> = {};
    category.fields.forEach((f) => {
      v[f.chave] = getVal(f.chave);
    });
    setValues(v);
  }, [configs, category.fields, getVal]);

  const hasChanges = category.fields.some((f) => values[f.chave] !== getVal(f.chave));

  const handleSave = () => {
    const updates = category.fields
      .filter((f) => values[f.chave] !== getVal(f.chave))
      .map((f) => ({ chave: f.chave, valor: values[f.chave] }));
    if (updates.length === 0) return;
    save.mutate(updates);
  };

  const Icon = category.icon;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">{category.title}</CardTitle>
        </div>
        <CardDescription className="text-xs">{category.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {category.fields.map((field) => (
          <div key={field.chave} className="space-y-1.5">
            <Label htmlFor={field.chave} className="text-xs font-medium">
              {field.label}
            </Label>
            <div className="flex items-center gap-2">
              {field.prefix && (
                <span className="text-xs text-muted-foreground font-medium">{field.prefix}</span>
              )}
              <Input
                id={field.chave}
                type={field.type === "number" ? "number" : "text"}
                value={values[field.chave] || ""}
                onChange={(e) => setValues((p) => ({ ...p, [field.chave]: e.target.value }))}
                placeholder={field.placeholder}
                disabled={readOnly}
                className="h-9 text-sm"
              />
              {field.suffix && (
                <span className="text-xs text-muted-foreground font-medium">{field.suffix}</span>
              )}
            </div>
          </div>
        ))}

        {!readOnly && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || save.isPending}
            className="gap-1.5 mt-2"
          >
            {save.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Salvar {category.title}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function Config() {
  const { role } = useAuth();
  const { data: configs, isLoading } = useConfiguracoes();

  const readOnly = role !== "admin";

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Parâmetros do contrato, períodos e alertas
          {readOnly && " — somente visualização"}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              configs={configs || []}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
