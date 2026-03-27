import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as XLSX from "xlsx";

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

function dateStr(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s.slice(0, 10);
}

// ── Config definitions ──

export interface ConfigCardDef {
  key: string;
  label: string;
  table: "ppu_items" | "classificacao_ppu" | "eac_items" | "criterio_medicao";
  source: string;
  range: number;
  description: string;
  parse: (raw: unknown[][]) => { rows: Record<string, unknown>[]; warnings: string[] };
}

function parsePPU(raw: unknown[][]): { rows: Record<string, unknown>[]; warnings: string[] } {
  const warnings: string[] = [];
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || r.length === 0) continue;
    const item_ppu = str(r[3]);
    if (!item_ppu) continue;
    const flag = str(r[0]).toLowerCase();
    rows.push({
      flag, item_eap: str(r[1]), item_gitec: str(r[2]), item_ppu,
      fase: str(r[4]), subfase: str(r[5]), agrupamento: str(r[6]),
      descricao: str(r[7]), criterio_medicao_ref: str(r[8]), item_lc: str(r[9]),
      reajuste: str(r[10]), unid_medida: str(r[11]),
      qtd: num(r[12]), preco_unit: num(r[13]), valor_total: num(r[14]), valor_medido: num(r[15]),
      carac: str(r[16]), disc: str(r[17]), fam: str(r[18]),
      data_inicio: dateStr(r[19]), data_fim: dateStr(r[20]),
    });
  }
  if (rows.length === 0) warnings.push("Nenhuma linha com Item PPU encontrada");
  return { rows, warnings };
}

function parseClassificacao(raw: unknown[][]): { rows: Record<string, unknown>[]; warnings: string[] } {
  const warnings: string[] = [];
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || r.length === 0) continue;
    const item_ppu = str(r[0]);
    if (!item_ppu) continue;
    rows.push({
      item_ppu, item_eap: str(r[1]), item_gitec: str(r[2]),
      fase: str(r[3]), subfase: str(r[4]), agrupamento: str(r[5]), disciplina: str(r[6]),
    });
  }
  if (rows.length === 0) warnings.push("Nenhuma linha com Item PPU encontrada");
  return { rows, warnings };
}

function parseEAC(raw: unknown[][]): { rows: Record<string, unknown>[]; warnings: string[] } {
  const warnings: string[] = [];
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || r.length === 0) continue;
    const ppu = str(r[1]);
    if (!ppu) continue;
    rows.push({
      ppu, up: str(r[2]), up_id: str(r[3]), ppu_agrup: str(r[4]),
      estrutura: str(r[5]), fase: str(r[6]), subfase: str(r[7]), agrupamento: str(r[8]),
      peso_fisico: num(r[9]), valor_financeiro: num(r[10]),
      data_inicio: dateStr(r[11]), data_termino: dateStr(r[12]),
      tipo_curva: str(r[13]), previsto: num(r[14]), realizado: num(r[15]),
      qtd_prevista: num(r[16]), um: str(r[17]), qtd_escopo: num(r[18]),
      vlr_medido: num(r[22]), valor_saldo: num(r[23]),
    });
  }
  if (rows.length === 0) warnings.push("Nenhuma linha com PPU encontrada");
  return { rows, warnings };
}

function parseCriterio(raw: unknown[][]): { rows: Record<string, unknown>[]; warnings: string[] } {
  const warnings: string[] = [];
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || r.length === 0) continue;
    const nivel = str(r[4]);
    if (!nivel.includes("7 - Etapa") && !nivel.includes("7 -Etapa") && !nivel.toLowerCase().includes("etapa")) continue;
    rows.push({
      identificador: str(r[2]), item_ppu: str(r[3]),
      nivel_estrutura: nivel, nome: str(r[5]),
      dicionario_etapa: str(r[6]),
      peso_absoluto: num(r[7]), peso_fisico_fin: num(r[8]),
    });
  }
  if (rows.length === 0) warnings.push("Nenhuma linha com Nível '7 - Etapa' encontrada");
  return { rows, warnings };
}

export const CONFIG_CARDS: ConfigCardDef[] = [
  {
    key: "ppu", label: "PPU-PREV", table: "ppu_items", source: "ppu_prev", range: 4,
    description: "Planilha de Preços Unitários (~900 itens)",
    parse: parsePPU,
  },
  {
    key: "classif", label: "Classificação PPU", table: "classificacao_ppu", source: "classificacao_ppu", range: 0,
    description: "Classificação por disciplina (~876 itens)",
    parse: parseClassificacao,
  },
  {
    key: "eac", label: "EAC", table: "eac_items", source: "eac", range: 2,
    description: "Curva de Avanço Físico/Financeiro (~874 itens)",
    parse: parseEAC,
  },
  {
    key: "criterio", label: "Critério de Medição", table: "criterio_medicao", source: "criterio_medicao", range: 5,
    description: "Anexo III — Etapas detalhadas (~1007 itens)",
    parse: parseCriterio,
  },
];

// ── File parsing ──

export function parseConfigFile(
  file: File,
  card: ConfigCardDef
): Promise<{ rows: Record<string, unknown>[]; warnings: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, range: card.range, defval: "" });
        resolve(card.parse(raw));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ── Hooks ──

export function useConfigCounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["config-counts", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const [ppu, classif, eac, criterio] = await Promise.all([
        supabase.from("ppu_items").select("id", { count: "exact", head: true }),
        supabase.from("classificacao_ppu").select("id", { count: "exact", head: true }),
        supabase.from("eac_items").select("id", { count: "exact", head: true }),
        supabase.from("criterio_medicao").select("id", { count: "exact", head: true }),
      ]);
      return {
        ppu_items: ppu.count ?? 0,
        classificacao_ppu: classif.count ?? 0,
        eac_items: eac.count ?? 0,
        criterio_medicao: criterio.count ?? 0,
      };
    },
  });
}

async function insertInBatches(
  table: "ppu_items" | "classificacao_ppu" | "eac_items" | "criterio_medicao",
  rows: Record<string, unknown>[],
  onProgress?: (done: number, total: number) => void
) {
  const BATCH = 500;
  const totalBatches = Math.ceil(rows.length / BATCH);
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase.from(table).insert(chunk as any);
    if (error) throw error;
    onProgress?.(Math.min(Math.floor(i / BATCH) + 1, totalBatches), totalBatches);
  }
}

export interface ConfigUploadInput {
  card: ConfigCardDef;
  rows: Record<string, unknown>[];
  file: File;
  replaceExisting: boolean;
  onProgress: (msg: string, pct: number) => void;
}

export function useConfigUpload() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: ConfigUploadInput) => {
      if (!user) throw new Error("Não autenticado");
      const { card, rows, file, replaceExisting, onProgress } = input;

      if (replaceExisting) {
        onProgress("Removendo dados anteriores...", 5);
        const { data: oldBatches } = await supabase
          .from("import_batches")
          .select("id")
          .eq("source", card.source)
          .eq("user_id", user.id);
        if (oldBatches && oldBatches.length > 0) {
          await supabase.from("import_batches").delete().in("id", oldBatches.map(b => b.id));
        }
      }

      onProgress("Criando batch...", 10);
      const { data: batch, error: bErr } = await supabase
        .from("import_batches")
        .insert({
          user_id: user.id,
          source: card.source,
          filename: file.name,
          row_count: rows.length,
          status: "processing",
        })
        .select()
        .single();
      if (bErr) throw bErr;

      const mapped = rows.map(r => ({ ...r, batch_id: batch.id }));
      await insertInBatches(card.table, mapped, (done, total) => {
        const pct = 10 + Math.round((done / total) * 85);
        onProgress(`Gravando lote ${done} de ${total}...`, pct);
      });

      await supabase
        .from("import_batches")
        .update({ status: "completed", row_count: rows.length })
        .eq("id", batch.id);

      onProgress("Concluído!", 100);
      return rows.length;
    },
    onSuccess: (count, input) => {
      qc.invalidateQueries({ queryKey: ["config-counts"] });
      qc.invalidateQueries({ queryKey: ["import-batches"] });
      toast.success(`${count.toLocaleString("pt-BR")} registros carregados em ${input.card.label}`);
    },
    onError: (err: Error) => {
      toast.error(`Erro no upload: ${err.message}`);
    },
  });
}
