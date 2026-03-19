import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CronogramaProvider } from "@/contexts/CronogramaContext";
import { ETFProvider } from "@/contexts/ETFContext";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Cronograma from "@/pages/Cronograma";
import ETF from "@/pages/ETF";
import Medicao from "@/pages/Medicao";
import Tubulacao from "@/pages/Tubulacao";
import Ajuste from "@/pages/Ajuste";
import Config from "@/pages/Config";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CronogramaProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/cronograma" element={<Cronograma />} />
              <Route path="/etf" element={<ETF />} />
              <Route path="/medicao" element={<Medicao />} />
              <Route path="/tubulacao" element={<Tubulacao />} />
              <Route path="/ajuste" element={<Ajuste />} />
              <Route path="/config" element={<Config />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </CronogramaProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
