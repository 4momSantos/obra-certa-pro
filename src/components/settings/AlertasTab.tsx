import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save } from "lucide-react";
import { type ConfigAlerta, useSaveAlertas } from "@/hooks/useContratoConfig";

const SEVERIDADES = [
  { value: "alta", label: "Alta", color: "bg-destructive text-destructive-foreground" },
  { value: "media", label: "Média", color: "bg-amber-500 text-white" },
  { value: "baixa", label: "Baixa", color: "bg-blue-500 text-white" },
];

interface Props {
  data: ConfigAlerta[];
  readonly: boolean;
  contratoId: string;
}

export const AlertasTab: React.FC<Props> = ({ data, readonly, contratoId }) => {
  const [rows, setRows] = useState<Partial<ConfigAlerta>[]>([]);
  const [dirty, setDirty] = useState(false);
  const save = useSaveAlertas();

  useEffect(() => {
    setRows(data.map((d) => ({ ...d })));
    setDirty(false);
  }, [data]);

  const update = (id: string, field: string, value: unknown) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    setDirty(true);
  };

  const sevBadge = (sev: string) => {
    const s = SEVERIDADES.find((sv) => sv.value === sev) || SEVERIDADES[2];
    return <Badge className={`${s.color} text-[10px]`}>{s.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Configure os alertas automáticos e seus thresholds.
        </p>
        {!readonly && (
          <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate(rows)}>
            <Save className="h-4 w-4 mr-1" /> Salvar
          </Button>
        )}
      </div>

      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo de Alerta</TableHead>
              <TableHead className="w-[80px]">Ativo</TableHead>
              <TableHead className="w-[140px]">Severidade</TableHead>
              <TableHead className="w-[120px]">Threshold</TableHead>
              <TableHead>Descrição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm font-medium">{r.tipo_alerta}</TableCell>
                <TableCell>
                  <Switch
                    checked={r.ativo ?? true}
                    onCheckedChange={(v) => update(r.id!, "ativo", v)}
                    disabled={readonly}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {sevBadge(r.severidade || "media")}
                    <Select
                      value={r.severidade || "media"}
                      onValueChange={(v) => update(r.id!, "severidade", v)}
                      disabled={readonly}
                    >
                      <SelectTrigger className="h-7 text-xs w-[90px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERIDADES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={r.threshold_valor ?? 0}
                    onChange={(e) => update(r.id!, "threshold_valor", Number(e.target.value))}
                    disabled={readonly}
                    className="h-7 text-xs w-[100px]"
                  />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.descricao}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum alerta configurado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
