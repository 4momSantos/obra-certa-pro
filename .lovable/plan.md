

# Cronograma Financeiro — Database Migration + Integration Plan

## Summary

Create three new database tables (`cronograma_tree`, `cronograma_bm_values`, `curva_s`) with views and RLS policies, then integrate them into the existing import pipeline and Cronograma page.

## Step 1 — Database Migration

Run the user's SQL as a single migration with minor adjustments:
- Use `owns_import_batch()` function (already exists) in RLS policies for consistency
- Use `TO authenticated` syntax for read policies instead of `auth.role() = 'authenticated'`
- Create all 3 tables, 3 views, indexes, and RLS policies

Tables:
- `cronograma_tree` — EAP hierarchy nodes (Fase/Subfase/Agrupamento)
- `cronograma_bm_values` — Values per BM period per agrupamento (Previsto/Projetado/Realizado)
- `curva_s` — Accumulated and monthly S-curve values

Views:
- `vw_cronograma_bm_por_ippu` — BM values aggregated by agrupamento
- `vw_ultimo_bm_realizado` — Last BM with realized values
- `vw_cronograma_tree_completo` — Tree with BM totals

## Step 2 — Import Parser for Cronograma

Add a `parseCronogramaFile()` function in `useImport.ts` that:
- Reads the CR-5290 Excel file
- Identifies EAP hierarchy rows (nivel 3/4/5) by indentation or column structure
- Extracts BM columns (BM-01 through BM-22) for Previsto/Projetado/Realizado
- Extracts Curva S rows (accumulated and monthly values)
- Returns `{ tree, bmValues, curvaS, warnings }`

Add a new upload card in `ImportData.tsx` for "Cronograma CR-5290".

Extend `useProcessImport` to handle the cronograma source:
- Create batch with `source: "cronograma"`
- Insert into `cronograma_tree`, `cronograma_bm_values`, `curva_s`
- Delete previous cronograma batches before inserting

## Step 3 — Refactor Cronograma Page

Replace the current `Cronograma.tsx` (which uses localStorage via `CronogramaContext`) with a database-backed version:

- Create `useCronogramaData()` hook that queries:
  - `cronograma_tree` for the EAP tree
  - `vw_cronograma_bm_por_ippu` for BM values per period
  - `curva_s` for the S-curve chart
  - `vw_ultimo_bm_realizado` for current BM indicator

- Update the page to show:
  - Tree grid with expandable Fase → Subfase → Agrupamento
  - BM period columns with Previsto/Projetado/Realizado values
  - Summary KPIs from tree totals
  - Empty state: "Importe o cronograma CR-5290 primeiro" + link to /import

## Step 4 — Update Curva S Widget

Refactor `CurvaSWidget.tsx` to optionally use data from the `curva_s` table instead of the `CronogramaContext`, so the dashboard shows real imported data when available.

## Step 5 — Update Import Stats

Add `cronograma` count to `useImportStats.ts` and the sidebar data indicator.

## Files Changed

| File | Action |
|------|--------|
| Migration SQL | Create 3 tables, 3 views, indexes, RLS |
| `src/hooks/useImport.ts` | Add `parseCronogramaFile`, extend `useProcessImport` |
| `src/pages/ImportData.tsx` | Add cronograma upload card |
| `src/hooks/useCronogramaData.ts` | New hook for DB-backed cronograma |
| `src/pages/Cronograma.tsx` | Refactor to use DB data instead of localStorage |
| `src/components/dashboard/CurvaSWidget.tsx` | Use DB curva_s data |
| `src/hooks/useImportStats.ts` | Add cronograma count |

