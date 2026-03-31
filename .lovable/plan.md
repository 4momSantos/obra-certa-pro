

## Estilizar Scrollbars Globalmente

### Problema
As scrollbars nativas do navegador (cinza padrão do OS) quebram a identidade visual dark/corporativa da aplicação. Aparecem em dezenas de locais: tabelas, sidebar, modais, sheets, etc.

### Solução
Adicionar estilos globais de scrollbar no `src/index.css` usando pseudo-elementos WebKit + `scrollbar-color` para Firefox. Usar as CSS variables do tema para manter consistência em light/dark mode.

### Mudança — Arquivo único: `src/index.css`

Adicionar no `@layer base`, dentro do bloco `*`:

**Scrollbar padrão (todos os elementos)**:
- Largura fina: `6px`
- Track: transparente
- Thumb: `hsl(var(--border))` com `border-radius` arredondado
- Hover no thumb: `hsl(var(--muted-foreground) / 0.5)`
- Firefox: `scrollbar-width: thin; scrollbar-color: hsl(var(--border)) transparent`

**Scrollbar da sidebar** (`.overflow-y-auto` dentro do sidebar):
- Thumb mais sutil: `hsl(var(--sidebar-border))`
- Hover: `hsl(var(--sidebar-accent))`

Isso cobre automaticamente todos os `overflow-auto`, `overflow-y-auto`, `ScrollArea`, e tabelas com scroll — sem tocar em nenhum componente individual.

