import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save } from "lucide-react";
import { type ConfigStatusMap, useSaveStatusMap } from "@/hooks/useContratoConfig";

const CLASSIFICACOES = ["Aprovado", "Pendente", "Recusado", "Cancelado", "Ignorar"];
const COR_OPTIONS = [
  { value: "green", label: "Verde" },
  { value: "amber", label: "Amarelo" },
  { value: "red", label: "Vermelho" },
  { value: "blue", label: "Azul" },
  { value: "gray", label: "Cinza" },
];

const SISTEMAS = ["sigem", "gitec", "scon"];

interface Props {
  data: ConfigStatusMap[];
  readonly: boolean;
  contratoId: string;
}

export const StatusMapTab: React.FC<Props> = ({ data, readonly, contratoId }) => {
  const [rows, setRows] = useState<Partial<ConfigStatusMap>[]>([]);
  const [dirty, setDirty] = useState(false);
  const save = useSaveStatusMap();

  useEffect(() => {
    setRows(data.map((d) => ({ ...d })));
    setDirty(false);
  }, [data]);

  const update = (id: string, field: string, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    setDirty(true);
  };

  const corBadge = (cor: string) => {
    const map: Record<string, string> = {
      green: "bg-emerald-500",
      amber: "bg-amber-500",
      red: "bg-destructive",
      blue: "bg-blue-500",
      gray: "bg-muted-foreground",
    };
    return <span className={`inline-block w-3 h-3 rounded-full ${map[cor] || map.gray}`} />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mapeie os status originais de cada sistema para classificações padronizadas.
        </p>
        {!readonly && (
          <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate(rows)}>
            <Save className="h-4 w-4 mr-1" /> Salvar
          </Button>
        )}
      </div>

      <Tabs defaultValue="sigem">
        <TabsList>
          {SISTEMAS.map((s) => {
            const count = rows.filter((r) => r.sistema === s).length;
            return (
              <TabsTrigger key={s} value={s} className="uppercase">
                {s} <Badge variant="secondary" className="ml-1 text-[10px]">{count}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {SISTEMAS.map((sistema) => (
          <TabsContent key={sistema} value={sistema}>
            <div className="rounded-lg border overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status Original</TableHead>
                    <TableHead className="w-[180px]">Classificação</TableHead>
                    <TableHead className="w-[130px]">Cor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows
                    .filter((r) => r.sistema === sistema)
                    .map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">
                          {r.status_original}
                          {!r.classificacao && (
                            <Badge variant="outline" className="ml-2 text-amber-600 border-amber-300 text-[10px]">
                              ⚠ Novo — classificar
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={r.classificacao || ""}
                            onValueChange={(v) => update(r.id!, "classificacao", v)}
                            disabled={readonly}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {CLASSIFICACOES.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {corBadge(r.cor || "gray")}
                            <Select
                              value={r.cor || "gray"}
                              onValueChange={(v) => update(r.id!, "cor", v)}
                              disabled={readonly}
                            >
                              <SelectTrigger className="h-8 text-xs w-[100px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {COR_OPTIONS.map((c) => (
                                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  {rows.filter((r) => r.sistema === sistema).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Nenhum status mapeado para {sistema.toUpperCase()}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
