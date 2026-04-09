

# Fix: Prevent PPU duplication on re-import

## Current state
- `ppu_items` has 883 rows (correct, orphans already cleaned)
- But re-importing will duplicate again because:
  1. The "Write via batch" RLS policy blocks DELETE of rows from other batches
  2. The code does `console.warn` instead of `throw` when DELETE fails

## Changes needed

### 1. Database migration — Add DELETE policies
Add permissive DELETE policies on all 4 config tables so any authenticated user can clear them during re-import:

```sql
CREATE POLICY "delete_config_auth" ON ppu_items
  FOR DELETE TO authenticated USING (true);
CREATE POLICY "delete_config_auth" ON classificacao_ppu
  FOR DELETE TO authenticated USING (true);
CREATE POLICY "delete_config_auth" ON eac_items
  FOR DELETE TO authenticated USING (true);
CREATE POLICY "delete_config_auth" ON criterio_medicao
  FOR DELETE TO authenticated USING (true);
```

### 2. `src/hooks/useConfig.ts` — Throw on delete failure
Line 267-269: Change `console.warn` to `throw` so insertion is blocked if cleanup fails:

```typescript
// Before (silent failure → duplicates)
if (delErr) {
  console.warn(`[Config] Could not clear ${card.table}:`, delErr.message);
}

// After (hard fail → no duplicates)
if (delErr) {
  throw new Error(`Falha ao limpar ${card.table}: ${delErr.message}`);
}
```

## Files
| File | Change |
|---|---|
| Migration SQL | Add DELETE policy on 4 config tables |
| `src/hooks/useConfig.ts` | `console.warn` → `throw` on line 268 |

## Result
- Re-importing PPU with "Substituir existentes" will correctly delete all 883 rows before inserting new ones
- If delete fails for any reason, the user sees an error and no data is inserted (no duplication)

