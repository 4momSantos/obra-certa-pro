import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Building2, LayoutDashboard, CalendarRange, Users,
  FileCheck, Pipette, SlidersHorizontal, DollarSign,
  UsersRound, FileBarChart, ArrowRight, ChevronDown,
  TrendingUp, Shield, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ─── Animation variants ─── */

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: (i: number) => ({
    opacity: 1, scale: 1,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
  }),
};

const slideInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" },
  }),
};

const slideInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" },
  }),
};

/* ─── Data ─── */

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

const stats = [
  { value: "R$ 915M", label: "Valor Contratual", icon: DollarSign },
  { value: "20", label: "Períodos de Medição", icon: CalendarRange },
  { value: "6", label: "Módulos Integrados", icon: Zap },
  { value: "100%", label: "Rastreabilidade", icon: Shield },
];

/* ─── Animated Counter ─── */

function AnimatedStat({ value, label, icon: Icon, index }: { value: string; label: string; icon: typeof DollarSign; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      custom={index}
      variants={scaleIn}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className="text-center group"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl glass-card mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
        <Icon className="h-6 w-6 text-accent" />
      </div>
      <motion.div
        className="text-3xl sm:text-4xl font-extrabold text-foreground font-mono"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: index * 0.15 + 0.3, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      >
        {value}
      </motion.div>
      <p className="text-sm text-muted-foreground mt-2">{label}</p>
    </motion.div>
  );
}

/* ─── Parallax helpers ─── */

function useParallax(scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"], distance: number) {
  const raw = useTransform(scrollYProgress, [0, 1], [0, distance]);
  return useSpring(raw, { stiffness: 100, damping: 30, restDelta: 0.001 });
}

/* ─── Navbar ─── */

function Navbar() {
  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 100], [0.6, 0.95]);
  const borderOpacity = useTransform(scrollY, [0, 100], [0, 1]);

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg border-b"
      style={{
        backgroundColor: `hsl(var(--background) / ${bgOpacity.get()})`,
        borderColor: `hsl(var(--border) / ${borderOpacity.get()})`,
      }}
    >
      <motion.div
        className="absolute inset-0 bg-background/80 backdrop-blur-lg border-b border-border/50"
        style={{ opacity: bgOpacity }}
      />
      <div className="relative max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-accent">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">SPLAN</span>
        </motion.div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#modulos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Módulos</a>
          <a href="#stats" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Números</a>
          <a href="#beneficios" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Benefícios</a>
        </div>
        <Button asChild size="sm">
          <Link to="/dashboard">Acessar Sistema <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </div>
    </motion.nav>
  );
}

/* ─── Hero with Parallax ─── */

function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const bgY = useParallax(scrollYProgress, 150);
  const blob1Y = useParallax(scrollYProgress, -80);
  const blob2Y = useParallax(scrollYProgress, -120);
  const blob3Y = useParallax(scrollYProgress, -60);
  const textY = useParallax(scrollYProgress, 60);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.6], [1, 0.92]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Parallax background layers */}
      <motion.div className="absolute inset-0 gradient-primary opacity-[0.04]" style={{ y: bgY }} />

      {/* Floating blobs with parallax */}
      <motion.div
        className="absolute top-1/4 -left-32 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[100px]"
        style={{ y: blob1Y }}
        animate={{ x: [0, 30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] rounded-full bg-accent/8 blur-[80px]"
        style={{ y: blob2Y }}
        animate={{ x: [0, -20, 0], scale: [1.1, 1, 1.1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-chart-3/5 blur-[90px]"
        style={{ y: blob3Y }}
        animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.06)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.06)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Floating geometric elements */}
      <motion.div
        className="absolute top-[20%] right-[15%] w-4 h-4 rounded-full border-2 border-accent/30"
        animate={{ y: [0, -20, 0], rotate: [0, 360] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[30%] left-[10%] w-6 h-6 rounded border-2 border-primary/20 rotate-45"
        animate={{ y: [0, 15, 0], rotate: [45, 225, 405] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[60%] right-[8%] w-3 h-3 bg-chart-3/30 rounded-full"
        animate={{ y: [0, -25, 0], x: [0, 10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Content with parallax */}
      <motion.div
        className="relative z-10 max-w-4xl mx-auto text-center px-6"
        style={{ y: textY, opacity, scale }}
      >
        <motion.div initial="hidden" animate="visible" className="space-y-8">
          {/* Badge */}
          <motion.div
            custom={0}
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 backdrop-blur-sm px-4 py-1.5"
            whileHover={{ scale: 1.05, borderColor: "hsl(var(--accent))" }}
          >
            <span className="h-2 w-2 rounded-full bg-chart-3 animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">RNEST UDA U-12 — Contrato R$ 915M</span>
          </motion.div>

          {/* Title with letter animation */}
          <motion.h1 custom={1} variants={fadeUp} className="text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight text-foreground">
            {"SPLAN".split("").map((letter, i) => (
              <motion.span
                key={i}
                className={i > 0 ? "text-gradient-gold" : ""}
                initial={{ opacity: 0, y: 50, rotateX: -90 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                {letter}
              </motion.span>
            ))}
          </motion.h1>

          {/* Subtitle with word reveal */}
          <motion.p custom={2} variants={fadeUp} className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {"Sistema de Planejamento para gestão financeira, cronograma e efetivo técnico em obras industriais de grande porte.".split(" ").map((word, i) => (
              <motion.span
                key={i}
                className="inline-block mr-[0.3em]"
                initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.8 + i * 0.04, duration: 0.4 }}
              >
                {word}
              </motion.span>
            ))}
          </motion.p>

          {/* CTA buttons */}
          <motion.div custom={3} variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button asChild size="lg" className="text-base px-8 shadow-lg shadow-primary/25">
                <Link to="/dashboard">Entrar no Sistema <ArrowRight className="h-5 w-5" /></Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button asChild variant="outline" size="lg" className="text-base px-8">
                <a href="#modulos">Ver Módulos <ChevronDown className="h-5 w-5" /></a>
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="text-xs text-muted-foreground/60 tracking-widest uppercase">Scroll</span>
        <div className="w-5 h-8 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </section>
  );
}

/* ─── Modules with 3D cards ─── */

function Modules() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const bgY = useParallax(scrollYProgress, -50);

  return (
    <section id="modulos" ref={ref} className="relative py-32 px-6 overflow-hidden">
      {/* Parallax background accent */}
      <motion.div
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-[120px]"
        style={{ y: bgY }}
      />

      <div className="relative max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="text-center mb-20">
          <motion.p custom={0} variants={fadeUp} className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-3">Módulos</motion.p>
          <motion.h2 custom={1} variants={fadeUp} className="text-3xl sm:text-5xl font-bold text-foreground">
            Tudo que você precisa<br />
            <span className="text-gradient-gold">em um só lugar</span>
          </motion.h2>
          <motion.div
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-6 h-1 w-16 rounded-full gradient-accent"
          />
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {modules.map((m, i) => (
            <motion.div
              key={m.title}
              custom={i}
              variants={scaleIn}
              whileHover={{
                y: -8,
                rotateX: 2,
                rotateY: -2,
                transition: { duration: 0.3 },
              }}
              className="glass-card rounded-xl p-6 group hover:shadow-2xl hover:shadow-primary/10 transition-shadow duration-500 cursor-default"
              style={{ transformPerspective: 800 }}
            >
              <motion.div
                className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary mb-5 shadow-lg"
                whileHover={{ scale: 1.15, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <m.icon className="h-5 w-5 text-primary-foreground" />
              </motion.div>
              <h3 className="text-base font-semibold text-foreground mb-2">{m.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>

              {/* Hover reveal arrow */}
              <motion.div
                className="flex items-center gap-1 text-xs font-medium text-accent mt-4 overflow-hidden"
                initial={{ opacity: 0, x: -10 }}
                whileHover={{ opacity: 1, x: 0 }}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Saiba mais</span>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Stats Section with Parallax ─── */

function Stats() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const bgY = useParallax(scrollYProgress, -40);

  return (
    <section id="stats" ref={ref} className="relative py-24 px-6 overflow-hidden">
      {/* Parallax diagonal background */}
      <motion.div
        className="absolute inset-0 bg-muted/40 -skew-y-2 origin-left scale-110"
        style={{ y: bgY }}
      />

      <div className="relative max-w-5xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} className="text-center mb-16">
          <motion.p custom={0} variants={fadeUp} className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-3">Em Números</motion.p>
          <motion.h2 custom={1} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground">Escala Industrial</motion.h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <AnimatedStat key={s.label} {...s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Benefits with alternating layout ─── */

function Benefits() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const bgY = useParallax(scrollYProgress, -60);

  return (
    <section id="beneficios" ref={ref} className="relative py-32 px-6 overflow-hidden">
      <motion.div
        className="absolute -bottom-20 right-0 w-[500px] h-[500px] rounded-full bg-accent/3 blur-[100px]"
        style={{ y: bgY }}
      />

      <div className="relative max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="text-center mb-20">
          <motion.p custom={0} variants={fadeUp} className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-3">Benefícios</motion.p>
          <motion.h2 custom={1} variants={fadeUp} className="text-3xl sm:text-5xl font-bold text-foreground">
            Por que usar o <span className="text-gradient-gold">SPLAN</span>?
          </motion.h2>
          <motion.div
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-6 h-1 w-16 rounded-full gradient-accent"
          />
        </motion.div>

        <div className="space-y-20">
          {benefits.map((b, i) => {
            const isEven = i % 2 === 0;
            return (
              <motion.div
                key={b.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                className={`flex flex-col md:flex-row items-center gap-10 ${isEven ? "" : "md:flex-row-reverse"}`}
              >
                {/* Icon side */}
                <motion.div
                  custom={0}
                  variants={isEven ? slideInLeft : slideInRight}
                  className="flex-shrink-0"
                >
                  <motion.div
                    className={`flex h-24 w-24 items-center justify-center rounded-3xl ${b.gradient} shadow-2xl`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <b.icon className="h-10 w-10 text-primary-foreground" />
                  </motion.div>
                </motion.div>

                {/* Text side */}
                <motion.div
                  custom={1}
                  variants={isEven ? slideInRight : slideInLeft}
                  className={`text-center md:text-left ${isEven ? "" : "md:text-right"}`}
                >
                  <h3 className="text-2xl font-bold text-foreground mb-3">{b.title}</h3>
                  <p className="text-muted-foreground leading-relaxed max-w-md">{b.desc}</p>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA Section ─── */

function CTA() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const bgY = useParallax(scrollYProgress, -30);

  return (
    <section ref={ref} className="relative py-32 px-6 overflow-hidden">
      <motion.div
        className="absolute inset-0 gradient-primary opacity-[0.06]"
        style={{ y: bgY }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[100px]"
        style={{ y: bgY }}
      />

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="relative max-w-3xl mx-auto text-center"
      >
        <motion.h2 custom={0} variants={fadeUp} className="text-3xl sm:text-5xl font-bold text-foreground mb-6">
          Pronto para começar?
        </motion.h2>
        <motion.p custom={1} variants={fadeUp} className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
          Acesse o sistema e tenha o controle completo da sua obra na palma da mão.
        </motion.p>
        <motion.div custom={2} variants={fadeUp}>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} className="inline-block">
            <Button asChild size="lg" className="text-base px-10 py-6 text-lg shadow-xl shadow-primary/25">
              <Link to="/dashboard">
                Acessar o SPLAN
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ─── Footer ─── */

function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
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

/* ─── Main Page ─── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <Hero />
      <Modules />
      <Stats />
      <Benefits />
      <CTA />
      <Footer />
    </div>
  );
}
