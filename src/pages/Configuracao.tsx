import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, CheckCircle2, FileSpreadsheet, RefreshCw, AlertCircle } from "lucide-react";
import { CONFIG_CARDS, ConfigCardDef, parseConfigFile, useConfigCounts, useConfigUpload } from "@/hooks/useConfig";

// ── Upload Card ──

interface CardState {
  file: File | null;
  rows: Record<string, unknown>[];
  warnings: string[];
  uploading: boolean;
  progress: number;
  progressMsg: string;
  done: boolean;
}

const initialCardState: CardState = {
  file: null, rows: [], warnings: [], uploading: false, progress: 0, progressMsg: "", done: false,
};

function ConfigUploadCard({ card }: { card: ConfigCardDef }) {
  const [state, setState] = useState<CardState>(initialCardState);
  const [showReplace, setShowReplace] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: counts } = useConfigCounts();
  const upload = useConfigUpload();

  const existingCount = counts?.[card.table] ?? 0;

  const handleFile = useCallback(async (file: File) => {
    try {
      const result = await parseConfigFile(file, card);
      setState({ ...initialCardState, file, rows: result.rows, warnings: result.warnings });
    } catch {
      setState({ ...initialCardState, warnings: ["Erro ao ler arquivo"] });
    }
  }, [card]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const startUpload = useCallback((replace: boolean) => {
    if (!state.file) return;
    setShowReplace(false);
    setState(s => ({ ...s, uploading: true, progress: 0, progressMsg: "Iniciando..." }));
    upload.mutate(
      {
        card,
        rows: state.rows,
        file: state.file,
        replaceExisting: replace,
        onProgress: (msg, pct) => setState(s => ({ ...s, progressMsg: msg, progress: pct })),
      },
      {
        onSuccess: () => setState(s => ({ ...s, uploading: false, done: true })),
        onError: () => setState(s => ({ ...s, uploading: false })),
      }
    );
  }, [card, state.file, state.rows, upload]);

  const handleUploadClick = useCallback(() => {
    if (existingCount > 0) {
      setShowReplace(true);
    } else {
      startUpload(false);
    }
  }, [existingCount, startUpload]);

  const previewCols = state.rows.length > 0 ? Object.keys(state.rows[0]).slice(0, 6) : [];
  const previewRows = state.rows.slice(0, 10);

  return (
    <>
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{card.label}</CardTitle>
              <CardDescription className="text-xs">{card.description}</CardDescription>
            </div>
            {existingCount > 0 && !state.done && (
              <Badge variant="secondary" className="text-xs">
                {existingCount.toLocaleString("pt-BR")} registros
              </Badge>
            )}
            {state.done && (
              <Badge className="bg-emerald-600 text-white text-xs gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {state.rows.length.toLocaleString("pt-BR")} carregados
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Drop zone */}
          {!state.file && !state.uploading && !state.done && (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Arraste <strong>{card.label}.xlsx</strong> ou clique
              </p>
              <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileChange} />
            </div>
          )}

          {/* Preview */}
          {state.file && !state.uploading && !state.done && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <span className="truncate font-medium">{state.file.name}</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {state.rows.length.toLocaleString("pt-BR")} linhas
                </Badge>
              </div>

              {state.warnings.length > 0 && (
                <div className="flex items-start gap-2 rounded-md bg-yellow-500/10 p-2 text-xs text-yellow-700 dark:text-yellow-400">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <div>{state.warnings.join("; ")}</div>
                </div>
              )}

              {previewRows.length > 0 && (
                <div className="rounded-md border overflow-auto max-h-48">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {previewCols.map(c => (
                          <TableHead key={c} className="text-[10px] whitespace-nowrap px-2 py-1">{c}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, i) => (
                        <TableRow key={i}>
                          {previewCols.map(c => (
                            <TableCell key={c} className="text-[10px] px-2 py-1 max-w-[120px] truncate">
                              {String(row[c] ?? "")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" onClick={handleUploadClick} disabled={state.rows.length === 0}>
                  Carregar {state.rows.length.toLocaleString("pt-BR")} registros
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setState(initialCardState)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Uploading */}
          {state.uploading && (
            <div className="space-y-2">
              <Progress value={state.progress} className="h-2" />
              <p className="text-xs text-muted-foreground">{state.progressMsg}</p>
            </div>
          )}

          {/* Done */}
          {state.done && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                setState(initialCardState);
                inputRef.current?.click();
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recarregar
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Replace dialog */}
      <Dialog open={showReplace} onOpenChange={setShowReplace}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Substituir dados existentes?</DialogTitle>
            <DialogDescription>
              Existem <strong>{existingCount.toLocaleString("pt-BR")}</strong> registros em {card.label}.
              Deseja substituí-los pelos <strong>{state.rows.length.toLocaleString("pt-BR")}</strong> novos registros?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowReplace(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => startUpload(true)}>Substituir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Page ──

export default function Configuracao() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuração</h1>
        <p className="text-sm text-muted-foreground">
          Dados de cadastro — carregados uma vez, atualizados conforme necessário
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CONFIG_CARDS.map(card => (
          <ConfigUploadCard key={card.key} card={card} />
        ))}
      </div>
    </div>
  );
}
