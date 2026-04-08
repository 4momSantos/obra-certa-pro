

## Problem

Data is imported into `rel_eventos` successfully (6,490 rows), but the GITEC Pipeline page shows "Sem dados" because:

1. **RLS blocks reads**: `rel_eventos` SELECT policy requires `contrato_id = ANY(user_contrato_ids())`, but imported rows have `contrato_id = NULL`
2. All `useGitec` hooks (`useGitecStats`, `useGitecEvents`, `useGitecEventDetail`) query `rel_eventos` and get 0 rows back
3. The `useExistingCounts` query also returns 0 for `rel_eventos` count

## Fix (2 steps)

### Step 1 — Migration: Fix `rel_eventos` SELECT RLS policy

Drop the restrictive `read_contrato` policy and replace it with an open authenticated-read policy, matching every other data table in the project:

```sql
DROP POLICY IF EXISTS "read_contrato" ON public.rel_eventos;
CREATE POLICY "read_auth" ON public.rel_eventos
  FOR SELECT TO authenticated
  USING (true);
```

This is safe — all other data tables (`gitec_events`, `documents`, `scon_components`, `ppu_items`, etc.) already use `USING (true)` for authenticated SELECT.

### Step 2 — No code changes needed

The hooks in `useGitec.ts` already query `rel_eventos` with the correct column names (`etapa`, `status`, `valor`, `agrupamento_ippu`, `fiscal_responsavel`, etc.). Once RLS allows reads, all KPIs, events table, fiscal rankings, and detail views will populate automatically.

## Impact

- GITEC Pipeline page will show all 6,490 events with KPIs, funnel, and rankings
- Import stats sidebar will show correct count
- Medição cross-references via `vw_gitec_por_ppu` (if it reads from `rel_eventos`) will also work
- No code changes required — only a database policy update

