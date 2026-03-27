import {
  LayoutDashboard, CalendarRange, Users, FileCheck, BarChart3, TrendingUp,
  Pipette, SlidersHorizontal, Settings, Building2, Shield, Upload, ClipboardCheck, FileText, AlertTriangle, Calculator, Clock, HardHat, Layers, ShieldCheck,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAlertCounts } from "@/hooks/useAlerts";
import { useImportStats } from "@/hooks/useImportStats";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

const mainItems = [
  { title: "Dashboard", url: "/", icon: TrendingUp },
  { title: "Medição", url: "/medicao", icon: BarChart3 },
  { title: "GITEC", url: "/gitec", icon: ClipboardCheck },
  { title: "Alertas", url: "/alertas", icon: AlertTriangle },
  { title: "Simulador", url: "/simulador", icon: Calculator },
  { title: "Dashboards", url: "/dashboards", icon: LayoutDashboard },
  { title: "Documentos", url: "/documentos", icon: FileText },
  { title: "Cronograma", url: "/cronograma", icon: CalendarRange },
  { title: "ETF Semanal", url: "/etf", icon: Users },
  { title: "Equipes", url: "/equipes", icon: HardHat },
  { title: "Disciplinas", url: "/disciplinas", icon: Layers },
  { title: "Cobertura SCON", url: "/cobertura", icon: ShieldCheck },
  { title: "Tubulação", url: "/tubulacao", icon: Pipette },
  { title: "Importar Dados", url: "/import", icon: Upload },
];

const configItems = [
  { title: "Ajuste Automático", url: "/ajuste", icon: SlidersHorizontal },
  { title: "Configurações", url: "/config", icon: Settings },
  { title: "Configuração", url: "/configuracao", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { role } = useAuth();
  const location = useLocation();
  const alertCounts = useAlertCounts();
  const { data: importStats } = useImportStats();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg gradient-accent">
            <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-primary-foreground">
                SPLAN
              </span>
              <span className="text-xs text-sidebar-foreground/60">
                RNEST UDA U-12
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[10px] tracking-widest">
            Módulos
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="text-sidebar-foreground/70 hover:text-sidebar-primary-foreground hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                      {item.url === "/alertas" && alertCounts.alta > 0 && (
                        <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse px-1">
                          {alertCounts.alta}
                        </span>
                      )}
                      {item.url === "/alertas" && alertCounts.alta === 0 && alertCounts.media > 0 && (
                        <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white px-1">
                          {alertCounts.media}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[10px] tracking-widest">
            Sistema
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="text-sidebar-foreground/70 hover:text-sidebar-primary-foreground hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[10px] tracking-widest">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Gestão de Usuários">
                    <NavLink
                      to="/admin"
                      className="text-sidebar-foreground/70 hover:text-sidebar-primary-foreground hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <Shield className="h-4 w-4" />
                      {!collapsed && <span>Gestão de Usuários</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        {!collapsed && importStats && (
          <div className="rounded-lg bg-sidebar-accent/50 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-sidebar-foreground/50" />
              <p className="text-[10px] text-sidebar-foreground/60">
                {importStats.lastImportAt
                  ? `Dados de ${new Date(importStats.lastImportAt).toLocaleDateString("pt-BR")} ${new Date(importStats.lastImportAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                  : "Sem importações"}
              </p>
            </div>
            {importStats.lastImportAt && (
              <p className="text-[9px] text-sidebar-foreground/40 font-mono">
                SIGEM: {importStats.counts.sigem.toLocaleString("pt-BR")} · GITEC: {importStats.counts.gitec.toLocaleString("pt-BR")} · SCON: {importStats.counts.scon.toLocaleString("pt-BR")}
              </p>
            )}
            {importStats.isStale && (
              <Badge variant="secondary" className="text-[9px] bg-amber-500/20 text-amber-400 border-0">
                Dados podem estar desatualizados
              </Badge>
            )}
          </div>
        )}
        {!collapsed && (
          <div className="rounded-lg bg-sidebar-accent/50 p-3">
            <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40">
              Contrato
            </p>
            <p className="font-mono text-sm font-bold text-sidebar-primary">
              R$ 915M
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
