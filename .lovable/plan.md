

# Plano: Previsão de Medição baseada na execução SCON

## Contexto do problema

Hoje a previsão de medição é manual — o usuário seleciona PPUs e informa valores. O pedido é inverter essa lógica: usar os **TAGs do SCON** como ponto de partida, cruzando com **critérios de medição** e **PPUs**, para mostrar automaticamente tudo que foi executado no período do BM (26→25) e identificar itens não medidos de períodos anteriores.

## Modelo de dados existente (chaves de cruzamento)

```text
scon_components.item_criterio  ←→  criterio_medicao.identificador
scon_components.item_wbs       ←→  ppu_items.item_ppu (via iPPU normalizado)
scon_programacao.item_wbs      ←→  ppu_items.item_ppu
scon_programacao.data_inicio/data_fim  → filtragem por range do BM (26→25)
criterio_medicao.item_ppu      ←→  ppu_items (nível hierárquico)
```

## Mudanças planejadas

### 1. Nova view SQL: `vw_scon_execucao_por_bm`

Agrega execução do `scon_programacao` por período BM, cruzando com `criterio_medicao`:

- Filtra `scon_programacao` onde `data_fim` cai dentro do range 26→25 de cada BM
- Agrupa por `item_wbs` (iPPU), retornando: total componentes executados, valor estimado, critério de medição vinculado
- Inclui campo calculado `bm_name` derivado das datas via lógica de período

Esta view será parametrizada para permitir filtro por **trigrama do setor** (campo `disciplina` ou prefixo do `item_criterio`) ou pelo **critério de medição** direto.

### 2. Nova view SQL: `vw_itens_nao_medidos`

Identifica itens executados no SCON que nunca foram incluídos em previsão/boletim:

- LEFT JOIN de `scon_programacao` (com avanço > 0) contra `previsao_medicao` e `boletim_itens`
- Retorna itens onde não existe registro de medição anterior
- Inclui o BM original de execução para rastrear "passivos"

### 3. Hook `useSconExecucaoBM(bmName)`

- Consulta `vw_scon_execucao_por_bm` filtrado pelo BM selecionado
- Retorna lista de itens executados com seus critérios de medição vinculados
- Permite agrupamento por critério de medição (coluna H do SCON = `item_criterio`)

### 4. Hook `useItensNaoMedidos(bmName)`

- Consulta `vw_itens_nao_medidos` para itens de BMs anteriores sem medição
- Alimenta uma seção "Passivos / Itens pendentes de períodos anteriores"

### 5. Refatorar `PrevisaoMedicao.tsx`

A página passará a ter **3 abas/seções**:

| Seção | Fonte | Descrição |
|---|---|---|
| **Execução SCON** | `vw_scon_execucao_por_bm` | TAGs executados no período, agrupados por critério de medição. Base para criar previsões. |
| **Previsão Atual** | `previsao_medicao` (existente) | Itens já adicionados à previsão, com status e ações. |
| **Passivos** | `vw_itens_nao_medidos` | Itens executados em BMs anteriores que não foram medidos. |

#### Filtros adicionais na aba "Execução SCON":
- **Por critério de medição**: dropdown com `criterio_medicao.nome` 
- **Por trigrama/setor**: filtro parametrizável por prefixo ou disciplina (configurável via settings)
- **Por iPPU**: busca textual

#### Fluxo de uso:
1. Usuário abre Previsão → vê automaticamente todos os TAGs executados no período
2. Seleciona itens da lista SCON → adiciona à previsão (botão "Incluir na Previsão")
3. Seção "Passivos" mostra itens de períodos anteriores não medidos → podem ser incluídos no BM atual

### 6. Componente `SconExecucaoTable`

Nova tabela mostrando:
- TAG (componente SCON)
- iPPU vinculado
- Critério de medição (nome da et