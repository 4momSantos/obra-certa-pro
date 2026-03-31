

## Inverter Hierarquia: Etapas do Critério → TAGs/Componentes

### Problema
Atualmente o `AgrupamentoDetail` mostra TAGs (do SCON) como nível principal e etapas do critério de medição como sub-itens. O usuário quer o inverso: **Etapas do critério de medição primeiro**, e dentro de cada etapa, os componentes SCON que pertencem àquela etapa.

### Nova hierarquia

```text
Agrupamento expandido:
├─ Resumo: "3 etapas · 12 TAGs"
├─ Etapa 1: "Mobilização..." │ Peso: 100 │ ✅ 8/8 concluídos
│   └─ TAG: PPU-ACAB-B-12001A │ Civil │ 100% │ SC │ Aprov
│   └─ TAG: PPU-ACAB-B-12002A │ Civil │ 100% │ CC │ Aprov
├─ Etapa 2: "Demolição..."   │ Peso: 49  │ ◐ 5/8 concluídos
│   └─ TAG: PPU-ACAB-B-12003A │ Civil │ 80%  │ — │ Pend
│   └─ TAG: PPU-ACAB-B-12004A │ Civil │ 0%   │ — │ —
├─ Sem etapa vinculada (4 TAGs)
│   └─ TAG: ...
```

### Lógica de matching

Cada componente SCON tem `item_criterio` (ex: `"3.4.19.1"`). O último segmento (`"1"`) identifica a etapa. Cada etapa do `criterio_medicao` tem `identificador` (ex: `"3.4.19.1"`). O match é direto: `component.item_criterio === etapa.identificador`.

Componentes sem `item_criterio` ou sem match vão para um grupo "Sem etapa vinculada".

### Mudança no arquivo

**`src/components/gestao-bm/AgrupamentoDetail.tsx`** — reescrever:

1. Manter os hooks `useCronogramaComponents(ippu)` e `useCriterioMedicao()`
2. Agrupar componentes SCON por etapa do critério via `item_criterio`
3. Cada **Etapa** é um card `Collapsible` mostrando: nome, peso, dicionário, status (✅/◐/○ baseado nos componentes dessa etapa)
4. Dentro de cada etapa expandida: lista de TAGs com tag, disciplina, avanço%, SIGEM, GITEC
5. Componentes sem etapa vinculada: grupo separado no final
6. Resumo no topo: "N etapas · M TAGs · X concluídos · Y parciais · Z não iniciados"

Nenhum outro arquivo será alterado.

