

## Plan: Comparativo Tab — Cell Detail + iPPU Description + Grouping Levels

### What changes

**1. iPPU column shows description**
- Display `nome` alongside the `ippu` code (e.g., "A-1.2.3 — Tubulação de Processo")
- Widen the sticky column to accommodate

**2. Click on cell opens detail popover/sheet**
- Clicking a BM cell (e.g., "P: 1.8M / R: 1.8M") opens a detail panel showing:
  - iPPU + nome
  - BM name
  - Previsto, Projetado, Realizado values (full precision)
  - Underlying GITEC events for that iPPU × BM combination (tag, etapa, valor, status)
- Implementation: Use a Popover or small Sheet triggered on cell click, with state for `selectedCell: { ippu, bmName } | null`
- Fetch GITEC events via existing `useGitecEventosByIppu` hook, filtered client-side by `bm_name`

**3. Grouping level selector**
- Add a Select dropdown above the table: "Agrupamento" (default) | "Subfase" | "Fase"
- When grouping by Subfase/Fase: aggregate BM values by summing child iPPUs
- Rows become the unique subfases or fases from the tree, with summed matrix values
- The iPPU column header changes to match the level name

### Files to modify

| File | Changes |
|------|---------|
| `src/components/cronograma/ComparativoTab.tsx` | Add grouping state + selector, show `nome` in iPPU column, add cell click handler with Popover showing detail data, aggregate rows by grouping level |

### Technical details

- **Grouping aggregation**: Use the `tree` data to map iPPUs to their fase/subfase. When grouping by "Fase", sum all BM values for iPPUs belonging to each fase. Same for "Subfase".
- **Cell detail popover**: Use Radix `Popover` on cell click. State: `{ ippu: string; bm: string } | null`. Show formatted values + filter `bmValues` for matching rows.
- **GITEC integration**: Lazy-load GITEC events for the selected iPPU using existing hook, then filter by `bm_name` in the popover.
- No new database queries needed — all data comes from existing `useAllBMValues` and `useCronogramaTree`.

