import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CronogramaProvider } from "@/contexts/CronogramaContext";
import { ETFProvider } from "@/contexts/ETFContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import HomeDashboard from "@/pages/HomeDashboard";
import DashboardList from "@/pages/DashboardList";
import DashboardEditor from "@/pages/DashboardEditor";
import DashboardView from "@/pages/DashboardView";
import TVMode from "@/pages/TVMode";
import LandingPage from "@/pages/LandingPage";
import Auth from "@/pages/Auth";
import AdminUsers from "@/pages/AdminUsers";
import Cronograma from "@/pages/Cronograma";
import ETF from "@/pages/ETF";
import Medicao from "@/pages/Medicao";
import Tubulacao from "@/pages/Tubulacao";
import Ajuste from "@/pages/Ajuste";
import Config from "@/pages/Config";
import ImportData from "@/pages/ImportData";
import GitecPipeline from "@/pages/GitecPipeline";
import DocumentsPage from "@/pages/DocumentsPage";
import AlertsPage from "@/pages/AlertsPage";
import Simulador from "@/pages/Simulador";
import Configuracao from "@/pages/Configuracao";
import Equipes from "@/pages/Equipes";
import Disciplinas from "@/pages/Disciplinas";
import Cobertura from "@/pages/Cobertura";
import CurvaS from "@/pages/CurvaS";
import DetalhamentoBM from "@/pages/DetalhamentoBM";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const location = useLocation();
  const isAuth = location.pathname === "/auth";
  const isLanding = location.pathname === "/landing";

  if (isLanding) return <LandingPage />;
  if (isAuth) return <Auth />;

  return (
    <ProtectedRoute>
      <Layout>
        <Routes>
          <Route path="/" element={<HomeDashboard />} />
          <Route path="/dashboards" element={<DashboardList />} />
          <Route path="/dashboards/:id" element={<DashboardEditor />} />
          <Route path="/dashboards/:id/view" element={<DashboardView />} />
          <Route path="/tv" element={<TVMode />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cronograma" element={<Cronograma />} />
          <Route path="/curva-s" element={<CurvaS />} />
          <Route path="/bm" element={<DetalhamentoBM />} />
          <Route path="/etf" element={<ETF />} />
          <Route path="/medicao" element={<Medicao />} />
          <Route path="/tubulacao" element={<Tubulacao />} />
          <Route path="/import" element={<ImportData />} />
          <Route path="/gitec" element={<GitecPipeline />} />
          <Route path="/documentos" element={<DocumentsPage />} />
          <Route path="/alertas" element={<AlertsPage />} />
          <Route path="/simulador" element={<Simulador />} />
          <Route path="/equipes" element={<Equipes />} />
          <Route path="/disciplinas" element={<Disciplinas />} />
          <Route path="/cobertura" element={<Cobertura />} />
          <Route path="/ajuste" element={<Ajuste />} />
          <Route path="/config" element={<Config />} />
          <Route path="/configuracao" element={<Configuracao />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </ProtectedRoute>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CronogramaProvider>
          <ETFProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ETFProvider>
        </CronogramaProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
