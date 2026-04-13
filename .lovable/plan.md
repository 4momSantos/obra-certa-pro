

# Fix: Auto-detect column mapping using field labels + fuzzy matching

## Problem
The auto-detection only uses rigid regex `hint` patterns. When a spreadsheet header says something like "Descrição" or "Valor Total (R$)", the system fails to match fields that have similar labels but no matching regex hint.

## Solution
Enhance `autoDetectMapping` in `src/lib/config-fields.ts` with a two-pass approach:

### Pass 1 — Regex hints (existing, unchanged)
Use the `hint` regex patterns as before for precise matches.

### Pass 2 — Label similarity (new)
For any field NOT matched by hints, compare the field `label` against remaining unmatched headers using normalized string similarity:
- Normalize both strings: lowercase, remove accents (NFD), trim
- **Exact match**: normalized label === normalized header → match
- **Contains match**: header contains the label or vice-versa → match
- **Word overlap score**: split both into words, count shared words — pick the header with the highest overlap (minimum 1 shared word)

### File: `src/lib/config-fields.ts`

1. Add a `normalize(s)` helper that lowercases + strips accents
2. Modify `autoDetectMapping` to run the existing hint pass first, then a second pass that compares `field.label` against unmatched headers using the similarity logic above
3. Sort second-pass candidates by match quality (exact > contains > word overlap)

### No other files change
The `ColumnMapperDialog` and `useConfig` already call `autoDetectMapping` — they'll automatically benefit from better detection.

## Result
When uploading a spreadsheet with headers like "Descrição", "Qtd", "Preço Unitário", the mapper will pre-select the correct columns automatically, and the user only needs to confirm or adjust.

