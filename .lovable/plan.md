

## Diagnóstico

### Por que não aparece o nome do PPU?
A tabela busca descrições da tabela `ppu_items` (linha 63), mas essa tabela está **vazia** (0 registros). A view `vw_cronograma_bm_por_ippu` retorna apenas `ippu`, `previsto`, `projetado`, `realizado` — sem descrição. Resultado: `ppuMap` fica vazio, e `descricao` e `disciplina` ficam sempre `""`.

**Solução**: Usar `cronograma_tree` (833 registros) como fonte de descrições — ela tem `ippu` e `nome`. Também buscar de `classificacao_ppu` para disciplina. Manter fallback para `ppu_items` caso seja populada futuramente.

### Responsividade
A tabela força `min-w-[1000px]` com 10 colunas, sem adaptação mobile. Valores financeiros ocupam espaço desnecessário.

---

## Plano de implementação

### 1. Corrigir fonte de dados para descrição e disciplina
No `BmPpuTable.tsx`, alterar a query `ppu-items-desc` para buscar de **3 fontes** em paralelo com fallback:
- `cronograma_tree` → `ippu` + `nome` (disponível agora)
- `classificacao_ppu` → `item_ppu` + `disciplina`
- `ppu_items` → fallback se tiver dados

Montar o `ppuMap` combinando as 3 fontes, priorizando `ppu_items` > `cronograma_tree` para descrição.

### 2. Melhorar responsividade da tabela
- Remover `min-w-[1000px]`, usar layout responsivo
- Em telas < `md`: ocultar colunas secundárias (Projetado, GITEC Pend.) via `hidden md:table-cell`
- Red