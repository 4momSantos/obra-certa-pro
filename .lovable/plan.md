

## Problem

The "Visão Consolidada" tab in /gestao-bm shows no data because it reads from `vw_cronograma_tree_completo`, which depends on `cronograma_tree` — a table with **0 rows**. Meanwhile, `ppu_items` has **1,061 rows** with the same hierarchical structure (fase → subfase → agrupamento) and financial values.

## Root Cause

The cronograma tree was designed to be populated via a separate "Cronograma" Excel import that was never executed. The PPU import already contains all the hierarchical data needed for the consolidated view.

## Plan

### 1. Create a database view `vw_ppu_consolidated_tree` that mirrors the cronograma tree structure

**New migration** — Create a view from `ppu_items` that produces the same shape as `cronograma_tree`:
- Level "3 - Fase" rows grouped by `fase`
- Level "5 - Agrupamento" rows (one per `ppu_items` row with fase set)
- Subfase level included when populated
- Joins with `vw_gitec_por_ppu` and `vw_scon_por_ppu` for enrichment (semaforo, SCON progress)
- Joins with `curva_s` or `gitec_events` for realized values per item

### 2. Update `useCronogramaTree` hook to use `ppu_items` as primary source

**File**: `src/hooks/useCronogramaData.ts`

When `cronograma_tree` is empty, fall back to building the tree directly from `ppu_items`:
- Query `ppu_items` with `fase != ''` (255 rows with hierarchy)
- Map each row to the `CronoTreeNode` interface: `nivel="5 - Agrupamento"`, `ippu=item_ppu`, `nome=agrupamento`, `valor=valor_total`
- Synthesize fase-level parent nodes by grouping
- Enrich with `vw_gitec_por_ppu` and `vw_scon_por_ppu` (same logic already exists)
- For financial totals (previsto/projetado/realizado), use `gitec_events` aggregated by ippu + curva_s proportional allocation

### 3. Enrich with GITEC realized values

Since `cronograma_bm_values` is also empty, compute realized values from `gitec_events`:
- Group `gitec_events` by `ippu`, sum `valor` where `status = 'Aprovado'`
- Map to `total_realizado_bm` on each agrupamento node
- This gives the consolidated view real financial progress data (5,977 GITEC events exist)

### 4. No changes to the UI component

`BmConsolidatedTree.tsx` already handles the tree structure correctly — it just needs data. The `buildAndAggregate` function works with the same `CronoTreeNode` shape regardless of source.

## Files Changed

1. `src/hooks/useCronogramaData.ts` — Update `useCronogramaTree` to build tree from `ppu_items` when `cronograma_tree` is empty, enrich with GITEC actuals

## Data Available

| Source | Rows | Used For |
|--------|------|----------|
| `ppu_items` | 1,061 (255 with fase) | Tree hierarchy + contract values |
| `gitec_events` | 5,977 | Realized values by ippu |
| `curva_s` | 23 | Aggregate S-curve (fallback totals) |
| `vw_gitec_por_ppu` | exists | Semaforo enrichment |
| `vw_scon_por_ppu` | exists | SCON progress enrichment |

