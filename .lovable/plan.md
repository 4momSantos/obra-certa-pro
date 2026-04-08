
Objetivo: corrigir o módulo GITEC para que a pipeline mostre os totais reais de eventos por status sem “sumir” com registros por causa do parse, e para que os filtros da tela não contaminem a leitura executiva dos números.

Plano

1. Corrigir o parse do REL_EVENTO
- Revisar `parseRelEventoFile` em `src/hooks/useImport.ts`.
- Normalizar os campos críticos no parse, principalmente:
  - `status` → mapear variações para apenas 3 grupos principais: `Aprovado`, `Pendente de Aprovação`, `Pendente de Verificação`
  - `etapa` → normalizar espaços, acentos e variantes como `Concluída`
- Manter o parser permissivo para não descartar eventos válidos só porque TAG/iPPU vieram vazios.
- Melhorar os warnings para mostrar claramente:
  - total lido
  - total importado
  - total descartado
  - contagem por status normalizado
  - soma financeira por status normalizado

2. Separar “visão executiva” de “tabela filtrável”
- Ajustar `useGitecStats` em `src/hooks/useGitec.ts` para sempre calcular KPIs e funil sobre a base inteira importada, sem depender dos filtros visuais da tabela.
- Garantir que os totais de:
  - Aprovado
  - Pendente de Aprovação
  - Pendente de Verificação
  sejam calculados apenas com status normalizado.
- Se existirem status fora do padrão, eles entram em “Outros” para diagnóstico, em vez de serem perdidos silenciosamente.

3. Ajustar a tela Pipeline para não parecer que “filtra os números”
- Em `src/pages/GitecPipeline.tsx`, manter filtros aplicados somente à lista de eventos.
- Deixar claro na interface que:
  - KPIs e funil = base total importada