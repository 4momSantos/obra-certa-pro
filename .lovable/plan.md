

## Plan: Enrich Visão Consolidada with KPIs, Charts, Filters & Drill-down

### Problem
The "Visão Consolidada" tab currently shows only a raw tree table with no summary metrics, no charts, and no interactive filtering — making it hard to get an overview or drill into specific areas.

### What changes

**1. KPI Cards row at the top**
- 6 compact cards above the tree: Valor Contrato, Total Previsto, Total Projetado, Total Realizado, Saldo (Valor - Realizado), % Avanço (Realizado/Valor)
- Each card shows value + percentage, colored by status (green when on track, amber/red when behind)
- Derived from the already-computed `totals` in `BmConsolidatedTree`

**2. Summary charts section (collapsible)**
- **Donut chart**: Distribution of Realizado by Fase (shows which phases consume the budget)
- **Stacked bar chart**: Previsto vs Projetado vs Realizado per Fase (horizontal bars, top 10)
- Uses Recharts (already in the project). Collapsible via a toggle button to save space
- Data derived from the `tree` (fase-level aggregations) — no new queries

**3. Filter toolbar**
- **Fase filter**: Select dropdown to filter the tree to a single Fase
- **Semáforo filter**: Toggle buttons (medido / executado / previsto / futuro) to show only agrupamentos with that status
- **Saldo filter**: Toggle to show only items where saldo > 0 (pending work)
- Filters apply to the existing tree + update the KPI totals dynamically

**4. Interactive row click → detail panel**
- Clicking a **Fase** row: shows a mini summary card below the row with totals + a small bar chart of its subfases
- Clicking an **Agrupamento** row: keeps existing behavior (AgrupamentoDetail inline) but also opens the `BmPpuDetailSheet` on double-click or via a button
- Clicking a **Subfase** row: shows aggregated KPIs for that subfase inline

### Files to modify

| File | Changes |
|------|---------|
| `src/components/gestao-bm/BmConsolidatedTree.tsx` | Add KPI cards section, chart section, filter toolbar, interactive drill-down on fase/subfase rows |

### Technical details

- **KPI cards**: Render a grid of `Card` components above the search bar using the existing `totals` memo, extended with saldo and % avanço
- **Charts**: Add a `useState<boolean>` for chart visibility toggle. Donut uses `PieChart` from Recharts with fase data. Bar chart uses `BarChart` horizontal layout
- **Filters**: Three new state vars: `faseFilter: string`, `semaforoFilter: string[]`, `saldoOnly: boolean`. Applied in a new `useMemo` that wraps the existing `filterTree` result
- **Fase detail inline**: When a fase row is expanded, render a summary row (`<tr colSpan={8}>`) with 3 mini-KPI badges + a small horizontal bar of subfase breakdown
- All data is client-side from the existing `useCronogramaTree` hook — no new database queries needed

