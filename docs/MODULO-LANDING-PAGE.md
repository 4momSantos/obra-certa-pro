# Modulo Landing Page

---

## 1. Visao Geral

A Landing Page e a porta de entrada do SPLAN. Apresenta o sistema com animacoes de scroll parallax, efeitos de mouse tracking, e transicoes suaves. Nao requer autenticacao e serve como vitrine dos modulos e beneficios do sistema.

**Rota:** `/`  
**Arquivo:** `src/pages/LandingPage.tsx` (441 linhas)  
**Sem protecao de rota** — acesso livre

---

## 2. Estrutura da Pagina

```
┌─────────────────────────────────────────────┐
│ [Barra de Progresso de Scroll]              │ ← ScrollProgress
├─────────────────────────────────────────────┤
│ [SPLAN]    Modulos  Beneficios  [Acessar]   │ ← Navbar
├─────────────────────────────────────────────┤
│                                             │
│           RNEST UDA U-12 — R$ 915M          │
│                                             │
│                 SPLAN                        │ ← Hero
│                                             │
│     Sistema de Planejamento para gestao...  │
│                                             │
│     [Entrar no Sistema]  [Ver Modulos]      │
│                                             │
│               ▼ scroll                      │
├─────────────────────────────────────────────┤
│                Modulos                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │ ← Modules
│  │Dashboard│ │Cronogra │ │ETF Sema │       │
│  └─────────┘ └─────────┘ └─────────┘       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │Medicao  │ │Tubulaca │ │Ajuste   │       │
│  └─────────┘ └─────────┘ └─────────┘       │
├─────────────────────────────────────────────┤
│              Beneficios                      │
│  [Controle]  [Gestao]  [Relatorios]         │ ← Benefits
├─────────────────────────────────────────────┤
│  SPLAN · RNEST UDA U-12     R$ 915M · v2.0 │ ← Footer
└─────────────────────────────────────────────┘
```

---

## 3. Componentes

### 3.1 ScrollProgress

Barra de progresso fixa no topo que acompanha o scroll da pagina.

```typescript
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100, damping: 30, restDelta: 0.001
  });
  // Renderiza div com scaleX animado, gradiente primary→accent→chart-3
}
```

- **Posicao:** Fixed, top 0, z-index 100
- **Altura:** 2px
- **Gradiente:** `from-primary via-accent to-chart-3`
- **Transformacao:** `origin-left` com `scaleX` de 0 a 1

### 3.2 Navbar

Barra de navegacao fixa com transparencia que muda ao scroll.

**Estado:** `scrolled` — detectado via `scrollY.on("change", v => setScrolled(v > 20))`

| Estado | Background | Borda | Sombra |
|--------|-----------|-------|--------|
| Topo (scrollY ≤ 20) | Transparente | Transparente | Nenhuma |
| Scrolled (scrollY > 20) | `bg-background/90 backdrop-blur-lg` | `border-border/50` | `shadow-sm` |

**Elementos:**
- Logo SPLAN com icone Building2 (gradiente dourado)
- Links internos: Modulos (#modulos), Beneficios (#beneficios)
- Botao "Acessar Sistema" → `/auth`

**Animacao de entrada:** `y: -80 → 0`, opacidade `0 → 1`, duracao 0.7s

### 3.3 Hero

Secao principal com parallax de scroll e mouse.

#### 3.3.1 Parallax de Scroll

Usando `useScroll({ target: ref, offset: ["start start", "end start"] })`:

| Elemento | Transformacao Y | Velocidade |
|----------|----------------|------------|
| Orb 1 (primary) | 0 → -200px | Media |
| Orb 2 (accent) | 0 → -110px | Lenta |
| Orb 3 (center) | 0 → -300px | Rapida |
| Conteudo | 0 → -80px | Lenta |
| Opacidade conteudo | 1 → 0 (ate 65% scroll) | — |
| Indicador scroll | 1 → 0 (ate 12% scroll) | — |

#### 3.3.2 Parallax de Mouse

Usando `useMotionValue` + `useSpring`:

| Elemento | Direcao | Intensidade | Spring |
|----------|---------|-------------|--------|
| Orb 1 | Segue mouse | ±52px | stiffness: 40, damping: 15 |
| Orb 2 | Oposto ao mouse | ±52px × 0.65 | stiffness: 28, damping: 12 |

```typescript
const handleMouseMove = (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  mouseX.set(((e.clientX - rect.left) / rect.width - 0.5) * 52);
  mouseY.set(((e.clientY - rect.top) / rect.height - 0.5) * 52);
};
```

Mouse leave reseta para (0, 0).

#### 3.3.3 Elementos Visuais

- **Dot grid:** Pattern de pontos 48×48px com opacidade 2.5%
- **Gradiente base:** `gradient-primary` com opacidade 3%
- **Orb 1:** 440×440px, `bg-primary/[0.07]`, blur-3xl, top-left
- **Orb 2:** 440×440px, `bg-accent/[0.07]`, blur-3xl, bottom-right
- **Orb 3:** 720×720px, `bg-chart-3/[0.025]`, blur-3xl, center

#### 3.3.4 Conteudo do Hero

1. **Badge flutuante:** "RNEST UDA U-12 — Contrato R$ 915M" com animacao bounce (y: 0 → -7 → 0, 4s loop)
2. **Titulo:** "SPLAN" com gradiente dourado no "PLAN"
3. **Descricao:** Texto explicativo do sistema
4. **CTAs:** "Entrar no Sistema" (→ /auth) + "Ver Modulos" (→ #modulos)
5. **Indicador de scroll:** Texto "scroll" + seta animada (fade out ao scroll)

### 3.4 Modules

Grid 3×2 de cards com os 6 modulos do sistema.

**Dados:**

| Icone | Titulo | Descricao |
|-------|--------|-----------|
| LayoutDashboard | Dashboard | Visao consolidada de avanco financeiro, curva S e indicadores |
| CalendarRange | Cronograma | Gestao de periodos com baseline, previsto, realizado e projetado |
| Users | ETF Semanal | Controle semanal de efetivo tecnico por funcao e equipe |
| FileCheck | Medicao | Acompanhamento de medicoes contratuais e aditivos |
| Pipette | Tubulacao | Rastreamento de progresso em soldagem e montagem |
| SlidersHorizontal | Ajuste Automatico | Redistribuicao automatica de valores entre periodos |

#### 3.4.1 Animacoes dos Cards

A funcao `moduleCardVariants(i)` gera variantes diferentes por coluna:

| Coluna | Direcao de Entrada | X inicial | Y inicial |
|--------|-------------------|-----------|-----------|
| Esquerda (i%3=0) | Da esquerda | -70px | 20px |
| Centro (i%3=1) | De baixo | 0px | 60px |
| Direita (i%3=2) | Da direita | +70px | 20px |

**Escala:** 0.94 → 1.0  
**Delay:** `i × 0.09s`  
**Hover:** `y: -10`, `scale: 1.025` (spring: stiffness 300, damping 22)

**Icone hover:** `scale: 1.18`, `rotate: 6°` (spring: stiffness 400, damping 18)

### 3.5 Benefits

Grid 1×3 de cards com beneficios do sistema.

**Dados:**

| Icone | Titulo | Gradiente |
|-------|--------|-----------|
| DollarSign | Controle Financeiro | `gradient-primary` (azul) |
| UsersRound | Gestao de Efetivo | `gradient-accent` (dourado) |
| FileBarChart | Relatorios Automatizados | `gradient-success` (verde) |

**Animacoes:**
- Entrada: `opacity: 0, y: 50, scale: 0.88` → `1, 0, 1`
- Delay: `i × 0.15s`
- Hover: `y: -8` (spring: stiffness 250, damping 18)
- Icone hover: `scale: 1.12, rotate: -6°`

### 3.6 Footer

Rodape simples com informacoes do projeto.

- Logo SPLAN com icone Building2
- Texto: "RNEST UDA U-12"
- Valor: "R$ 915M"
- Versao: "v2.0"
- Animacao: fade-in de baixo ao entrar no viewport

---

## 4. Sistema de Animacoes

### 4.1 Variantes Base

```typescript
const easeCustom = [0.22, 1, 0.36, 1]; // Bezier customizado

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.65, ease: easeCustom },
  }),
};
```

### 4.2 Viewport Detection

Todas as secoes usam `whileInView="visible"` com `viewport={{ once: true, margin: "-80px" }}`:
- `once: true` — Anima apenas na primeira vez que entra no viewport
- `margin: "-80px"` — Dispara 80px antes de entrar completamente no viewport

### 4.3 Spring Physics

| Uso | Stiffness | Damping | Contexto |
|-----|-----------|---------|----------|
| Module card hover | 300 | 22 | Elevacao do card |
| Module icon hover | 400 | 18 | Rotacao do icone |
| Benefit card hover | 250 | 18 | Elevacao do card |
| Benefit icon hover | 400 | 18 | Rotacao do icone |
| Mouse parallax orb 1 | 40 | 15 | Seguimento suave |
| Mouse parallax orb 2 | 28 | 12 | Seguimento lento |
| Scroll progress bar | 100 | 30 | Suavizacao |
| Navbar logo hover | 400 | 25 | Escala sutil |

---

## 5. Responsividade

| Breakpoint | Ajustes |
|-----------|---------|
| Mobile (< sm) | Titulo 5xl, CTAs em coluna, links nav ocultos, step labels ocultos |
| Tablet (sm) | Titulo 7xl, CTAs em linha, grid 2 colunas (modules) |
| Desktop (lg) | Grid 3 colunas (modules), nav completa |

---

## 6. Navegacao

| Elemento | Destino | Tipo |
|----------|---------|------|
| Navbar "Acessar Sistema" | `/auth` | React Router Link |
| Hero "Entrar no Sistema" | `/auth` | React Router Link |
| Hero "Ver Modulos" | `#modulos` | Anchor scroll |
| Navbar "Modulos" | `#modulos` | Anchor scroll |
| Navbar "Beneficios" | `#beneficios` | Anchor scroll |

---

## 7. Dependencias do Modulo

| Pacote | Uso |
|--------|-----|
| `framer-motion` | useScroll, useTransform, useSpring, useMotionValue, motion components |
| `react-router-dom` | Link para /auth |
| `lucide-react` | 12 icones (Building2, LayoutDashboard, CalendarRange, etc.) |
| Shadcn/UI | Button |

---

## 8. Performance

- **Sem data fetching:** Pagina 100% estatica, sem chamadas de API
- **Animacoes GPU:** Todas as transforms sao will-change otimizadas pelo Framer Motion
- **Lazy viewport:** Animacoes disparam apenas ao entrar no viewport (`once: true`)
- **Blur eficiente:** Os orbs usam `blur-3xl` (CSS filter) — compositing na GPU
- **Mouse events:** Valores atualizados via `useMotionValue` (nao causa re-renders)
