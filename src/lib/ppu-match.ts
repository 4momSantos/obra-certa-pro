/**
 * Centralized GITEC ippu → PPU item matching.
 *
 * Two match paths:
 *   1. Direct: gitec.ippu === ppu.item_ppu  (works for B/C/D items)
 *   2. Via item_gitec: strip "E_" prefix, then prefix-match
 *      e.g. PPU item_gitec "E_ETF_3.2.1" → normalized "ETF_3.2.1"
 *           GITEC ippu "ETF_3.2.1_MO_Ajudante" startsWith "ETF_3.2.1" → MATCH
 */

export interface PpuMatchItem {
  item_ppu: string;
  item_gitec?: string | null;
  [key: string]: unknown;
}

export interface PpuLookup<T extends PpuMatchItem> {
  directMap: Map<string, T>;
  gitecPrefixes: Array<{ prefix: string; ppu: T }>;
}

/**
 * Build lookup structure from PPU items.
 * Call once per render cycle (memoize with useMemo).
 */
export function buildGitecToPpuLookup<T extends PpuMatchItem>(
  ppuItems: T[]
): PpuLookup<T> {
  const directMap = new Map<string, T>();
  const gitecPrefixes: Array<{ prefix: string; ppu: T }> = [];

  for (const ppu of ppuItems) {
    if (ppu.item_ppu) {
      directMap.set(ppu.item_ppu, ppu);
    }
    if (ppu.item_gitec) {
      // "E_ETF_3.2.1" → "ETF_3.2.1"
      const normalized = ppu.item_gitec.replace(/^E_/, "");
      gitecPrefixes.push({ prefix: normalized, ppu });
    }
  }

  // Sort by prefix length descending for most-specific match first
  gitecPrefixes.sort((a, b) => b.prefix.length - a.prefix.length);

  return { directMap, gitecPrefixes };
}

/**
 * Find the PPU item that matches a GITEC ippu.
 * Returns null if no match found.
 */
export function findPpuForGitec<T extends PpuMatchItem>(
  gitecIppu: string | null | undefined,
  lookup: PpuLookup<T>
): T | null {
  if (!gitecIppu) return null;

  // Path 1: direct match by item_ppu
  const direct = lookup.directMap.get(gitecIppu);
  if (direct) return direct;

  // Path 2: prefix match via normalized item_gitec
  for (const { prefix, ppu } of lookup.gitecPrefixes) {
    if (gitecIppu === prefix || gitecIppu.startsWith(prefix + "_")) {
      return ppu;
    }
  }

  return null;
}

/**
 * Aggregate GITEC values by PPU item_ppu using dual match.
 * Returns a map: item_ppu → aggregated value, plus orphanTotal for unmatched.
 */
export function aggregateGitecByPpu<T extends PpuMatchItem>(
  gitecEvents: Array<{ ippu: string | null; valor: number | null }>,
  lookup: PpuLookup<T>
): { byPpu: Record<string, number>; orphanTotal: number; orphanCount: number } {
  const byPpu: Record<string, number> = {};
  let orphanTotal = 0;
  let orphanCount = 0;

  for (const evt of gitecEvents) {
    const ppu = findPpuForGitec(evt.ippu, lookup);
    if (ppu) {
      byPpu[ppu.item_ppu] = (byPpu[ppu.item_ppu] ?? 0) + (Number(evt.valor) || 0);
    } else {
      orphanTotal += Number(evt.valor) || 0;
      orphanCount++;
    }
  }

  return { byPpu, orphanTotal, orphanCount };
}
