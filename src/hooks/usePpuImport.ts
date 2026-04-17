/**
 * Parsers and import hooks for PPU, CRIT, and PPU Disciplina files.
 * Mirrors parsePPU(), parseCRIT(), parsePpuDisciplina() from SPLAN Explorer.
 */

import * as XLSX from 'xlsx';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ── Shared helpers (same pattern as useImport.ts) ─────────────────────────────

function str(v: unknown): string {
  if (v == null) return '';
  return String(v)
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f\u2028\u2029]/g, '')
    .replace(/[\ud800-\udfff]/g, '')
    .trim();
}

function num(v: unknown): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const raw = str(v).replace(/^R\$\s*/i, '').replace(/%$/i, '').replace(/\s+/g, '');
  if (!raw) return 0;
  const negative = raw.startsWith('(') && raw.endsWith(')');
  const unsigned = raw.replace(/[()]/g, '');
  const hasComma = unsigned.includes(','), hasDot = unsigned.includes('.');
  let normalized = unsigned;
  if (hasComma && hasDot) {
    normalized = unsigned.lastIndexOf(',') > unsigned.lastIndexOf('.')
      ? unsigned.replace(/\./g, '').replace(',', '.')
      : unsigned.replace(/,/g, '');
  } else if (hasComma) {
    normalized = unsigned.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = unsigned.replace(/,/g, '');
  }
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n)) return 0;
  return negative ? -n : n;
}

function normalizeHeader(value: string): string {
  return str(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function findCol(headers: string[], ...candidates: string[]): number {
  const nh = headers.map(normalizeHeader);
  for (const c of candidates) {
    const nc = normalizeHeader(c);
    const idx = nh.findIndex(h => h === nc);
    if (idx >= 0) return idx;
  }
  for (const c of candidates) {
    const nc = normalizeHeader(c);
    const idx = nh.findIndex(h => h.includes(nc) || nc.includes(h));
    if (idx >= 0) return idx;
  }
  return -1;
}

function cell(row: unknown[], col: number): unknown {
  return col >= 0 ? row[col] : undefined;
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface ParsedPpuRow {
  item_ppu: string;
  descricao: string;
  unidade: string;
  qtd: number;
  preco_unit: number;
  valor_total: number;
  is_agrupamento: boolean;
  fase: string;
  subfase: string;
  agrupamento: string;
  disciplina: string;
}

export interface ParsedPpuDisciplinaRow {
  item_ppu: string;
  disciplina: string;
  fase: string;
  subfase: string;
  agrupamento: string;
}

export interface ParsedCritRow {
  identificador: string;
  descricao: string;
  nivel: string;
  ippu: string;
  peso: number;
  unidade: string;
  qtd_referencia: number;
}

// ── PPU Parser ──────────────────────────────────────────────────────────────

/**
 * Parses a PPU (Planilha de Preço Unitário) workbook.
 * First sheet, dynamic header detection for "Item PPU".
 * Flag column 'Agrup.' = 'x' marks aggregation (Agrupamento) rows.
 * Mirrors parsePPU() from SPLAN Explorer.
 */
export function parsePpuFile(file: File): Promise<{ rows: ParsedPpuRow[]; warnings: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array', cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const warnings: string[] = [];

        let headerIdx = 0;
        for (let i = 0; i < Math.min(raw.length, 20); i++) {
          const rh = (raw[i] || []).map(h => normalizeHeader(str(h)));
          if (rh.some(h => h.includes('item') && h.includes('ppu'))) { headerIdx = i; break; }
        }
        const headers = (raw[headerIdx] || []).map(h => str(h));
        warnings.push(`PPU: cabeçalho na linha ${headerIdx + 1}`);

        const cItem  = findCol(headers, 'item ppu', 'item_ppu', 'item');
        const cDesc  = findCol(headers, 'descricao', 'descrição', 'nome');
        const cUnid  = findCol(headers, 'unidade', 'unid', 'un', 'um');
        const cQtd   = findCol(headers, 'quantidade', 'qtd', 'qtde');
        const cPreco = findCol(headers, 'preco unitario', 'preço unitário', 'preco unit', 'pu');
        const cValor = findCol(headers, 'valor total', 'valor', 'total');
        const cAgrup = findCol(headers, 'agrup.', 'agrup', 'agrupamento flag', 'flag');
        const cFase  = findCol(headers, 'fase');
        const cSub   = findCol(headers, 'subfase', 'sub fase', 'sub-fase');
        const cDisc  = findCol(headers, 'disciplina', 'disc');

        if (cItem < 0) warnings.push('⚠ Coluna "Item PPU" não encontrada');

        let currentFase = '', currentSubfase = '', currentAgrupamento = '';
        let noItem = 0;
        const rows: ParsedPpuRow[] = [];

        for (let i = headerIdx + 1; i < raw.length; i++) {
          const r = raw[i];
          if (!r || r.length === 0) continue;
          const item_ppu = str(cell(r, cItem));
          if (!item_ppu) { noItem++; continue; }

          const fase = cFase >= 0 ? str(cell(r, cFase)) : '';
          const subfase = cSub >= 0 ? str(cell(r, cSub)) : '';
          if (fase) currentFase = fase;
          if (subfase) currentSubfase = subfase;

          const agrupFlag = cAgrup >= 0 ? str(cell(r, cAgrup)).toLowerCase() : '';
          const is_agrupamento = agrupFlag === 'x' || agrupFlag === 'sim' || agrupFlag === '1';
          const descricao = str(cell(r, cDesc));
          if (is_agrupamento) currentAgrupamento = descricao;

          rows.push({
            item_ppu,
            descricao,
            unidade: str(cell(r, cUnid)),
            qtd: num(cell(r, cQtd)),
            preco_unit: num(cell(r, cPreco)),
            valor_total: num(cell(r, cValor)),
            is_agrupamento,
            fase: currentFase,
            subfase: currentSubfase,
            agrupamento: is_agrupamento ? descricao : currentAgrupamento,
            disciplina: cDisc >= 0 ? str(cell(r, cDisc)) : '',
          });
        }

        if (noItem > 0) warnings.push(`${noItem} linhas sem Item PPU ignoradas`);
        const agrupCount = rows.filter(r => r.is_agrupamento).length;
        warnings.push(`📊 PPU: ${rows.length} itens (${agrupCount} agrupamentos)`);
        resolve({ rows, warnings });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ── PPU Disciplina Parser ────────────────────────────────────────────────

/**
 * Parses the "Classificação PPU" sheet mapping iPPU → disciplina.
 * Mirrors parsePpuDisciplina() from SPLAN Explorer.
 */
export function parsePpuDisciplinaFile(
  file: File
): Promise<{ rows: ParsedPpuDisciplinaRow[]; warnings: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array', cellDates: false });
        const sheetName =
          wb.SheetNames.find(s => s.toLowerCase().includes('classif') || s.toLowerCase().includes('ppu')) ||
          wb.SheetNames[0];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
        const warnings: string[] = [`Aba: ${sheetName}`];
        const headers = (raw[0] || []).map(h => str(h));

        const cItem = findCol(headers, 'item ppu', 'item_ppu', 'ippu', 'item');
        const cDisc = findCol(headers, 'disciplina', 'disc');
        const cFase = findCol(headers, 'fase');
        const cSub  = findCol(headers, 'subfase', 'sub fase');
        const cAgrup = findCol(headers, 'agrupamento', 'agrup');

        if (cItem < 0) warnings.push('⚠ Coluna Item PPU não encontrada');
        if (cDisc < 0) warnings.push('⚠ Coluna Disciplina não encontrada');

        const rows: ParsedPpuDisciplinaRow[] = [];
        for (let i = 1; i < raw.length; i++) {
          const r = raw[i];
          if (!r || r.length === 0) continue;
          const item_ppu = str(cell(r, cItem));
          if (!item_ppu) continue;
          rows.push({
            item_ppu,
            disciplina: str(cell(r, cDisc)),
            fase: str(cell(r, cFase)),
            subfase: str(cell(r, cSub)),
            agrupamento: str(cell(r, cAgrup)),
          });
        }
        warnings.push(`📊 Classificação PPU: ${rows.length} itens mapeados`);
        resolve({ rows, warnings });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ── CRIT Parser ────────────────────────────────────────────────────────────────

/**
 * Parses a CRIT (Critério de Medição) workbook.
 * First sheet, dynamic header for "Identificador".
 * Collects "7 - Etapa" rows, tracking their parent "5 - Agrupamento".
 * Mirrors parseCRIT() from SPLAN Explorer.
 */
export function parseCritFile(file: File): Promise<{ rows: ParsedCritRow[]; warnings: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array', cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const warnings: string[] = [];

        let headerIdx = 0;
        for (let i = 0; i < Math.min(raw.length, 20); i++) {
          const rh = (raw[i] || []).map(h => normalizeHeader(str(h)));
          if (rh.some(h => h.includes('identif'))) { headerIdx = i; break; }
        }
        const headers = (raw[headerIdx] || []).map(h => str(h));
        warnings.push(`CRIT: cabeçalho na linha ${headerIdx + 1}`);

        const cId   = findCol(headers, 'identificador', 'id', 'item');
        const cDesc = findCol(headers, 'descricao', 'descrição', 'nome', 'descriçao');
        const cNivel = findCol(headers, 'nivel', 'nível', 'level', 'hierarquia');
        const cPeso  = findCol(headers, 'peso', 'peso fisico', 'peso físico');
        const cUnid  = findCol(headers, 'unidade', 'unid', 'um');
        const cQtd   = findCol(headers, 'quantidade', 'qtd', 'qtde');

        if (cId < 0) warnings.push('⚠ Coluna "Identificador" não encontrada');

        let currentIppu = '';
        let noId = 0;
        const rows: ParsedCritRow[] = [];

        for (let i = headerIdx + 1; i < raw.length; i++) {
          const r = raw[i];
          if (!r || r.length === 0) continue;
          const id = str(cell(r, cId));
          if (!id) { noId++; continue; }
          const nivel = str(cell(r, cNivel));
          const desc  = str(cell(r, cDesc));

          // Track parent Agrupamento (level 5)
          if (nivel.includes('5') || nivel.toLowerCase().includes('agrup')) {
            currentIppu = id;
          }

          // Collect Etapa rows (level 7)
          if (nivel.includes('7') || nivel.toLowerCase().includes('etapa')) {
            rows.push({
              identificador: id,
              descricao: desc,
              nivel,
              ippu: currentIppu,
              peso: num(cell(r, cPeso)),
              unidade: str(cell(r, cUnid)),
              qtd_referencia: num(cell(r, cQtd)),
            });
          }
        }

        if (noId > 0) warnings.push(`${noId} linhas sem Identificador ignoradas`);
        const ippuSet = new Set(rows.map(r => r.ippu));
        warnings.push(`📊 CRIT: ${rows.length} etapas em ${ippuSet.size} agrupamentos`);
        resolve({ rows, warnings });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ── Import hooks ─────────────────────────────────────────────────────────────

async function batchInsert(
  table: string,
  rows: Record<string, unknown>[],
  batchId: string
) {
  const BATCH = 500;
  const mapped = rows.map(r => ({ ...r, batch_id: batchId }));
  for (let i = 0; i < mapped.length; i += BATCH) {
    const { error } = await (supabase.from(table as any) as any).insert(mapped.slice(i, i + BATCH));
    if (error) throw error;
  }
}

/** Imports PPU rows into the ppu_items table. */
export function useImportPpu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rows, file }: { rows: ParsedPpuRow[]; file: File }) => {
      const { data: old } = await supabase.from('import_batches').select('id').eq('source', 'ppu');
      if (old?.length) await supabase.from('import_batches').delete().in('id', old.map((b: any) => b.id));
      await (supabase.from('ppu_items' as any) as any).delete().neq('item_ppu', '');

      const { data: batch, error: bErr } = await supabase.from('import_batches').insert({
        source: 'ppu', filename: file.name, row_count: rows.length, status: 'processing', errors: [],
      }).select().single();
      if (bErr) throw bErr;

      await batchInsert('ppu_items', rows as any, (batch as any).id);
      await supabase.from('import_batches').update({ status: 'completed' }).eq('id', (batch as any).id);
      return rows.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['ppu-items-all'] });
      qc.invalidateQueries({ queryKey: ['import-existing-counts'] });
      toast.success(`${count.toLocaleString('pt-BR')} itens PPU importados`);
    },
    onError: (err: Error) => toast.error(`Erro ao importar PPU: ${err.message}`),
  });
}

/** Imports PPU Disciplina rows into the classificacao_ppu table. */
export function useImportPpuDisciplina() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rows, file }: { rows: ParsedPpuDisciplinaRow[]; file: File }) => {
      const { data: old } = await supabase.from('import_batches').select('id').eq('source', 'ppu_disciplina');
      if (old?.length) await supabase.from('import_batches').delete().in('id', old.map((b: any) => b.id));
      await (supabase.from('classificacao_ppu' as any) as any).delete().neq('item_ppu', '');

      const { data: batch, error: bErr } = await supabase.from('import_batches').insert({
        source: 'ppu_disciplina', filename: file.name, row_count: rows.length, status: 'processing', errors: [],
      }).select().single();
      if (bErr) throw bErr;

      await batchInsert('classificacao_ppu', rows as any, (batch as any).id);
      await supabase.from('import_batches').update({ status: 'completed' }).eq('id', (batch as any).id);
      return rows.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['classificacao-ppu-all'] });
      toast.success(`${count} classificações PPU importadas`);
    },
    onError: (err: Error) => toast.error(`Erro ao importar Classificação PPU: ${err.message}`),
  });
}
