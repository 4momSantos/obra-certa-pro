

# Corrigir Parser REL_EVENTO para Estrutura Real do Arquivo

## Problema

O parser atual tem 3 problemas graves:

1. **`range: 2` errado**: O arquivo tem 4 linhas de cabeçalho/filtros antes dos headers reais (linha 5). O parser lê a linha 3 ("Data de Execução: Não selecionado...") como headers, então nenhum `findCol` funciona e todos os campos ficam mapeados para posições erradas.

2. **Colunas inexistentes**: O parser busca `item_ppu`, `rel_status`, `rel_status_item`, `tag_agrup`, `quantidade_ponderada` -- nenhuma existe no arquivo. O `item_ppu` deve ser derivado do campo `Agrupamento` (ex: `B_1.1_Mobilização...` → `B-1.1`).

3. **Sem filtro de pivot table**: Linhas "Rótulos de Linha" e "Total Geral" passam direto e tentam ser gravadas como datas, causando o erro SQL.

## Colunas reais do arquivo (21 colunas, linha 5)

```text
Estrutura | Fase | Sub fase | Agrupamento | Característica | TAG | Qtd | UM | Etapa |
Peso Físico | Peso Financeiro | Data de Execução | Data Inf. Execução | Executado por |
Necessita Evidências | Número Evidências | Data de Aprovação | Fiscal Responsável |
Status | Valor | Comentário
```

## Mudanças em `src/hooks/useImport.ts`

### 1. Detecção dinâmica da linha de cabeçalho

Substituir `range: 2` fixo por busca dinâmica: varrer as primeiras 20 linhas até encontrar uma que contenha "Estrutura" ou "Etapa" ou "TAG" simultaneamente.

```typescript
const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
// Encontrar linha de cabeçalho dinamicamente
let headerIdx = 0;
for (let i = 0; i < Math.min(raw.length, 20); i++) {
  const rowStr = (raw[i] || []).map(h => str(h).toLowerCase()).join("|");
  if (rowStr.includes("estrutura") && rowStr.includes("etapa")) {
    headerIdx = i;
    break;
  }
}
const headers = (raw[headerIdx] || []).map(h => str(h));
```

### 2. Derivar `item_ppu` do Agrupamento

O campo Agrupamento tem formato `B_1.1_Nome do Agrupamento`. Extrair o iPPU:

```typescript
function extractIppuFromAgrupamento(agrup: string): string {
  if (!agrup) return "";
  // "B_1.1_Mobilização..." → "B-1.1"
  const m = agrup.match(/^([A-Z])_(\d+(?:\.\d+)*)_/);
  return m ? `${m[1]}-${m[2]}` : "";
}
```

Usar no loop: `item_ppu: extractIppuFromAgrupamento(str(cell(r, cAgrup)))`.

### 3. Filtrar linhas de pivot table

Após `if (!r || r.length === 0) continue;`, adicionar:

```typescript
const firstVal = str(r[0] || "").toLowerCase();
if (firstVal.includes("rótulos de") || firstVal.includes("rotulos de") ||
    firstVal.includes("total geral") || firstVal.includes("grand total") ||
    firstVal.includes("(blank)") || firstVal.includes("(em branco)")) {
  continue;
}
```

### 4. Adicionar candidatos de nome para "Sub fase"

O arquivo usa "Sub fase" (com espaço). Adicionar ao `findCol`:

```typescript
const cSubfase = findCol(headers, "subfase", "sub fase", "sub_fase");
```

### 5. Relaxar filtro de chave

Atualmente: `if (!item_ppu && !tag) { noKey++; continue; }`. Mudar para aceitar linhas que tenham pelo menos Agrupamento OU TAG:

```typescript
if (!item_ppu && !tag && !agrupamento) { noKey++; continue; }
```

## Arquivo alterado

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useImport.ts` | `parseRelEventoFile`: header dinâmico, iPPU derivado, filtro pivot, candidatos "sub fase" |

