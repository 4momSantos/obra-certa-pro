# SPLAN - Sistema de Planejamento

Sistema de gestao financeira, cronograma e efetivo tecnico para obras industriais de grande porte.

**Projeto:** CONSAG / RNEST UDA U-12  
**Valor Contratual:** R$ 915.000.000  
**Versao:** 2.0

---

## Visao Geral

O SPLAN e uma aplicacao web completa para gestao de contratos de construcao industrial. Ele oferece controle financeiro via Curva S, gestao de cronograma por periodos de medicao, controle de efetivo tecnico semanal (ETF), e um dashboard interativo com funcionalidades inspiradas no Power BI.

---

## Modulos

| Modulo | Rota | Status | Descricao |
|--------|------|--------|-----------|
| [Landing Page](docs/MODULO-LANDING-PAGE.md) | `/` | Completo | Pagina de entrada com animacoes parallax |
| [Autenticacao](docs/MODULO-AUTH.md) | `/auth` | Completo | Login, cadastro, controle de acesso |
| [Dashboard](docs/MODULO-DASHBOARD.md) | `/dashboard` | Completo | Dashboard interativo estilo Power BI |
| [Cronograma](docs/MODULO-CRONOGRAMA.md) | `/cronograma` | Completo | Gestao de periodos financeiros |
| [ETF Semanal](docs/MODULO-ETF.md) | `/etf` | Completo | Wizard de processamento de efetivo tecnico |
| Medicao | `/medicao` | Em desenvolvimento | Acompanhamento de medicoes contratuais |
| Tubulacao | `/tubulacao` | Em desenvolvimento | Rastreamento de soldagem/montagem |
| Ajuste Automatico | `/ajuste` | Em desenvolvimento | Redistribuicao automatica de valores |
| Configuracoes | `/config` | Em desenvolvimento | Configuracoes do sistema |
| [Admin Usuarios](docs/MODULO-AUTH.md#admin-de-usuarios) | `/admin` | Completo | Gestao de usuarios (admin only) |

---

## Documentacao Tecnica

| Documento | Descricao |
|-----------|-----------|
| [Arquitetura](docs/ARQUITETURA.md) | Stack, providers, rotas, estado, padroes |
| [Dashboard](docs/MODULO-DASHBOARD.md) | Widgets, DAX, grid, filtros, HTML5 |
| [Cronograma](docs/MODULO-CRONOGRAMA.md) | Periodos, edicao inline, metricas |
| [ETF](docs/MODULO-ETF.md) | Wizard 6 etapas, processamento, export |
| [Auth](docs/MODULO-AUTH.md) | Supabase, roles, modo offline |
| [Landing Page](docs/MODULO-LANDING-PAGE.md) | Animacoes, parallax, scroll |

---

## Stack Tecnologica

| Camada | Tecnologia | Versao |
|--------|------------|--------|
| Framework | React | 18.3.1 |
| Roteamento | React Router | 6.30.1 |
| Build | Vite + SWC | 5.4.19 |
| Linguagem | TypeScript | 5.8.3 |
| Estilos | Tailwind CSS | 3.4.17 |
| Componentes UI | Shadcn/UI (Radix) | Varios |
| Graficos | Recharts | 2.15.4 |
| Animacoes | Framer Motion | 12.38.0 |
| Grid Layout | react-grid-layout | 2.2.3 |
| Backend/Auth | Supabase | 2.99.3 |
| Excel Import | xlsx | 0.18.5 |
| Excel Export | ExcelJS | 4.4.0 |
| Validacao | Zod | 3.25.76 |
| Formularios | React Hook Form | 7.61.1 |
| Estado Servidor | TanStack React Query | 5.83.0 |

---

## Estrutura de Diretorios

```
src/
  App.tsx                          # Raiz: providers + rotas
  main.tsx                         # Entry point React DOM
  index.css                        # Tema CSS (variáveis HSL, gradientes)
  
  pages/
    LandingPage.tsx                # Pagina de entrada (441 linhas)
    Auth.tsx                       # Login/Cadastro (143 linhas)
    Dashboard.tsx                  # Dashboard Power BI-like (389 linhas)
    Cronograma.tsx                 # Gestao de periodos (210 linhas)
    ETF.tsx                        # Wizard ETF 6 etapas (164 linhas)
    AdminUsers.tsx                 # Admin de usuarios (253 linhas)
    Medicao.tsx                    # Placeholder
    Tubulacao.tsx                  # Placeholder
    Ajuste.tsx                     # Placeholder
    Config.tsx                     # Placeholder
    NotFound.tsx                   # 404
    
  contexts/
    AuthContext.tsx                 # Auth + perfil + role (145 linhas)
    CronogramaContext.tsx           # Estado do cronograma (108 linhas)
    ETFContext.tsx                  # Estado do wizard ETF (144 linhas)
    DashboardFilterContext.tsx      # Filtros cross-filtering (161 linhas)
    
  components/
    Layout.tsx                     # Layout principal com sidebar (56 linhas)
    AppSidebar.tsx                 # Sidebar de navegacao (143 linhas)
    NavLink.tsx                    # Link de navegacao (29 linhas)
    ProtectedRoute.tsx             # Protecao de rotas (38 linhas)
    
    dashboard/
      KPICards.tsx                  # 6 cards de metricas (109 linhas)
      CurvaSWidget.tsx             # Grafico Area - Curva S (73 linhas)
      PeriodBarWidget.tsx          # Grafico Barras por periodo (75 linhas)
      DonutWidget.tsx              # Grafico Donut (65 linhas)
      GaugeWidget.tsx              # Medidor semicircular (56 linhas)
      WaterfallWidget.tsx          # Grafico Waterfall (64 linhas)
      DataTableWidget.tsx          # Tabela interativa (102 linhas)
      DashboardSlicers.tsx         # Filtros visuais (83 linhas)
      SeriesToggle.tsx             # Toggle de series (37 linhas)
      FieldPicker.tsx              # Seletor de campos (99 linhas)
      FormulaBar.tsx               # Barra de formulas DAX (150+ linhas)
      WidgetConfigurator.tsx       # Configurador de visuais (200+ linhas)
      HtmlVisualImporter.tsx       # Importador HTML5 (212 linhas)
      CustomWidgetRenderer.tsx     # Renderizador de widgets (260 linhas)
      WidgetWrapper.tsx            # Wrapper base para widgets (25 linhas)
      
    etf/
      ETFWizardUpload.tsx          # Etapa 1: Upload (182 linhas)
      ETFWizardConfig.tsx          # Etapa 2: Configuracao (163 linhas)
      ETFWizardEquipGrid.tsx       # Etapa 3: Grid equipamentos (181 linhas)
      ETFWizardProcess.tsx         # Etapa 4: Processamento (60 linhas)
      ETFWizardResults.tsx         # Etapa 5: Resultados (357 linhas)
      ETFWizardExport.tsx          # Etapa 6: Export Excel (96 linhas)
      
    ui/                            # 40+ componentes Shadcn/UI
    
  lib/
    format.ts                      # Formatacao (moeda, %, compacto)
    utils.ts                       # cn() - class merge utility
    data-model.ts                  # Registro de tabelas/colunas
    dax-engine.ts                  # Motor de formulas DAX (479 linhas)
    etf-processing.ts              # Pipeline ETF (756 linhas)
    
  types/
    cronograma.ts                  # Tipos do cronograma (42 linhas)
    etf.ts                         # Tipos do ETF (217 linhas)
    
  data/
    initial-data.ts                # Dados iniciais (20 periodos)
    
  integrations/
    supabase/
      client.ts                    # Cliente Supabase
      types.ts                     # Tipos auto-gerados

supabase/
  config.toml                      # Configuracao Supabase
  functions/
    create-user/index.ts           # Edge Function: criar usuario
  migrations/
    *.sql                          # 3 arquivos de migracao
```

---

## Como Executar

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Build de producao
npm run build

# Rodar testes
npm test

# Lint
npm run lint
```

### Variaveis de Ambiente (.env)

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

> Nota: O sistema funciona em **modo offline** se o Supabase nao estiver acessivel (timeout de 5 segundos).

---

## Dados Iniciais

O sistema inicializa com 20 periodos de medicao (BM-01 a BM-20):
- Valor contratual: R$ 915.000.000
- Primeiros 8 periodos marcados como fechados
- Valores de baseline variando de R$ 12M a R$ 75M (curva em sino)
- Dados persistidos em localStorage
