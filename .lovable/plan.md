

# Fix: BmSelector não reconhece BMs fechados

## Diagnóstico

A tabela `bm_periodos` está **correta** — BM-01 a BM-09 com status `fechado`, BM-10 `aberto`, BM-11+ `futuro`. Os valores financeiros também estão preenchidos (exceto BM-09 `valor_medido = 0`).

O problema é que o `BmSelector` usa a view `vw_ultimo_bm_realizado` que retorna `null`, fazendo com que:
- `ultimoBm = 0` → `currentBm = 1` → auto-seleciona BM-01
- `isDone = bm.number <= 0` → nenhum BM aparece como fechado (todos cinza)

O `GestaoBM.tsx` também tem fallback para `bms[0]` (BM-01).

## Solução

### 1. `BmSelector.tsx` — Usar `bm_periodos` em vez da view quebrada

Substituir a query à `vw_ultimo_bm_realizado` por uma query direta:

```sql
SELECT bm_name, bm_number, status FROM bm_periodos ORDER BY bm_number
```

Usar os dados reais de status para colorir os botões:
- `fechado` → verde com