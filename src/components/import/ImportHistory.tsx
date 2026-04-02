import React from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, Trash2, AlertCircle } from "lucide-react";
import { useImportBatches, useDeleteBatch } from "@/hooks/useImport";
import { format } from "date-fns";

const SOURCE_LABELS: Record<string, string> = {
  sigem: "SIGEM",
  rel_evento: "REL_EVENTO",
  scon: "SCON",
  ppu_prev: "PPU-PREV",
  classificacao_ppu: "Classificação PPU",
  eac: "EAC",
  criterio_medicao: "Critério Medição",
  gitec: "GITEC (legado)",
  consulta_geral: "Consulta Geral (legado)",
  consolidacao: "Consolidação (legado)",
  scon_programacao: "SCON Programação",
  cronograma: "Cronograma",
};

function getErrorMessage(errors: unknown): string | null {
  if (!errors) return null;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0];
    if (typeof first === "string") return first;
    if (typeof first === "object" && first !== null && "message" in first) return String((first as any).message);
  }
  if (typeof errors === "string") return errors;
  return null;
}

export const ImportHistory: React.FC = () => {
  const { data: batches, isLoading } = useImportBatches();
  const deleteBatch = useDeleteBatch();

  if (isLoading || !batches || batches.length === 0) return null;

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between">
          <span>Histórico de Imports ({batches.length})</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="rounded-lg border overflow-auto mt-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead className="text-right">Registros</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b: any) => {
                const errorMsg = getErrorMessage(b.errors);
                return (
                  <TableRow key={b.id}>
                    <TableCell className="text-xs">{format(new Date(b.created_at), "dd/MM/yy HH:mm")}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{SOURCE_LABELS[b.source] ?? b.source}</Badge></TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{b.filename}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{b.row_count?.toLocaleString("pt-BR")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge
                          variant={b.status === "completed" ? "default" : b.status === "error" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {b.status === "error" ? "erro" : b.status}
                        </Badge>
                        {errorMsg && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertCircle className="h-3.5 w-3.5 text-destructive cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                              {errorMsg}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => deleteBatch.mutate(b.id)}
                        disabled={deleteBatch.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
