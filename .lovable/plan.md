

# Correção completa: Dados zerados em /gestao-bm

## Contexto confirmado

- `curva_s.col_index` = `bm_periodos.bm_number` (1:1 confirmado)
- `gitec_events.ippu` = `ppu_items.item_ppu` (match direto, 124 iPPUs distintos)
- GITEC min date = 2025-01-25, BM-01 (jun/25) terá GITEC antes do período = 0
- `vw_cronograma_bm_por_ippu` retorna 0 rows (fonte atual, quebrada)

## Alterações

### 1. BmKPIs.tsx

**Remover**: query a `vw_cronograma_bm_por_ippu` (linhas 24-43)
**Remover**: import dinâmico de `bmRange` (linhas 49-52)

**Adicionar**: duas queries novas:
- `curva_s` completa (23 rows, cacheada 5min) → extrair `previsto_mensal`, `realizado_mensal` onde `col_index = bmNumber`
- `bm_periodos` single row para o BM → usar `periodo_inicio`/`periodo_fim` para filtrar `gitec_events`

**Cards**:
- Previsto: `curva_s[bmNumber].previsto_mensal` (se 0, mostrar "—" não R$ 0)
- Realizado (Curva S): `curva_s[bmNumber].realizado_mensal`
- GITEC Medido: soma gitec_events aprovados no período (manter lógica atual, trocar `bmRange` por `bm_periodos`)
- Gap: Realizado - GITEC

**Tooltip extra**: Se BM é fechado e GITEC = 0, tooltip "Sem eventos GITEC no período deste BM"

### 2. BmPpuTable.tsx

**Remover**: query a `vw_cronograma_bm_por_ippu` (linhas 50-60)
**Remover**: query a `gitec_by_ippu` view (linhas 99-117) — acumulado total, inconsistente com período

**Adicionar**:
- Query `ppu_items` com `item_ppu, descricao, fase, disc, valor_total` (excluir agrupamentos)
- Query `gitec_events` filtrada por `periodo_inicio`/`periodo_fim` do BM (de `bm_periodos`)
- Agrupar GITEC por `ippu` no código: `gitec_bm` (no período) e `gitec_acum` (até periodo_fim)

**Colunas novas**:
| Coluna | Fonte |
|---|---|
| PPU | `ppu_items.item_ppu` |
| Descrição | `ppu_items.descricao` |
| Disc. | `ppu_items.disc` |
| Valor Contratual | `ppu_items.valor_total` |
| GITEC no BM | soma aprovados no período |
| GITEC Acumulado | soma aprovados até fim do BM |
| % Avanço | GITEC acum / valor_total × 100 |

**Remover colunas**: Previsto, Projetado, Executado (não disponíveis por iPPU sem cronograma detalhado)

**Semáforo**: baseado em GITEC no período (aprovado > 0 = verde, pendente = amarelo, sem eventos = cinza)

**Toggle**: "Mostrar apenas itens com medição neste BM" para filtrar os 1.060 itens

### 3. BmCharts.tsx — BarChartByPPU

**Remover**: query a `vw_cronograma_bm_por_ippu` (linhas 57-60)

**Adicionar**:
- Query `ppu_items` (item_ppu, descricao, valor_total)
- Query `gitec_events` filtrada por período do BM (de `bm_periodos`)
- Agrupar GITEC por iPPU
- Top 15 iPPUs por GITEC no BM
- Barras: Valor Contratual (azul) vs GITEC no BM (verde)
- Labels: `descricao` truncada em 25 chars (não código iPPU)
- Se nenhum iPPU tem GITEC: mensagem "Sem medição GITEC neste período"

**EvolutionChart**: sem alteração (já funciona com `curva_s`)

### 4. Shared pattern: período do BM

Todos os 3 componentes precisam do período. Cada um fará:
```ts
const { data: bmPeriodo } = useQuery({
  queryKey: ["bm-periodo", bmName],
  queryFn: () => supabase.from("bm_periodos")
    .select("periodo_inicio, periodo_fim")
    .eq("bm_name", bmName).single().then(r => r.data),
  staleTime: 300_000,
});
```

## Arquivos alterados

| Arquivo | Ação |
|---|---|
| `BmKPIs.tsx` | Reescrever queries: curva_s + bm_periodos + gitec_events |
| `BmPpuTable.tsx` | Reescrever queries: ppu_items + gitec_events filtrado por período |
| `BmCharts.tsx` | BarChartByPPU: ppu_items + gitec_events filtrado por período |

Nenhuma migration necessária. Nenhum schema alterado.

