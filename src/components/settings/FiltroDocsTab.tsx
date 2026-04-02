import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Save } from "lucide-react";
import { type ConfigFiltroDoc, useSaveFiltros } from "@/hooks/useContratoConfig";

interface Props {
  data: ConfigFiltroDoc[];
  readonly: boolean;
  contratoId: string;
}

function groupByTipo(items: Partial<ConfigFiltroDoc>[]) {
  const groups: Record<string, Partial<ConfigFiltroDoc>[]> = {};
  items.forEach((item) => {
    const tipo = item.tipo || "outros";
    if (!groups[tipo]) groups[tipo] = [];
    groups[tipo].push(item);
  });
  return groups;
}

const TIPO_LABELS: Record<string, string> = {
  prefixo: "Prefixos de Documento",
  disciplina_doc: "Disciplinas de Documento",
  tipo_doc: "Tipos de Evidência",
  excluir: "Exclusões",
};

export const FiltroDocsTab: React.FC<Props> = ({ data, readonly, contratoId }) => {
  const [rows, setRows] = useState<Partial<ConfigFiltroDoc>[]>([]);
  const [dirty, setDirty] = useState(false);
  const save = useSaveFiltros();

  useEffect(() => {
    setRows(data.map((d) => ({ ...d })));
    setDirty(false);
  }, [data]);

  const toggle = (id: string, checked: boolean) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ativo: checked } : r)));
    setDirty(true);
  };

  const addFilter = (tipo: string) => {
    setRows((prev) => [
      ...prev,
      {
        contrato_id: contratoId,
        tipo,
        valor: "",
        acao: tipo === "excluir" ? "excluir" : "incluir",
        ativo: true,
        descricao: "",
      },
    ]);
    setDirty(true);
  };

  const updateValue = (idx: number, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, valor: value } : r)));
    setDirty(true);
  };

  const groups = groupByTipo(rows);
  const activeCount = rows.filter((r) => r.ativo).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Configure quais documentos são incluídos na análise.
        </p>
        {!readonly && (
          <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate(rows)}>
            <Save className="h-4 w-4 mr-1" /> Salvar
          </Button>
        )}
      </div>

      {Object.entries(TIPO_LABELS).map(([tipo, label]) => {
        const items = groups[tipo] || [];
        return (
          <div key={tipo} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{label}</h3>
              {!readonly && (
                <Button variant="ghost" size="sm" onClick={() => addFilter(tipo)}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {items.map((item, idx) => {
                const globalIdx = rows.indexOf(item);
                return (
                  <div
                    key={item.id || `new-${globalIdx}`}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2"
                  >
                    <Switch
                      checked={item.ativo ?? true}
                      onCheckedChange={(v) => item.id ? toggle(item.id, v) : null}
                      disabled={readonly || !item.id}
                    />
                    {item.id ? (
                      <span className="text-sm font-mono">{item.valor}</span>
                    ) : (
                      <Input
                        value={item.valor || ""}
                        onChange={(e) => updateValue(globalIdx, e.target.value)}
                        placeholder="Valor..."
                        className="h-7 text-xs"
                      />
                    )}
                  </div>
                );
              })}
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground col-span-full">Nenhum filtro</p>
              )}
            </div>
          </div>
        );
      })}

      <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
        {activeCount} filtros ativos de {rows.length} total
      </div>
    </div>
  );
};
