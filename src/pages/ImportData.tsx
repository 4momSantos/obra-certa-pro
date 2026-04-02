import React, { useState, useCallback } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UploadCard } from "@/components/import/UploadCard";
import { ImportPreview } from "@/components/import/ImportPreview";
import { ImportHistory } from "@/components/import/ImportHistory";
import {
  parseSigemFile, parseRelEventoFile, parseSconFile, parseCronogramaFile,
  parseSconProgramacaoFile,
  useExistingCounts, useProcessImport,
  type ParsedSigemRow, type ParsedRelEventoRow, type ParsedSconRow,
  type ParsedSconProgRow, type CronogramaParseResult,
} from "@/hooks/useImport";

const ImportData: React.FC = () => {
  const { data: existing } = useExistingCounts();
  const processImport = useProcessImport();

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
      },
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Importar Dados</h1>
        <p className="text-sm text-muted-foreground">
          Upload dos arquivos operacionais — atualização a cada medição
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <UploadCard label="SIGEM" description="~22k documentos (.xlsx)" required file={sigemFile} onFile={handleSigem} />
        <UploadCard label="Relação de Eventos (GITEC)" description="~6.5k eventos RelResumoEvento (.xlsx)" required file={relFile} onFile={handleRel} />
        <UploadCard label="SCON (Resumido)" description="~1.5k componentes (.xlsx)" required file={sconFile} onFile={handleScon} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UploadCard label="SCON Programação (Completo)" description="Detalhamento semanal — pode ter 10.000+ linhas (.xlsx)" file={sconProgFile} onFile={handleSconProg} />
        <UploadCard label="Cronograma CR-5290" description="Cronograma financeiro (.xlsx)" file={cronoFile} onFile={handleCrono} />
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

      {cronoResult && (
        <div className="rounded-lg border border-muted bg-muted/30 p-4 space-y-3">
          <p className="text-sm font-medium">Preview do Cronograma:</p>
          <div className="grid grid-cols-3 gap-3 text-sm text-muted-foreground">
            <div className="font-mono">
              <span className="font-semibold text-foreground">{cronoResult.tree.length}</span> nós na árvore
              <span className="text-xs block">
                ({cronoResult.tree.filter(t => t.nivel.includes("Fase")).length} fases,{" "}
                {cronoResult.tree.filter(t => t.nivel.includes("Subfase")).length} subfases,{" "}
                {cronoResult.tree.filter(t => t.nivel.includes("Agrupamento")).length} agrupamentos)
              </span>
            </div>
            <div className="font-mono">
              <span className="font-semibold text-foreground">{cronoResult.bmValues.length.toLocaleString("pt-BR")}</span> valores de BM
              {(() => {
                const bms = new Set(cronoResult.bmValues.map(b => b.bm_name));
                return bms.size > 0 ? <span className="text-xs block">{[...bms].sort()[0]} a {[...bms].sort().pop()}</span> : null;
              })()}
            </div>
            <div className="font-mono">
              <span className="font-semibold text-foreground">{cronoResult.curvaS.length}</span> pontos Curva S
            </div>
          </div>
          {cronoResult.tree.length > 0 && (
            <div className="rounded border overflow-auto max-h-[200px]">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/50 text-left">
                  <th className="px-2 py-1 font-semibold">Nível</th>
                  <th className="px-2 py-1 font-semibold">iPPU</th>
                  <th className="px-2 py-1 font-semibold">Nome</th>
                  <th className="px-2 py-1 font-semibold text-right">Valor</th>
                </tr></thead>
                <tbody>
                  {cronoResult.tree.slice(0, 10).map((t, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1 text-muted-foreground">{t.nivel}</td>
                      <td className="px-2 py-1 font-mono">{t.ippu || "—"}</td>
                      <td className="px-2 py-1 truncate max-w-[200px]">{t.nome}</td>
                      <td className="px-2 py-1 text-right font-mono">{t.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {cronoResult.tree.length > 10 && <p className="text-[10px] text-muted-foreground text-center py-1">... e mais {cronoResult.tree.length - 10}</p>}
            </div>
          )}
        </div>
      )}

      <ImportPreview sigem={sigemRows} relEvento={relRows} scon={sconRows} sconProg={sconProgRows} warnings={warnings} />

      {!processImport.isPending && (
        <div className="space-y-2">
          <Button
            size="lg"
            className="w-full"
            onClick={doProcess}
            disabled={(!allLoaded && !cronoFile && !sconProgFile) || totalRows === 0}
          >
            <Upload className="h-5 w-5 mr-2" />
            {allLoaded || cronoFile || sconProgFile
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
