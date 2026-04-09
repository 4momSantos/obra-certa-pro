

# Fix useCobertura + Import Counts

## Changes

### 1. `src/hooks/useSconViews.ts` — useCobertura fallback to ppu_items

Replace the query to `vw_cronograma_tree_completo` (lines 48-52) with a query to `ppu_items` directly:

```typescript
const { data: tree, error: treeErr } = await supabase
  .from("ppu_items")
  .select("item_ppu, agrupamento, valor_total, valor_medido")
  .not("item_ppu", "is", null);
```

Map fields to match existing logic:
- `item_ppu` → `ippu`
- `agrupamento` → `nome`
- `valor_total` → `valor`
- `valor_medido` → `total_realizado_bm`

The rest of the function (SCON enrichment, semaforo logic, aggregation) stays identical.

### 2. `src/hooks/useImport.ts` — Add scon_programacao count

In `useExistingCounts` (line 1193), add a 4th parallel query:

```typescript
const [s, r, c, sp] = await Promise.all([
  supabase.from("sigem_documents").select("id", { count: "exact", head: true }),
  supabase.from("gitec_events").select("id", { count: "exact