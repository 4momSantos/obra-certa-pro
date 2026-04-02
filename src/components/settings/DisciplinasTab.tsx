import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Save } from "lucide-react";
import { type ConfigDisciplina, useSaveDisciplinas } from "@/hooks/useContratoConfig";

interface Props {
  data: ConfigDisciplina[];
  readonly: boolean;
  contratoId: string;
}

export const DisciplinasTab: React.FC<Props> = ({ data, readonly, contratoId }) => {
  const [rows, setRows] = useState<Partial<ConfigDisciplina>[]>([]);
  const [dirty, setDirty] = useState(false);
  const save = useSaveDisciplinas();

  useEffect(() => {
    setRows(data.map((d) => ({ ...d })));
    setDirty(false);
  }, [data]);

  const update = (idx: number, field: string, value: unknown) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
    setDirty(true);
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        contrato_id: contratoId,
        codigo: "",
        nome: "",
        nome_scon: "",
        sigla_documento: "",
        cor: "#3b82f6",
        icone: "",
        ativa: true,
        ordem: prev.length,
      },
    ]);
    setDirty(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Configure as disciplinas do contrato e suas propriedades.
        </p>
        {!readonly && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4 mr-1" /> Nova Disciplina
            </Button>
            <Button
              size="sm"
              disabled={!dirty || save.isPending}
              onClick={() => save.mutate(rows)}
            >
              <Save className="h-4 w-4 mr-1" /> Salvar
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Nome SCON</TableHead>
              <TableHead className="w-[100px]">Sigla Doc</TableHead>
              <TableHead className="w-[70px]">Cor</TableHead>
              <TableHead className="w-[70px]">Ordem</TableHead>
              <TableHead className="w-[70px]">Ativa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id || `new-${i}`}>
                <TableCell>
                  <Input
                    value={r.codigo || ""}
                    onChange={(e) => update(i, "codigo", e.target.value)}
                    disabled={readonly}
                    className="h-8 text-xs"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={r.nome || ""}
                    onChange={(e) => update(i, "nome", e.target.value)}
                    disabled={readonly}
                    className="h-8 text-xs"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={r.nome_scon || ""}
                    onChange={(e) => update(i, "nome_scon", e.target.value)}
                    disabled={readonly}
                    className="h-8 text-xs"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={r.sigla_documento || ""}
                    onChange={(e) => update(i, "sigla_documento", e.target.value)}
                    disabled={readonly}
                    className="h-8 text-xs"
                  />
                </TableCell>
                <TableCell>
                  <input
                    type="color"
                    value={r.cor || "#3b82f6"}
                    onChange={(e) => update(i, "cor", e.target.value)}
                    disabled={readonly}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={r.ordem ?? 0}
                    onChange={(e) => update(i, "ordem", Number(e.target.value))}
                    disabled={readonly}
                    className="h-8 text-xs w-16"
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={r.ativa ?? true}
                    onCheckedChange={(v) => update(i, "ativa", v)}
                    disabled={readonly}
                  />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhuma disciplina configurada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
