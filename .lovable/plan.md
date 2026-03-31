

## Problema

A página **Documentos SIGEM** (`/documentos`) mostra "Nenhum documento importado" apesar de existirem **23.279 registros** no banco. O badge na sidebar mostra corretamente **3.212** (recusados).

**Causa raiz**: O hook `useDocuments.ts` consulta a tabela `documents` (que está **vazia** — 0 registros). Os dados reais estão na tabela `sigem_documents`. São tabelas diferentes com schemas diferentes:

| `documents` (vazia) | `sigem_documents` (23.279 rows) |
|---|---|
| nivel2, nivel3, tipo, status_workflow, dias_corridos_wf | up, status_correto, ppu, status_gitec, documento_revisao |

## Plano

Reescrever o hook `useDocuments.ts` e ajustar a página e o detail sheet para usar `sigem_documents` em vez de `documents`.

### 1. Reescrever `src/hooks/useDocuments.ts`

- **`useDocumentStats`**: Consultar `sigem_documents` em vez de `documents`. Usar `status_correto` como campo de status. Remover referência a `document_revisions` e `dias_corridos_wf` (não existem nessa tabela). Calcular recusados com GITEC cruzando `sigem_documents` filtrados por `status_correto = 'Recusado'` com `gitec_events.evidencias`.
- **`useDocuments` (lista)**: Consultar `sigem_documents`. Mapear colunas: `status_correto` → status, `ppu` → área. Manter enriquecimento com GITEC via `evidencias`.
- **`useRecusados`**: Consultar `sigem_documents` filtrado por `status_correto = 'Recusado'` em vez de `document_revisions`.
- **`useDocumentDetail`**: Buscar em `sigem_documents` por documento. Manter busca de GITEC vinculados. Remover referência a `document_revisions`.
- **`useDocumentStatuses`**: Consultar `sigem_documents` usando `status_correto`.
- **Interfaces**: Adaptar `DocumentRow` e `DocStats` para os campos disponíveis em `sigem_documents`.

### 2. Ajustar `src/pages/DocumentsPage.tsx`

- Adaptar referências de campos (ex: `nivel2` → `ppu`, `status` → `status_correto`).
- Remover colunas que não existem em `sigem_documents` (Tipo, WF, Dias WF).
- Ajustar o funil e KPIs para os novos campos.

### 3. Ajustar `src/components/documents/DocumentDetailSheet.tsx`

- Remover campos inexistentes (tipo, nivel2, status_workflow, dias_corridos_wf).
- Adicionar campos disponíveis (ppu, status_gitec, up).
- Adaptar seção de revisões (usar `sigem_documents` filtrados pelo mesmo documento se houver múltiplas revisões, ou remover se não aplicável).

### Detalhes técnicos

- A tabela `sigem_documents` tem colunas: `id, batch_id, documento, revisao, incluido_em, titulo, status, up, status_correto, ppu, status_gitec, documento_revisao, created_at`
- O campo de status correto é `status_correto` (não `status`)
- A tabela `document_revisions` está vazia (0 rows) — todas as referências a ela devem ser removidas ou substituídas
- Nenhuma migração SQL necessária — apenas mudança de tabela nas queries do frontend

