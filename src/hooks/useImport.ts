import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const BATCHES_KEY = "import-batches";

// ── Helpers ──

function str(v: unknown): string {
  if (v == null) return "";
  return String(v)
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f\u2028\u2029]/g, "")
    .replace(/[\ud800-\udfff]/g, "")
    .trim();
}

function num(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  const raw = str(v)
    .replace(/^R\$\s*/i, "")
    .replace(/%$/i, "")
    .replace(/\s+/g, "");

  if (!raw) return 0;

  const negative = raw.startsWith("(") && raw.endsWith(")");
  const unsigned = raw.replace(/[()]/g, "");
  const hasComma = unsigned.includes(",");
  const hasDot = unsigned.includes(".");

  let normalized = unsigned;
  if (hasComma && hasDot) {
    normalized = unsigned.lastIndexOf(",") > unsigned.lastIndexOf(".")
      ? unsigned.replace(/\./g, "").replace(",", ".")
      : unsigned.replace(/,/g, "");
  } else if (hasComma) {
    normalized = unsigned.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = unsigned.replace(/,/g, "");
  }

  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n)) return 0;
  return negative ? -n : n;
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
function normalizeHeader(value: string): string {
  return str(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function findCol(headers: string[], ...candidates: string[]): number {
  const normalizedHeaders = headers.map(normalizeHeader);

  for (const c of candidates) {
    const normalizedCandidate = normalizeHeader(c);
    const idx = normalizedHeaders.findIndex(h => h === normalizedCandidate);
    if (idx >= 0) return idx;
  }

  for (const c of candidates) {
    const normalizedCandidate = normalizeHeader(c);
    const idx = normalizedHeaders.findIndex(
      h => h.includes(normalizedCandidate) || normalizedCandidate.includes(h)
    );
    if (idx >= 0) return idx;
  }

  return -1;
}

/** Safe cell read — returns "" if column not found */
function cell(row: unknown[], col: number): unknown {
  return col >= 0 ? row[col] : undefined;
}

function sanitizeForInsert(value: unknown): unknown {
  if (value == null || typeof value === "undefined") return null;
  if (typeof value === "symbol" || typeof value === "bigint") return String(value);
  if (value instanceof Date) {
    const iso = value.toISOString();
    return iso === "Invalid Date" ? null : iso;
  }
  if (typeof value === "string") return str(value);
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(sanitizeForInsert);

  if (typeof value === "object") {
    try {
      return Object.fromEntries(
        Object.entries(value)
          .map(([key, innerValue]) => [key, sanitizeForInsert(innerValue)])
          .filter(([, innerValue]) => innerValue !== undefined)
      );
    } catch {
      return "{}";
    }
  }

  return str(value);
}

/** Ensure entire row is JSON-serializable */
function ensureJsonSafe(row: Record<string, unknown>): Record<string, unknown> {
  try {
    JSON.stringify(row);
    return row;
  } catch {
    const safe: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      try {
        JSON.stringify(v);
        safe[k] = v;
      } catch {
        safe[k] = typeof v === "string" ? str(v) : "";
      }
    }
    return safe;
  }
}

function sanitizeRowForInsert(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row)
      .map(([key, value]) => [key, sanitizeForInsert(value)])
      .filter(([, value]) => value !== undefined)
  );
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
        const cSta = findCol(headers, "status", "status documento");
        const cUp = findCol(headers, "up");
        const cStaCorr = findCol(headers, "status correto", "status_correto");
        const cPpu = findCol(headers, "ppu", "item ppu", "item_ppu", "ippu");
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
        const headers = (raw[0] || []).map(h => str(h));

        const cItemPpu = findCol(headers, "item ppu", "item_ppu", "ippu");
        const cRelSta = findCol(headers, "rel status", "rel_status", "status rel");
        const cRelStaItem = findCol(headers, "rel status item", "rel_status_item", "status item");
        const cTagAgrup = findCol(headers, "tag agrup", "tag_agrup");
        const cQtdPond = findCol(headers, "quantidade ponderada", "qtd ponderada", "qtd_pond");
        const cEstrutura = findCol(headers, "estrutura");
        const cFase = findCol(headers, "fase");
        const cSubfase = findCol(headers, "subfase");
        const cAgrup = findCol(headers, "agrupamento");
        const cCarac = findCol(headers, "caracteristica", "característica");
        const cTag = findCol(headers, "tag");
        const cQtd = findCol(headers, "qtd");
        const cUm = findCol(headers, "um", "unidade");
        const cEtapa = findCol(headers, "etapa");
        const cPesoFis = findCol(headers, "peso fisico", "peso físico", "peso_fisico");
        const cPesoFin = findCol(headers, "peso financeiro", "peso_financeiro");
        const cDataExec = findCol(headers, "data de execução", "data execução", "data_execucao", "data execucao");
        const cDataInf = findCol(headers, "data inf", "data_inf_execucao", "data inf. exec");
        const cExecPor = findCol(headers, "executado por", "executado_por");
        const cNecEvid = findCol(headers, "necessita evidencia", "necessita evidência", "necessita_evidencias");
        const cNumEvid = findCol(headers, "numero evidencia", "número evidência", "numero_evidencias", "evidência");
        const cDataAprov = findCol(headers, "data de aprovação", "data aprovação", "data_aprovacao");
        const cFiscal = findCol(headers, "fiscal responsável", "fiscal responsavel", "fiscal_responsavel", "fiscal");
        const cStatus = findCol(headers, "status", "status evento");
        const cValor = findCol(headers, "valor");
        const cComent = findCol(headers, "comentário", "comentario");

        if (cTag < 0) warnings.push("Coluna 'TAG' não encontrada no cabeçalho REL_EVENTO");
        if (cStatus < 0) warnings.push("Coluna 'Status' não encontrada no cabeçalho REL_EVENTO");
        if (cValor < 0) warnings.push("Coluna 'Valor' não encontrada no cabeçalho REL_EVENTO");

        let noKey = 0;
        const rows: ParsedRelEventoRow[] = [];
        for (let i = 1; i < raw.length; i++) {
          const r = raw[i];
          if (!r || r.length === 0) continue;
          const item_ppu = str(cell(r, cItemPpu));
          const tag = str(cell(r, cTag));
          if (!item_ppu && !tag) { noKey++; continue; }
          rows.push({
            item_ppu,
            rel_status: str(cell(r, cRelSta)),
            rel_status_item: str(cell(r, cRelStaItem)),
            tag_agrup: str(cell(r, cTagAgrup)),
            quantidade_ponderada: num(cell(r, cQtdPond)),
            estrutura: str(cell(r, cEstrutura)),
            fase: str(cell(r, cFase)),
            subfase: str(cell(r, cSubfase)),
            agrupamento: str(cell(r, cAgrup)),
            caracteristica: str(cell(r, cCarac)),
            tag,
            qtd: num(cell(r, cQtd)),
            um: str(cell(r, cUm)),
            etapa: str(cell(r, cEtapa)),
            peso_fisico: num(cell(r, cPesoFis)),
            peso_financeiro: num(cell(r, cPesoFin)),
            data_execucao: dateVal(cell(r, cDataExec)),
            data_inf_execucao: dateVal(cell(r, cDataInf)),
            executado_por: str(cell(r, cExecPor)),
            necessita_evidencias: str(cell(r, cNecEvid)),
            numero_evidencias: str(cell(r, cNumEvid)),
            data_aprovacao: dateVal(cell(r, cDataAprov)),
            fiscal_responsavel: str(cell(r, cFiscal)),
            status: str(cell(r, cStatus)),
            valor: num(cell(r, cValor)),
            comentario: str(cell(r, cComent)),
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
        const headers = (raw[0] || []).map(h => str(h));

        const cItemCrit = findCol(headers, "item criterio", "item critério", "item_criterio");
        const cRelEsp = findCol(headers, "relatorio esperado", "relatório esperado", "relatorio_esperado");
        const cStaSigem = findCol(headers, "status sigem", "status_sigem");
        const cStaGitec = findCol(headers, "status gitec", "status_gitec");
        const cObra = findCol(headers, "obra", "obra_desc");
        const cClasse = findCol(headers, "classe");
        const cDisc = findCol(headers, "disciplina");
        const cTipo = findCol(headers, "tipo");
        const cItemWbs = findCol(headers, "item wbs", "item_wbs", "wbs");
        const cTag = findCol(headers, "tag");
        const cTagDesc = findCol(headers, "tag desc", "tag_desc", "descrição tag");
        const cQtdEtapa = findCol(headers, "qtde etapa", "qtde_etapa", "qtd etapa");
        const cQtdExec = findCol(headers, "qtde etapa exec", "exec acum", "qtde_etapa_exec_acum");
        const cAvanco = findCol(headers, "avanço ponderado", "avanco ponderado", "avanco_ponderado", "avanço");
        const cTagIdProj = findCol(headers, "tag id proj", "tag_id_proj");

        if (cTag < 0) warnings.push("Coluna 'TAG' não encontrada no cabeçalho SCON");

        let noTag = 0;
        const rows: ParsedSconRow[] = [];
        for (let i = 1; i < raw.length; i++) {
          const r = raw[i];
          if (!r || r.length === 0) continue;
          const tag = str(cell(r, cTag));
          const item_wbs = str(cell(r, cItemWbs));
          if (!tag && !item_wbs) { noTag++; continue; }
          rows.push({
            item_criterio: str(cell(r, cItemCrit)),
            relatorio_esperado: str(cell(r, cRelEsp)),
            status_sigem: str(cell(r, cStaSigem)),
            status_gitec: str(cell(r, cStaGitec)),
            obra_desc: str(cell(r, cObra)),
            classe: str(cell(r, cClasse)),
            disciplina: str(cell(r, cDisc)),
            tipo: str(cell(r, cTipo)),
            item_wbs,
            tag,
            tag_desc: str(cell(r, cTagDesc)),
            qtde_etapa: num(cell(r, cQtdEtapa)),
            qtde_etapa_exec_acum: num(cell(r, cQtdExec)),
            avanco_ponderado: num(cell(r, cAvanco)),
            tag_id_proj: str(cell(r, cTagIdProj)),
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

// ── Cronograma Parser ──

export interface ParsedCronoTreeRow {
  nivel: string;
  ippu: string;
  nome: string;
  valor: number;
  acumulado: number;
  saldo: number;
  fase_nome: string;
  subfase_nome: string;
  sort_order: number;
}

export interface ParsedCronoBmRow {
  ippu: string;
  bm_name: string;
  bm_number: number;
  tipo: string;
  valor: number;
}

export interface ParsedCurvaSRow {
  label: string;
  col_index: number;
  previsto_acum: number;
  projetado_acum: number;
  realizado_acum: number;
  previsto_mensal: number;
  projetado_mensal: number;
  realizado_mensal: number;
}

export interface CronogramaParseResult {
  tree: ParsedCronoTreeRow[];
  bmValues: ParsedCronoBmRow[];
  curvaS: ParsedCurvaSRow[];
  warnings: string[];
}

export function parseCronogramaFile(file: File): Promise<CronogramaParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
        const warnings: string[] = [];
        const tree: ParsedCronoTreeRow[] = [];
        const bmValues: ParsedCronoBmRow[] = [];
        const curvaS: ParsedCurvaSRow[] = [];

        // ── EAP Sheet ──
        const eapSheet = wb.SheetNames.find(s => s === "EAP") || wb.SheetNames[2] || wb.SheetNames[0];
        const rows: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[eapSheet], { header: 1, defval: null });

        if (rows.length < 7) {
          warnings.push("Planilha EAP muito curta");
          resolve({ tree, bmValues, curvaS, warnings });
          return;
        }

        // Passo 1 — Mapear colunas de BM (dinâmicas)
        // BMs estão na linha 3 (index 2), tipos na linha 6 (index 5)
        // Começam a partir da coluna 19 (index 19)
        interface BmCol { col: number; type: string }
        interface BmEntry { name: string; number: number; cols: BmCol[] }
        const bmMap: BmEntry[] = [];

        for (let c = 19; c < Math.min(90, rows[0]?.length || 0); c++) {
          const label = rows[2]?.[c];
          if (label && String(label).startsWith("BM")) {
            const bm: BmEntry = {
              name: String(label),
              number: parseInt(String(label).replace("BM-", "")),
              cols: [],
            };
            bm.cols.push({ col: c, type: String(rows[5]?.[c] || "Previsto") });
            let nc = c + 1;
            while (nc < c + 4 && nc < (rows[0]?.length || 0)) {
              const nextLabel = rows[2]?.[nc];
              if (nextLabel && (String(nextLabel).startsWith("BM") || String(nextLabel) === "TOTAL")) break;
              const nextType = rows[5]?.[nc];
              if (nextType) bm.cols.push({ col: nc, type: String(nextType) });
              nc++;
            }
            bmMap.push(bm);
            c = nc - 1;
          }
        }

        if (bmMap.length === 0) warnings.push("Nenhuma coluna BM encontrada na aba EAP");
        else warnings.push(`${bmMap.length} BMs encontrados (${bmMap[0].name} a ${bmMap[bmMap.length - 1].name})`);

        // Passo 2 — Construir árvore
        // Dados começam na linha 7 (index 6)
        // Col 8 (idx 8): nível da estrutura ("3 - Fase", "4 - Subfase", "5 - Agrupamento")
        // Col 7 (idx 7): iPPU
        // Col 9 (idx 9): nome
        // Col 15 (idx 15): valor
        // Col 17 (idx 17): acumulado
        // Col 18 (idx 18): saldo
        let currentFase = "";
        let currentSubfase = "";
        let sortOrder = 0;

        for (let r = 6; r < rows.length; r++) {
          const row = rows[r];
          if (!row) continue;
          const nivelStr = String(row[8] || "");
          if (!nivelStr.includes("-")) continue;

          const iPPU = row[7] != null ? String(row[7]).trim() : "";
          const nome = str(row[9] || "");
          if (!nome) continue;

          const valor = num(row[15]);
          const acumulado = num(row[17]);
          const saldo = num(row[18]);

          let nivel = "";
          if (nivelStr.includes("3 - Fase") || nivelStr.includes("3 -")) {
            nivel = "3 - Fase";
            currentFase = nome;
            currentSubfase = "";
          } else if (nivelStr.includes("4 - Subfase") || nivelStr.includes("4 -")) {
            nivel = "4 - Subfase";
            currentSubfase = nome;
          } else if (nivelStr.includes("5 - Agrupamento") || nivelStr.includes("5 -")) {
            nivel = "5 - Agrupamento";
          } else {
            continue;
          }

          // Extrair valores por BM
          const rowBmValues: ParsedCronoBmRow[] = [];
          bmMap.forEach(bm => {
            bm.cols.forEach(sc => {
              const v = num(row[sc.col]);
              if (v !== 0) {
                rowBmValues.push({
                  ippu: iPPU,
                  bm_name: bm.name,
                  bm_number: bm.number,
                  tipo: sc.type,
                  valor: v,
                });
              }
            });
          });

          tree.push({
            nivel,
            ippu: iPPU,
            nome: nome.substring(0, 200),
            valor,
            acumulado,
            saldo,
            fase_nome: currentFase,
            subfase_nome: currentSubfase,
            sort_order: sortOrder++,
          });

          bmValues.push(...rowBmValues);
        }

        // ── Curva S Sheet ──
        const curvaSheet = wb.SheetNames.find(s => s.toLowerCase().includes("curva"));
        if (curvaSheet) {
          const csRows: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[curvaSheet], { header: 1, defval: null });
          for (let c = 1; c < 24; c++) {
            const label = csRows[2]?.[c];
            if (!label) continue;
            let labelStr: string;
            if (typeof label === "string") {
              labelStr = label;
            } else if (label instanceof Date) {
              labelStr = label.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
            } else if (typeof label === "number") {
              const d = XLSX.SSF.parse_date_code(label);
              labelStr = d ? `${["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][d.m - 1]}/${String(d.y).slice(-2)}` : String(label);
            } else {
              labelStr = String(label);
            }

            curvaS.push({
              label: labelStr,
              col_index: c,
              previsto_acum: num(csRows[3]?.[c]),
              projetado_acum: num(csRows[4]?.[c]),
              realizado_acum: num(csRows[5]?.[c]),
              previsto_mensal: num(csRows[6]?.[c]),
              projetado_mensal: num(csRows[7]?.[c]),
              realizado_mensal: num(csRows[8]?.[c]),
            });
          }
        } else {
          warnings.push("Aba 'Curva S' não encontrada");
        }

        const fases = tree.filter(t => t.nivel.includes("Fase")).length;
        const subfases = tree.filter(t => t.nivel.includes("Subfase")).length;
        const agrups = tree.filter(t => t.nivel.includes("Agrupamento")).length;
        warnings.push(`${tree.length} nós na árvore (${fases} fases, ${subfases} subfases, ${agrups} agrupamentos)`);
        warnings.push(`${bmValues.length} valores de BM`);
        warnings.push(`${curvaS.length} pontos da Curva S`);

        resolve({ tree, bmValues, curvaS, warnings });
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
  const sanitizedRows = rows.map(r => ensureJsonSafe(sanitizeRowForInsert(r)));
  const BATCH = 500;
  const totalBatches = Math.ceil(sanitizedRows.length / BATCH);
  for (let i = 0; i < sanitizedRows.length; i += BATCH) {
    const chunk = sanitizedRows.slice(i, i + BATCH);
    const { error } = await supabase.from(table as any).insert(chunk as any);
    if (error) {
      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j];
        const { error: rowError } = await supabase.from(table as any).insert(row as any);
        if (rowError) {
          console.error(`[import] Row ${i + j + 1} in ${table} failed:`, JSON.stringify(row));
          const sample = Object.entries(row)
            .filter(([, value]) => value !== null && value !== "")
            .slice(0, 8)
            .map(([key, value]) => `${key}=${String(value).slice(0, 60)}`)
            .join(", ");

          throw new Error(
            `Erro ao gravar ${table} na linha ${i + j + 1}: ${rowError.message}${sample ? `. Campos: ${sample}` : ""}`
          );
        }
      }

      throw error;
    }
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
  cronogramaResult: CronogramaParseResult | null;
  cronogramaFile: File | null;
  onProgress: (msg: string, pct: number) => void;
}

export function useProcessImport() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: ProcessInput) => {
      if (!user) throw new Error("Não autenticado");
      const { sigemRows, relEventoRows, sconRows, sigemFile, relEventoFile, sconFile, cronogramaResult, cronogramaFile, onProgress } = input;
      const cronoRows = cronogramaResult ? cronogramaResult.tree.length + cronogramaResult.bmValues.length + cronogramaResult.curvaS.length : 0;
      const totalRows = sigemRows.length + relEventoRows.length + sconRows.length + cronoRows;
      let processed = 0;
      const report = (msg: string) => onProgress(msg, Math.round((processed / Math.max(totalRows, 1)) * 100));
      const results: string[] = [];

      // Delete previous batches for these sources
      report("Removendo dados anteriores...");
      const sourcesToDelete = ["sigem", "rel_evento", "scon"];
      if (cronogramaResult && cronogramaFile) sourcesToDelete.push("cronograma");
      for (const src of sourcesToDelete) {
        const { data: old } = await supabase.from("import_batches").select("id").eq("source", src).eq("user_id", user.id);
        if (old && old.length > 0) {
          await supabase.from("import_batches").delete().in("id", old.map(b => b.id));
        }
      }

      // SIGEM
      if (sigemRows.length > 0 && sigemFile) {
        report("Criando batch SIGEM...");
        const { data: batch, error: bErr } = await supabase.from("import_batches").insert({
          user_id: user.id, source: "sigem", filename: sigemFile.name, row_count: sigemRows.length, status: "processing", errors: [],
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
          user_id: user.id, source: "rel_evento", filename: relEventoFile.name, row_count: relEventoRows.length, status: "processing", errors: [],
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
          user_id: user.id, source: "scon", filename: sconFile.name, row_count: sconRows.length, status: "processing", errors: [],
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

      // CRONOGRAMA
      if (cronogramaResult && cronogramaFile) {
        const { tree, bmValues, curvaS } = cronogramaResult;
        const totalCronoRows = tree.length + bmValues.length + curvaS.length;
        report("Criando batch Cronograma...");
        const { data: batch, error: bErr } = await supabase.from("import_batches").insert({
          user_id: user.id, source: "cronograma", filename: cronogramaFile.name, row_count: totalCronoRows, status: "processing", errors: [],
        }).select().single();
        if (bErr) throw bErr;

        // Insert tree nodes
        if (tree.length > 0) {
          const mappedTree = tree.map(r => ({ ...r, batch_id: batch.id }));
          await insertInBatches("cronograma_tree", mappedTree, (done, total) => {
            report(`Gravando árvore EAP — lote ${done} de ${total}...`);
          });
        }

        // Insert BM values (without tree_id for now — linking by ippu)
        if (bmValues.length > 0) {
          const mappedBm = bmValues.map(r => ({ ...r, batch_id: batch.id }));
          await insertInBatches("cronograma_bm_values", mappedBm, (done, total) => {
            report(`Gravando valores BM — lote ${done} de ${total}...`);
          });
        }

        // Insert Curva S
        if (curvaS.length > 0) {
          const mappedCs = curvaS.map(r => ({ ...r, batch_id: batch.id }));
          await insertInBatches("curva_s", mappedCs, (done, total) => {
            report(`Gravando Curva S — lote ${done} de ${total}...`);
          });
        }

        await supabase.from("import_batches").update({ status: "completed", row_count: totalCronoRows }).eq("id", batch.id);
        processed += totalCronoRows;
        results.push(`${tree.length} nós EAP + ${bmValues.length} valores BM`);
      }

      onProgress("Concluído!", 100);
      return results.join(" + ");
    },
    onSuccess: (msg) => {
      qc.invalidateQueries({ queryKey: [BATCHES_KEY] });
      qc.invalidateQueries({ queryKey: ["import-existing-counts"] });
      qc.invalidateQueries({ queryKey: ["cronograma-tree"] });
      qc.invalidateQueries({ queryKey: ["cronograma-bm"] });
      qc.invalidateQueries({ queryKey: ["curva-s"] });
      qc.invalidateQueries({ queryKey: ["ultimo-bm"] });
      qc.invalidateQueries({ queryKey: ["import-stats"] });
      toast.success(`Importação concluída: ${msg}`);
    },
    onError: (err: Error) => {
      toast.error(`Erro na importação: ${err.message}`);
    },
  });
}
