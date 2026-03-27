import React, { useState, useCallback } from "react";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UploadCard } from "@/components/import/UploadCard";
import { ImportPreview } from "@/components/import/ImportPreview";
import { ImportHistory } from "@/components/import/ImportHistory";
import {
  parseGitecFile, parseDocumentsFile, parseRevisionsFile,
  useExistingCounts, useProcessImport,
  type ParsedGitecRow, type ParsedDocumentRow, type ParsedRevisionRow,
} from "@/hooks/useImport";

const ImportData: React.FC = () => {
  const navigate = useNavigate();
  const { data: existing } = useExistingCounts();
  const processImport = useProcessImport();

  // Files
  const [gitecFile, setGitecFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [revFile, setRevFile] = useState<File | null>(null);

  // Parsed data
  const [gitecRows, setGitecRows] = useState<ParsedGitecRow[]>([]);
  const [docRows, setDocRows] = useState<ParsedDocumentRow[]>([]);
  const [revRows, setRevRows] = useState<ParsedRevisionRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);

  // Processing state
  const [progressMsg, setProgressMsg] = useState("");
  const [progressPct, setProgressPct] = useState(0);

  // Replace dialog
  const [showReplace, setShowReplace] = useState(false);

  const handleGitecFile = useCallback(async (f: File | null) => {
    setGitecFile(f);
    if (!f) { setGitecRows([]); return; }
    setParsing(true);
    try {
      const { rows, warnings: w } = await parseGitecFile(f);
      setGitecRows(rows);
      setWarnings(prev => [...prev.filter(p => !p.includes("Agrupamento") && !p.includes("Status")), ...w]);
    } catch { setWarnings(prev => [...prev, "Erro ao ler arquivo GITEC"]); }
    setParsing(false);
  }, []);

  const handleDocFile = useCallback(async (f: File | null) => {
    setDocFile(f);
    if (!f) { setDocRows([]); return; }
    setParsing(true);
    try {
      const { rows, warnings: w } = await parseDocumentsFile(f);
      setDocRows(rows);
      setWarnings(prev => [...prev, ...w]);
    } catch { setWarnings(prev => [...prev, "Erro ao ler arquivo Consulta Geral"]); }
    setParsing(false);
  }, []);

  const handleRevFile = useCallback(async (f: File | null) => {
    setRevFile(f);
    if (!f) { setRevRows([]); return; }
    setParsing(true);
    try {
      const { rows, warnings: w } = await parseRevisionsFile(f);
      setRevRows(rows);
      setWarnings(prev => [...prev, ...w]);
    } catch { setWarnings(prev => [...prev, "Erro ao ler arquivo Consolidação"]); }
    setParsing(false);
  }, []);

  const hasData = gitecRows.length > 0 || docRows.length > 0 || revRows.length > 0;

  const hasExisting =
    (gitecRows.length > 0 && (existing?.gitec ?? 0) > 0) ||
    (docRows.length > 0 && (existing?.documents ?? 0) > 0) ||
    (revRows.length > 0 && (existing?.revisions ?? 0) > 0);

  const handleProcess = () => {
    if (hasExisting) {
      setShowReplace(true);
    } else {
      doProcess(false);
    }
  };

  const doProcess = (replaceMode: boolean) => {
    setShowReplace(false);
    processImport.mutate({
      gitecRows, docRows, revRows,
      gitecFile, docFile, revFile,
      replaceMode,
      onProgress: (msg, pct) => { setProgressMsg(msg); setProgressPct(pct); },
    }, {
      onSuccess: () => {
        setGitecFile(null); setDocFile(null); setRevFile(null);
        setGitecRows([]); setDocRows([]); setRevRows([]);
        setWarnings([]);
        setProgressMsg(""); setProgressPct(0);
      },
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Importar Dados GITEC & Documentos</h1>
          <p className="text-sm text-muted-foreground">Faça upload dos arquivos Excel para importar</p>
        </div>
      </div>

      {/* Upload cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UploadCard
          label="Eventos GITEC"
          description="Relação de Eventos (.xlsx)"
          required
          file={gitecFile}
          onFile={handleGitecFile}
        />
        <UploadCard
          label="Consulta Geral"
          description="ProjectWise (.xlsx)"
          file={docFile}
          onFile={handleDocFile}
        />
        <UploadCard
          label="Consolidação"
          description="Recusas (.xlsx)"
          file={revFile}
          onFile={handleRevFile}
        />
      </div>

      {/* Parsing indicator */}
      {parsing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Lendo arquivo...
        </div>
      )}

      {/* Preview */}
      <ImportPreview gitec={gitecRows} documents={docRows} revisions={revRows} warnings={warnings} />

      {/* Existing data warning */}
      {hasExisting && hasData && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium text-amber-600">⚠ Dados existentes encontrados</p>
          <p className="text-muted-foreground mt-1">
            {existing?.gitec ? `${existing.gitec} eventos GITEC` : ""}
            {existing?.documents ? `${existing.gitec ? ", " : ""}${existing.documents} documentos` : ""}
            {existing?.revisions ? `${(existing.gitec || existing.documents) ? ", " : ""}${existing.revisions} revisões` : ""}
            {" já importados. Ao processar você poderá substituir ou adicionar."}
          </p>
        </div>
      )}

      {/* Process button */}
      {hasData && !processImport.isPending && (
        <Button size="lg" className="w-full" onClick={handleProcess} disabled={!gitecFile}>
          <Upload className="h-5 w-5 mr-2" />
          Processar e Gravar ({(gitecRows.length + docRows.length + revRows.length).toLocaleString("pt-BR")} registros)
        </Button>
      )}

      {/* Progress */}
      {processImport.isPending && (
        <div className="space-y-2">
          <Progress value={progressPct} className="h-3" />
          <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> {progressMsg}
          </p>
        </div>
      )}

      {/* History */}
      <ImportHistory />

      {/* Replace dialog */}
      <AlertDialog open={showReplace} onOpenChange={setShowReplace}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dados existentes encontrados</AlertDialogTitle>
            <AlertDialogDescription>
              Já existem dados importados. Deseja substituir (limpa anteriores) ou adicionar (mantém)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="outline" onClick={() => doProcess(false)}>
              Adicionar
            </AlertDialogAction>
            <AlertDialogAction onClick={() => doProcess(true)}>
              Substituir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ImportData;
