# Modulo: Dashboard

**Rota:** `/dashboard`  
**Arquivo principal:** `src/pages/Dashboard.tsx` (389 linhas)  
**Contexto dedicado:** `src/contexts/DashboardFilterContext.tsx` (161 linhas)  
**Componentes:** 15 arquivos em `src/components/dashboard/`

---

## 1. Visao Geral

O Dashboard e o modulo central do SPLAN, oferecendo uma experiencia interativa inspirada no Power BI com:
- **6 KPI Cards** dinamicos
- **6 widgets built-in** (Curva S, Barras, Donut, Gauge, Waterfall, Tabela)
- **Cross-filtering** — clicar em um grafico filtra todos os outros
- **Drag-and-drop layout** — arrastar e redimensionar widgets
- **Motor DAX** — formulas de calculo personalizadas
- **Criacao de visuais customizados** — graficos, tabelas, KPIs
- **Importacao de visuais HTML5** — elementos customizados em sandbox

---

## 2. Arquitetura do Dashboard

```
Dashboard.tsx
  DashboardFilterProvider        (contexto de filtros)
    DashboardContent
      Header                     (titulo + toolbar)
      Sidebar (condicional)      (FieldPicker | WidgetConfigurator | FormulaBar | HtmlImporter)
      DashboardSlicers           (filtros visuais)
      SeriesToggle               (visibilidade de series)
      KPICards                   (6 metricas)
      ResponsiveGridLayout       (react-grid-layout)
        CurvaSWidget             (grafico area)
        PeriodBarWidget          (grafico barras)
        DonutWidget              (grafico donut)
        GaugeWidget              (medidor)
        WaterfallWidget          (cascata)
        DataTableWidget          (tabela interativa)
        CustomWidgetRenderer[]   (widgets do usuario)
        HtmlWidgetRenderer[]     (widgets HTML5)
```

---

## 3. Sistema de Filtros (Cross-Filtering)

### DashboardFilterContext

**Estado dos filtros:**

```typescript
interface DashboardFilters {
  periodRange: [number, number];  // Range de indices [0, 19]
  status: "all" | "aberto" | "fechado";
  selectedPeriod: string | null;  // Ex: "BM-05"
  seriesVisibility: {
    baseline: boolean;
    previsto: boolean;
    projetado: boolean;
    realizado: boolean;
  };
}
```

**Acoes disponveis:**
| Acao | Descricao |
|------|-----------|
| `setPeriodRange([start, end])` | Define range de periodos |
| `setStatus(status)` | Filtra por fechado/aberto/todos |
| `setSelectedPeriod(label)` | Seleciona periodo (toggle) |
| `toggleSeries(key)` | Mostra/esconde serie nos graficos |
| `resetFilters()` | Volta tudo ao padrao |

**Dados derivados (recalculados automaticamente):**
| Dado | Descricao |
|------|-----------|
| `filteredPeriods` | Periodos apos filtro de range + status |
| `filteredCurvaS` | Curva S com acumulados recalculados |
| `filteredMetrics` | Metricas (totais, avancos, saldo, contagens) |

### Como o Cross-Filtering funciona

1. Usuario clica em uma barra no grafico de barras
2. `setSelectedPeriod("BM-05")` e chamado
3. Todos os widgets que usam `useDashboardFilters()` se atualizam:
   - Graficos: barras nao-selecionadas ficam com opacidade 30%
   - Graficos: `ReferenceLine` vertical aparece no periodo
   - Tabela: linha selecionada fica destacada, outras com opacidade 40%
   - KPI Cards: permanecem mostrando totais filtrados
4. Clicar novamente no mesmo periodo deseleciona

---

## 4. Widgets Built-in

### 4.1 KPICards (`KPICards.tsx`, 109 linhas)

Exibe 6 cards em grid responsivo (2 colunas mobile, 3 tablet, 6 desktop):

| Card | Valor | Icone | Gradiente |
|------|-------|-------|-----------|
| Valor Contratual | R$ 915M | DollarSign | gradient-accent |
| Avanco Financeiro | X.XX% + trend | TrendingUp | gradient-primary |
| Saldo | R$ XXM | Wallet | gradient-success |
| Ultimo Fechamento | BM-XX | CalendarCheck | gradient-danger |
| Periodos Fechados | N de M filtrados | Lock | gradient-primary |
| Periodos Abertos | N de M filtrados | Unlock | gradient-accent |

### 4.2 CurvaSWidget (`CurvaSWidget.tsx`, 73 linhas)

**Tipo:** AreaChart (Recharts)  
**Dados:** `filteredCurvaS` (valores acumulados)  
**Series condicionais** (baseadas em `seriesVisibility`):

| Serie | Campo | Cor | Estilo |
|-------|-------|-----|--------|
| Baseline | baselineAcum | chart-1 (azul) | Solido + gradiente fill |
| Previsto | previstoAcum | chart-2 (dourado) | Tracejado 6-3 |
| Projetado | projetadoAcum | chart-5 (roxo) | Tracejado 3-3 |
| Realizado | realizadoAcum | chart-3 (verde) | Solido + gradiente fill + dots |

**Interacoes:**
- Click no grafico → `setSelectedPeriod(activeLabel)`
- ReferenceLine no periodo selecionado

### 4.3 PeriodBarWidget (`PeriodBarWidget.tsx`, 75 linhas)

**Tipo:** BarChart (Recharts)  
**Dados:** `filteredCurvaS` (valores por periodo)  
**Barras:** baseline, previsto, realizado (condicionais)  
**Interacoes:** Click + opacidade condicional por periodo selecionado

### 4.4 DonutWidget (`DonutWidget.tsx`, 65 linhas)

**Tipo:** PieChart com innerRadius 55%  
**Segmentos:** Baseline, Previsto, Projetado, Realizado  
**Centro:** Valor total realizado (formatCompact)  
**Paleta:** chart-1, chart-2, chart-5, chart-3

### 4.5 GaugeWidget (`GaugeWidget.tsx`, 56 linhas)

**Tipo:** PieChart semicircular (210 a -30 graus)  
**Valor:** `avancoFinanceiro` (% do contrato)  
**Cores por faixa:**
- >= 80% → Verde (chart-3)
- >= 50% → Dourado (chart-2)
- < 50% → Vermelho (chart-4)

### 4.6 WaterfallWidget (`WaterfallWidget.tsx`, 64 linhas)

**Tipo:** BarChart com barras positivas/negativas  
**Calculo:** `delta = realizado - baseline` por periodo  
**Cores:** Verde (positivo), Vermelho (negativo)  
**ReferenceLine:** Y=0 e periodo selecionado

### 4.7 DataTableWidget (`DataTableWidget.tsx`, 102 linhas)

**Tipo:** Tabela HTML com sort e cross-filter  
**Colunas sortaveis:** Periodo, Baseline, Previsto, Projetado, Realizado, Adiantamento, Status  
**Interacoes:**
- Click no header → sort asc/desc com icones
- Click na linha → `setSelectedPeriod(label)`
- Linha selecionada → background primary/10
- Linhas nao selecionadas → opacidade 40%
- Badge de status: "Fechado" (default) ou "Aberto" (secondary)

---

## 5. Grid Layout (react-grid-layout)

### Configuracao

```typescript
breakpoints: { lg: 1200, md: 996, sm: 0 }
cols:        { lg: 12,   md: 12,  sm: 6 }
rowHeight:   40px
margin:      [16, 16]
```

### Layout Padrao (lg)

| Widget | x | y | w | h | minW | minH |
|--------|---|---|---|---|------|------|
| curvaS | 0 | 0 | 6 | 8 | 4 | 6 |
| periodBar | 6 | 0 | 6 | 8 | 4 | 6 |
| donut | 0 | 8 | 4 | 8 | 3 | 6 |
| gauge | 4 | 8 | 4 | 8 | 3 | 6 |
| waterfall | 8 | 8 | 4 | 8 | 4 | 6 |
| table | 0 | 16 | 12 | 9 | 6 | 6 |

### Controles de Layout

| Botao | Acao |
|-------|------|
| Editar Layout | Destrava drag-and-drop |
| Salvar | Persiste em localStorage |
| Reset | Volta ao layout padrao |

Quando desbloqueado:
- Widgets ganham borda tracejada
- Drag handle (icone GripHorizontal) no header de cada widget
- Resize handle no canto inferior direito

---

## 6. Motor de Formulas DAX

### Arquivo: `src/lib/dax-engine.ts` (479 linhas)

O motor DAX implementa um **tokenizer + parser recursivo descendente + evaluator**:

```
Expressao → tokenize() → Token[] → DAXEvaluator.evaluate() → DAXResult
```

### Sintaxe de Referencia

Colunas: `tabela[coluna]`
- `periods[realizado]` → soma de todos os valores realizado
- `contrato[valorContratual]` → valor do contrato
- `curvaS[baselineAcum]` → soma dos acumulados

### Funcoes Suportadas

| Funcao | Sintaxe | Exemplo | Resultado |
|--------|---------|---------|-----------|
| SUM | `SUM(tabela[col])` | `SUM(periods[realizado])` | Soma dos valores |
| AVERAGE | `AVERAGE(tabela[col])` | `AVERAGE(periods[baseline])` | Media |
| COUNT | `COUNT(tabela[col])` | `COUNT(periods[id])` | Contagem de linhas |
| MIN | `MIN(tabela[col])` | `MIN(periods[baseline])` | Valor minimo |
| MAX | `MAX(tabela[col])` | `MAX(periods[baseline])` | Valor maximo |
| DIVIDE | `DIVIDE(num, den, alt?)` | `DIVIDE(SUM(periods[realizado]), contrato[valorContratual])` | Divisao segura |
| IF | `IF(cond, true, false)` | `IF(periods[realizado] > 100000000, "Alto", "Baixo")` | Condicional |
| ABS | `ABS(valor)` | `ABS(periods[realizado] - periods[baseline])` | Valor absoluto |
| ROUND | `ROUND(valor, dec)` | `ROUND(DIVIDE(...), 4)` | Arredondamento |
| FORMAT | `FORMAT(valor, tipo)` | `FORMAT(0.45, "percent")` | "45.00%" |
| DISTINCTCOUNT | `DISTINCTCOUNT(tabela[col])` | `DISTINCTCOUNT(periods[fechado])` | Valores unicos |
| CONCATENATE | `CONCATENATE(a, b)` | `CONCATENATE("Total: ", ...)` | Concatenacao |

### Tipos de formato (FORMAT)

| Tipo | Exemplo | Resultado |
|------|---------|-----------|
| `"percent"` ou `"%"` | `FORMAT(0.45, "percent")` | `45.00%` |
| `"currency"` ou `"R$"` | `FORMAT(1000000, "currency")` | `R$ 1.000.000` |
| `"compact"` | `FORMAT(1000000, "compact")` | `R$ 1.0M` |

### Operadores

| Tipo | Operadores |
|------|-----------|
| Aritmeticos | `+` `-` `*` `/` |
| Comparacao | `=` `<>` `<` `>` `<=` `>=` |
| Logicos | `&&` `||` `NOT` |
| Agrupamento | `(` `)` |

### Contexto de Dados

O `buildDataContext()` cria o contexto passando:

```typescript
{
  periods: PeriodData[],          // 20 periodos
  curvaS: CurvaSPoint[],          // 20 pontos acumulados
  contrato: [{ valorContratual, projectName, lastUpdate }]
}
```

---

## 7. Criacao de Visuais Customizados

### WidgetConfigurator (`WidgetConfigurator.tsx`, 200+ linhas)

**Tipos de grafico disponiveis:**

| Tipo | Icone | Descricao |
|------|-------|-----------|
| bar | BarChart3 | Grafico de barras |
| line | LineChart | Grafico de linhas |
| area | AreaChart | Grafico de area |
| pie | PieChart | Grafico pizza |
| donut | PieChart | Grafico donut |
| gauge | Gauge | Medidor |
| table | Table2 | Tabela de dados |
| kpi | Settings2 | Card KPI |

**Campos do configurador:**

1. **Tipo de Visualizacao** — Grid de 8 opcoes
2. **Titulo** — Input de texto
3. **Fonte de Dados** — Select: Periodos / Curva S / Contrato
4. **Eixo X** — Drop zone para campo de categoria (drag-and-drop)
5. **Valores (Eixo Y)** — Drop zone multi-campo
6. **Medidas DAX** — Lista de expressoes com input + botao adicionar

### CustomWidgetRenderer (`CustomWidgetRenderer.tsx`, 260 linhas)

Renderiza widgets baseado no `WidgetConfig`:

```typescript
interface WidgetConfig {
  id: string;          // "custom-1234567890"
  type: ChartType;     // "bar" | "line" | etc.
  title: string;       // Titulo do widget
  xAxis?: ColumnDef;   // Campo do eixo X
  yAxis: ColumnDef[];  // Campos do eixo Y
  measures: string[];  // Expressoes DAX
  table?: string;      // "periods" | "curvaS" | "contrato"
}
```

Para tipo `kpi`: avalia medidas DAX e mostra resultado formatado.
Para tipos de grafico: renderiza Recharts com campo mapping automatico.
Para tipo `table`: renderiza tabela HTML com colunas mapeadas.

---

## 8. Visuais HTML5

### HtmlVisualImporter (`HtmlVisualImporter.tsx`, 212 linhas)

**Templates incluidos:**

| Template | Descricao |
|----------|-----------|
| Progress Ring | SVG circular com percentual |
| Status Indicator | Grid de status (no prazo/atencao/critico) |
| Mini Sparkline | SVG sparkline com gradiente |

**Editor:**
- Textarea HTML (tema escuro, font mono)
- Textarea CSS (tema escuro, font mono)
- Preview ao vivo em iframe sandbox
- Titulo customizavel

**Seguranca:**
- Visuais renderizados em `<iframe sandbox="allow-scripts">`
- CSS isolado dentro do iframe
- Aviso de seguranca exibido ao usuario

### HtmlWidgetRenderer

Renderiza o HTML/CSS importado dentro de iframe sandboxed:

```html
<iframe srcDoc="<html>...<style>CSS</style>...<body>HTML</body></html>"
        sandbox="allow-scripts"
        className="w-full h-[250px]" />
```

---

## 9. Slicers (DashboardSlicers.tsx)

Barra de filtros visuais com:

| Controle | Tipo | Descricao |
|----------|------|-----------|
| Range de Periodos | Slider duplo | Seleciona BM-XX a BM-XX |
| Status | Select dropdown | Todos / Fechados / Abertos |
| Periodo Selecionado | Badge | Mostra cross-filter ativo |
| Limpar | Botao ghost | Reset de todos os filtros |

### SeriesToggle (`SeriesToggle.tsx`)

Botoes toggle para mostrar/esconder series nos graficos:
- Baseline (azul)
- Previsto (dourado)
- Projetado (roxo)
- Realizado (verde)

Cada botao mostra icone Eye/EyeOff e indicador de cor.

---

## 10. Modelo de Dados

### Arquivo: `src/lib/data-model.ts` (77 linhas)

Registry de tabelas/colunas para o FieldPicker e WidgetConfigurator:

**Tabela: periods (8 colunas)**
| Coluna | Display | Tipo |
|--------|---------|------|
| id | ID | text |
| label | Periodo | text |
| baseline | Baseline (R$) | number |
| previsto | Previsto (R$) | number |
| projetado | Projetado (R$) | number |
| realizado | Realizado (R$) | number |
| adiantamento | Adiantamento (R$) | number |
| fechado | Fechado | boolean |

**Tabela: curvaS (9 colunas)**
| Coluna | Display | Tipo |
|--------|---------|------|
| period | Periodo | text |
| baseline | Baseline | number |
| previsto | Previsto | number |
| projetado | Projetado | number |
| realizado | Realizado | number |
| baselineAcum | Baseline Acum. | number |
| previstoAcum | Previsto Acum. | number |
| projetadoAcum | Projetado Acum. | number |
| realizadoAcum | Realizado Acum. | number |

**Tabela: contrato (3 colunas)**
| Coluna | Display | Tipo |
|--------|---------|------|
| valorContratual | Valor Contratual | number |
| projectName | Nome do Projeto | text |
| lastUpdate | Ultima Atualizacao | date |

---

## 11. Persistencia

| Dado | Chave localStorage | Auto-save |
|------|--------------------|-----------|
| Layouts do grid | `dashboard-layouts` | No botao "Salvar" |
| Widgets customizados | `dashboard-custom-widgets` | No botao "Salvar" |
| Widgets HTML | `dashboard-html-widgets` | No botao "Salvar" |

O botao "Reset" remove todas as 3 chaves e volta ao layout padrao.

---

## 12. FieldPicker (Seletor de Campos)

### Arquivo: `src/components/dashboard/FieldPicker.tsx` (99 linhas)

**Funcionalidades:**
- Busca por nome de campo (filtro texto)
- Tabelas expansiveis/colapsaveis
- Icones por tipo de dado (Hash=number, Type=text, ToggleLeft=boolean, Calendar=date)
- Drag-and-drop nativo (HTML5 Drag API)
- `dataTransfer.setData("application/field", JSON.stringify(column))`
- Grip handle visivel no hover

**Fluxo de drag-and-drop:**
1. Usuario arrasta campo do FieldPicker
2. Widget Configurator tem drop zones (eixo X, eixo Y)
3. `onDrop` le `dataTransfer.getData("application/field")`
4. Campo e adicionado a configuracao do widget
