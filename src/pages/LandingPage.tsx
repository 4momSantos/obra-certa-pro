import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Building2, LayoutDashboard, CalendarRange, Users,
  FileCheck, Pipette, SlidersHorizontal, DollarSign,
  UsersRound, FileBarChart, ArrowRight, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

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

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-accent">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">SPLAN</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#modulos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Módulos</a>
          <a href="#beneficios" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Benefícios</a>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Acessar Sistema <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0 gradient-primary opacity-[0.04]" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />

      <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
        <motion.div initial="hidden" animate="visible" className="space-y-8">
          <motion.div custom={0} variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 backdrop-blur-sm px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-chart-3 animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">RNEST UDA U-12 — Contrato R$ 915M</span>
          </motion.div>

          <motion.h1 custom={1} variants={fadeUp} className="text-5xl sm:text-7xl font-extrabold tracking-tight text-foreground">
            S<span className="text-gradient-gold">PLAN</span>
          </motion.h1>

          <motion.p custom={2} variants={fadeUp} className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Sistema de Planejamento para gestão financeira, cronograma e efetivo técnico em obras industriais de grande porte.
          </motion.p>

          <motion.div custom={3} variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="text-base px-8">
              <Link to="/dashboard">Entrar no Sistema <ArrowRight className="h-5 w-5" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base px-8">
              <a href="#modulos">Ver Módulos <ChevronDown className="h-5 w-5" /></a>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Modules() {
  return (
    <section id="modulos" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="text-center mb-16">
          <motion.p custom={0} variants={fadeUp} className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">Módulos</motion.p>
          <motion.h2 custom={1} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground">Tudo que você precisa em um só lugar</motion.h2>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((m, i) => (
            <motion.div key={m.title} custom={i} variants={fadeUp} className="glass-card rounded-xl p-6 group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-primary mb-4 shadow-lg group-hover:scale-110 transition-transform">
                <m.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{m.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Benefits() {
  return (
    <section id="beneficios" className="py-24 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="text-center mb-16">
          <motion.p custom={0} variants={fadeUp} className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">Benefícios</motion.p>
          <motion.h2 custom={1} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground">Por que usar o SPLAN?</motion.h2>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} className="grid md:grid-cols-3 gap-8">
          {benefits.map((b, i) => (
            <motion.div key={b.title} custom={i} variants={fadeUp} className="text-center space-y-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${b.gradient} shadow-lg mx-auto`}>
                <b.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{b.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{b.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/50 py-10 px-6">
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
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Modules />
      <Benefits />
      <Footer />
    </div>
  );
}
