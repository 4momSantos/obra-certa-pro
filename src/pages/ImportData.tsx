import React, { useState, useCallback } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UploadCard } from "@/components/import/UploadCard";
import { ImportPreview } from "@/components/import/ImportPreview";
import { ImportHistory } from "@/components/import/ImportHistory";
import {
  parseSigemFile, parseRelEventoFile, parseSconFile,
  useExistingCounts, useProcessImport,
  type ParsedSigemRow, type ParsedRelEventoRow, type ParsedSconRow,
} from "@/hooks/useImport";

const ImportData: React.FC = () => {
  const { data: existing } = useExistingCounts();
  const processImport = useProcessImport();

  const [sigemFile, setSigemFile] = useState<File | null>(null);
  const [relFile, setRelFile] = useState<File | null>(null);
  const [sconFile, setSconFile] = useState<File | null>(null);

  const [sigemRows, setSigemRows] = useState<ParsedSigemRow[]>([]);
  const [relRows, setRelRows] = useState<ParsedRelEventoRow[]>([]);
  const [sconRows, setSconRows] = useState<ParsedSconRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);

  const [progressMsg, setProgressMsg] = useState("");
  const [progressPct, setProgressPct] = useState(0);

  const handleSigem = useCallback(async (f: File | null) => {
    setSigemFile(f);
    if (!f) { setSigemRows([]); return; }
    setParsing(true);
    try {
      const { rows, warnings: w } = await parseSigemFile(f);
      setSigemRows(rows);
      setWarnings(prev => [...prev.filter(p => !p.includes("SIGEM") && !p.includes("Documento")), ...w]);
    } catch { setWarnings(prev => [...prev, "Erro ao ler arquivo SIGEM"]); }
    setParsing(false);
  }, []);

  const handleRel = useCallback(async (f: File | null) => {
    setRelFile(f);
    if (!f) { setRelRows([]); return; }
    setParsing(true);
    try {
      const { rows, warnings: w } = await parseRelEventoFile(f);
      setRelRows(rows);
      setWarnings(prev => [...prev.filter(p => !p.includes("REL") && !p.includes("Item PPU")), ...w]);
    } catch { setWarnings(prev => [...prev, "Erro ao ler arquivo REL_EVENTO"]); }
    setParsing(false);
  }, []);

  const handleScon = useCallback(async (f: File | null) => {
    setSconFile(f);
    if (!f) { setSconRows([]); return; }
    setParsing(true);
    try {
      const { rows, warnings: w } = await parseSconFile(f);
      setSconRows(rows);
      setWarnings(prev => [...prev.filter(p => !p.includes("SCON") && !p.includes("TAG nem")), ...w]);
    } catch { setWarnings(prev => [...prev, "Erro ao ler arquivo SCON"]); }
    setParsing(false);
  }, []);

  const allLoaded = !!sigemFile && !!relFile && !!sconFile;
  const totalRows = sigemRows.length + relRows.length + sconRows.length;

  const doProcess = () => {
    processImport.mutate({
      sigemRows, relEventoRows: relRows, sconRows,
      sigemFile, relEventoFile: relFile, sconFile,
      onProgress: (msg, pct) => { setProgressMsg(msg); setProgressPct(pct); },
    }, {
      onSuccess: () => {
        setSigemFile(null); setRelFile(null); setSconFile(null);
        setSigemRows([]); setRelRows([]); setSconRows([]);
        setWarnings([]);
        setProgressMsg(""); setProgressPct(0);
      },
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Importar Dados</h1>
        <p className="text-sm text-muted-foreground">
          Upload dos 3 arquivos operacionais — atualização a cada medição
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UploadCard label="SIGEM" description="~22k documentos (.xlsx)" required file={sigemFile} onFile={handleSigem} />
        <UploadCard label="REL_EVENTO" description="~6k eventos GITEC (.xlsx)" required file={relFile} onFile={handleRel} />
        <UploadCard label="SCON" description="~1.5k componentes (.xlsx)" required file={sconFile} onFile={handleScon} />
      </div>

      {parsing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Lendo arquivo...
        </div>
      )}

      {existing && (existing.sigem > 0 || existing.relEvento > 0 || existing.scon > 0) && (
        <div className="rounded-lg border border-muted bg-muted/30 p-3 text-sm text-muted-foreground">
          Dados atuais: {existing.sigem.toLocaleString("pt-BR")} docs SIGEM, {existing.relEvento.toLocaleString("pt-BR")} eventos, {existing.scon.toLocaleString("pt-BR")} componentes.
          Ao processar, os dados anteriores serão substituídos.
        </div>
      )}

      <ImportPreview sigem={sigemRows} relEvento={relRows} scon={sconRows} warnings={warnings} />

      {!processImport.isPending && (
        <div className="space-y-2">
          <Button
            size="lg"
            className="w-full"
            onClick={doProcess}
            disabled={!allLoaded || totalRows === 0}
          >
            <Upload className="h-5 w-5 mr-2" />
            {allLoaded
              ? `▶ Processar Tudo (${totalRows.toLocaleString("pt-BR")} registros)`
              : `Carregue os 3 arquivos (${[sigemFile, relFile, sconFile].filter(Boolean).length}/3)`
            }
          </Button>
        </div>
      )}

      {processImport.isPending && (
        <div className="space-y-2">
          <Progress value={progressPct} className="h-3" />
          <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> {progressMsg}
          </p>
        </div>
      )}

      <ImportHistory />
    </div>
  );
};

export default ImportData;
