/**
 * Builds a 3-level hierarchy: Fase → Subfase → Items
 * with fallback logic for corrupted fase data.
 */

export interface PpuRow {
  item_ppu: string;
  item_gitec: string | null;
  descricao: string;
  fase: string;
  subfase: string;
  agrupamento: string;
  disc: string;
  valor_total: number;
}

export interface TreeItem {
  item_ppu: string;
  item_gitec: string | null;
  descricao: string;
  disc: string;
  agrupamento: string;
  valor_total: number;
  gitec_aprovado: number;
  avanco: number;
}

export interface SubfaseNode {
  key: string;
  nome: string;
  valor_total: number;
  gitec_aprovado: number;
  avanco: number;
  children: TreeItem[];
}

export interface FaseNode {
  key: string;
  nome: string;
  valor_total: number;
  gitec_aprovado: number;
  avanco: number;
  subfases: SubfaseNode[];
  itemCount: number;
}

/** Detect if a fase value is corrupted (single char, empty, etc.) */
function isInvalidFase(fase: string): boolean {
  const trimmed = fase.trim();
  if (!trimmed) return true;
  if (trimmed.length <= 2) return true;
  // Common artifacts
  if (/^[a-zA-Z]$/.test(trimmed)) return true;
  return false;
}

/** Derive fase from item_ppu prefix (e.g. "B.01.001" → "B", "C.02.003" → "C") */
function deriveFase(item: PpuRow): string {
  // Try agrupamento first — often more descriptive
  if (item.agrupamento && item.agrupamento.trim().length > 2) {
    // Use first segment of agrupamento as fase proxy
    const parts = item.agrupamento.split(/[._\-/]/);
    if (parts[0] && parts[0].length >= 1) {
      return `Grupo ${parts[0].toUpperCase()}`;
    }
  }
  // Derive from item_ppu prefix
  const prefix = item.item_ppu.split(".")[0]?.trim();
  if (prefix) {
    const prefixMap: Record<string, string> = {
      "B": "Fase B — Construção e Montagem",
      "C": "Fase C — Comissionamento",
      "D": "Fase D — Documentação",
      "E": "Fase E — ETF/AT",
    };
    return prefixMap[prefix.toUpperCase()] ?? `Fase ${prefix.toUpperCase()}`;
  }
  return "Sem classificação";
}

/** Clean and normalize a PPU item for tree building */
function normalizePpu(raw: PpuRow): PpuRow & { normalizedFase: string; normalizedSubfase: string } {
  const fase = isInvalidFase(raw.fase) ? deriveFase(raw) : raw.fase.trim();
  const subfase = raw.subfase?.trim() || raw.agrupamento?.trim() || "Geral";
  return { ...raw, normalizedFase: fase, normalizedSubfase: subfase };
}

/** Filter out artifacts */
function isValidItem(item: PpuRow): boolean {
  if (!item.item_ppu || item.item_ppu.length < 3) return false;
  // Common spreadsheet artifacts
  const artifacts = ["prev", "agrup", "agrup.", "total", "subtotal", "soma"];
  if (artifacts.includes(item.item_ppu.toLowerCase())) return false;
  return true;
}

export interface BuildTreeResult {
  tree: FaseNode[];
  totalItems: number;
  hasCorruptedData: boolean;
  corruptedCount: number;
}

export function buildConsolidatedTree(
  ppuItems: PpuRow[],
  gitecByPpu: Record<string, number>
): BuildTreeResult {
  const validItems = ppuItems.filter(isValidItem);
  let corruptedCount = 0;

  // Normalize all items
  const normalized = validItems.map((item) => {
    const n = normalizePpu(item);
    if (isInvalidFase(item.fase)) corruptedCount++;
    return n;
  });

  // Build: Fase → Subfase → Items
  const faseMap = new Map<string, Map<string, TreeItem[]>>();

  for (const item of normalized) {
    if (!faseMap.has(item.normalizedFase)) {
      faseMap.set(item.normalizedFase, new Map());
    }
    const subfaseMap = faseMap.get(item.normalizedFase)!;
    if (!subfaseMap.has(item.normalizedSubfase)) {
      subfaseMap.set(item.normalizedSubfase, []);
    }

    const gitecVal = gitecByPpu[item.item_ppu] ?? 0;
    subfaseMap.get(item.normalizedSubfase)!.push({
      item_ppu: item.item_ppu,
      item_gitec: item.item_gitec,
      descricao: item.descricao,
      disc: item.disc,
      agrupamento: item.agrupamento,
      valor_total: item.valor_total,
      gitec_aprovado: gitecVal,
      avanco: item.valor_total > 0 ? (gitecVal / item.valor_total) * 100 : 0,
    });
  }

  // Assemble tree
  const tree: FaseNode[] = [];

  for (const [faseName, subfaseMap] of faseMap) {
    const subfases: SubfaseNode[] = [];
    let faseValor = 0;
    let faseGitec = 0;
    let faseItems = 0;

    for (const [subfaseName, items] of subfaseMap) {
      items.sort((a, b) => a.item_ppu.localeCompare(b.item_ppu));
      const sfValor = items.reduce((s, i) => s + i.valor_total, 0);
      const sfGitec = items.reduce((s, i) => s + i.gitec_aprovado, 0);

      subfases.push({
        key: `${faseName}::${subfaseName}`,
        nome: subfaseName,
        valor_total: sfValor,
        gitec_aprovado: sfGitec,
        avanco: sfValor > 0 ? (sfGitec / sfValor) * 100 : 0,
        children: items,
      });

      faseValor += sfValor;
      faseGitec += sfGitec;
      faseItems += items.length;
    }

    subfases.sort((a, b) => b.valor_total - a.valor_total);

    tree.push({
      key: faseName,
      nome: faseName,
      valor_total: faseValor,
      gitec_aprovado: faseGitec,
      avanco: faseValor > 0 ? (faseGitec / faseValor) * 100 : 0,
      subfases,
      itemCount: faseItems,
    });
  }

  tree.sort((a, b) => b.valor_total - a.valor_total);

  return {
    tree,
    totalItems: validItems.length,
    hasCorruptedData: corruptedCount > validItems.length * 0.3,
    corruptedCount,
  };
}
