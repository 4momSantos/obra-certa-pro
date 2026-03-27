import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const BATCHES_KEY = "import-batches";

// ── Helpers ──

function str(v: unknown): string {
  if (v == null) return "";
  // Remove null bytes and other chars that break JSON serialization
  return String(v).trim().replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
}

function num(v: unknown): number {
  if (v == null) return 0;
  const s = String(v).replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function dateVal(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s.slice(0, 10);
}

/** Find column index by fuzzy-matching header names */
function findCol(headers: string[], ...candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.findIndex(h => h.toLowerCase().includes(c.toLowerCase()));
    if (idx >= 0) return idx;
  }
  return -1;
}

/** Safe cell read — returns "" if column not found */
function cell(row: unknown[], col: number): unknown {
  return col >= 0 ? row[col] : undefined;
}

// ── Types ──

export interface ParsedSigemRow {
  documento: string;
  revisao: string;
  incluido_em: string;
  titulo: string;
  status: string;
  up: string;
  status_correto: string;
  ppu: string;
  status_gitec: string;
  documento_revisao: string;
}

export interface ParsedRelEventoRow {
  item_ppu: string;
  rel_status: string;
  rel_status_item: string;
  tag_agrup: string;
  quantidade_ponderada: number;
  estrutura: string;
  fase: string;
  subfase: string;
  agrupamento: string;
  caracteristica: string;
  tag: string;
  qtd: number;
  um: string;
  etapa: string;
  peso_fisico: number;
  peso_financeiro: number;
  data_execucao: string | null;
  data_inf_execucao: string | null;
  executado_por: string;
  necessita_evidencias: string;
  numero_evidencias: string;
  data_aprovacao: string | null;
  fiscal_responsavel: string;
  status: string;
  valor: number;
  comentario: string;
}

export interface ParsedSconRow {
  item_criterio: string;
  relatorio_esperado: string;
  status_sigem: string;
  status_gitec: string;
  obra_desc: string;
  classe: string;
  disciplina: string;
  tipo: string;
  item_wbs: string;
  tag: string;
  tag_desc: string;
  qtde_etapa: number;
  qtde_etapa_exec_acum: number;
  avanco_ponderado: number;
  tag_id_proj: string;
}

export interface ParseResult {
  sigem: ParsedSigemRow[];
  relEvento: ParsedRelEventoRow[];
  scon: ParsedSconRow[];
  warnings: string[];
}

// ── Parsers ──

export function parseSigemFile(file: File): Promise<{ rows: ParsedSigemRow[]; warnings: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, range: 4, defval: "" });
        const warnings: string[] = [];
        const headers = (raw[0] || []).map(h => str(h));

        const cDoc = findCol(headers, "documento");
        const cRev = findCol(headers, "revisão", "revisao", "rev");
        const cInc = findCol(headers, "incluido em", "incluído em", "incluido");
        const cTit = findCol(headers, "título", "titulo");
        const cSta = findCol(headers, "status");
        const cUp = findCol(headers, "up");
        const cStaCorr = findCol(headers, "status correto", "status_correto");
        const cPpu = findCol(headers, "ppu");
        const cStaGitec = findCol(headers, "status gitec", "status_gitec");
        const cDocRev = findCol(headers, "documento_revisao", "documento revisão", "doc_rev");

        if (cDoc < 0) warnings.push("Coluna 'Documento' não encontrada no cabeçalho SIGEM");
        if (cStaCorr < 0) warnings.push("Coluna STATUS CORRETO não encontrada — usando Status");
        if (cPpu < 0) warnings.push("Coluna PPU não encontrada");

        let noDoc = 0;
        const rows: ParsedSigemRow[] = [];
        for (let i = 1; i < raw.length; i++) {
          const r = raw[i];
          if (!r || r.length === 0) continue;
          const documento = str(cell(r, cDoc >= 0 ? cDoc : 0));
          if (!documento) { noDoc++; continue; }
          const status = str(cell(r, cSta));
          rows.push({
            documento,
            revisao: str(cell(r, cRev)),
            incluido_em: str(cell(r, cInc)),
            titulo: str(cell(r, cTit)),
            status,
            up: str(cell(r, cUp)),
            status_correto: cStaCorr >= 0 ? (str(cell(r, cStaCorr)) || status) : status,
            ppu: cPpu >= 0 ? str(cell(r, cPpu)) : "",
            status_gitec: str(cell(r, cStaGitec)),
            documento_revisao: str(cell(r, cDocRev)),
          });
        }
        if (noDoc > 0) warnings.push(`${noDoc} linhas sem Documento (ignoradas)`);
        resolve({ rows, warnings });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function parseRelEventoFile(file: File): Promise<{ rows: ParsedRelEventoRow[]; warnings: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, range: 2, defval: "" });
        const warnings: string[] = [];

        let noKey = 0;
        const rows: ParsedRelEventoRow[] = [];
        for (let i = 1; i < raw.length; i++) {
          const r = raw[i];
          if (!r || r.length === 0) continue;
          const item_ppu = str(r[0]);
          const tag = str(r[10]);
          if (!item_ppu && !tag) { noKey++; continue; }
          rows.push({
            item_ppu,
            rel_status: str(r[1]),
            rel_status_item: str(r[2]),
            tag_agrup: str(r[3]),
            quantidade_ponderada: num(r[4]),
            estrutura: str(r[5]),
            fase: str(r[6]),
            subfase: str(r[7]),
            agrupamento: str(r[8]),
            caracteristica: str(r[9]),
            tag,
            qtd: num(r[11]),
            um: str(r[12]),
            etapa: str(r[13]),
            peso_fisico: num(r[14]),
            peso_financeiro: num(r[15]),
            data_execucao: dateVal(r[16]),
            data_inf_execucao: dateVal(r[17]),
            executado_por: str(r[18]),
            necessita_evidencias: str(r[19]),
            numero_evidencias: str(r[20]),
            data_aprovacao: dateVal(r[21]),
            fiscal_responsavel: str(r[22]),
            status: str(r[23]),
            valor: num(r[24]),
            comentario: str(r[25]),
          });
        }
        if (noKey > 0) warnings.push(`${noKey} linhas sem Item PPU nem TAG (ignoradas)`);
        resolve({ rows, warnings });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function parseSconFile(file: File): Promise<{ rows: ParsedSconRow[]; warnings: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: "" });
        const warnings: string[] = [];

        let noTag = 0;
        const rows: ParsedSconRow[] = [];
        for (let i = 1; i < raw.length; i++) {
          const r = raw[i];
          if (!r || r.length === 0) continue;
          const tag = str(r[9]);
          const item_wbs = str(r[8]);
          if (!tag && !item_wbs) { noTag++; continue; }
          rows.push({
            item_criterio: str(r[0]),
            relatorio_esperado: str(r[1]),
            status_sigem: str(r[2]),
            status_gitec: str(r[3]),
            obra_desc: str(r[4]),
            classe: str(r[5]),
            disciplina: str(r[6]),
            tipo: str(r[7]),
            item_wbs,
            tag,
            tag_desc: str(r[10]),
            qtde_etapa: num(r[11]),
            qtde_etapa_exec_acum: num(r[12]),
            avanco_ponderado: num(r[13]),
            tag_id_proj: str(r[14]),
          });
        }
        if (noTag > 0) warnings.push(`${noTag} linhas sem TAG nem ItemWBS (ignoradas)`);
        resolve({ rows, warnings });
      } catch (err) { reject(err); }
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
      const [s, r, c] = await Promise.all([
        supabase.from("sigem_documents").select("id", { count: "exact", head: true }),
        supabase.from("rel_eventos").select("id", { count: "exact", head: true }),
        supabase.from("scon_components").select("id", { count: "exact", head: true }),
      ]);
      return {
        sigem: s.count ?? 0,
        relEvento: r.count ?? 0,
        scon: c.count ?? 0,
      };
    },
  });
}

async function insertInBatches(
  table: string,
  rows: Record<string, unknown>[],
  onProgress?: (done: number, total: number) => void
) {
  const BATCH = 500;
  const totalBatches = Math.ceil(rows.length / BATCH);
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase.from(table as any).insert(chunk as any);
    if (error) throw error;
    onProgress?.(Math.min(Math.floor(i / BATCH) + 1, totalBatches), totalBatches);
  }
}

export interface ProcessInput {
  sigemRows: ParsedSigemRow[];
  relEventoRows: ParsedRelEventoRow[];
  sconRows: ParsedSconRow[];
  sigemFile: File | null;
  relEventoFile: File | null;
  sconFile: File | null;
  onProgress: (msg: string, pct: number) => void;
}

export function useProcessImport() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: ProcessInput) => {
      if (!user) throw new Error("Não autenticado");
      const { sigemRows, relEventoRows, sconRows, sigemFile, relEventoFile, sconFile, onProgress } = input;
      const totalRows = sigemRows.length + relEventoRows.length + sconRows.length;
      let processed = 0;
      const report = (msg: string) => onProgress(msg, Math.round((processed / totalRows) * 100));
      const results: string[] = [];

      // Delete previous batches for these sources
      report("Removendo dados anteriores...");
      for (const src of ["sigem", "rel_evento", "scon"]) {
        const { data: old } = await supabase.from("import_batches").select("id").eq("source", src).eq("user_id", user.id);
        if (old && old.length > 0) {
          await supabase.from("import_batches").delete().in("id", old.map(b => b.id));
        }
      }

      // SIGEM
      if (sigemRows.length > 0 && sigemFile) {
        report("Criando batch SIGEM...");
        const { data: batch, error: bErr } = await supabase.from("import_batches").insert({
          user_id: user.id, source: "sigem", filename: sigemFile.name, row_count: sigemRows.length, status: "processing",
        }).select().single();
        if (bErr) throw bErr;
        const mapped = sigemRows.map(r => ({ ...r, batch_id: batch.id }));
        await insertInBatches("sigem_documents", mapped, (done, total) => {
          processed = done * 500;
          report(`Gravando SIGEM — lote ${done} de ${total}...`);
        });
        await supabase.from("import_batches").update({ status: "completed", row_count: sigemRows.length }).eq("id", batch.id);
        processed = sigemRows.length;
        results.push(`${sigemRows.length.toLocaleString("pt-BR")} docs SIGEM`);
      }

      // REL_EVENTO
      if (relEventoRows.length > 0 && relEventoFile) {
        report("Criando batch REL_EVENTO...");
        const { data: batch, error: bErr } = await supabase.from("import_batches").insert({
          user_id: user.id, source: "rel_evento", filename: relEventoFile.name, row_count: relEventoRows.length, status: "processing",
        }).select().single();
        if (bErr) throw bErr;
        const mapped = relEventoRows.map(r => ({ ...r, batch_id: batch.id }));
        await insertInBatches("rel_eventos", mapped, (done, total) => {
          report(`Gravando REL_EVENTO — lote ${done} de ${total}...`);
        });
        await supabase.from("import_batches").update({ status: "completed", row_count: relEventoRows.length }).eq("id", batch.id);
        processed += relEventoRows.length;
        results.push(`${relEventoRows.length.toLocaleString("pt-BR")} eventos`);
      }

      // SCON
      if (sconRows.length > 0 && sconFile) {
        report("Criando batch SCON...");
        const { data: batch, error: bErr } = await supabase.from("import_batches").insert({
          user_id: user.id, source: "scon", filename: sconFile.name, row_count: sconRows.length, status: "processing",
        }).select().single();
        if (bErr) throw bErr;
        const mapped = sconRows.map(r => ({ ...r, batch_id: batch.id }));
        await insertInBatches("scon_components", mapped, (done, total) => {
          report(`Gravando SCON — lote ${done} de ${total}...`);
        });
        await supabase.from("import_batches").update({ status: "completed", row_count: sconRows.length }).eq("id", batch.id);
        processed += sconRows.length;
        results.push(`${sconRows.length.toLocaleString("pt-BR")} componentes`);
      }

      onProgress("Concluído!", 100);
      return results.join(" + ");
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
