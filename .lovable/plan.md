

# Fix: Scrollbar na tabela do AddItemDialog

## Problema
O `ScrollArea` na tabela de seleção de itens PPU tem `max-h-[340px]`, mas o Radix ScrollArea precisa que o **Viewport** tenha altura restrita para ativar o scroll. O `h-full` no Viewport herda do Root, mas o Root com `max-h` nem sempre propaga corretamente a altura fixa necessária.

## Solução
Substituir o `ScrollArea` do Radix por um `div` com `overflow-y-auto` nativo, que funciona de forma mais confiável com tabelas. Aumentar também a altura máxima para aproveitar melhor o espaço do dialog.

### Arquivo: `src/components/previsao/AddItemDialog.tsx`
- **Linha 460-524**: Trocar o wrapper `ScrollArea` por um `div` com `overflow-y-auto` e `max-h-[50vh]`
- Manter os headers sticky como estão

```tsx
// Antes (linha 460-461):
<div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
  <ScrollArea className="h-full max-h-[340px]">

// Depois:
<div className="flex-1 min-h-0 border rounded-lg overflow-y-auto max-h-[50vh]">
```

E remover o `</ScrollArea>` correspondente na linha 524.

Isso garante scroll nativo visível com a barra do browser, mais confiável que o Radix ScrollArea para tabelas.

