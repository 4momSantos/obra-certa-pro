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

export interface ParsedSconProgRow {
  componente: string;
  etapa: string;
  atividade: string;
  semana: string;
  data_inicio: string | null;
  data_fim: string | null;
  equipe: string;
  equipe_desc: string;
  encarregado: string;
  supervisor: string;
  engenheiro: string;
  gerente: string;
  programado_componente: number;
  total_exec_semana: number;
  total_exec_geral: number;
  peso_stagecode: number;
  cwp: string;
  disciplina: string;
  classe: string;
  tipo: string;
  tag_id_proj: string;
  documento: string;
  pacote: string;
  proposito: string;
  id_primavera: string;
  unit_valor: number;
  unit: string;
  indice_rop: number;
  peso_custcode: number;
  indice_atual: number;
  item_wbs: string;
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
        const cStaGitec = findCol(headers, "status gitec", "status_gitec");
        const cDocRev = findCol(headers, "documento_revisao", "documento revisão", "doc_rev");

        if (cDoc < 0) warnings.push("Coluna 'Documento' não encontrada no cabeçalho SIGEM");
        if (cStaCorr < 0) warnings.push("Coluna STATUS CORRETO não encontrada — usando Status");
        warnings.push(`Cabeçalhos SIGEM detectados: ${headers.slice(0, 15).join(", ")}`);

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
            ppu: "",
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

function extractIppuFromAgrupamento(agrup: string): string {
  if (!agrup) return "";
  const m = agrup.match(/^([A-Z])_(\d+(?:\.\d+)*)_/);
  return m ? `${m[1]}-${m[2]}` : "";
}

function isPivotArtifact(val: string): boolean {
  const low = val.toLowerCase();
  return low.includes("rótulos de") || low.includes("rotulos de") ||
    low.includes("total geral") || low.includes("grand total") ||
    low.includes("(blank)") || low.includes("(em branco)");
}

export function parseRelEventoFile(file: File): Promise<{ rows: ParsedRelEventoRow[]; warnings: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        const warnings: string[] = [];

        // Detecção dinâmica da linha de cabeçalho — exigir 5+ colunas conhecidas
        const knownCols = ["estrutura", "fase", "agrupamento", "tag", "etapa", "status", "valor"];
        let headerIdx = 0;
        for (let i = 0; i < Math.min(raw.length, 20); i++) {
          const rowHeaders = (raw[i] || []).map(h => normalizeHeader(str(h)));
          const matches = knownCols.filter(kc => rowHeaders.some(rh => rh === kc));
          if (matches.length >= 5) { headerIdx = i; break; }
        }
        const headers = (raw[headerIdx] || []).map(h => str(h));
        warnings.push(`REL_EVENTO: cabeçalho na linha ${headerIdx + 1}: ${headers.slice(0, 15).join(" | ")}`);

        const cEstrutura = findCol(headers, "estrutura");
        const cFase = findCol(headers, "fase");
        const cSubfase = findCol(headers, "subfase", "sub fase", "sub_fase");
        const cAgrup = findCol(headers, "agrupamento");
        const cCarac = findCol(headers, "caracteristica", "característica");
        const cTag = findCol(headers, "tag");
        const cQtd = findCol(headers, "qtd");
        const cUm = findCol(headers, "um", "unidade");
        const cEtapa = findCol(headers, "etapa");
        const cPesoFis = findCol(headers, "peso fisico", "peso físico", "peso_fisico");
        const cPesoFin = findCol(headers, "peso financeiro", "peso_financeiro");
        const cDataExec = findCol(headers, "data de execução", "data execução", "data_execucao", "data execucao");
        const cDataInf = findCol(headers, "data inf", "data_inf_execucao", "data inf. exec", "data inf. execução");
        const cExecPor = findCol(headers, "executado por", "executado_por");
        const cNecEvid = findCol(headers, "necessita evidencia", "necessita evidência", "necessita_evidencias", "necessita evidências");
        const cNumEvid = findCol(headers, "numero evidencia", "número evidência", "numero_evidencias", "evidência", "número evidências");
        const cDataAprov = findCol(headers, "data de aprovação", "data aprovação", "data_aprovacao");
        const cFiscal = findCol(headers, "fiscal responsável", "fiscal responsavel", "fiscal_responsavel", "fiscal");
        const cStatus = findCol(headers, "status", "status evento");
        const cValor = findCol(headers, "valor");
        const cComent = findCol(headers, "comentário", "comentario");

        // Debug de mapeamento de colunas
        const colMap: Record<string, number> = { cEstrutura, cFase, cSubfase, cAgrup, cCarac, cTag, cQtd, cUm, cEtapa, cPesoFis, cPesoFin, cDataExec, cDataInf, cExecPor, cNecEvid, cNumEvid, cDataAprov, cFiscal, cStatus, cValor, cComent };
        const foundCols = Object.entries(colMap).filter(([,v]) => v >= 0).map(([k,v]) => `${k}=${v}`);
        const notFoundCols = Object.entries(colMap).filter(([,v]) => v < 0).map(([k]) => k);
        warnings.push(`Colunas mapeadas (${foundCols.length}): ${foundCols.join(", ")}`);
        if (notFoundCols.length) warnings.push(`⚠ Colunas NÃO encontradas: ${notFoundCols.join(", ")}`);

        let noKey = 0;
        let pivotSkipped = 0;
        const rows: ParsedRelEventoRow[] = [];
        for (let i = headerIdx + 1; i < raw.length; i++) {
          const r = raw[i];
          if (!r || r.length === 0) continue;

          // Filtrar artefatos de tabela dinâmica
          const firstVal = str(r[0] || "");
          if (isPivotArtifact(firstVal)) { pivotSkipped++; continue; }

          const agrupamento = str(cell(r, cAgrup));
          const tag = str(cell(r, cTag));
          const item_ppu = extractIppuFromAgrupamento(agrupamento);

          if (!item_ppu && !tag && !agrupamento) { noKey++; continue; }

          rows.push({
            item_ppu,
            rel_status: "",
            rel_status_item: "",
            tag_agrup: "",
            quantidade_ponderada: 0,
            estrutura: str(cell(r, cEstrutura)),
            fase: str(cell(r, cFase)),
            subfase: str(cell(r, cSubfase)),
            agrupamento,
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
          if (rows.length === 1) {
            const r0 = rows[0];
            console.log("[REL_EVENTO] Primeira linha:", { etapa: r0.etapa, status: r0.status, valor: r0.valor, tag: r0.tag, item_ppu: r0.item_ppu, agrupamento: r0.agrupamento });
          }
        }
        if (noKey > 0) warnings.push(`${noKey} linhas sem Item PPU, TAG nem Agrupamento (ignoradas)`);
        if (pivotSkipped > 0) warnings.push(`${pivotSkipped} linhas de resumo/pivot ignoradas`);
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

// ── SCON Programação Parser ──

export function parseSconProgramacaoFile(file: File): Promise<{ rows: ParsedSconProgRow[]; warnings: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: false });
        const sheetName = wb.SheetNames.find(s =>
          s.toLowerCase().includes("consulta") || s.toLowerCase().includes("scon") || s.toLowerCase().includes("prog")
        ) || wb.SheetNames[0];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null, raw: false });
        const warnings: string[] = [];
        const headers = (raw[0] || []).map((h, i) => h != null ? str(h) : `col_${i}`);

        const cComp = findCol(headers, "COMPONENTE", "componente");
        const cEtapa = findCol(headers, "ETAPA", "etapa");
        const cAtiv = findCol(headers, "ATIVIDADE", "atividade");
        const cSemana = findCol(headers, "SEMANA", "semana");
        const cDtIni = findCol(headers, "DATA_INICIO", "data inicio", "data_inicio");
        const cDtFim = findCol(headers, "DATA_FIM", "data fim", "data_fim");
        const cEquipe = findCol(headers, "EQUIPE", "equipe");
        const cEquipeDesc = findCol(headers, "EQUIPE_DESC", "equipe desc", "equipe_desc");
        const cEncarr = findCol(headers, "ENCARREGADO", "encarregado");
        const cSuper = findCol(headers, "SUPERVISOR", "supervisor");
        const cEng = findCol(headers, "ENGENHEIRO", "engenheiro");
        const cGer = findCol(headers, "GERENTE", "gerente");
        const cProgComp = findCol(headers, "PROGRAMADO_COMPONENTE", "programado componente", "programado_componente");
        const cExecSem = findCol(headers, "TOTAL_EXEC_SEMANA", "total exec semana", "total_exec_semana");
        const cExecGeral = findCol(headers, "TOTAL_EXEC_GERAL", "total exec geral", "total_exec_geral");
        const cPesoStage = findCol(headers, "PESO_STAGECODE", "peso stagecode", "peso_stagecode");
        const cCwp = findCol(headers, "CWP", "cwp");
        const cDisc = findCol(headers, "DISCIPLINA", "disciplina");
        const cClasse = findCol(headers, "Classe", "classe", "CLASSE");
        const cTipo = findCol(headers, "Tipo", "tipo", "TIPO");
        const cTagIdProj = findCol(headers, "TagIDProj", "tag id proj", "tag_id_proj", "TAGIDPROJ");
        const cDoc = findCol(headers, "Documento", "documento", "DOCUMENTO");
        const cPacote = findCol(headers, "PACOTE", "pacote");
        const cProposito = findCol(headers, "PROPOSITO", "proposito", "propósito");
        const cIdPrimavera = findCol(headers, "IDPrimavera", "id primavera", "id_primavera", "IDPRIMAVERA");
        const cUnitValor = findCol(headers, "UNIT_VALOR", "unit valor", "unit_valor");
        const cUnit = findCol(headers, "UNIT", "unit");
        const cIndiceRop = findCol(headers, "IndiceROP", "indice rop", "indice_rop", "INDICEROP");
        const cPesoCust = findCol(headers, "PESO_CUSTCODE", "peso custcode", "peso_custcode");
        const cIndiceAtual = findCol(headers, "IndiceAtual", "indice atual", "indice_atual", "INDICEATUAL");
        const cItemWbs = findCol(headers, "ItemWBS", "Item WBS", "item_wbs", "item wbs", "ITEMWBS");

        if (cComp < 0) warnings.push("Coluna 'COMPONENTE' não encontrada no SCON Programação");
        if (cItemWbs < 0) warnings.push("Coluna 'ItemWBS' não encontrada no SCON Programação");

        let noComp = 0;
        let noDisc = 0;
        let zeroProg = 0;
        const rows: ParsedSconProgRow[] = [];

        for (let i = 1; i < raw.length; i++) {
          const r = raw[i];
          if (!r) continue;
          const componente = str(cell(r, cComp));
          if (!componente) { noComp++; continue; }

          const programado_componente = num(cell(r, cProgComp));
          const disciplina = str(cell(r, cDisc));
          if (!disciplina) noDisc++;
          if (programado_componente === 0) zeroProg++;

          // Date handling for raw:false mode
          const parseDate = (v: unknown): string | null => {
            if (v == null || v === "") return null;
            const n = parseFloat(String(v));
            if (!isNaN(n) && n > 40000) {
              return new Date((n - 25569) * 86400000).toISOString().slice(0, 10);
            }
            return dateVal(v);
          };

          rows.push({
            componente,
            etapa: str(cell(r, cEtapa)),
            atividade: str(cell(r, cAtiv)),
            semana: str(cell(r, cSemana)),
            data_inicio: parseDate(cell(r, cDtIni)),
            data_fim: parseDate(cell(r, cDtFim)),
            equipe: str(cell(r, cEquipe)),
            equipe_desc: str(cell(r, cEquipeDesc)),
            encarregado: str(cell(r, cEncarr)),
            supervisor: str(cell(r, cSuper)),
            engenheiro: str(cell(r, cEng)),
            gerente: str(cell(r, cGer)),
            programado_componente,
            total_exec_semana: num(cell(r, cExecSem)),
            total_exec_geral: num(cell(r, cExecGeral)),
            peso_stagecode: num(cell(r, cPesoStage)),
            cwp: str(cell(r, cCwp)),
            disciplina,
            classe: str(cell(r, cClasse)),
            tipo: str(cell(r, cTipo)),
            tag_id_proj: str(cell(r, cTagIdProj)),
            documento: str(cell(r, cDoc)),
            pacote: str(cell(r, cPacote)),
            proposito: str(cell(r, cProposito)),
            id_primavera: str(cell(r, cIdPrimavera)),
            unit_valor: num(cell(r, cUnitValor)),
            unit: str(cell(r, cUnit)),
            indice_rop: num(cell(r, cIndiceRop)),
            peso_custcode: num(cell(r, cPesoCust)),
            indice_atual: num(cell(r, cIndiceAtual)),
            item_wbs: str(cell(r, cItemWbs)),
          });
        }

        if (noComp > 0) warnings.push(`${noComp} linhas sem COMPONENTE (filtradas)`);
        if (noDisc > 0) warnings.push(`${noDisc} linhas sem DISCIPLINA`);
        if (zeroProg > 0) warnings.push(`${zeroProg} linhas com PROGRAMADO_COMPONENTE = 0`);

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
  sconProgRows: ParsedSconProgRow[];
  sigemFile: File | null;
  relEventoFile: File | null;
  sconFile: File | null;
  sconProgFile: File | null;
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
      const { sigemRows, relEventoRows, sconRows, sconProgRows, sigemFile, relEventoFile, sconFile, sconProgFile, cronogramaResult, cronogramaFile, onProgress } = input;
      const cronoRows = cronogramaResult ? cronogramaResult.tree.length + cronogramaResult.bmValues.length + cronogramaResult.curvaS.length : 0;
      const totalRows = sigemRows.length + relEventoRows.length + sconRows.length + sconProgRows.length + cronoRows;
      let processed = 0;
      const report = (msg: string) => onProgress(msg, Math.round((processed / Math.max(totalRows, 1)) * 100));
      const results: string[] = [];

      // Delete previous batches for these sources
      report("Removendo dados anteriores...");
      const sourcesToDelete = ["sigem", "rel_evento", "scon"];
      if (sconProgRows.length > 0 && sconProgFile) sourcesToDelete.push("scon_programacao");
      if (cronogramaResult && cronogramaFile) sourcesToDelete.push("cronograma");
      for (const src of sourcesToDelete) {
        const { data: old } = await supabase.from("import_batches").select("id").eq("source", src).eq("user_id", user.id);
        if (old && old.length > 0) {
          await supabase.from("import_batches").delete().in("id", old.map(b => b.id));
        }
      }

      // Helper to safely process a source with error handling
      async function processSource(
        source: string,
        table: string,
        rows: any[],
        file: File,
        label: string,
      ) {
        report(`Criando batch ${label}...`);
        const { data: batch, error: bErr } = await supabase.from("import_batches").insert({
          user_id: user!.id, source, filename: file.name, row_count: rows.length, status: "processing", errors: [],
        }).select().single();
        if (bErr) throw bErr;
        try {
          const mapped = rows.map(r => ({ ...r, batch_id: batch.id }));
          await insertInBatches(table, mapped, (done, total) => {
            report(`Gravando ${label} — lote ${done} de ${total}...`);
          });
          await supabase.from("import_batches").update({ status: "completed", row_count: rows.length }).eq("id", batch.id);
          return batch.id;
        } catch (err: any) {
          await supabase.from("import_batches").update({ status: "error", errors: [{ message: err?.message || "Erro desconhecido" }] }).eq("id", batch.id);
          throw err;
        }
      }

      // SIGEM
      if (sigemRows.length > 0 && sigemFile) {
        await processSource("sigem", "sigem_documents", sigemRows, sigemFile, "SIGEM");
        processed = sigemRows.length;
        results.push(`${sigemRows.length.toLocaleString("pt-BR")} docs SIGEM`);
      }

      // REL_EVENTO
      if (relEventoRows.length > 0 && relEventoFile) {
        await processSource("rel_evento", "rel_eventos", relEventoRows, relEventoFile, "REL_EVENTO");
        processed += relEventoRows.length;
        results.push(`${relEventoRows.length.toLocaleString("pt-BR")} eventos`);
      }

      // SCON
      if (sconRows.length > 0 && sconFile) {
        await processSource("scon", "scon_components", sconRows, sconFile, "SCON");
        processed += sconRows.length;
        results.push(`${sconRows.length.toLocaleString("pt-BR")} componentes`);
      }

      // SCON PROGRAMAÇÃO
      if (sconProgRows.length > 0 && sconProgFile) {
        await processSource("scon_programacao", "scon_programacao", sconProgRows, sconProgFile, "SCON Programação");
        processed += sconProgRows.length;
        results.push(`${sconProgRows.length.toLocaleString("pt-BR")} programação SCON`);
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

        try {
          if (tree.length > 0) {
            const mappedTree = tree.map(r => ({ ...r, batch_id: batch.id }));
            await insertInBatches("cronograma_tree", mappedTree, (done, total) => {
              report(`Gravando árvore EAP — lote ${done} de ${total}...`);
            });
          }
          if (bmValues.length > 0) {
            const mappedBm = bmValues.map(r => ({ ...r, batch_id: batch.id }));
            await insertInBatches("cronograma_bm_values", mappedBm, (done, total) => {
              report(`Gravando valores BM — lote ${done} de ${total}...`);
            });
          }
          if (curvaS.length > 0) {
            const mappedCs = curvaS.map(r => ({ ...r, batch_id: batch.id }));
            await insertInBatches("curva_s", mappedCs, (done, total) => {
              report(`Gravando Curva S — lote ${done} de ${total}...`);
            });
          }
          await supabase.from("import_batches").update({ status: "completed", row_count: totalCronoRows }).eq("id", batch.id);
        } catch (err: any) {
          await supabase.from("import_batches").update({ status: "error", errors: [{ message: err?.message || "Erro desconhecido" }] }).eq("id", batch.id);
          throw err;
        }

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
