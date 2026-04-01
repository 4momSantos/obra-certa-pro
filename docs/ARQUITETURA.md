# Arquitetura do SPLAN

---

## 1. Hierarquia de Providers

A aplicacao usa React Context API para gerenciamento de estado global. Os providers sao aninhados no `App.tsx`:

```
QueryClientProvider          (TanStack React Query)
  TooltipProvider            (Radix UI)
    AuthProvider             (Supabase auth + perfil + role)
      CronogramaProvider     (Estado do cronograma financeiro)
        ETFProvider          (Estado do wizard ETF)
          Toaster + Sonner   (Notificacoes)
          BrowserRouter      (React Router)
            AppRoutes        (Roteamento principal)
```

### Contextos Disponiveis

| Contexto | Hook | Arquivo | Responsabilidade |
|----------|------|---------|-----------------|
| AuthContext | `useAuth()` | `contexts/AuthContext.tsx` | Autenticacao, perfil, role, modo offline |
| CronogramaContext | `useCronograma()` | `contexts/CronogramaContext.tsx` | Periodos, metricas, Curva S |
| ETFContext | `useETF()` | `contexts/ETFContext.tsx` | Wizard ETF (steps, files, results) |
| DashboardFilterContext | `useDashboardFilters()` | `contexts/DashboardFilterContext.tsx` | Cross-filtering do dashboard |

> Nota: `DashboardFilterContext` e instanciado dentro do `Dashboard.tsx`, nao no provider global.

---

## 2. Roteamento

O roteamento e definido em `App.tsx` via React Router v6:

```
/                    LandingPage         (sem layout, sem auth)
/auth                Auth                (sem layout, sem auth)
/dashboard           Dashboard           (protegido, com layout)
/cronograma          Cronograma          (protegido, com layout)
/etf                 ETF                 (protegido, com layout)
/medicao             Medicao             (protegido, com layout)
/tubulacao           Tubulacao           (protegido, com layout)
/ajuste              Ajuste              (protegido, com layout)
/config              Config              (protegido, com layout)
/admin               AdminUsers          (protegido, role: admin)
*                    NotFound            (protegido, com layout)
```

### Logica de Roteamento

```typescript
const AppRoutes = () => {
  const location = useLocation();
  
  if (location.pathname === "/")    return <LandingPage />;
  if (location.pathname === "/auth") return <Auth />;
  
  return (
    <ProtectedRoute>
      <Layout>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          // ... demais rotas
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminUsers />
            </ProtectedRoute>
          } />
        </Routes>
      </Layout>
    </ProtectedRoute>
  );
};
```

---

## 3. Gerenciamento de Estado

### 3.1 CronogramaContext

**Estado persistido em localStorage** (`cronograma-state`):

```typescript
interface CronogramaState {
  periods: PeriodData[];        // 20 periodos BM-01 a BM-20
  valorContratual: number;      // R$ 915.000.000
  projectName: string;          // "CONSAG / RNEST UDA U-12"
  lastUpdate: string;           // ISO timestamp
}

interface PeriodData {
  id: string;                   // "bm-01"
  label: string;                // "BM-01"
  baseline: number;             // Valor planejado original
  previsto: number;             // Valor previsto atual
  projetado: number;            // Valor projetado
  realizado: number;            // Valor efetivamente executado
  adiantamento: number;         // Valor de adiantamento
  fechado: boolean;             // Periodo fechado/travado
}
```

**Acoes:**
- `updatePeriod(id, field, value)` — Atualiza campo de um periodo
- `toggleFechamento(id)` — Trava/destrava periodo
- `getMetrics()` — Calcula metricas derivadas (totais, avancos, saldo)
- `getCurvaS()` — Gera dados acumulados para Curva S

### 3.2 DashboardFilterContext

**Estado (nao persistido):**

```typescript
interface DashboardFilters {
  periodRange: [number, number];    // Indices [inicio, fim]
  status: "all" | "aberto" | "fechado";
  selectedPeriod: string | null;    // Cross-filter: periodo clicado
  seriesVisibility: {
    baseline: boolean;
    previsto: boolean;
    projetado: boolean;
    realizado: boolean;
  };
}
```

**Dados derivados (useMemo):**
- `filteredPeriods` — Periodos apos aplicar range + status
- `filteredCurvaS` — Curva S recalculada com acumulados corretos
- `filteredMetrics` — Metricas recalculadas para periodos filtrados

### 3.3 ETFContext

**Estado (em memoria, nao persistido):**

```typescript
{
  step: WizardStep;               // 1-6
  files: WizardFiles;             // Refs aos arquivos Excel
  workbooks: WizardWorkbooks;     // Workbooks parseados
  config: WizardConfig;           // Configuracao do processamento
  equipamentos: EquipamentoInfo[];
  equipGrid: EquipGridRow[];
  feriados: Set<string>;
  logs: LogEntry[];
  progress: number;               // 0-100
  isProcessing: boolean;
  results: ProcessingResults | null;
}
```

### 3.4 AuthContext

**Estado:**

```typescript
{
  user: User | null;              // Supabase User
  session: Session | null;        // Supabase Session
  profile: Profile | null;        // {id, full_name, avatar_url}
  role: AppRole | null;           // "admin" | "gestor" | "tecnico"
  loading: boolean;               // Carregando estado inicial
  connectionError: boolean;       // Supabase inacessivel
}
```

---

## 4. Persistencia de Dados

| Dado | Storage | Chave |
|------|---------|-------|
| Estado do cronograma | localStorage | `cronograma-state` |
| Layout do dashboard | localStorage | `dashboard-layouts` |
| Widgets customizados | localStorage | `dashboard-custom-widgets` |
| Widgets HTML | localStorage | `dashboard-html-widgets` |
| Sessao de auth | localStorage | Gerenciado pelo Supabase |

---

## 5. Sistema de Temas

O tema e baseado em variaveis CSS HSL definidas em `index.css`:

```css
:root {
  --background: 220 20% 97%;
  --foreground: 222 47% 11%;
  --primary: 224 76% 30%;        /* Azul escuro */
  --accent: 40 55% 55%;          /* Dourado */
  --chart-1: 224 76% 30%;        /* Azul */
  --chart-2: 40 55% 55%;         /* Dourado */
  --chart-3: 160 60% 40%;        /* Verde */
  --chart-4: 0 84% 60%;          /* Vermelho */
  --chart-5: 280 60% 50%;        /* Roxo */
}
```

**Classes utilitarias customizadas:**
- `.glass-card` — Card com glassmorphism (blur + transparencia)
- `.gradient-primary` — Gradiente azul
- `.gradient-accent` — Gradiente dourado
- `.gradient-success` — Gradiente verde
- `.gradient-danger` — Gradiente vermelho
- `.text-gradient-gold` — Texto com gradiente dourado

O modo escuro (`.dark`) e ativado via classe CSS no `<html>` (definido em `main.tsx`).

---

## 6. Fluxo de Autenticacao

```
1. App inicia
2. AuthProvider tenta conectar ao Supabase
3. Se responder em <5s:
   a. Usuario logado → profile + role carregados
   b. Usuario nao logado → loading=false, user=null
4. Se NAO responder em 5s:
   a. connectionError=true → modo offline
   b. ProtectedRoute permite acesso direto
5. Pagina Auth redireciona para /dashboard em modo offline
```

### Roles e Permissoes

| Role | Acesso |
|------|--------|
| `admin` | Todas as rotas + `/admin` |
| `gestor` | Todas as rotas exceto `/admin` |
| `tecnico` | Todas as rotas exceto `/admin` |

---

## 7. Build e Deploy

**Vite Config** (`vite.config.ts`):
- Plugin React SWC (compilacao rapida)
- Path alias `@/` → `./src/`
- HMR overlay desabilitado
- Servidor dev na porta 8080

**Output:** `dist/` com assets estaticos (HTML + JS + CSS)

**Bundle size (producao):**
- CSS: ~76KB (gzip: ~13KB)
- JS: ~2.7MB (gzip: ~792KB)

---

## 8. Banco de Dados (Supabase)

### Tabelas

**profiles:**
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK, ref auth.users |
| full_name | text | Nome completo |
| avatar_url | text | URL do avatar |
| created_at | timestamptz | Data criacao |
| updated_at | timestamptz | Ultima atualizacao |

**user_roles:**
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK → auth.users |
| role | app_role | "admin"/"gestor"/"tecnico" |

### Funcoes RPC

- `get_user_role(_user_id uuid)` → `app_role` — Retorna role do usuario
- `has_role(_user_id uuid, _role app_role)` → `boolean` — Verifica se usuario tem role

### Edge Function

- `create-user` — Cria usuario via Supabase Admin API (usado pelo admin)

---

## 9. Dependencias Externas Chave

| Pacote | Uso | Onde |
|--------|-----|------|
| `recharts` | Graficos (Area, Bar, Line, Pie) | Dashboard widgets |
| `react-grid-layout` | Grid drag-and-drop | Dashboard layout |
| `framer-motion` | Animacoes e parallax | Landing page, transicoes |
| `xlsx` | Leitura de Excel (.xlsx) | ETF import |
| `exceljs` | Geracao de Excel (.xlsx) | ETF export |
| `@supabase/supabase-js` | Auth + DB | AuthContext, AdminUsers |
| `zod` | Validacao de schemas | Formularios |
| `date-fns` | Manipulacao de datas | ETF processing |
| `sonner` | Notificacoes toast | Feedback ao usuario |
