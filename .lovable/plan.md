

# Fix "invalid input syntax for type json" Error

## Root Cause

The `import_batches` table has an `errors` column of type `jsonb`. While the default is `'[]'::jsonb`, PostgREST may have issues when the column isn't explicitly set. Additionally, some Excel cell values may contain characters that break JSON serialization in the HTTP request body sent to PostgREST.

## Changes

### 1. Explicitly set `errors: []` on batch creation (`src/hooks/useImport.ts`)

All four `import_batches.insert()` calls (SIGEM, REL_EVENTO, SCON, Cronograma ~lines 747, 764, 780, 798) currently omit the `errors` field. Add `errors: []` to each insert to avoid relying on the database default.

### 2. Add JSON-safe validation before insert (`src/hooks/useImport.ts`)

Add a `ensureJsonSafe()` wrapper around each row before it reaches `insertInBatches`. This function will:
- Call `JSON.stringify()` on each row to validate it's serializable
- If it throws, iterate fields to find and sanitize the problematic value
- Replace any non-serializable values with empty strings

### 3. Improve `sanitizeForInsert` to handle edge cases (`src/hooks/useImport.ts`)

- Handle `Date` objects more defensively (check for Invalid Date)
- Handle `BigInt`, `Symbol`, `undefined` explicitly
- For objects, wrap `JSON.stringify` in try-catch and fall back to `"{}"`

### 4. Add diagnostic logging on error (`src/hooks/useImport.ts`)

In the `insertInBatches` row-by-row fallback, log the exact row data via `console.error` before throwing, so the user can report which field causes the issue.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useImport.ts` | Add `errors: []` to batch inserts, add JSON validation, improve sanitizer |

