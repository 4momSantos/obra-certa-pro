

# Fix: Scrollbar visibility in ColumnMapperDialog

## Problem
The mapping table uses Radix `ScrollArea` which doesn't reliably show scrollbars, making it impossible to scroll through all PPU fields.

## Solution
Replace `ScrollArea` with a native `div` using `overflow-y-auto` and make table headers sticky — matching the project's established scroll pattern.

### File: `src/components/config/ColumnMapperDialog.tsx`

1. **Mapping table (line 128)**: Replace `<ScrollArea className="max-h-[300px] ...">` with `<div className="max-h-[300px] overflow-y-auto border rounded-md">`. Add `sticky top-0 z-10 bg-background` to the `TableHeader`.

2. **Preview table (line ~185)**: Same treatment — replace `ScrollArea` with native `div overflow-y-auto` and sticky header.

3. Remove unused `ScrollArea` import.

