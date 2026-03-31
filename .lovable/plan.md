

## Reestruturar Visão Consolidada: Responsividade + Hierarquia TAG → Critérios

### Problemas identificados
1. Tabela com 8 colunas fixas — em telas < 1050px fica cortada ou escondida
2. Dentro do agrupamento, mostra critérios primeiro e componentes em tabela plana — o usuário quer ver **TAGs com avanço GITEC** e dentro de cada TAG, as **etapas/critérios**

### Mudanças

#### 1. Responsividade da árvore (`BmConsolidatedTree.tsx`)
- Esconder colunas "Proj. BM", "Comps" e "Sem" em telas < `md` usando `hidden md:table-cell`
- Manter sempre visíveis: Nome, Valor, Prev BM, Real BM, SCON%
- Reduzir padding e font em mobile
- Remover `min-w-[280px]` do Nome, usar `min-w-0` com truncate

#### 2. Reestruturar `AgrupamentoDetail.tsx` — Nova hierarquia

Substituir a estrutura atual (Critérios separados + Tabela de componentes) por:

```text
Agrupamento expandido:
├─ Resumo: "45 TAGs · 30 concluídos · 10 parciais · 5 não iniciados"
├─ TAG: PPU-ACAB-B-12001A  │ Civil │ ████ 100% │ SC │ Aprov
│   └─ Etapa 1: "Mobilização..." Peso: 100  ✅ Concluída
│   └─ Etapa 2: "Demolição..."   Peso: 49   ◐ Parcial
├─ TAG: PPU-ACAB-B-12002A  │ Civil │ ████ 80%  │ CC │ Pend
│   └─ Etapa 1: ...
│   └─ Etapa 2: ...
└─ [Ver todos (45)]
```

Lógica:
- Buscar componentes SCON (`scon_components`) por `item_wbs = ippu`
- Buscar critérios (`criterio_medicao`) por `getEtapasByAgrupamento(ippu)`
- Cada TAG é um card expandível (Collapsible) mostrando: