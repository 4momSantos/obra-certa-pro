

## Otimizar Página Medição — Eliminar Scroll Horizontal

### Problema
A tabela tem `min-w-[900px]` forçando scroll horizontal. Em telas de ~1048px com sidebar, o conteúdo fica apertado e depende de scroll.

### Mudanças

#### `MedicaoTable.tsx`
- Remover `min-w-[900px]` da Table
- Esconder colunas secundárias em telas menores:
  - **Sempre visíveis**: Semáforo dot, Item PPU, Valor Total, SCON%, Medido
  - **`hidden md:table-cell`**: Descrição, Disciplina, SIGEM, GITEC, Gap
- Truncar Descrição com `max-w-[120px]` e usar tooltip ou title
- Reduzir padding das células (`px-2 py-1.5` em vez do padrão)

#### `MedicaoFilters.tsx`
- Reduzir `min-w-[200px]` do search para `min-w-[140px]`
- Selects: `w-[130px]` em vez de `w-[160px]`
- Já usa `flex-wrap` então vai encaixar melhor

#### `MedicaoFunnel.tsx`
- Legenda: usar `flex-wrap` para não cortar em telas menores

Nenhuma mudança estrutural — apenas classes responsivas para eliminar o overflow.

