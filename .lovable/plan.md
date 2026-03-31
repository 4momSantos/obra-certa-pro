

## Melhorar visibilidade do Detail Sheet do PPU

O sheet atual tem largura máxima de 520px e usa grid 2x2 para os cards financeiros, causando truncamento de valores. Vamos ampliar e reorganizar.

### Alterações em `src/components/gestao-bm/BmPpuDetailSheet.tsx`

1. **Ampliar largura do sheet**: De `sm:max-w-[520px]` para `sm:max-w-[680px]` — mais espaço sem ocupar a tela toda.

2. **Resumo Financeiro em 4 colunas**: Trocar `grid-cols-2` por `grid-cols-4` para exibir os 4 cards lado a lado, cada um com texto legível sem truncamento.

3. **Eventos GITEC — grid mais espaçado**: Mudar o grid interno de `grid-cols-3` para layout flexível com `flex-wrap` para que Tag, Etapa e Fiscal não fiquem comprimidos.

4. **Evidências — coluna Título mais larga**: Remover `max-w-[140px]