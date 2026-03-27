

## Problem

The GITEC Excel parser uses **fixed column indices** (r[0], r[1], r[2]...) which don't match the actual Excel file structure. This causes:
- 5979 rows parsed but KPI values (Aprovados, Pendentes, Valor Total) all showing zero
- Status, Valor, Fiscal and other fields not being read from the correct columns

The same issue likely affects the Documents and Revisions parsers.

## Root Cause

The Excel files have columns in a different order than what the parser expects. Using fixed indices is fragile.

## Solution: Header-based column mapping

Instead of reading columns by index, read the **header row** (row 5 / index 4) and map columns by name using fuzzy matching.

### Changes

**1. `src/hooks/useImport.ts` — Refactor all 3 parsers to use header-based mapping**

For each parser (`parseGitecFile`, `parseDocumentsFile`, `parseRevisionsFile`):
- Read the first row of the parsed range as headers (raw[0])
- Build a column index map by matching header names (case-insensitive, trimmed)
- Use the map to read each data row instead of fixed indices
- Add fallback: try partial/fuzzy match for common variations (e.g. "Fiscal Responsável" vs "Fiscal")

Example for GITEC headers to match:
```
Agrupamento, TAG, Etapa, Status, Valor, Data de Execução,
Data Inf. Execução, Data de Aprovação, Executado por,
Fiscal Responsável, Número Evidências, Comentário
```

Column matching logic:
```typescript
function findCol(headers: string[], ...candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.findIndex(h => 
      h.toLowerCase().includes(c.toLowerCase())
    );
    if (idx >= 0) return idx;
  }
  return -1;
}
```

Then use like:
```typescript
const headers = raw[0].map(h => str(h));
const colAgrup = findCol(headers, "agrupamento");
const colTag = findCol(headers, "tag");
const colStatus = findCol(headers, "status");
const colValor = findCol(headers, "valor");
// ... etc
```

And for each data row: `str(r[colAgrup])` instead of `str(r[0])`.

**2. Add warning if expected columns are not found**

If critical columns (Agrupamento, Status, Valor for GITEC; Documento for docs) are not found in the headers, add a warning like "Coluna 'Valor' não encontrada no cabeçalho".

**3. Same pattern for Documents parser**

Headers to match: `Documento, Revisão, Incluido em, Título, Status, Nível 2, Nível 3, Tipo de documento, Status Workflow, Dias Corridos`

**4. Same pattern for Revisions parser**

Headers to match: `Documento, Revisão, Modificado em, Título, Status, 2 Nivel / Nível 2, Texto de Consolidação, Propósito de Emissão`

### Files to modify
- `src/hooks/useImport.ts` — Refactor 3 parser functions to use header-based column mapping

No database changes. No new components.

