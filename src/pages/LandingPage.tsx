import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";
import { Link } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import {
  Building2, LayoutDashboard, CalendarRange, Users,
  FileCheck, Pipette, SlidersHorizontal, DollarSign,
  UsersRound, FileBarChart, ArrowRight, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Easing & Base Variants ────────────────────────────────────────────────────

const easeCustom: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.65, ease: easeCustom },
  }),
};

// Module cards: left column slides from left, center from below, right from right
function moduleCardVariants(i: number) {
  const col = i % 3;
  return {
    hidden: {
      opacity: 0,
      x: col === 0 ? -70 : col === 2 ? 70 : 0,
      y: col === 1 ? 60 : 20,
      scale: 0.94,
    },
    visible: {
      opacity: 1, x: 0, y: 0, scale: 1,
      transition: { delay: i * 0.09, duration: 0.65, ease: easeCustom },
    },
    hover: {
      y: -10, scale: 1.025,
      transition: { type: "spring" as const, stiffness: 300, damping: 22 },
    },
  };
}

const moduleIconVariants = {
  hidden: {},
  visible: {},
  hover: {
    scale: 1.18, rotate: 6,
    transition: { type: "spring" as const, stiffness: 400, damping: 18 },
  },
};

const benefitCardVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.88 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.15, duration: 0.7, ease: easeCustom },
  }),
  hover: {
    y: -8,
    transition: { type: "spring" as const, stiffness: 250, damping: 18 },
  },
};

const benefitIconVariants = {
  hidden: {},
  visible: {},
  hover: {
    scale: 1.12, rotate: -6,
    transition: { type: "spring" as const, stiffness: 400, damping: 18 },
  },
};

// ── Data ──────────────────────────────────────────────────────────────────────

const modules = [
  { icon: LayoutDashboard, title: "Dashboard", desc: "Visão consolidada de avanço financeiro, curva S e indicadores de desempenho." },
  { icon: CalendarRange, title: "Cronograma", desc: "Gestão de períodos com baseline, previsto, realizado e projetado." },
  { icon: Users, title: "ETF Semanal", desc: "Controle semanal de efetivo técnico por função e equipe." },
  { icon: FileCheck, title: "Medição", desc: "Acompanhamento de medições contratuais e aditivos." },
  { icon: Pipette, title: "Tubulação", desc: "Rastreamento de progresso em soldagem e montagem de tubulações." },
  { icon: SlidersHorizontal, title: "Ajuste Automático", desc: "Redistribuição automática de valores entre períodos." },
];

const benefits = [
  { icon: DollarSign, title: "Controle Financeiro", desc: "Acompanhe o avanço financeiro em tempo real com curva S e métricas consolidadas.", gradient: "gradient-primary" },
  { icon: UsersRound, title: "Gestão de Efetivo", desc: "Monitore e planeje a alocação de equipes técnicas com visão semanal detalhada.", gradient: "gradient-accent" },
  { icon: FileBarChart, title: "Relatórios Automatizados", desc: "Exporte relatórios profissionais em Excel com um clique, prontos para apresentação.", gradient: "gradient-success" },
];

// ── Scroll Progress Bar ───────────────────────────────────────────────────────

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-accent to-chart-3 origin-left z-[100]"
    />
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────

function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    return scrollY.on("change", (v) => setScrolled(v > 20));
  }, [scrollY]);

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-colors duration-500 ${
        scrolled
          ? "bg-background/90 backdrop-blur-lg border-border/50 shadow-sm"
          : "bg-transparent border-transparent"
      }`}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: easeCustom }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.03 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-accent">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">SPLAN</span>
        </motion.div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#modulos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Módulos</a>
          <a href="#beneficios" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Benefícios</a>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Acessar Sistema <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </div>
    </motion.nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  // Scroll-based parallax (different depths per orb)
  const orb1Y = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const orb2Y = useTransform(scrollYProgress, [0, 1], [0, -110]);
  const orb3Y = useTransform(scrollYProgress, [0, 1], [0, -300]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);
  const scrollIndicatorOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  // Mouse parallax motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Orb 1: follows mouse with spring smoothing
  const orb1MX = useSpring(mouseX, { stiffness: 40, damping: 15 });
  const orb1MY = useSpring(mouseY, { stiffness: 40, damping: 15 });

  // Orb 2: opposite direction, slower spring
  const orb2MXRaw = useTransform(mouseX, (v) => -v * 0.65);
  const orb2MYRaw = useTransform(mouseY, (v) => -v * 0.65);
  const orb2MX = useSpring(orb2MXRaw, { stiffness: 28, damping: 12 });
  const orb2MY = useSpring(orb2MYRaw, { stiffness: 28, damping: 12 });

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(((e.clientX - rect.left) / rect.width - 0.5) * 52);
    mouseY.set(((e.clientY - rect.top) / rect.height - 0.5) * 52);
  };
  const handleMouseLeave = () => { mouseX.set(0); mouseY.set(0); };

  return (
    <section
      ref={ref}
      className="relative min-h-[85vh] flex items-center justify-center overflow-hidden pt-16"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Gradient base */}
      <div className="absolute inset-0 gradient-primary opacity-[0.03] pointer-events-none" />

      {/* Orb 1 — primary, top-left: scroll + mouse parallax */}
      <motion.div style={{ y: orb1Y }} className="absolute top-1/4 -left-32 pointer-events-none">
        <motion.div
          style={{ x: orb1MX, y: orb1MY }}
          className="w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] lg:w-[440px] lg:h-[440px] rounded-full bg-primary/[0.07] blur-3xl"
        />
      </motion.div>

      {/* Orb 2 — accent, bottom-right: scroll + inverse mouse parallax */}
      <motion.div style={{ y: orb2Y }} className="absolute bottom-1/4 -right-32 pointer-events-none">
        <motion.div
          style={{ x: orb2MX, y: orb2MY }}
          className="w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] lg:w-[440px] lg:h-[440px] rounded-full bg-accent/[0.07] blur-3xl"
        />
      </motion.div>

      {/* Orb 3 — large ambient center, fastest parallax depth */}
      <motion.div
        style={{ y: orb3Y }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      >
        <div className="w-[400px] h-[400px] sm:w-[560px] sm:h-[560px] lg:w-[720px] lg:h-[720px] rounded-full bg-chart-3/[0.025] blur-3xl" />
      </motion.div>

      {/* Content with scroll parallax + fade */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 max-w-4xl mx-auto text-center px-4 sm:px-6"
      >
        <motion.div initial="hidden" animate="visible" className="space-y-8">
          {/* Floating badge */}
          <motion.div custom={0} variants={fadeUp}>
            <motion.div
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 backdrop-blur-sm px-4 py-1.5"
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.5 }}
            >
              <span className="h-2 w-2 rounded-full bg-chart-3 animate-pulse" />
              <span className="text-xs font-medium text-muted-foreground">RNEST UDA U-12 — Contrato R$ 915M</span>
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-5xl sm:text-7xl font-extrabold tracking-tight text-foreground"
          >
            S<span className="text-gradient-gold">PLAN</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            custom={2}
            variants={fadeUp}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Sistema de Planejamento para gestão financeira, cronograma e efetivo técnico em obras industriais de grande porte.
          </motion.p>

          {/* CTAs */}
          <motion.div
            custom={3}
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button asChild size="lg" className="text-base px-8">
              <Link to="/auth">Entrar no Sistema <ArrowRight className="h-5 w-5" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base px-8">
              <a href="#modulos">Ver Módulos <ChevronDown className="h-5 w-5" /></a>
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator: fade in after delay, fade out on scroll */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.6 }}
      >
        <motion.div
          style={{ opacity: scrollIndicatorOpacity }}
          className="flex flex-col items-center gap-1.5"
        >
          <span className="text-[10px] font-medium text-muted-foreground/50 tracking-widest uppercase">scroll</span>
          <motion.div
            animate={{ y: [0, 9, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground/40" />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

// ── Modules ───────────────────────────────────────────────────────────────────

function Modules() {
  return (
    <section id="modulos" className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="text-center mb-16"
        >
          <motion.p custom={0} variants={fadeUp} className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">
            Módulos
          </motion.p>
          <motion.h2 custom={1} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground">
            Tudo que você precisa em um só lugar
          </motion.h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((m, i) => (
            <motion.div
              key={m.title}
              initial="hidden"
              whileInView="visible"
              whileHover="hover"
              viewport={{ once: true, margin: "-40px" }}
              variants={moduleCardVariants(i)}
              className="glass-card rounded-xl p-6 cursor-default"
              style={{ transformPerspective: 1000 }}
            >
              <motion.div
                variants={moduleIconVariants}
                className="flex h-11 w-11 items-center justify-center rounded-xl gradient-primary mb-4 shadow-lg"
              >
                <m.icon className="h-5 w-5 text-primary-foreground" />
              </motion.div>
              <h3 className="text-base font-semibold text-foreground mb-2">{m.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Benefits ──────────────────────────────────────────────────────────────────

function Benefits() {
  return (
    <section id="beneficios" className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="text-center mb-16"
        >
          <motion.p custom={0} variants={fadeUp} className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">
            Benefícios
          </motion.p>
          <motion.h2 custom={1} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground">
            Por que usar o SPLAN?
          </motion.h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              whileHover="hover"
              viewport={{ once: true, margin: "-40px" }}
              variants={benefitCardVariants}
              className="text-center space-y-4 cursor-default"
            >
              <motion.div
                variants={benefitIconVariants}
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ${b.gradient} shadow-lg mx-auto`}
              >
                <b.icon className="h-7 w-7 text-primary-foreground" />
              </motion.div>
              <h3 className="text-lg font-semibold text-foreground">{b.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: easeCustom }}
      className="border-t border-border/50 py-10 px-6"
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md gradient-accent">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">SPLAN</span>
          <span>·</span>
          <span>RNEST UDA U-12</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono font-semibold text-accent">R$ 915M</span>
          <span>·</span>
          <span className="font-mono">v2.0</span>
        </div>
      </div>
    </motion.footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <ScrollProgress />
      <Navbar />
      <Hero />
      <Modules />
      <Benefits />
      <Footer />
    </div>
  );
}
