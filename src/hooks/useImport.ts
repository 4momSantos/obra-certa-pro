import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const BATCHES_KEY = "import-batches";

// ── Types ──

export interface ParsedGitecRow {
  agrupamento: string;
  ippu: string | null;
  tag: string;
  etapa: string;
  status: string;
  valor: number;
  data_execucao: string | null;
  data_inf_execucao: string | null;
  data_aprovacao: string | null;
  executado_por: string;
  fiscal: string;
  evidencias: string;
  comentario: string;
}

export interface ParsedDocumentRow {
  documento: string;
  revisao: string;
  incluido_em: string;
  titulo: string;
  status: string;
  nivel2: string;
  nivel3: string;
  tipo: string;
  status_workflow: string;
  dias_corridos_wf: number;
}

export interface ParsedRevisionRow {
  documento: string;
  revisao: string;
  modificado_em: string;
  titulo: string;
  status: string;
  nivel2: string;
  texto_consolidacao: string;
  proposito_emissao: string;
}

export interface ParseResult {
  gitec: ParsedGitecRow[];
  documents: ParsedDocumentRow[];
  revisions: ParsedRevisionRow[];
  warnings: string[];
}

// ── Parsers ──

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function num(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function dateStr(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  if (!s) return null;
  // Try DD/MM/YYYY
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s.slice(0, 10);
}

const IPPU_RE = /^([A-Z])_(\d+(?:\.\d+)*)/;

function extractIppu(agrupamento: string): string | null {
  const m = agrupamento.match(IPPU_RE);
  return m ? `${m[1]}-${m[2]}` : null;
}

export function parseGitecFile(file: File): Promise<{ rows: ParsedGitecRow[]; warnings: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, range: 4, defval: "" });
        const warnings: string[] = [];
        let noAgrup = 0, noStatus = 0;

        const rows: ParsedGitecRow[] = [];
        for (let i = 1; i < raw.length; i++) {
          const r = raw[i];
          if (!r || r.length === 0) continue;
          const agrupamento = str(r[0]);
          const tag = str(r[1]);
          const status = str(r[3]);
          if (!agrupamento && !tag && !status) continue;
          if (!agrupamento) noAgrup++;
          if (!status) noStatus++;
          rows.push({
            agrupamento,
            ippu: extractIppu(agrupamento),
            tag,
            etapa: str(r[2]),
            status,
            valor: num(r[4]),
            data_execucao: dateStr(r[5]),
            data_inf_execucao: dateStr(r[6]),
            data_aprovacao: dateStr(r[7]),
            executado_por: str(r[8]),
            fiscal: str(r[9]),
            evidencias: str(r[10]),
            comentario: str(r[11]),
          });
        }
        if (noAgrup > 0) warnings.push(`${noAgrup} linhas sem Agrupamento`);
        if (noStatus > 0) warnings.push(`${noStatus} linhas sem Status`);
        resolve({ rows, warnings });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function parseDocumentsFile(file: File): Promise<{ rows: ParsedDocumentRow[]; warnings: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, range: 4, defval: "" });
        const warnings: string[] = [];
        let noDoc = 0;
        const rows: ParsedDocumentRow[] = [];
        for (let i = 1; i < raw.length; i++) {
          const r = raw[i];
          if (!r || r.length === 0) continue;
          const documento = str(r[0]);
          if (!documento) { noDoc++; continue; }
          rows.push({
            documento,
            revisao: str(r[1]),
            incluido_em: str(r[2]),
            titulo: str(r[3]),
            status: str(r[4]),
            nivel2: str(r[5]),
            nivel3: str(r[6]),
            tipo: str(r[7]),
            status_workflow: str(r[8]),
            dias_corridos_wf: num(r[9]),
          });
        }
        if (noDoc > 0) warnings.push(`${noDoc} linhas sem Documento (ignoradas)`);
        resolve({ rows, warnings });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function parseRevisionsFile(file: File): Promise<{ rows: ParsedRevisionRow[]; warnings: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, range: 4, defval: "" });
        const warnings: string[] = [];
        let noDoc = 0;
        const rows: ParsedRevisionRow[] = [];
        for (let i = 1; i < raw.length; i++) {
          const r = raw[i];
          if (!r || r.length === 0) continue;
          const documento = str(r[0]);
          if (!documento) { noDoc++; continue; }
          rows.push({
            documento,
            revisao: str(r[1]),
            modificado_em: str(r[2]),
            titulo: str(r[3]),
            status: str(r[4]),
            nivel2: str(r[5]),
            texto_consolidacao: str(r[6]),
            proposito_emissao: str(r[7]),
          });
        }
        if (noDoc > 0) warnings.push(`${noDoc} linhas sem Documento (ignoradas)`);
        resolve({ rows, warnings });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ── Hooks ──

export function useImportBatches() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [BATCHES_KEY, user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("import_batches")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useDeleteBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("import_batches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BATCHES_KEY] });
      toast.success("Import excluído");
    },
  });
}

export function useExistingCounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["import-existing-counts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [g, d, r] = await Promise.all([
        supabase.from("gitec_events").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("document_revisions").select("id", { count: "exact", head: true }),
      ]);
      return {
        gitec: g.count ?? 0,
        documents: d.count ?? 0,
        revisions: r.count ?? 0,
      };
    },
  });
}

async function insertInBatches<T extends Record<string, unknown>>(
  table: "gitec_events" | "documents" | "document_revisions",
  rows: T[],
  onProgress?: (done: number, total: number) => void
) {
  const BATCH = 500;
  const total = Math.ceil(rows.length / BATCH);
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase.from(table).insert(chunk as any);
    if (error) throw error;
    onProgress?.(Math.min(Math.floor(i / BATCH) + 1, total), total);
  }
}

export interface ProcessInput {
  gitecRows: ParsedGitecRow[];
  docRows: ParsedDocumentRow[];
  revRows: ParsedRevisionRow[];
  gitecFile: File | null;
  docFile: File | null;
  revFile: File | null;
  replaceMode: boolean;
  onProgress: (msg: string, pct: number) => void;
}

export function useProcessImport() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: ProcessInput) => {
      if (!user) throw new Error("Não autenticado");
      const { gitecRows, docRows, revRows, gitecFile, docFile, revFile, replaceMode, onProgress } = input;
      const totalRows = gitecRows.length + docRows.length + revRows.length;
      let processed = 0;

      const report = (msg: string) => {
        onProgress(msg, Math.round((processed / totalRows) * 100));
      };

      // If replace mode, delete old batches for each source
      if (replaceMode) {
        report("Removendo dados anteriores...");
        if (gitecRows.length > 0) {
          const { data: old } = await supabase.from("import_batches").select("id").eq("source", "gitec").eq("user_id", user.id);
          if (old && old.length > 0) {
            await supabase.from("import_batches").delete().in("id", old.map(b => b.id));
          }
        }
        if (docRows.length > 0) {
          const { data: old } = await supabase.from("import_batches").select("id").eq("source", "consulta_geral").eq("user_id", user.id);
          if (old && old.length > 0) {
            await supabase.from("import_batches").delete().in("id", old.map(b => b.id));
          }
        }
        if (revRows.length > 0) {
          const { data: old } = await supabase.from("import_batches").select("id").eq("source", "consolidacao").eq("user_id", user.id);
          if (old && old.length > 0) {
            await supabase.from("import_batches").delete().in("id", old.map(b => b.id));
          }
        }
      }

      const results: string[] = [];

      // GITEC
      if (gitecRows.length > 0 && gitecFile) {
        report("Criando batch GITEC...");
        const { data: batch, error: bErr } = await supabase.from("import_batches").insert({
          user_id: user.id, source: "gitec", filename: gitecFile.name, row_count: gitecRows.length, status: "processing",
        }).select().single();
        if (bErr) throw bErr;

        const mapped = gitecRows.map(r => ({ ...r, batch_id: batch.id }));
        await insertInBatches("gitec_events", mapped, (done, total) => {
          processed = done * 500;
          report(`Gravando GITEC — lote ${done} de ${total}...`);
        });
        await supabase.from("import_batches").update({ status: "completed", row_count: gitecRows.length }).eq("id", batch.id);
        processed = gitecRows.length;
        results.push(`${gitecRows.length} eventos GITEC`);
      }

      // Documents
      if (docRows.length > 0 && docFile) {
        report("Criando batch Documentos...");
        const { data: batch, error: bErr } = await supabase.from("import_batches").insert({
          user_id: user.id, source: "consulta_geral", filename: docFile.name, row_count: docRows.length, status: "processing",
        }).select().single();
        if (bErr) throw bErr;

        const mapped = docRows.map(r => ({ ...r, batch_id: batch.id }));
        await insertInBatches("documents", mapped, (done, total) => {
          report(`Gravando Documentos — lote ${done} de ${total}...`);
        });
        await supabase.from("import_batches").update({ status: "completed", row_count: docRows.length }).eq("id", batch.id);
        processed += docRows.length;
        results.push(`${docRows.length} documentos`);
      }

      // Revisions
      if (revRows.length > 0 && revFile) {
        report("Criando batch Revisões...");
        const { data: batch, error: bErr } = await supabase.from("import_batches").insert({
          user_id: user.id, source: "consolidacao", filename: revFile.name, row_count: revRows.length, status: "processing",
        }).select().single();
        if (bErr) throw bErr;

        const mapped = revRows.map(r => ({ ...r, batch_id: batch.id }));
        await insertInBatches("document_revisions", mapped, (done, total) => {
          report(`Gravando Revisões — lote ${done} de ${total}...`);
        });
        await supabase.from("import_batches").update({ status: "completed", row_count: revRows.length }).eq("id", batch.id);
        processed += revRows.length;
        results.push(`${revRows.length} revisões`);
      }

      onProgress("Concluído!", 100);
      return results.join(", ");
    },
    onSuccess: (msg) => {
      qc.invalidateQueries({ queryKey: [BATCHES_KEY] });
      qc.invalidateQueries({ queryKey: ["import-existing-counts"] });
      toast.success(`Importação concluída: ${msg}`);
    },
    onError: (err: Error) => {
      toast.error(`Erro na importação: ${err.message}`);
    },
  });
}
