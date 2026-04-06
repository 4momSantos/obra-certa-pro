import React, { useState, useCallback } from "react";
import { Upload, Loader2, RefreshCw, Database, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadCard } from "@/components/import/UploadCard";
import { ImportPreview } from "@/components/import/ImportPreview";
import { ImportHistory } from "@/components/import/ImportHistory";
import { useImportStats } from "@/hooks/useImportStats";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  parseSigemFile, parseRelEventoFile, parseSconFile, parseCronogramaFile,
  parseSconProgramacaoFile,
  useExistingCounts, useProcessImport,
  type ParsedSigemRow, type ParsedRelEventoRow, type ParsedSconRow,
  type ParsedSconProgRow, type CronogramaParseResult,
} from "@/hooks/useImport";

/* ── Status card for each data source ── */
const DataSourceStatus: React.FC<{
  label: string; count: number; icon?: React.ReactNode;
}> = ({ label, count }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="flex items-center gap-2">
      {count > 0 ? (
        <>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-mono font-semibold">{count.toLocaleString("pt-BR")}</span>
        </>
      ) : (
        <>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-muted-foreground">Sem dados</span>
        </>
      )}
    </div>
  </div>
);

const ImportData: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useImportStats();
  const { data: existing } = useExistingCounts();
  const processImport = useProcessImport();

  const [showUpload, setShowUpload] = useState(false);

  const [sigemFile, setSigemFile] = useState<File | null>(null);
  const [relFile, setRelFile] = useState<File | null>(null);
  const [sconFile, setSconFile] = useState<File | null>(null);
  const [sconProgFile, setSconProgFile] = useState<File | null>(null);
  const [cronoFile, setCronoFile] = useState<File | null>(null);

  const [sigemRows, setSigemRows] = useState<ParsedSigemRow[]>([]);
  const [relRows, setRelRows] = useState<ParsedRelEventoRow[]>([]);
  const [sconRows, setSconRows] = useState<ParsedSconRow[]>([]);
  const [sconProgRows, setSconProgRows] = useState<ParsedSconProgRow[]>([]);
  const [cronoResult, setCronoResult] = useState<CronogramaParseResult | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);

  const [progressMsg, setProgressMsg] = useState("");
  const [progressPct, setProgressPct] = useState(0);

  const hasData = stats && (stats.counts.sigem > 0 || stats.counts.gitec > 0 || stats.counts.scon > 0);

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

  const handleSconProg = useCallback(async (f: File | null) => {
    setSconProgFile(f);
    if (!f) { setSconProgRows([]); return; }
    setParsing(true);
    try {
      const { rows, warnings: w } = await parseSconProgramacaoFile(f);
      setSconProgRows(rows);
      setWarnings(prev => [...prev.filter(p => !p.includes("SCON Programação") && !p.includes("COMPONENTE") && !p.includes("DISCIPLINA") && !p.includes("PROGRAMADO")), ...w]);
    } catch { setWarnings(prev => [...prev, "Erro ao ler arquivo SCON Programação"]); }
    setParsing(false);
  }, []);

  const handleCrono = useCallback(async (f: File | null) => {
    setCronoFile(f);
    if (!f) { setCronoResult(null); return; }
    setParsing(true);
    try {
      const result = await parseCronogramaFile(f);
      setCronoResult(result);
      setWarnings(prev => [...prev.filter(p => !p.includes("Cronograma") && !p.includes("EAP") && !p.includes("BM")), ...result.warnings]);
    } catch { setWarnings(prev => [...prev, "Erro ao ler arquivo Cronograma"]); }
    setParsing(false);
  }, []);

  const allLoaded = !!sigemFile && !!relFile && !!sconFile;
  const cronoRows = cronoResult ? cronoResult.tree.length + cronoResult.bmValues.length + cronoResult.curvaS.length : 0;
  const totalRows = sigemRows.length + relRows.length + sconRows.length + sconProgRows.length + cronoRows;

  const doProcess = () => {
    processImport.mutate({
      sigemRows, relEventoRows: relRows, sconRows,
      sconProgRows, sconProgFile,
      sigemFile, relEventoFile: relFile, sconFile,
      cronogramaResult: cronoResult, cronogramaFile: cronoFile,
      onProgress: (msg, pct) => { setProgressMsg(msg); setProgressPct(pct); },
    }, {
      onSuccess: () => {
        setSigemFile(null); setRelFile(null); setSconFile(null); setSconProgFile(null); setCronoFile(null);
        setSigemRows([]); setRelRows([]); setSconRows([]); setSconProgRows([]); setCronoResult(null);
        setWarnings([]);
        setProgressMsg(""); setProgressPct(0);
        setShowUpload(false);
      },
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Importar Dados</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie os dados operacionais importados do contrato
        </p>
      </div>

      {/* ── Current Data Status ── */}
      {!statsLoading && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                Estado Atual dos Dados
              </CardTitle>
              {stats?.lastImportAt && (
                <Badge variant={stats.isStale ? "destructive" : "secondary"} className="text-xs gap-1">
                  <Clock className="h-3 w-3" />
                  Última importação: {format(new Date(stats.lastImportAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <DataSourceStatus label="SIGEM (Documentos)" count={existing?.sigem ?? stats?.counts.sigem ?? 0} />
            <DataSourceStatus label="GITEC (Eventos)" count={existing?.relEvento ?? stats?.counts.gitec ?? 0} />
            <DataSourceStatus label="SCON (Componentes)" count={existing?.scon ?? stats?.counts.scon ?? 0} />

            {hasData && !showUpload && (
              <div className="pt-4 border-t mt-3">
                <p className="text-xs text-muted-foreground mb-3">
                  Seus dados já estão carregados. Só importe novamente se tiver <strong>arquivos atualizados</strong> dos sistemas SIGEM, GITEC ou SCON.
                  Ao re-importar, os dados anteriores da mesma fonte serão substituídos.
                </p>
                <Button variant="outline" size="sm" onClick={() => setShowUpload(true)} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Atualizar Dados
                </Button>
              </div>
            )}

            {!hasData && !showUpload && (
              <div className="pt-4 border-t mt-3">
                <p className="text-xs text-muted-foreground mb-3">
                  Nenhum dado importado ainda. Faça o upload dos arquivos operacionais para começar.
                </p>
                <Button size="sm" onClick={() => setShowUpload(true)} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Importar Dados
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Upload Section (collapsed by default when data exists) ── */}
      {showUpload && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {hasData ? "Atualizar Dados" : "Upload dos Arquivos"}
            </h2>
            {hasData && (
              <Button variant="ghost" size="sm" onClick={() => setShowUpload(false)}>
                Cancelar
              </Button>
            )}
          </div>

          {hasData && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-500 inline mr-2" />
              Ao processar novos arquivos, os dados anteriores da mesma fonte serão <strong>substituídos</strong>.
              Importe apenas os arquivos que deseja atualizar.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <UploadCard label="SIGEM" description="~22k documentos (.xlsx)" required file={sigemFile} onFile={handleSigem} />
            <UploadCard label="Relação de Eventos (GITEC)" description="~6.5k eventos RelResumoEvento (.xlsx)" required file={relFile} onFile={handleRel} />
            <UploadCard label="SCON (Resumido)" description="~1.5k componentes (.xlsx)" required file={sconFile} onFile={handleScon} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UploadCard label="SCON Programação (Completo)" description="Detalhamento semanal (.xlsx)" file={sconProgFile} onFile={handleSconProg} />
            <UploadCard label="Cronograma CR-5290" description="Cronograma financeiro (.xlsx)" file={cronoFile} onFile={handleCrono} />
          </div>

          {parsing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Lendo arquivo...
            </div>
          )}

          {cronoResult && (
            <div className="rounded-lg border border-muted bg-muted/30 p-4 space-y-3">
              <p className="text-sm font-medium">Preview do Cronograma:</p>
              <div className="grid grid-cols-3 gap-3 text-sm text-muted-foreground">
                <div className="font-mono">
                  <span className="font-semibold text-foreground">{cronoResult.tree.length}</span> nós na árvore
                </div>
                <div className="font-mono">
                  <span className="font-semibold text-foreground">{cronoResult.bmValues.length.toLocaleString("pt-BR")}</span> valores de BM
                </div>
                <div className="font-mono">
                  <span className="font-semibold text-foreground">{cronoResult.curvaS.length}</span> pontos Curva S
                </div>
              </div>
            </div>
          )}

          <ImportPreview sigem={sigemRows} relEvento={relRows} scon={sconRows} sconProg={sconProgRows} warnings={warnings} />

          {!processImport.isPending && (
            <Button
              size="lg"
              className="w-full"
              onClick={doProcess}
              disabled={(!allLoaded && !cronoFile && !sconProgFile) || totalRows === 0}
            >
              <Upload className="h-5 w-5 mr-2" />
              {allLoaded || cronoFile || sconProgFile
                ? `▶ Processar (${totalRows.toLocaleString("pt-BR")} registros)`
                : `Carregue os 3 arquivos (${[sigemFile, relFile, sconFile].filter(Boolean).length}/3)`
              }
            </Button>
          )}

          {processImport.isPending && (
            <div className="space-y-2">
              <Progress value={progressPct} className="h-3" />
              <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> {progressMsg}
              </p>
            </div>
          )}
        </>
      )}

      <ImportHistory />
    </div>
  );
};

export default ImportData;
