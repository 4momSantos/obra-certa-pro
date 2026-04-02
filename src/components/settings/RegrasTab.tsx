import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { type ConfigRegra, useSaveRegras } from "@/hooks/useContratoConfig";

interface Props {
  data: ConfigRegra[];
  readonly: boolean;
  contratoId: string;
}

const REGRA_GROUPS: { label: string; regras: { key: string; label: string; desc: string; tipo: "number" | "boolean" | "text" }[] }[] = [
  {
    label: "Quando sugerir medição",
    regras: [
      { key: "avanco_minimo_medir", label: "SCON mínimo (%)", desc: "Avanço ponderado mínimo para sugerir medição", tipo: "number" },
      { key: "exige_documento", label: "Exige documento SIGEM", desc: "Se true, só sugere medição se houver documento aprovado", tipo: "boolean" },
      { key: "aceita_com_comentarios", label: "Aceita com comentários", desc: "Considerar documentos 'com comentários' como válidos", tipo: "boolean" },
    ],
  },
  {
    label: "Backlog",
    regras: [
      { key: "backlog_meses", label: "Meses para buscar", desc: "Quantos meses retroativos incluir no backlog", tipo: "number" },
      { key: "backlog_valor_minimo", label: "Valor mínimo (R$)", desc: "Itens abaixo deste valor são ignorados", tipo: "number" },
    ],
  },
  {
    label: "Postergamento",
    regras: [
      { key: "postergamento_justificativa_min", label: "Justificativa mín. (chars)", desc: "Tamanho mínimo da justificativa de postergamento", tipo: "number" },
      { key: "postergamento_max_vezes", label: "Máx. vezes", desc: "Número máximo de postergamentos para um item", tipo: "number" },
    ],
  },
  {
    label: "Fechamento de BM",
    regras: [
      { key: "fechamento_exige_obs", label: "Exige observação", desc: "Exigir observação ao fechar BM", tipo: "boolean" },
      { key: "fechamento_migrar_postergados", label: "Migrar postergados", desc: "Mover itens postergados automaticamente para o próximo BM", tipo: "boolean" },
    ],
  },
];

export const RegrasTab: React.FC<Props> = ({ data, readonly, contratoId }) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const save = useSaveRegras();

  useEffect(() => {
    const map: Record<string, string> = {};
    data.forEach((r) => { map[r.regra] = r.valor; });
    setValues(map);
    setDirty(false);
  }, [data]);

  const update = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const handleSave = () => {
    const rows: Partial<ConfigRegra>[] = Object.entries(values).map(([regra, valor]) => {
      const existing = data.find((r) => r.regra === regra);
      return {
        ...(existing ? { id: existing.id } : {}),
        contrato_id: contratoId,
        regra,
        valor,
        tipo: REGRA_GROUPS.flatMap((g) => g.regras).find((r) => r.key === regra)?.tipo || "text",
        descricao: REGRA_GROUPS.flatMap((g) => g.regras).find((r) => r.key === regra)?.desc || "",
      };
    });
    save.mutate(rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Regras que controlam a lógica de medição, backlog e postergamento.
        </p>
        {!readonly && (
          <Button size="sm" disabled={!dirty || save.isPending} onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" /> Salvar
          </Button>
        )}
      </div>

      {REGRA_GROUPS.map((group) => (
        <div key={group.label} className="space-y-3">
          <h3 className="text-sm font-semibold border-b pb-1">{group.label}</h3>
          <div className="grid gap-4">
            {group.regras.map((regra) => (
              <div key={regra.key} className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-sm">{regra.label}</Label>
                  <p className="text-xs text-muted-foreground">{regra.desc}</p>
                </div>
                <div className="w-[160px]">
                  {regra.tipo === "boolean" ? (
                    <Switch
                      checked={values[regra.key] === "true"}
                      onCheckedChange={(v) => update(regra.key, String(v))}
                      disabled={readonly}
                    />
                  ) : (
                    <Input
                      type="number"
                      value={values[regra.key] || ""}
                      onChange={(e) => update(regra.key, e.target.value)}
                      disabled={readonly}
                      className="h-8 text-sm"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
