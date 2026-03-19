

# Plano: Recriar o ERP "Cronograma Financeiro CONSAG/RNEST" em React/TypeScript

## Visão Geral

Recriar o sistema desktop Python (tkinter + PyWebView) como aplicação web moderna com visual premium, usando React, TypeScript, Tailwind CSS e Shadcn UI. O sistema será organizado em módulos com navegação por sidebar.

## Arquitetura

```text
┌─────────────────────────────────────────────────┐
│  SidebarProvider (Layout Principal)             │
│  ┌──────────┬──────────────────────────────────┐│
│  │ Sidebar  │  Área de Conteúdo               ││
│  │          │                                  ││
│  │ Dashboard│  <Routes>                        ││
│  │ Cronogr. │    /  → Dashboard                ││
│  │ ETF      │    /cronograma → Cronograma      ││
│  │ Medição  │    /etf → ETF Semanal            ││
│  │ Tubulação│    /medicao → Medição            ││
│  │ Ajuste   │    /tubulacao → Tubulação        ││
│  │ Config   │    /ajuste → Ajuste Automático   ││
│  │          │    /config → Configurações       ││
│  └──────────┴──────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

## Design Visual Premium

- Paleta escura/corporativa com acentos em azul (#1e40af) e dourado (#d4a843)
- Cards com glassmorphism sutil e sombras suaves
- Tipografia Inter para corpo, JetBrains Mono para números financeiros
- Animações com framer-motion em transições de página e