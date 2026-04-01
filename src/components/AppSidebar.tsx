import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAlertCounts } from "@/hooks/useAlerts";
import { useImportStats } from "@/hooks/useImportStats";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, FolderOpen, Monitor, BarChart3, ClipboardCheck, ClipboardList, FileCheck, FileText,
  Calculator, AlertTriangle, CalendarRange, TrendingUp, Calendar, ShieldCheck,
  SlidersHorizontal, Users, Layers, Clock, Pipette, Upload, Database,
  UserCog, Settings, ChevronDown, ChevronRight, Building2, Menu, X, LogOut, User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────
interface MenuItem {
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: () => React.ReactNode;
  subtitle?: string;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  items: MenuItem[];
  adminOnly?: boolean;
}

const STORAGE_KEY = "splan-sidebar-state";

// ── Hook: docs recusados count ─────────────────────────────────────────────────
function useRecusadosCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sidebar-recusados", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("sigem_documents")
        .select("*", { count: "exact", head: true })
        .eq("status_correto", "Recusado");
      if (error) return 0;
      return count ?? 0;
    },
  });
}

// ── Hook: dashboards count ─────────────────────────────────────────────────────
function useDashboardsCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sidebar-dashboards-count", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("dashboards")
        .select("*", { count: "exact", head: true });
      if (error) return 0;
      return count ?? 0;
    },
  });
}

// ── Component ──────────────────────────────────────────────────────────────────
export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, profile, signOut } = useAuth();
  const alertCounts = useAlertCounts();
  const { data: importStats } = useImportStats();
  const { data: recusadosCount } = useRecusadosCount();
  const { data: dashCount } = useDashboardsCount();
  const [mobileOpen, setMobileOpen] = useState(false);

  // ── Menu group definitions ─────────────────────────────────────────────
  const groups: MenuGroup[] = useMemo(() => [
    {
      id: "dashboards",
      label: "DASHBOARDS",
      icon: LayoutDashboard,
      items: [
        { label: "Dashboard Geral", path: "/", icon: LayoutDashboard },
        {
          label: "Dashboards Salvos", path: "/dashboards", icon: FolderOpen,
          badge: () => dashCount ? <BadgePill variant="muted">{dashCount}</BadgePill> : null,
        },
        { label: "TV Mode", path: "/tv", icon: Monitor },
      ],
    },
    {
      id: "medicao",
      label: "MEDIÇÃO",
      icon: BarChart3,
      items: [
        { label: "Gestão BM", path: "/gestao-bm", icon: ClipboardCheck },
        { label: "Acompanhamento", path: "/medicao", icon: BarChart3 },
        { label: "Previsão", path: "/previsao", icon: ClipboardList },
        { label: "Boletim", path: "/boletim/BM-09", icon: FileCheck },
        { label: "Pipeline GITEC", path: "/gitec", icon: Pipette },
        {
          label: "Documentos SIGEM", path: "/documentos", icon: FileText,
          badge: () =>
            (recusadosCount ?? 0) > 0
              ? <BadgePill variant="destructive">{recusadosCount}</BadgePill>
              : null,
        },
        { label: "Simulador de BM", path: "/simulador", icon: Calculator },
        {
          label: "Alertas", path: "/alertas", icon: AlertTriangle,
          badge: () => {
            if (alertCounts.alta > 0)
              return <BadgePill variant="destructive" pulse>{alertCounts.alta}</BadgePill>;
            if (alertCounts.media > 0)
              return <BadgePill variant="warning">{alertCounts.media}</BadgePill>;
            return null;
          },
        },
      ],
    },
    {
      id: "pcp",
      label: "PCP",
      icon: CalendarRange,
      items: [
        { label: "Cronograma EAP", path: "/cronograma", icon: CalendarRange },
        { label: "Curva S", path: "/curva-s", icon: TrendingUp },
        { label: "Detalhamento por BM", path: "/bm", icon: Calendar },
        { label: "Cobertura SCON", path: "/cobertura", icon: ShieldCheck },
        { label: "Ajuste Automático", path: "/ajuste", icon: SlidersHorizontal },
      ],
    },
    {
      id: "engenharia",
      label: "ENGENHARIA",
      icon: Users,
      items: [
        { label: "Equipes", path: "/equipes", icon: Users },
        { label: "Disciplinas", path: "/disciplinas", icon: Layers },
        { label: "ETF Semanal", path: "/etf", icon: Clock },
        { label: "Tubulação", path: "/tubulacao", icon: Pipette },
      ],
    },
    {
      id: "dados",
      label: "DADOS",
      icon: Upload,
      items: [
        { label: "Importar Operacional", path: "/import", icon: Upload, subtitle: "SIGEM + GITEC + SCON" },
        { label: "Configuração", path: "/configuracao", icon: Database, subtitle: "PPU, EAP, EAC, Critério" },
      ],
    },
    {
      id: "admin",
      label: "ADMIN",
      icon: Settings,
      adminOnly: true,
      items: [
        { label: "Gestão de Usuários", path: "/admin", icon: UserCog },
        { label: "Configurações", path: "/config", icon: Settings },
        { label: "Histórico de Auditoria", path: "/admin/historico", icon: Clock },
      ],
    },
  ], [alertCounts, recusadosCount, dashCount]);

  // ── Expanded state ──────────────────────────────────────────────────────
  const defaultExpanded = useMemo(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as Record<string, boolean>;
    } catch { /* ignore */ }
    return { dashboards: true, medicao: true };
  }, []);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(defaultExpanded);

  // Auto-expand group containing active route
  useEffect(() => {
    const activeGroup = groups.find(g =>
      g.items.some(i => i.path === "/" ? location.pathname === "/" : location.pathname.startsWith(i.path))
    );
    if (activeGroup && !expanded[activeGroup.id]) {
      setExpanded(prev => ({ ...prev, [activeGroup.id]: true }));
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist expanded state
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(expanded)); } catch { /* ignore */ }
  }, [expanded]);

  const toggleGroup = useCallback((id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const isActive = useCallback((path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  const handleNav = useCallback((path: string) => {
    navigate(path);
    setMobileOpen(false);
  }, [navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  // ── Visible groups ─────────────────────────────────────────────────────
  const visibleGroups = groups.filter(g => !g.adminOnly || role === "admin");

  // ── Sidebar content ────────────────────────────────────────────────────
  const sidebarContent = (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-accent">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg gradient-accent text-[11px] font-bold text-sidebar-primary-foreground">
            CM
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-sidebar-primary-foreground">SPLAN</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-sidebar-accent text-sidebar-foreground/60 font-mono">v2.0</span>
            </div>
            <span className="text-[10px] text-sidebar-foreground/50 truncate">RNEST UDA U-12</span>
          </div>
          {/* Mobile close button */}
          <button
            className="ml-auto lg:hidden p-1 rounded hover:bg-sidebar-accent"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Menu groups */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {visibleGroups.map((group) => {
          const isExpanded = !!expanded[group.id];
          const hasActiveChild = group.items.some(i => isActive(i.path));

          return (
            <div key={group.id} className="mb-0.5">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors",
                  hasActiveChild
                    ? "text-sidebar-primary"
                    : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70"
                )}
              >
                <group.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                {isExpanded
                  ? <ChevronDown className="h-3 w-3 shrink-0 transition-transform" />
                  : <ChevronRight className="h-3 w-3 shrink-0 transition-transform" />
                }
              </button>

              {/* Submenu with CSS transition */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-200 ease-in-out",
                  isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                )}
              >
                {group.items.map((item) => {
                  const active = isActive(item.path);
                  const badgeNode = item.badge?.();

                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNav(item.path)}
                      className={cn(
                        "w-full flex items-center gap-2.5 pl-10 pr-3 py-[7px] text-[13px] transition-colors relative group",
                        active
                          ? "bg-primary/10 text-sidebar-primary font-medium before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-r before:bg-sidebar-primary"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-primary-foreground"
                      )}
                    >
                      <item.icon className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-sidebar-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
                      )} />
                      <div className="flex-1 text-left min-w-0">
                        <span className="truncate block">{item.label}</span>
                        {item.subtitle && (
                          <span className="text-[9px] text-sidebar-foreground/40 block truncate">{item.subtitle}</span>
                        )}
                      </div>
                      {badgeNode}
                    </button>
                  );
                })}
              </div>

              {/* Separator */}
              <div className="mx-4 border-b border-sidebar-accent/50" />
            </div>
          );
        })}
      </nav>

      {/* Footer — Import stats */}
      <div className="border-t border-sidebar-accent p-3 space-y-2">
        {importStats && (
          <div className="space-y-1">
            <p className="text-[10px] text-sidebar-foreground/50">
              {importStats.lastImportAt
                ? `Última importação: ${new Date(importStats.lastImportAt).toLocaleDateString("pt-BR")} ${new Date(importStats.lastImportAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                : "Nenhum dado importado"}
            </p>
            {importStats.lastImportAt && (
              <p className="text-[9px] text-sidebar-foreground/35 font-mono">
                SIGEM {fmtK(importStats.counts.sigem)} · GITEC {fmtK(importStats.counts.gitec)} · SCON {fmtK(importStats.counts.scon)}
              </p>
            )}
            {importStats.isStale && importStats.lastImportAt && (
              <Badge variant="secondary" className="text-[9px] bg-amber-500/20 text-amber-400 border-0">
                Dados desatualizados
              </Badge>
            )}
            {!importStats.lastImportAt && (
              <span className="text-[9px] text-destructive">Nenhum dado importado</span>
            )}
          </div>
        )}

        {/* User + Sign out */}
        <div className="flex items-center gap-2 pt-1 border-t border-sidebar-accent/50">
          <User className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />
          <span className="text-[11px] text-sidebar-foreground/60 truncate flex-1">{profile?.full_name || "Usuário"}</span>
          {role && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-sidebar-accent text-sidebar-foreground/50">{role}</span>
          )}
          <button onClick={handleSignOut} className="p-1 rounded hover:bg-sidebar-accent shrink-0" title="Sair">
            <LogOut className="h-3.5 w-3.5 text-sidebar-foreground/40" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger trigger */}
      <button
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border shadow-sm"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={cn(
        "lg:hidden fixed top-0 left-0 bottom-0 w-[280px] z-50 transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block w-[260px] shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </div>
    </>
  );
}

// ── Badge pill helper ──────────────────────────────────────────────────────────
function BadgePill({ children, variant = "muted", pulse }: { children: React.ReactNode; variant?: "destructive" | "warning" | "muted"; pulse?: boolean }) {
  const styles = {
    destructive: "bg-destructive text-destructive-foreground",
    warning: "bg-amber-500 text-white",
    muted: "bg-sidebar-accent text-sidebar-foreground/60",
  };
  return (
    <span className={cn(
      "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full text-[10px] font-bold px-1",
      styles[variant],
      pulse && "animate-pulse"
    )}>
      {children}
    </span>
  );
}

function fmtK(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
