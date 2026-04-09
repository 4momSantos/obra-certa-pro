import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { FieldDef, colToLetter, autoDetectMapping } from "@/lib/config-fields";

// ── Helpers ──

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}
function num(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}
function dateStr(v: unknown): string {
  if (v == null || v === "") return "";
  if (v instanceof Date) return isNaN(v.getTime()) ? "" : v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (!s) return "";
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function convertValue(raw: unknown, type: FieldDef["type"]): unknown {
  switch (type) {
    case "num": return num(raw);
    case "date": return dateStr(raw) || null;
    default: return str(raw);
  }
}

// ── Props ──

interface ColumnMapperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: FieldDef[];
  headers: string[];
  rawRows: unknown[][];
  savedMapping: Record<string, number> | null;
  onConfirm: (mapping: Record<string, number>) => void;
}

export default function ColumnMapperDialog({
  open, onOpenChange, fields, headers, rawRows, savedMapping, onConfirm,
}: ColumnMapperDialogProps) {
  const [mapping, setMapping] = useState<Record<string, number>>({});

  // Initialize mapping on open
  useEffect(() => {
    if (!open) return;
    if (savedMapping && Object.keys(savedMapping).length > 0) {
      setMapping(savedMapping);
    } else {
      setMapping(autoDetectMapping(headers, fields));
    }
  }, [open, savedMapping, headers, fields]);

  // Column options for selects
  const colOptions = useMemo(() =>
    headers.map((h, i) => ({
      value: String(i),
      label: `${colToLetter(i)}: ${h || "(vazio)"}`,
    })),
    [headers]
  );

  // Check required fields
  const requiredMissing = useMemo(() =>
    fields.filter(f => f.required && mapping[f.key] == null),
    [fields, mapping]
  );

  // Preview rows
  const previewData = useMemo(() => {
    const rows = rawRows.slice(0, 5);
    return rows.map(raw =>
      fields.reduce((acc, field) => {
        const colIdx = mapping[field.key];
        acc[field.key] = colIdx != null ? convertValue(raw[colIdx], field.type) : null;
        return acc;
      }, {} as Record<string, unknown>)
    );
  }, [rawRows, mapping, fields]);

  const handleFieldChange = useCallback((fieldKey: string, colValue: string) => {
    setMapping(prev => {
      const next = { ...prev };
      if (colValue === "__none__") {
        delete next[fieldKey];
      } else {
        next[fieldKey] = Number(colValue);
      }
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(mapping);
  }, [mapping, onConfirm]);

  // Preview columns — only mapped fields
  const previewFields = fields.filter(f => mapping[f.key] != null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Mapeamento de Colunas</DialogTitle>
          <DialogDescription>
            Associe cada campo do sistema a uma coluna do arquivo. O preview atualiza em tempo real.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Mapping table */}
          <ScrollArea className="max-h-[300px] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-[200px]">Campo</TableHead>
                  <TableHead className="text-xs">Coluna do Arquivo</TableHead>
                  <TableHead className="text-xs w-[100px]">Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map(field => (
                  <TableRow key={field.key}>
                    <TableCell className="text-sm py-1.5">
                      <div className="flex items-center gap-2">
                        <span>{field.label}</span>
                        {field.required && (
                          <Badge variant="destructive" className="text-[9px] px-1 py-0">
                            obrigatório
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Select
                        value={mapping[field.key] != null ? String(mapping[field.key]) : "__none__"}
                        onValueChange={(v) => handleFieldChange(field.key, v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="— não mapeado —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" className="text-xs text-muted-foreground">
                            — não mapeado —
                          </SelectItem>
                          {colOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-1.5">
                      {field.type === "str" ? "Texto" : field.type === "num" ? "Número" : "Data"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Preview */}
          {previewFields.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Preview (primeiras 5 linhas)
              </p>
              <ScrollArea className="max-h-[180px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {previewFields.map(f => (
                        <TableHead key={f.key} className="text-[10px] whitespace-nowrap px-2 py-1">
                          {f.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, i) => (
                      <TableRow key={i}>
                        {previewFields.map(f => (
                          <TableCell key={f.key} className="text-[10px] px-2 py-1 max-w-[120px] truncate">
                            {String(row[f.key] ?? "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {/* Validation messages */}
          {requiredMissing.length > 0 && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Campos obrigatórios não mapeados: {requiredMissing.map(f => f.label).join(", ")}
              </span>
            </div>
          )}

          {requiredMissing.length === 0 && Object.keys(mapping).length > 0 && (
            <div className="flex items-start gap-2 rounded-md bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                {Object.keys(mapping).length} campos mapeados. Pronto para importar.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={requiredMissing.length > 0 || Object.keys(mapping).length === 0}
          >
            Confirmar Mapeamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
