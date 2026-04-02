# Modulo Cronograma Financeiro

---

## 1. Visao Geral

O modulo Cronograma e o nucleo financeiro do SPLAN. Ele gerencia 20 periodos de medicao (BM-01 a BM-20) com valores de baseline, previsto, projetado, realizado e adiantamento para cada periodo. Os dados alimentam diretamente o Dashboard (Curva S, KPIs, graficos) e sao persistidos em localStorage.

**Rota:** `/cronograma`  
**Arquivo principal:** `src/pages/Cronograma.tsx` (210 linhas)  
**Contexto:** `src/contexts/CronogramaContext.tsx` (108 linhas)  
**Tipos:** `src/types/cronograma.ts` (42 linhas)  
**Dados iniciais:** `src/data/initial-data.ts` (37 linhas)  
**Formatacao:** `src/lib/format.ts` (29 linhas)

---

## 2. Arquitetura de Estado

### 2.1 CronogramaState

```typescript
interface CronogramaState {
  periods: PeriodData[];      // 20 periodos BM-01 a BM-20
  valorContratual: number;    // R$ 915.000.000
  projectName: string;        // "CONSAG / RNEST UDA U-12"
  lastUpdate: string;         // ISO timestamp da ultima modificacao
}
```

### 2.2 PeriodData

Cada periodo de medicao contem:

```typescript
interface PeriodData {
  id: string;            // "bm-01" a "bm-20"
  label: string;         // "BM-01" a "BM-20"
  baseline: number;      // Valor planejado original (R$)
  previsto: number;      // Valor previsto atual (R$)
  projetado: number;     // Valor projetado (R$)
  realizado: number;     // Valor efetivamente executado (R$)
  adiantamento: number;  // Valor de adiantamento (R$)
  fechado: boolean;      // Periodo fechado/travado para edicao
}
```

### 2.3 Metricas Derivadas (DashboardMetrics)

```typescript
interface DashboardMetrics {
  valorContratual: number;      // R$ 915.000.000
  totalBaseline: number;        // Soma de todos baseline
  totalPrevisto: number;        // Soma de todos previsto
  totalProjetado: number;       // Soma de todos projetado
  totalRealizado: number;       // Soma de todos realizado
  totalAdiantamento: number;    // Soma de todos adiantamento
  avancoFisico: number;         // totalRealizado / totalBaseline (0-1)
  avancoFinanceiro: number;     // totalRealizado / valorContratual (0-1)
  saldo: number;                // valorContratual - totalRealizado
}
```

### 2.4 Curva S (CurvaSPoint)

Cada ponto da Curva S contem valores individuais e acumulados:

```typescript
interface CurvaSPoint {
  period: string;          // "BM-01"
  baseline: number;        // Valor individual
  previsto: number;
  projetado: number;
  realizado: number;
  baselineAcum: number;    // Valor acumulado ate esse periodo
  previstoAcum: number;
  projetadoAcum: number;
  realizadoAcum: number;
}
```

---

## 3. CronogramaContext (Provider)

**Arquivo:** `src/contexts/CronogramaContext.tsx`

### 3.1 Inicializacao

O estado e carregado na seguinte ordem de prioridade:
1. Dados salvos em `localStorage` (chave: `cronograma-state`)
2. Dados iniciais de `initialCronogramaState` (fallback)

```typescript
const [state, setState] = useState<CronogramaState>(() => {
  const saved = localStorage.getItem("cronograma-state");
  return saved ? JSON.parse(saved) : initialCronogramaState;
});
```

### 3.2 Acoes Disponiveis

| Acao | Assinatura | Descricao |
|------|-----------|-----------|
| `updatePeriod` | `(id, field, value) => void` | Atualiza um campo numerico de um periodo especifico |
| `toggleFechamento` | `(id) => void` | Alterna estado fechado/aberto de um periodo |
| `getMetrics` | `() => DashboardMetrics` | Calcula metricas derivadas a partir de todos os periodos |
| `getCurvaS` | `() => CurvaSPoint[]` | Gera array de pontos da Curva S com acumulados |

### 3.3 Persistencia Automatica

Toda alteracao (updatePeriod, toggleFechamento) grava imediatamente no localStorage:

```typescript
const updatePeriod = useCallback((id, field, value) => {
  setState(prev => {
    const updated = {
      ...prev,
      lastUpdate: new Date().toISOString(),
      periods: prev.periods.map(p =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    };
    localStorage.setItem("cronograma-state", JSON.stringify(updated));
    return updated;
  });
}, []);
```

### 3.4 Calculo de Metricas

O `getMetrics()` e memoizado via `useCallback` e recalcula sempre que `state` muda:
- Soma todos os campos numericos via `reduce`
- Calcula avancos como razao (realizado/baseline ou realizado/valorContratual)
- Calcula saldo como diferenca (valorContratual - totalRealizado)

### 3.5 Calculo da Curva S

O `getCurvaS()` percorre os periodos sequencialmente, acumulando valores:

```typescript
let baselineAcum = 0, previstoAcum = 0, projetadoAcum = 0, realizadoAcum = 0;
return state.periods.map(p => {
  baselineAcum += p.baseline;
  previstoAcum += p.previsto;
  // ...
  return { period: p.label, baseline: p.baseline, baselineAcum, ... };
});
```

---

## 4. Dados Iniciais

**Arquivo:** `src/data/initial-data.ts`

### 4.1 Geracao dos Periodos

Os 20 periodos sao gerados com:

- **Baseline:** Valores fixos em curva de sino (12M → 75M → 15M):
  ```
  [12M, 18M, 28M, 42M, 55M, 68M, 72M, 75M, 70M, 65M,
   58M, 52M, 48M, 44M, 40M, 35M, 30M, 25M, 20M, 15M]
  ```
- **Previsto/Projetado:** Variacao aleatoria de 85% a 115% do baseline
- **Realizado:** Variacao aleatoria para periodos fechados (1-8), zero para abertos
- **Adiantamento:** 5% do baseline com 40% de chance, apenas para periodos fechados
- **Fechamento:** Primeiros 8 periodos (BM-01 a BM-08) marcados como fechados

### 4.2 Estado Inicial

```typescript
{
  periods: generateInitialPeriods(),  // 20 periodos
  valorContratual: 915000000,         // R$ 915M
  projectName: "CONSAG / RNEST UDA U-12",
  lastUpdate: new Date().toISOString(),
}
```

---

## 5. Pagina Cronograma (UI)

**Arquivo:** `src/pages/Cronograma.tsx`

### 5.1 Estrutura Visual

```
┌────────────────────────────────────────────────────────┐
│  Cronograma Financeiro              [Salvar]           │
│  Periodos BM-01 a BM-20                               │
├────────────────────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐    │
│  │Baseli│ │Previ │ │Proje │ │Reali │ │Adiantame │    │
│  │ ne   │ │ sto  │ │ tado │ │ zado │ │   nto    │    │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────────┘    │
├────────────────────────────────────────────────────────┤
│  Periodo │Status │Baseline│Previsto│Projet. │Realiz. │
│  BM-01   │Fechado│R$ 12M  │R$ 11M  │R$ 13M  │R$ 10M  │
│  BM-02   │Fechado│R$ 18M  │R$ 17M  │R$ 19M  │R$ 16M  │
│  ...     │       │        │        │        │        │
│  BM-09   │Aberto │R$ 70M  │R$ 65M  │R$ 68M  │ click  │
│  ...     │       │        │        │        │        │
│  BM-20   │Aberto │R$ 15M  │R$ 14M  │R$ 16M  │ click  │
└────────────────────────────────────────────────────────┘
```

### 5.2 Cards de Resumo

Cinco cards no topo exibem os totais de cada campo:

| Card | Campo | Cor |
|------|-------|-----|
| Baseline | `metrics.totalBaseline` | `text-chart-1` (Azul) |
| Previsto | `metrics.totalPrevisto` | `text-chart-2` (Dourado) |
| Projetado | `metrics.totalProjetado` | `text-chart-5` (Roxo) |
| Realizado | `metrics.totalRealizado` | `text-chart-3` (Verde) |
| Adiantamento | `metrics.totalAdiantamento` | `text-chart-4` (Vermelho) |

### 5.3 Tabela Principal

A tabela exibe todos os 20 periodos com as colunas:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| Periodo | Texto | Label do periodo (BM-01 a BM-20) |
| Status | Badge | "Fechado" (secondary) ou "Aberto" (default) |
| Baseline | EditableCell | Valor editavel (se aberto) |
| Previsto | EditableCell | Valor editavel (se aberto) |
| Projetado | EditableCell | Valor editavel (se aberto) |
| Realizado | EditableCell | Valor editavel (se aberto) |
| Adiantamento | EditableCell | Valor editavel (se aberto) |
| % Avanco | Calculado | `realizado / baseline` formatado como % |
| Acao | Botao | Lock/Unlock para fechar/abrir periodo |

### 5.4 Componente EditableCell

O componente `EditableCell` implementa edicao inline:

**Estados:**
1. **Desabilitado** (periodo fechado): Exibe valor formatado em cinza (`text-muted-foreground`)
2. **Visualizacao** (periodo aberto): Exibe valor clicavel com hover azul
3. **Edicao** (clicado): Input numerico com foco automatico

**Comportamento:**
- Click no valor → Entra em modo edicao
- `Enter` ou `onBlur` → Confirma alteracao
- `Escape` → Cancela edicao
- Valor invalido (NaN) → Ignorado

**Formatacao:** Todos os valores monetarios usam `formatCurrencyFull()` (R$ com 2 casas decimais).

### 5.5 Coluna % Avanco

O percentual de avanco por periodo e calculado inline:

```typescript
const pct = period.baseline > 0 ? period.realizado / period.baseline : 0;
```

Cores condicionais:
- `>= 100%` → Verde (`text-chart-3`)
- `> 0%` → Dourado (`text-chart-2`)
- `= 0%` → Cinza (`text-muted-foreground`)

### 5.6 Fechamento de Periodos

- Periodos **fechados**: Background `bg-muted/30`, celulas nao editaveis, icone Lock
- Periodos **abertos**: Background normal, celulas editaveis, icone Unlock verde
- Toggle via botao na ultima coluna

---

## 6. Funcoes de Formatacao

**Arquivo:** `src/lib/format.ts`

| Funcao | Entrada | Saida | Exemplo |
|--------|---------|-------|---------|
| `formatCurrency(value)` | `915000000` | `"R$ 915.000.000"` | Sem decimais |
| `formatCurrencyFull(value)` | `12000000` | `"R$ 12.000.000,00"` | Com 2 decimais |
| `formatPercent(value)` | `0.8523` | `"85.23%"` | Multiplicado por 100 |
| `formatCompact(value)` | `915000000` | `"R$ 915,0M"` | Compacto (B/M/K) |

---

## 7. Fluxo de Dados

```
initial-data.ts
      │
      ▼
localStorage ("cronograma-state")
      │
      ▼
CronogramaProvider (estado reativo)
      │
      ├──► Cronograma.tsx (tabela editavel)
      │        │
      │        └──► updatePeriod() / toggleFechamento()
      │                    │
      │                    └──► setState + localStorage.setItem
      │
      ├──► Dashboard.tsx (via useCronograma)
      │        │
      │        ├──► getMetrics() → KPICards
      │        └──► getCurvaS() → CurvaSWidget, PeriodBarWidget, etc.
      │
      └──► DashboardFilterContext (filtra e recalcula)
               │
               ├──► filteredPeriods
               ├──► filteredCurvaS
               └──► filteredMetrics
```

---

## 8. Animacoes

A pagina usa Framer Motion para entrada suave:

```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
>
```

---

## 9. Dependencias do Modulo

| Pacote | Uso |
|--------|-----|
| `framer-motion` | Animacao de entrada da pagina |
| `lucide-react` | Icones (Lock, Unlock, Save) |
| `sonner` | Toast de confirmacao ao salvar |
| Shadcn/UI | Card, Button, Badge, Table |
