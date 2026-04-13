/**
 * Field definitions for each config import source.
 * Used by ColumnMapperDialog to build the mapping UI.
 */

export interface FieldDef {
  key: string;
  label: string;
  type: "str" | "num" | "date";
  required?: boolean;
  /** Regex pattern to auto-detect from spreadsheet headers */
  hint?: string;
}

// ── PPU-PREV (ppu_items) ──
export const PPU_FIELDS: FieldDef[] = [
  { key: "flag", label: "Flag", type: "str", hint: "flag" },
  { key: "item_eap", label: "Item EAP", type: "str", hint: "eap" },
  { key: "item_gitec", label: "Item GITEC", type: "str", hint: "gitec" },
  { key: "item_ppu", label: "Item PPU", type: "str", required: true, hint: "item.*ppu|i\\.?ppu" },
  { key: "fase", label: "Fase", type: "str", hint: "^fase$" },
  { key: "subfase", label: "Subfase", type: "str", hint: "subfase|sub.?fase" },
  { key: "agrupamento", label: "Agrupamento", type: "str", hint: "agrupamento|agrup" },
  { key: "descricao", label: "Descrição", type: "str", hint: "descri" },
  { key: "criterio_medicao_ref", label: "Critério Medição Ref", type: "str", hint: "crit.rio|crit.*medi" },
  { key: "item_lc", label: "Item LC", type: "str", hint: "item.*lc|lc" },
  { key: "reajuste", label: "Reajuste", type: "str", hint: "reajuste" },
  { key: "unid_medida", label: "Unidade Medida", type: "str", hint: "unid|u\\.?m\\.?" },
  { key: "qtd", label: "Quantidade", type: "num", hint: "qtd|quant" },
  { key: "preco_unit", label: "Preço Unitário", type: "num", hint: "pre.o.*unit|p\\.?u\\.?" },
  { key: "valor_total", label: "Valor Total", type: "num", hint: "valor.*total|v\\.?total" },
  { key: "valor_medido", label: "Valor Medido", type: "num", hint: "valor.*medido|v\\.?medido" },
  { key: "carac", label: "Característica", type: "str", hint: "carac" },
  { key: "disc", label: "Disciplina", type: "str", hint: "disc|disciplina" },
  { key: "fam", label: "Família", type: "str", hint: "fam" },
  { key: "data_inicio", label: "Data Início", type: "date", hint: "data.*in.cio|dt.*ini" },
  { key: "data_fim", label: "Data Fim", type: "date", hint: "data.*fim|dt.*fim" },
];

// ── Classificação PPU (classificacao_ppu) ──
export const CLASSIF_FIELDS: FieldDef[] = [
  { key: "item_ppu", label: "Item PPU", type: "str", required: true, hint: "item.*ppu|i\\.?ppu" },
  { key: "item_eap", label: "Item EAP", type: "str", hint: "eap" },
  { key: "item_gitec", label: "Item GITEC", type: "str", hint: "gitec" },
  { key: "fase", label: "Fase", type: "str", hint: "^fase$" },
  { key: "subfase", label: "Subfase", type: "str", hint: "subfase|sub.?fase" },
  { key: "agrupamento", label: "Agrupamento", type: "str", hint: "agrupamento|agrup" },
  { key: "disciplina", label: "Disciplina", type: "str", hint: "disc|disciplina" },
];

// ── EAC (eac_items) ──
export const EAC_FIELDS: FieldDef[] = [
  { key: "ppu", label: "PPU", type: "str", required: true, hint: "ppu" },
  { key: "up", label: "UP", type: "str", hint: "^up$" },
  { key: "up_id", label: "UP ID", type: "str", hint: "up.*id" },
  { key: "ppu_agrup", label: "PPU Agrupamento", type: "str", hint: "ppu.*agrup" },
  { key: "estrutura", label: "Estrutura", type: "str", hint: "estrutura" },
  { key: "fase", label: "Fase", type: "str", hint: "^fase$" },
  { key: "subfase", label: "Subfase", type: "str", hint: "subfase|sub.?fase" },
  { key: "agrupamento", label: "Agrupamento", type: "str", hint: "agrupamento|agrup" },
  { key: "peso_fisico", label: "Peso Físico", type: "num", hint: "peso.*f.sico" },
  { key: "valor_financeiro", label: "Valor Financeiro", type: "num", hint: "valor.*financ|financeiro" },
  { key: "data_inicio", label: "Data Início", type: "date", hint: "data.*in.cio|dt.*ini" },
  { key: "data_termino", label: "Data Término", type: "date", hint: "data.*t.rmino|dt.*term" },
  { key: "tipo_curva", label: "Tipo Curva", type: "str", hint: "tipo.*curva" },
  { key: "previsto", label: "Previsto", type: "num", hint: "previsto" },
  { key: "realizado", label: "Realizado", type: "num", hint: "realizado" },
  { key: "qtd_prevista", label: "Qtd Prevista", type: "num", hint: "qtd.*prev" },
  { key: "um", label: "UM", type: "str", hint: "^um$|unid.*medida" },
  { key: "qtd_escopo", label: "Qtd Escopo", type: "num", hint: "qtd.*escopo" },
  { key: "vlr_medido", label: "Valor Medido", type: "num", hint: "vlr.*medido|valor.*medido" },
  { key: "valor_saldo", label: "Valor Saldo", type: "num", hint: "valor.*saldo|saldo" },
];

// ── Critério de Medição (criterio_medicao) ──
export const CRITERIO_FIELDS: FieldDef[] = [
  { key: "identificador", label: "Identificador", type: "str", hint: "identificador|id" },
  { key: "item_ppu", label: "Item PPU", type: "str", hint: "item.*ppu|i\\.?ppu" },
  { key: "nivel_estrutura", label: "Nível Estrutura", type: "str", required: true, hint: "n.vel|nivel.*estrut" },
  { key: "nome", label: "Nome", type: "str", hint: "^nome$" },
  { key: "dicionario_etapa", label: "Dicionário Etapa", type: "str", hint: "dicion.rio|etapa" },
  { key: "peso_absoluto", label: "Peso Absoluto", type: "num", hint: "peso.*absoluto" },
  { key: "peso_fisico_fin", label: "Peso Físico/Fin", type: "num", hint: "peso.*f.sico|fisico.*fin" },
];

// ── Lookup by source key ──
export const FIELDS_BY_SOURCE: Record<string, FieldDef[]> = {
  ppu_prev: PPU_FIELDS,
  classificacao_ppu: CLASSIF_FIELDS,
  eac: EAC_FIELDS,
  criterio_medicao: CRITERIO_FIELDS,
};

/** Normalize string: lowercase, strip accents, trim */
function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** Score how well a field label matches a header (0 = no match) */
function similarityScore(fieldLabel: string, header: string): number {
  const nLabel = normalize(fieldLabel);
  const nHeader = normalize(header);
  if (!nLabel || !nHeader) return 0;
  // Exact
  if (nLabel === nHeader) return 100;
  // Contains
  if (nHeader.includes(nLabel) || nLabel.includes(nHeader)) return 80;
  // Word overlap
  const labelWords = nLabel.split(/\s+/);
  const headerWords = nHeader.split(/\s+/);
  const shared = labelWords.filter(w => headerWords.some(hw => hw === w || hw.includes(w) || w.includes(hw)));
  if (shared.length > 0) return 10 + (shared.length / Math.max(labelWords.length, 1)) * 50;
  return 0;
}

/**
 * Auto-detect column mapping from spreadsheet headers.
 * Pass 1: regex hints. Pass 2: fuzzy label similarity.
 */
export function autoDetectMapping(
  headers: string[],
  fields: FieldDef[]
): Record<string, number> {
  const mapping: Record<string, number> = {};
  const usedCols = new Set<number>();

  // Pass 1: regex hints
  for (const field of fields) {
    if (!field.hint) continue;
    const regex = new RegExp(field.hint, "i");
    for (let i = 0; i < headers.length; i++) {
      if (usedCols.has(i)) continue;
      if (regex.test(headers[i])) {
        mapping[field.key] = i;
        usedCols.add(i);
        break;
      }
    }
  }

  // Pass 2: fuzzy label matching for unmatched fields
  for (const field of fields) {
    if (mapping[field.key] !== undefined) continue;
    let bestScore = 0;
    let bestCol = -1;
    for (let i = 0; i < headers.length; i++) {
      if (usedCols.has(i)) continue;
      const score = similarityScore(field.label, headers[i]);
      if (score > bestScore) {
        bestScore = score;
        bestCol = i;
      }
    }
    if (bestCol >= 0 && bestScore >= 10) {
      mapping[field.key] = bestCol;
      usedCols.add(bestCol);
    }
  }

  return mapping;
}

/** Convert column index to Excel letter (0→A, 25→Z, 26→AA) */
export function colToLetter(col: number): string {
  let result = "";
  let c = col;
  while (c >= 0) {
    result = String.fromCharCode(65 + (c % 26)) + result;
    c = Math.floor(c / 26) - 1;
  }
  return result;
}
