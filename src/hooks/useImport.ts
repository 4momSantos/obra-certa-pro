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
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return str(value);
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(sanitizeForInsert);

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, innerValue]) => [key, sanitizeForInsert(innerValue)])
        .filter(([, innerValue]) => innerValue !== undefined)
    );
  }

  return str(value);
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

        // Find the main sheet (first sheet or one containing "cronograma")
        const sheetName = wb.SheetNames.find(s => s.toLowerCase().includes("cronog")) || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (raw.length < 5) {
          warnings.push("Planilha muito curta para conter um cronograma");
          resolve({ tree, bmValues, curvaS, warnings });
          return;
        }

        // Find header row: look for a row containing "Agrupamento" or "Item PPU"
        let headerIdx = -1;
        for (let i = 0; i < Math.min(20, raw.length); i++) {
          const row = (raw[i] || []).map(c => str(c).toLowerCase());
          if (row.some(c => c.includes("agrupamento") || c.includes("item ppu") || c.includes("ippu"))) {
            headerIdx = i;
            break;
          }
        }

        if (headerIdx < 0) {
          // Try to find BM columns directly
          for (let i = 0; i < Math.min(20, raw.length); i++) {
            const row = (raw[i] || []).map(c => str(c));
            if (row.some(c => /bm[- ]?0?1/i.test(c))) {
              headerIdx = i;
              break;
            }
          }
        }

        if (headerIdx < 0) {
          warnings.push("Cabeçalho do cronograma não encontrado — procurando 'Agrupamento' ou 'BM-01'");
          resolve({ tree, bmValues, curvaS, warnings });
          return;
        }

        const headers = (raw[headerIdx] || []).map(c => str(c));

        // Find key columns
        const cNome = findCol(headers, "agrupamento", "nome", "descrição", "descricao");
        const cIppu = findCol(headers, "item ppu", "ippu", "ppu");
        const cValor = findCol(headers, "valor", "valor total", "total");
        const cAcum = findCol(headers, "acumulado", "acum");
        const cSaldo = findCol(headers, "saldo");

        // Find BM columns: look for BM-01, BM-02, etc.
        // BM columns come in groups of 3: Previsto, Projetado, Realizado
        const bmCols: { bmNumber: number; bmName: string; colIdx: number }[] = [];
        headers.forEach((h, idx) => {
          const m = h.match(/bm[- ]?(\d+)/i);
          if (m) {
            bmCols.push({ bmNumber: parseInt(m[1]), bmName: `BM-${String(parseInt(m[1])).padStart(2, "0")}`, colIdx: idx });
          }
        });

        // Detect the structure: each BM might have sub-columns (Previsto/Projetado/Realizado)
        // or BMs might be in a row with tipo indicator
        // Most common: BM columns are values, and there's a "tipo" row above or beside
        
        // Try detecting tipo from the row above the header
        const tipoRow = headerIdx > 0 ? (raw[headerIdx - 1] || []).map(c => str(c)) : [];
        
        // Group BM columns by BM number
        const bmGroups = new Map<number, number[]>();
        bmCols.forEach(bm => {
          if (!bmGroups.has(bm.bmNumber)) bmGroups.set(bm.bmNumber, []);
          bmGroups.get(bm.bmNumber)!.push(bm.colIdx);
        });

        if (bmCols.length === 0) {
          warnings.push("Nenhuma coluna BM encontrada no cabeçalho");
        }

        // Parse data rows
        let currentFase = "";
        let currentSubfase = "";
        let sortOrder = 0;

        for (let i = headerIdx + 1; i < raw.length; i++) {
          const r = raw[i];
          if (!r || r.every(c => !c && c !== 0)) continue;

          const nome = str(cell(r, cNome >= 0 ? cNome : 0));
          const ippu = str(cell(r, cIppu));
          const valor = num(cell(r, cValor));

          if (!nome && !ippu && valor === 0) continue;

          // Detect level by indentation or structure
          // Level 3 = Fase (bold, no ippu, large value)
          // Level 4 = Subfase (indented, no ippu)
          // Level 5 = Agrupamento (has ippu)
          let nivel = "5";
          if (ippu) {
            nivel = "5";
          } else if (!currentFase || (nome && valor > 0 && !ippu)) {
            // Could be Fase or Subfase - check if it looks like a header row
            const firstNonEmpty = (r as any[]).findIndex((c, idx) => idx > 0 && c && str(c));
            if (firstNonEmpty <= 1 || !currentFase) {
              nivel = "3";
              currentFase = nome;
              currentSubfase = "";
            } else {
              nivel = "4";
              currentSubfase = nome;
            }
          }

          sortOrder++;

          const treeRow: ParsedCronoTreeRow = {
            nivel,
            ippu,
            nome,
            valor,
            acumulado: num(cell(r, cAcum)),
            saldo: num(cell(r, cSaldo)),
            fase_nome: nivel === "3" ? nome : currentFase,
            subfase_nome: nivel === "4" ? nome : nivel === "5" ? currentSubfase : "",
            sort_order: sortOrder,
          };
          tree.push(treeRow);

          // Extract BM values for agrupamentos (nivel 5)
          if (nivel === "5" && ippu && bmCols.length > 0) {
            // For each unique BM, read value(s)
            bmGroups.forEach((cols, bmNum) => {
              const bmName = `BM-${String(bmNum).padStart(2, "0")}`;
              if (cols.length >= 3) {
                // 3 sub-columns: Previsto, Projetado, Realizado
                bmValues.push({ ippu, bm_name: bmName, bm_number: bmNum, tipo: "Previsto", valor: num(cell(r, cols[0])) });
                bmValues.push({ ippu, bm_name: bmName, bm_number: bmNum, tipo: "Projetado", valor: num(cell(r, cols[1])) });
                bmValues.push({ ippu, bm_name: bmName, bm_number: bmNum, tipo: "Realizado", valor: num(cell(r, cols[2])) });
              } else if (cols.length === 1) {
                // Single column — detect tipo from tipoRow
                const tipo = tipoRow[cols[0]] || "Realizado";
                bmValues.push({ ippu, bm_name: bmName, bm_number: bmNum, tipo: str(tipo) || "Realizado", valor: num(cell(r, cols[0])) });
              }
            });
          }
        }

        // Look for Curva S sheet
        const curvaSSheet = wb.SheetNames.find(s =>
          s.toLowerCase().includes("curva") || s.toLowerCase().includes("s-curve")
        );
        if (curvaSSheet) {
          const csWs = wb.Sheets[curvaSSheet];
          const csRaw: unknown[][] = XLSX.utils.sheet_to_json(csWs, { header: 1, defval: "" });
          
          // Find header row with BM labels
          let csHeaderIdx = -1;
          for (let i = 0; i < Math.min(10, csRaw.length); i++) {
            const row = (csRaw[i] || []).map(c => str(c));
            if (row.some(c => /bm[- ]?\d+/i.test(c))) {
              csHeaderIdx = i;
              break;
            }
          }

          if (csHeaderIdx >= 0) {
            const csHeaders = (csRaw[csHeaderIdx] || []).map(c => str(c));
            
            // Find tipo rows (Previsto Acum, Projetado Acum, Realizado Acum, etc.)
            for (let i = csHeaderIdx + 1; i < csRaw.length; i++) {
              const r = csRaw[i];
              if (!r) continue;
              const label = str(r[0]).toLowerCase();
              if (!label) continue;
              
              const isPrevisto = label.includes("previst");
              const isProjetado = label.includes("projetad");
              const isRealizado = label.includes("realizad");
              const isAcum = label.includes("acum");
              const isMensal = label.includes("mensal") || label.includes("period");

              if (!isPrevisto && !isProjetado && !isRealizado) continue;

              // Read values per BM column
              csHeaders.forEach((h, colIdx) => {
                const m = h.match(/bm[- ]?(\d+)/i);
                if (!m) return;
                const bmNum = parseInt(m[1]);
                const val = num(cell(r as unknown[], colIdx));
                
                // Find or create curvaS entry
                let entry = curvaS.find(c => c.col_index === bmNum);
                if (!entry) {
                  entry = {
                    label: `BM-${String(bmNum).padStart(2, "0")}`,
                    col_index: bmNum,
                    previsto_acum: 0, projetado_acum: 0, realizado_acum: 0,
                    previsto_mensal: 0, projetado_mensal: 0, realizado_mensal: 0,
                  };
                  curvaS.push(entry);
                }

                if (isPrevisto && isAcum) entry.previsto_acum = val;
                else if (isPrevisto && isMensal) entry.previsto_mensal = val;
                else if (isPrevisto) entry.previsto_acum = val;
                else if (isProjetado && isAcum) entry.projetado_acum = val;
                else if (isProjetado && isMensal) entry.projetado_mensal = val;
                else if (isProjetado) entry.projetado_acum = val;
                else if (isRealizado && isAcum) entry.realizado_acum = val;
                else if (isRealizado && isMensal) entry.realizado_mensal = val;
                else if (isRealizado) entry.realizado_acum = val;
              });
            }
            curvaS.sort((a, b) => a.col_index - b.col_index);
          }
        }

        if (tree.length === 0) warnings.push("Nenhum nó da árvore EAP encontrado");
        
        warnings.push(`Cronograma: ${tree.length} nós, ${bmValues.length} valores BM, ${curvaS.length} pontos Curva S`);

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
  const sanitizedRows = rows.map(sanitizeRowForInsert);
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
          const sample = Object.entries(row)
            .filter(([, value]) => value !== null && value !== "")
            .slice(0, 6)
            .map(([key, value]) => `${key}=${String(value).slice(0, 40)}`)
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
