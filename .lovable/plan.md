

## Adicionar Hierarquia BM → TAGs → Etapas no Detalhe do Agrupamento

### Problema atual
Ao expandir um agrupamento na Visão Consolidada, o usuário vê Etapas → TAGs. Mas falta a informação de **qual BM mediu cada item**, quais TAGs foram medidos em cada BM, e as etapas de cada TAG.

### Nova hierarquia proposta

```text
Agrupamento expandido:
├─ Resumo: "3 BMs com medição · 12 eventos GITEC"
├─ BM-07 │ Prev: R$120k │ Real: R$95k │ 5 eventos
│   ├─ TAG: ACAB-B-12001A │ Etapa: Mobilização │ ✅ Aprovado │ R$8.500
│   ├─ TAG: ACAB-B-12002A │ Etapa: Demolição   │ ⏳ Pend Verif │ R$12.000
├─ BM-08 │ Prev: R$80k  │ Real: R$60k │ 3 eventos
│   ├─ TAG: ACAB-B-12003A │ Etapa: Montagem │ ✅ Aprovado │ R$15.000
├─ Etapas do Critério (visão atual preservada)
│   ├─ Etapa 1: Mobilização │ ✅ 8/8
│   └─ Etapa 2: Demolição │ ◐ 5/8
```

### Fontes de dados

- **`cronograma_bm_values`** (iPPU): valores financeiros por BM (Prev