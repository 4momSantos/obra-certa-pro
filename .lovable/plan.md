
Objetivo
Corrigir o “processando para sempre” no histórico de imports e impedir novos batches órfãos.

Diagnóstico (confirmado no código + banco)
- Não é timeout de função backend/worker: esses uploads são feitos no cliente (hooks `useConfigUpload` e `useProcessImport`) com inserts diretos no banco.
- O status começa como `"processing"` na criação do batch.
- Se ocorrer erro no meio (ex.: data inválida), o fluxo lança exceção e sai sem atualizar batch para `"error"`.
- Resultado: ficam registros antigos `"processing"` com `0` linhas gravadas (exatamente o padrão que aparece no seu histórico).

Plano de implementação
1) Robustez de status no upload de Configuração (`src/hooks/useConfig.ts`)
- Envolver mutation em `try/catch`.
- Guardar `batchId` assim que criar o batch.
- Em sucesso: manter `status = "completed"`.
- Em erro: atualizar o mesmo batch para `status = "error"` e salvar mensagem em `errors` (JSON), evitando travamento visual eterno.

2) Robustez de status no upload operacional (`src/hooks/useImport.ts`)
- Aplicar a mesma estratégia por fonte (SIGEM, REL_EVENTO, SCON, etc.).
- Em qualquer falha da fonte atual: marcar aquele batch como `"error"` com detalhe do erro.
- Preservar comportamento atual de abortar o restante, mas sem deixar batch órfão em `"processing"`.

3) Normalização de batches já travados (migração SQL)
- Criar migração para converter batches antigos `"processing"` para `"error"` quando estiverem claramente abandonados (ex.: mais de X minutos/horas).
- Mensagem padrão em `errors`: “Upload interrompido antes da finalização”.
- Isso limpa o histórico sem apagar rastreabilidade.

4) UX no histórico (`src/components/import/ImportHistory.tsx`)
- Exibir badge de erro com destaque.
- Mostrar detalhe resumido do `errors` (tooltip/linha secundária).
- (Opcional) botão rápido para excluir batches com status `"error"`/travados.

5) Ajuste paralelo recomendado (console warning)
- Corrigir warning de `ref` em `Badge` (usar `React.forwardRef`) para eliminar ruído de debug na tela de import.

Validação (aceite)
- Falha forçada de upload deve terminar com batch `"error"` (nunca mais `"processing"` infinito).
- Upload válido deve terminar `"completed"`.
- Batches antigos travados devem aparecer como `"error"` após migração.
- Histórico deve permitir entender rapidamente “o que falhou e por quê”.

Detalhes técnicos
- Arquivos alvo:
  - `src/hooks/useConfig.ts`
  - `src/hooks/useImport.ts`
  - `src/components/import/ImportHistory.tsx`
  - `src/components/ui/badge.tsx` (warning de ref)
  - `supabase/migrations/*` (reclassificação de status antigo)
- Segurança/RLS:
  - Sem mudança de políticas; só updates em `import_batches` do próprio usuário (já coberto por policy atual).
