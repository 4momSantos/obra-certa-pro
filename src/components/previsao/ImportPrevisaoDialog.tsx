import { useState, useCallback, useMemo, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Props {
  open: boolean;
  onClose: () => void;
  bmName: string;
  ppuItems: any[];
}

interface ParsedRow {
  rowIndex: number;
  bm_name: string;
  ippu: string;
  qtd_prevista: number;
  valor_previsto: number;
  status: string;
  error?: string;
}

type FieldKey = "bm_name" | "ippu" | "qtd_prevista" | "valor_previsto" | "status";

const FIELD_LABELS: Record<FieldKey, string> = {
  bm_name: "BM (obrigatório)",
  ippu: "iPPU (obrigatório)",
  qtd_prevista: "Qtd Prevista (obrigatório)",
  valor_previsto: "Valor Previsto",
  status: "Status",
};

const FIELD_ALIASES: Record<FieldKey, string[]> = {
  bm_name: ["bm_name", "bm", "boletim", "periodo", "bm name"],
  ippu: ["ippu", "item_ppu", "ppu", "item ppu", "item_gitec", "cod_item"],
  qtd_prevista: ["qtd_prevista", "qtd", "quantidade", "qty", "qtde"],
  valor_previsto: ["valor_previsto", "valor", "value", "vlr", "vlr_previsto"],
  status: ["status"],
};

function autoMapColumns(headers: string[]): Record<FieldKey, string> {
  const mapping: Record<FieldKey, string> = { bm_name: "", ippu: "", qtd_prevista: "", valor_previsto: "", status: "" };
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());

  for (const field of Object.keys(FIELD_ALIASES) as FieldKey[]) {
    for (const alias of FIELD_ALIASES[field]) {
      const idx = lowerHeaders.findIndex(h => h === alias || h.includes(alias));
      if (idx >= 0 && !mapping[field]) {
        mapping[field] = headers[idx];
        break;
      }
    }
  }
  return mapping;
}

export function ImportPrevisaoDialog({ open, onClose, bmName, ppuItems }: Props) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, string>>({ bm_name: "", ippu: "", qtd_prevista: "", valor_previsto: "", status: "" });
  const [importProgress, setImportProgress] = useState(0);
  const [step, setStep] = useState<"upload" | "map" | "importing" | "done">("upload");

  const ppuMap = useMemo(() => {
    const m = new Map<string, any>();
    (ppuItems || []).forEach(p => {
      m.set(String(p.item_ppu).replace(/_/g, "-"), p);
    });
    return m;
  }, [ppuItems]);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

        if (json.length === 0) {
          toast.error("Planilha vazia.");
          return;
        }

        const hdrs = Object.keys(json[0]);
        setHeaders(hdrs);
        setRawRows(json);
        setMapping(autoMapColumns(hdrs));
        setStep("map");
      } catch {
        toast.error("Erro ao ler o arquivo.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const parsedRows = useMemo((): ParsedRow[] => {
    if (!mapping.ippu || !mapping.qtd_prevista) return [];

    return rawRows.map((row, i) => {
      const ippu = String(row[mapping.ippu] || "").trim().replace(/_/g, "-");
      const bm = mapping.bm_name ? String(row[mapping.bm_name] || "").trim() : bmName;
      const qtd = Number(row[mapping.qtd_prevista]) || 0;
      let valor = mapping.valor_previsto ? Number(row[mapping.valor_previsto]) || 0 : 0;
      const status = mapping.status ? String(row[mapping.status] || "previsto").trim().toLowerCase() : "previsto";

      let error: string | undefined;

      if (!ippu) error = "iPPU vazio";
      else if (!ppuMap.has(ippu)) error = `iPPU "${ippu}" não encontrado na PPU`;
      else if (qtd <= 0) error = "Qtd inválida";

      if (!valor && !error) {
        const ppu = ppuMap.get(ippu);
        if (ppu?.preco_unit) valor = qtd * Number(ppu.preco_unit);
      }

      if (!["previsto", "confirmado"].includes(status) && !error) {
        error = `Status inválido: "${status}"`;
      }

      return { rowIndex: i + 2, bm_name: bm || bmName, ippu, qtd_prevista: qtd, valor_previsto: valor, status: error ? status : status, error };
    });
  }, [rawRows, mapping, bmName, ppuMap]);

  const validRows = parsedRows.filter(r => !r.error);
  const errorRows = parsedRows.filter(r => !!r.error);

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");

      const BATCH = 50;
      let inserted = 0, updated = 0, errors = 0;

      for (let i = 0; i < validRows.length; i += BATCH) {
        const batch = validRows.slice(i, i + BATCH);

        for (const row of batch) {
          try {
            // Check if exists
            const { data: existing } = await supabase
              .from("previsao_medicao")
              .select("id, status")
              .eq("bm_name", row.bm_name)
              .eq("ippu", row.ippu)
              .maybeSingle();

            const classifMap = ppuMap.get(row.ippu);

            if (existing) {
              await supabase
                .from("previsao_medicao")
                .update({
                  qtd_prevista: row.qtd_prevista,
                  valor_previsto: row.valor_previsto,
                } as any)
                .eq("id", existing.id);

              await supabase.from("previsao_historico").insert({
                previsao_id: existing.id,
                bm_name: row.bm_name,
                ippu: row.ippu,
                status_anterior: existing.status,
                status_novo: existing.status,
                justificativa: "Atualizado via importação de planilha",
                alterado_por: user.id,
                alterado_por_nome: profile?.full_name || "",
              } as any);

              updated++;
            } else {
              const { data: newRow } = await supabase
                .from("previsao_medicao")
                .insert({
                  bm_name: row.bm_name,
                  ippu: row.ippu,
                  responsavel_id: user.id,
                  responsavel_nome: profile?.full_name || "",
                  disciplina: classifMap?.disc || "",
                  status: row.status || "previsto",
                  qtd_prevista: row.qtd_prevista,
                  valor_previsto: row.valor_previsto,
                } as any)
                .select("id")
                .single();

              if (newRow) {
                await supabase.from("previsao_historico").insert({
                  previsao_id: (newRow as any).id,
                  bm_name: row.bm_name,
                  ippu: row.ippu,
                  status_anterior: "",
                  status_novo: row.status || "previsto",
                  justificativa: "Criado via importação de planilha",
                  alterado_por: user.id,
                  alterado_por_nome: profile?.full_name || "",
                } as any);
              }
              inserted++;
            }
          } catch {
            errors++;
          }
        }

        setImportProgress(Math.min(100, Math.round(((i + batch.length) / validRows.length) * 100)));
      }

      return { inserted, updated, errors };
    },
    onSuccess: (result) => {
      const parts = [];
      if (result.inserted > 0) parts.push(`${result.inserted} inseridos`);
      if (result.updated > 0) parts.push(`${result.updated} atualizados`);
      if (result.errors > 0) parts.push(`${result.errors} erros`);
      toast.success(`Importação concluída: ${parts.join(", ")}`);
      queryClient.invalidateQueries({ queryKey: ["previsao"] });
      queryClient.invalidateQueries({ queryKey: ["previsao-resumo"] });
      setStep("done");
    },
    onError: (err: any) => {
      toast.error("Erro na importação: " + (err.message || "desconhecido"));
    },
  });

  const handleImport = () => {
    setStep("importing");
    setImportProgress(0);
    importMutation.mutate();
  };

  const handleClose = () => {
    setHeaders([]);
    setRawRows([]);
    setMapping({ bm_name: "", ippu: "", qtd_prevista: "", valor_previsto: "", status: "" });
    setStep("upload");
    setImportProgress(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Previsão via Planilha
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div
            className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">Arraste um arquivo ou clique para selecionar</p>
            <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls ou .csv</p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {rawRows.length} linhas detectadas. Confirme o mapeamento das colunas:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Object.keys(FIELD_LABELS) as FieldKey[]).map(field => (
                <div key={field} className="space-y-1">
                  <label className="text-xs font-medium">{FIELD_LABELS[field]}</label>
                  <Select value={mapping[field] || "__none__"} onValueChange={v => setMapping(m => ({ ...m, [field]: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Não mapeado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs text-muted-foreground">— Não mapeado —</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {validRows.length} válidos
                  </span>
                  {errorRows.length > 0 && (
                    <span className="flex items-center gap-1 text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5" /> {errorRows.length} com erro
                    </span>
                  )}
                </div>

                <div className="rounded-md border overflow-auto max-h-[250px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-12">#</TableHead>
                        <TableHead className="text-xs">BM</TableHead>
                        <TableHead className="text-xs">iPPU</TableHead>
                        <TableHead className="text-xs text-right">Qtd</TableHead>
                        <TableHead className="text-xs text-right">Valor</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.slice(0, 20).map((r, i) => (
                        <TableRow key={i} className={r.error ? "bg-destructive/5" : ""}>
                          <TableCell className="text-[10px] text-muted-foreground">{r.rowIndex}</TableCell>
                          <TableCell className="text-[10px] font-mono">{r.bm_name}</TableCell>
                          <TableCell className="text-[10px] font-mono">{r.ippu}</TableCell>
                          <TableCell className="text-[10px] text-right font-mono">{r.qtd_prevista}</TableCell>
                          <TableCell className="text-[10px] text-right font-mono">
                            {r.valor_previsto.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                          </TableCell>
                          <TableCell>
                            {r.error ? (
                              <Badge variant="destructive" className="text-[9px]">{r.error}</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[9px]">{r.status}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsedRows.length > 20 && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    Exibindo 20 de {parsedRows.length} linhas
                  </p>
                )}
              </div>
            )}

            {parsedRows.length === 0 && mapping.ippu && mapping.qtd_prevista && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum registro válido encontrado. Verifique o mapeamento.
              </p>
            )}
          </div>
        )}

        {/* Step 3: Importing */}
        {step === "importing" && (
          <div className="space-y-4 py-6">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm font-medium">Importando {validRows.length} registros...</p>
            </div>
            <Progress value={importProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">{importProgress}%</p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && (
          <div className="flex flex-col items-center py-8 gap-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <p className="text-sm font-medium">Importação concluída!</p>
          </div>
        )}

        <DialogFooter>
          {step === "map" && (
            <>
              <Button variant="outline" onClick={() => { setStep("upload"); setHeaders([]); setRawRows([]); }}>
                <X className="h-3.5 w-3.5 mr-1" /> Trocar Arquivo
              </Button>
              <Button
                onClick={handleImport}
                disabled={validRows.length === 0}
                className="gap-1"
              >
                <Upload className="h-3.5 w-3.5" />
                Importar {validRows.length} registros
              </Button>
            </>
          )}
          {(step === "done" || step === "upload") && (
            <Button variant="outline" onClick={handleClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
