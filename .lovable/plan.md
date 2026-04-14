
Objetivo: corrigir de forma definitiva a aba "Visão Consolidada" da Gestão BM para que ela puxe corretamente PPU, subfases e agrupamentos, sem depender de campos hoje corrompidos.

Diagnóstico confirmado:
- A tela atual `src/components/gestao-bm/BmConsolidatedTree.tsx` monta a árvore só por `fase -> itens`.
- Ela lê direto de `ppu_items` e ignora `agrupamento`, então nunca monta a hierarquia esperada.
- Pior: a base atual de `ppu_items` está inconsistente no campo `fase`:
  - 558 registros com `fase = "s"`
  - 324 registros com `fase = "b"`
  - 27 vazios
- `subfase` e `agrupamento` existem, mas `fase` está vindo mapeada errado.
- `cronograma_tree` está vazio, então hoje não existe uma fonte pronta para recuperar a hierarquia consolidada.

Plano definitivo de correção

1. Reestruturar a fonte da Visão Consolidada
- Parar de usar a lógica atual “fase → itens” como fonte principal.
- Criar uma camada de normalização dentro de `BmConsolidatedTree.tsx` ou em utilitário/hook dedicado para montar:
  - Fase
  - Subfase
  - Agrupamento
  - Item PPU
- Regra de fallback:
  - usar `ppu_items.fase` quando estiver válido
  - se vier inválido (`"s"`, `"b"`, vazio), derivar a fase a partir do prefixo do `item_ppu`/`item_gitec` e/ou do próprio `agrupamento`
  - manter `subfase` e `agrupamento` como rótulos reais da árvore

2. Corrigir a hierarquia visual da aba consolidada
- Trocar o componente atual para renderizar pelo menos 3 níveis:
  - Fase
  - Subfase
  - Agrupamento/PPU
- Exibir o nome do agrupamento como rótulo principal quando existir.
- Mostrar o `item_ppu` como badge/código secundário, não como único nome da linha.
- Preservar expansão/colapso por nível, busca e totais.

3. Centralizar a agregação financeira corretamente
- Reaproveitar `src/lib/ppu-match.ts` para continuar cruzando GITEC com PPU.
- Agregar valores em cascata:
  - item → agrupamento → subfase → fase
- Corrigir KPIs e gráficos da consolidação para usar a nova árvore agregada, não a lista achatada atual.

4. Blindar a tela contra dados ruins de importação
- Filtrar registros inválidos antes de montar a árvore:
  - `item_ppu` curto ou artefatos
  - descrições vazias quando houver agrupamento melhor
  - fases inválidas como `"s"` e `"b"`
- Quando houver degradação de dados, mostrar aviso discreto na UI:
  - exemplo: “Parte da hierarquia foi reconstruída automaticamente por inconsistência no cadastro PPU”.

5. Ajustar o detalhe ao clicar no item
- Garantir que o clique no nível final abra `BmPpuDetailSheet` com o `item_ppu` correto.
- Se houver linha de agrupamento pai com múltiplos itens, o clique deve apenas expandir; o detalhe fica só no nó folha.

6. Corrigir a origem do problema na importação PPU
- Revisar `src/pages/Configuracao.tsx`, `src/hooks/useConfig.ts` e `src/lib/config-fields.ts`.
- Adicionar validação específica para `fase` no pós-mapeamento:
  - alertar se a maioria dos valores tiver apenas 1 caractere
  - alertar se a cardinalidade de fase estiver anormalmente baixa (`s`, `b`, vazio)
- Se o usuário importar assim mesmo, deixar warning explícito de que a Visão Consolidada ficará comprometida.
- Isso evita repetir a corrupção atual.

7. Validar o comportamento com os padrões já existentes
- Seguir a arquitetura do projeto, onde transformação de dados fica centralizada e a UI não lê dados crus de forma ingênua.
- Manter consistência com:
  - `BmPpuTable.tsx` para match financeiro
  - `useCronogramaData.ts` para lógica de fallback hierárquico
  - regras de limpeza dos itens PPU já adotadas no projeto

Arquivos principais a ajustar
- `src/components/gestao-bm/BmConsolidatedTree.tsx`
- `src/lib/ppu-match.ts` (se precisar expor helper extra, sem quebrar os usos atuais)
- possivelmente novo utilitário/hook para árvore consolidada
- `src/pages/Configuracao.tsx`
- `src/hooks/useConfig.ts`

Resultado esperado
- A aba “Visão Consolidada” passa a mostrar a árvore correta com PPU e agrupamentos.
- A tela deixa de depender cegamente do campo `fase` importado.
- Mesmo com base parcialmente ruim, a consolidação continua navegável.
- Novas importações passam a ser validadas para impedir que o problema volte.

Detalhe técnico importante
- Como a base atual já está inconsistente, a correção ideal tem duas frentes:
  1. corrigir a UI/fallback agora para a tela parar de quebrar
  2. reforçar a importação para impedir novas cargas erradas
- Se quiser uma correção 100% fiel à planilha original, depois dessa implementação ainda será recomendável reimportar a PPU com o mapeamento correto de fase/subfase/agrupamento.
