

## Problema

O valor contratual real é **R$ 915.377.248,92**, mas o pipeline GITEC mostra apenas **R$ 276M** (soma dos eventos no `rel_eventos`). Isso porque:

1. A tabela `contratos` está **vazia** — não tem o valor de referência cadastrado
2. Os KPIs do GITEC mostram apenas a soma dos eventos importados, sem comparar com o valor contratual
3. Não existe um KPI de "% Medido" para contextualizar o progresso

## Plano

### Passo 1 — Cadastrar o contrato na base de dados

Inserir um registro na tabela `contratos` com o valor contratual correto:

```sql
INSERT INTO contratos (codigo, nome, valor_contratual, ativo)
VALUES ('CONTRATO-01', 'Contrato Principal', 915377248.92, true);
```

Isso também desbloqueia o `ContratoContext` que já busca essa tabela e expõe `contratoAtivo.valor_contratual`.

### Passo 2 — Adicionar KPI "Valor Contratual" e "% Medido" no pipeline

Atualizar `GitecKPIs.tsx` para receber o valor contratual (via props do `ContratoContext`) e mostrar:

- **Valor Contratual**: R$ 915,4M
- **% Medido (Aprovado)**: R$ 212,5M / R$ 915,4M = **23,2%**

### Passo 3 — Conectar o ContratoContext na página GitecPipeline

Atualizar `GitecPipeline.tsx` para consumir `useContrato()` e passar `contratoAtivo.valor_contratual` ao componente `GitecKPIs`.

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| Migration SQL | INSERT do contrato com valor R$ 915.377.248,92 |
| `src/components/gitec/GitecKPIs.tsx` | Adicionar KPI "Valor Contratual" e "% Medido" |
| `src/pages/GitecPipeline.tsx` | Importar `useContrato` e passar valor ao KPIs |

### Resultado esperado

O pipeline GITEC mostrará 7 KPIs (em vez de 6), incluindo o valor contratual como referência e o percentual aprovado (~23%) para contextualizar que os R$ 276M de eventos representam ~30% do contrato total.

