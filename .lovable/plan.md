

# Corrigir Relacionamento SIGEM-PPU via Evidências GITEC

## Problema

O arquivo SIGEM não possui coluna de PPU. O aviso "Coluna PPU não encontrada" é esperado. A relação entre documentos SIGEM e itens PPU é indireta: o campo `gitec_events.evidencias` contém números de documentos SIGEM separados por `;`, e cada evento GITEC tem um `item_ppu`. A view `vw_sigem_por_ppu` atual agrupa por `sigem_documents.ppu` (sempre vazio), retornando zero resultados.

## Mudanças

### 1. Remover aviso falso no parser SIGEM (`src/hooks/useImport.ts`)

- Remover a busca pela coluna PPU (`findCol(headers, "ppu", ...)`) e o warning "Coluna PPU não encontrada"
- Manter o campo `ppu` no objeto parseado, mas com valor vazio (sem alerta)
- Adicionar aviso diagnóstico mostrando os primeiros 15 cabeçalhos encontrados no arquivo para facilitar debug futuro

### 2. Recriar `vw_sigem_por_ppu` via GITEC (migração SQL)

Substituir a view atual que depende da coluna `ppu` vazia por uma que faz o JOIN através das evidências GITEC:

```sql
CREATE OR REPLACE VIEW vw_sigem_por_ppu AS
SELECT
  ge.item_ppu AS ppu,
  COUNT(DISTINCT sd.id) AS total_docs,
  COUNT(DISTINCT sd.id) FILTER (
    WHERE sd.status_correto IN ('Sem Comentários', 'Para Construção')
  ) AS docs_ok,
  COUNT(DISTINCT sd.id) FILTER (
    WHERE sd.status_correto = 'Recusado'
  ) AS docs_recusados,
  COUNT(DISTINCT sd.id) FILTER (
    WHERE sd.status_correto = 'Em Workflow'
  ) AS docs_workflow,
  COUNT(DISTINCT sd.id) FILTER (
    WHERE sd.status_correto = 'Com Comentários'
  ) AS docs_comentarios
FROM gitec_events ge
CROSS JOIN LATERAL unnest(
  string_to_array(ge.evidencias, ';')
) AS ev(doc_num)
JOIN sigem_documents sd
  ON trim(ev.doc_num) = sd.documento
WHERE ge.item_ppu IS NOT NULL
  AND ge.item_ppu != ''
  AND ge.evidencias IS NOT NULL
  AND ge.evidencias != ''
GROUP BY ge.item_ppu;
```

Isso usa `unnest(string_to_array(...))` para explodir o campo `evidencias` em linhas individuais e fazer o JOIN com `sigem_documents.documento`. A coluna de saída continua chamando `ppu` para manter compatibilidade com `useMedicao.ts`.

### 3. Nenhuma mudança nos consumidores

A view mantém as mesmas colunas (`ppu`, `total_docs`, `docs_ok`, `docs_recusados`, `docs_workflow`, `docs_comentarios`), então `useMedicao.ts`, `MedicaoExport.tsx` e `HomeDashboard.tsx` continuam funcionando sem alteração.

## Arquivos Alterados

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useImport.ts` | Remover busca de coluna PPU e aviso falso |
| Nova migração SQL | Recriar `vw_sigem_por_ppu` com JOIN via `gitec_events.evidencias` |

