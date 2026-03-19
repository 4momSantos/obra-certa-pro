

# Landing Page SPLAN — Página Inicial Pré-Login

## O que será construído

Uma landing page pública e moderna na rota `/`, sem sidebar, apresentando o SPLAN como sistema de planejamento para obras industriais. O Dashboard atual move para `/dashboard`.

## Estrutura da página

1. **Navbar fixa** — Logo SPLAN + links âncora (Módulos, Benefícios, Sobre) + botão "Acessar Sistema" que leva a `/dashboard`
2. **Hero** — Título grande "SPLAN", subtítulo "Sistema de Planejamento — RNEST UDA U-12", gradiente de fundo premium, botão CTA "Entrar no Sistema"
3. **Módulos** — Grid de 6 cards (Dashboard, Cronograma, ETF Semanal, Medição, Tubulação, Ajuste Automático) com ícones e descrições curtas
4. **Benefícios** — 3 colunas com ícones (Controle Financeiro, Gestão de Efetivo, Relatórios Automatizados)
5. **Footer** — Contrato R$ 915M, versão, créditos

## Arquivos a criar/modificar

### Criar: `src/pages/LandingPage.tsx`
- Componente full-page sem Layout wrapper
- Navbar, Hero, Módulos, Benefícios, Footer como seções
- Animações com framer-motion (fade-in on scroll)
- Estilo consistente com o design system (cores primary, accent, gradientes existentes)

### Modificar: `src/App.tsx`
- Rota `/` → `<LandingPage />` (sem Layout wrapper)
- Rota `/dashboard` → `<Dashboard />` (dentro de Layout)
- Demais rotas permanecem dentro de Layout

### Modificar: `src/components/AppSidebar.tsx`
- Atualizar link do Dashboard de `/` para `/dashboard`

### Modificar: `src/components/NavLink.tsx` (se necessário)
- Ajustar `end` prop para `/dashboard`

## Detalhes técnicos

- A rota `/` renderiza `LandingPage` **fora** do `<Layout>`, sem sidebar
- Todas as demais rotas continuam dentro de `<Layout>` com sidebar
- O botão CTA usa `react-router-dom` `Link` para `/dashboard`
- Responsivo: hero com texto centralizado em mobile, grid de módulos 1→2→3 colunas

