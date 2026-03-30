

# Plano: Detail Sheet com Tags, Rel. Eventos e Critérios de Medição

## Objetivo

Ao clicar em uma linha da tabela PPU na Gestão BM, o painel lateral (BmPpuDetailSheet) deve mostrar uma visão hierárquica:

```text
TAG-001
├── Rel. Evento #1 (etapa: "Soldagem", status: "Aprovado", valor: R$ 50k)
│   └── Critério: "Solda de Topo" — peso 2.5% ✅ cumprido
├── Rel. Evento #2 (etapa: "Pintura", status: "Pend. Verificação")
│   └── Critério: "Pintura Final" — peso 1.8% ⏳ pendente
TAG-002
└── Rel. Evento #3 ...
```

## Dados disponíveis

- **`rel_eventos`** (`item_ppu`, `tag`, `etapa`, `status`, `valor`, `data_execucao`, `fiscal_responsavel`) — eventos GITEC por PPU com TAG
- **`criterio_medicao`** (`item_ppu`, `nome`, `nivel_estrutura`, `peso_fisico_fin`, `dicionario_etapa`) — critérios de medição por PPU
- A ligação entre rel_evento e critério se faz pelo campo `etapa` do rel_evento cruzando com `nome` do critério (ambos no mesmo `item_ppu`)

## Implementação

### 1. Expandir `BmPpuDetailSheet.tsx` — Adicionar seção "Tags & Critérios"

Após a seção de "Eventos GITEC" existente, adicionar uma nova seção que:

1. **Busca `rel_eventos`** filtrado por `item_ppu` (todos os BMs, não só o atual)
2. **Busca `criterio_medicao`** filtrado por `item_ppu`
3. **Agrupa rel_eventos por TAG** usando `useMemo`
4. **Cruza etapas**: para cada evento, localiza o critério correspondente pelo campo `etapa` ↔ `nome`
5. **Renderiza como Accordion/Collapsible**: cada TAG é um item expansível, dentro dele a lista de eventos com badge de status, e para cada evento o critério vinculado com peso e indicador visual (check verde se "Concluída"/"Aprovado", relógio amber se pendente)

### 2. Queries adicionais no Sheet

Usar o hook `usePPUDetail` já existente (que busca `rel_eventos` e `criterio_medicao` por `item_ppu`) em vez de duplicar queries. Importar e chamar:

```typescript
const { rel, criterio, isLoading: detailLoading } = usePPUDetail(itemPpu, null);
```

### 3. Lógica de agrupamento e cruzamento

```typescript
const tagGroups = useMemo(() => {
  const byTag = new Map<string, typeof rel>();
  rel.forEach(ev => {
    const tag = ev.tag || "Sem TAG";
    if (!byTag.has(tag)) byTag.set(tag, []);
    byTag.get(tag)!.push(ev);
  });
  
  const criterioMap = new Map<string, any>();
  criterio.forEach(c => criterioMap.set(c.nome?.toLowerCase(), c));
  
  return { byTag, criterioMap };
}, [rel, criterio]);
```

### 4. UI — Accordion por TAG

Cada TAG expande para mostrar seus eventos. Cada evento mostra:
- Status badge (colorido por statusColor existente)
- Etapa, valor, data, fiscal
- Critério vinculado (se encontrado): nome, peso, dicionário da etapa
- Indicador visual: ✅ se etapa concluída, ⏳ se pendente

### Arquivos modificados
- `src/components/gestao-bm/BmPpuDetailSheet.tsx` — adicionar seção com accordion de Tags > Eventos > Critérios, usando `usePPUDetail`

