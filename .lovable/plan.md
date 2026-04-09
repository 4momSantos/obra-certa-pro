

# Plano: Proteger importação PPU + Match dual GITEC ↔ PPU

## Problema raiz
O `replaceExisting` em `useConfigUpload` deleta batches por `source` — mas os 178 registros atuais em `ppu_items` vieram de um batch com `source=gitec`, não `source=ppu_prev`. Quando a PPU foi reimportada, o replace deletou apenas batches `ppu_prev` anteriores, deixando os 178 do GITEC. Depois, alguma operação cascateou e deletou os 883 rows da PPU real.

## Alterações

### 1. `src/hooks/useConfig.ts` — Proteger replaceExisting (CRÍTICO)

Na função `useConfigUpload` (linhas 257-267), quando `replaceExisting=true` para PPU:
- Deletar **todos** os registros da tabela destino (`card.table`), não apenas os que pertencem a batches do mesmo source
- Isso garante que os 178 rows órfãos do batch GITEC sejam limpos antes de inserir os 883 da PPU
- Implementação: antes de criar o novo batch, fazer `DELETE FROM ppu_items` (via supabase client) quando a tabela for `ppu_items` e `replaceExisting=true`
- Para outras tabelas (classificacao_ppu, eac_items, criterio_medicao), manter o mesmo comportamento (limpar tudo da tabela)

Código atual problemático:
```ts
// Deleta apenas batches do mesmo source — NÃO limpa rows de outros sources
const { data: oldBatches } = await supabase
  .from("import_batches").select("id")
  .eq("source", card.source).eq("user_id", user.id);
```

Novo comportamento:
```ts
// 1. Deletar TODOS os registros da tabela destino
await supabase.from(card.table).delete().neq("id", "00000000-...");
// 2. Deletar batches antigos do mesmo source
await supabase.from("import_batches").delete()
  .eq("source", card.source).eq("user_id", user.id);
```

Nota: como RLS em `ppu_items` usa `owns_import_batch(batch_id, auth.uid())`, o DELETE só apaga rows do próprio usuário — seguro.

### 2. `src/lib/ppu-match.ts` — Criar utility de match dual (NOVO)

```typescript
interface PpuMatchItem {
  item_ppu: string;
  item_gitec?: string | null;
  [key: string]: unknown;
}

// Constrói lookup: gitec ippu → ppu item
export function buildGitecToPpuLookup<T extends PpuMatchItem>(ppuItems: T[]) {
  const directMap = new Map<string, T>();    // item_ppu direto
  const gitecMap = new Map<string, T>();     // item_gitec normalizado (strip E_)

  for (const ppu of ppuItems) {
    if (ppu.item_ppu) directMap.set(ppu.item_ppu, ppu);
    if (ppu.item_gitec) {
      gitecMap.set(ppu.item_gitec.replace(/^E_/, ''), ppu);
    }
  }
  return { directMap, gitecMap };
}

// Match: direto → prefixo via item_gitec
export function findPpuForGitec<T extends PpuMatchItem>(
  gitecIppu: string,
  lookup: ReturnType<typeof buildGitecToPpuLookup<T>>
): T | null {
  if (!gitecIppu) return null;
  if (lookup.directMap.has(gitecIppu)) return lookup.directMap.get(gitecIppu)!;
  for (const [prefix, ppu] of lookup.gitecMap.entries()) {
    if (gitecIppu === prefix || gitecIppu.startsWith(prefix + '_')) return ppu;
  }
  return null;
}
```

### 3. `src/components/gestao-bm/BmConsolidatedTree.tsx` — Usar match dual

- Adicionar `item_gitec` ao SELECT da query ppu-items (linha 51)
- Importar `buildGitecToPpuLookup`, `findPpuForGitec`
- No `useMemo` da árvore (linhas 112-146): em vez de `gitec[p.item_ppu]`, usar `findPpuForGitec(gitecIppu, lookup)` para vincular cada evento GITEC ao PPU correto
- Inverter a lógica: iterar sobre gitecData para encontrar o PPU correspondente, somar ao item correto
- `totalGitec` (linha 187) agora incluirá os R$ 58M ETF

### 4. `src/components/gestao-bm/BmPpuTable.tsx` — Usar match dual

- Adicionar `item_gitec` ao SELECT (linha 71)
- No `useMemo` de `gitecByIppu` (linhas 129-138): usar match dual para vincular eventos GITEC ao item PPU correto
- Isso faz os eventos ETF aparecerem na linha correta do item B-3.2.1

### 5. `src/components/gestao-bm/BmCharts.tsx` — Usar match dual

- Adicionar `item_gitec` ao SELECT (linha 69)
- No `chartData` useMemo (linhas 93-111): usar match dual para vincular GITEC ao PPU

### 6. `src/components/gestao-bm/consolidated/ConsolidatedKPIs.tsx` — Sem alteração

Já recebe `gitec` como prop do tree. O valor correto virá automaticamente após o match dual no componente pai.

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/hooks/useConfig.ts` | Fix replaceExisting: limpar tabela inteira |
| `src/lib/ppu-match.ts` | Novo: match dual centralizado |
| `src/components/gestao-bm/BmConsolidatedTree.tsx` | SELECT item_gitec + match dual |
| `src/components/gestao-bm/BmPpuTable.tsx` | SELECT item_gitec + match dual |
| `src/components/gestao-bm/BmCharts.tsx` | SELECT item_gitec + match dual |

Nenhuma migration. Após as correções, o usuário reimporta o PPU.xlsx via /configuracao e os 883 items (incluindo ETF com item_gitec) são carregados corretamente.

