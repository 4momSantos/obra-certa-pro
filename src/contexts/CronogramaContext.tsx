import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CronogramaState, PeriodData, DashboardMetrics, CurvaSPoint } from "@/types/cronograma";
import { initialCronogramaState } from "@/data/initial-data";

interface CronogramaContextType {
  state: CronogramaState;
  updatePeriod: (id: string, field: keyof PeriodData, value: number) => void;
  toggleFechamento: (id: string) => void;
  getMetrics: () => DashboardMetrics;
  getCurvaS: () => CurvaSPoint[];
}

const CronogramaContext = createContext<CronogramaContextType | null>(null);

export function CronogramaProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CronogramaState>(() => {
    const saved = localStorage.getItem("cronograma-state");
    return saved ? JSON.parse(saved) : initialCronogramaState;
  });

  const save = (newState: CronogramaState) => {
    setState(newState);
    localStorage.setItem("cronograma-state", JSON.stringify(newState));
  };

  const updatePeriod = useCallback((id: string, field: keyof PeriodData, value: number) => {
    setState(prev => {
      const updated = {
        ...prev,
        lastUpdate: new Date().toISOString(),
        periods: prev.periods.map(p =>
          p.id === id ? { ...p, [field]: value } : p
        ),
      };
      localStorage.setItem("cronograma-state", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleFechamento = useCallback((id: string) => {
    setState(prev => {
      const updated = {
        ...prev,
        lastUpdate: new Date().toISOString(),
        periods: prev.periods.map(p =>
          p.id === id ? { ...p, fechado: !p.fechado } : p
        ),
      };
      localStorage.setItem("cronograma-state", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getMetrics = useCallback((): DashboardMetrics => {
    const { periods, valorContratual } = state;
    const totalBaseline = periods.reduce((s, p) => s + p.baseline, 0);
    const totalPrevisto = periods.reduce((s, p) => s + p.previsto, 0);
    const totalProjetado = periods.reduce((s, p) => s + p.projetado, 0);
    const totalRealizado = periods.reduce((s, p) => s + p.realizado, 0);
    const totalAdiantamento = periods.reduce((s, p) => s + p.adiantamento, 0);

    return {
      valorContratual,
      totalBaseline,
      totalPrevisto,
      totalProjetado,
      totalRealizado,
      totalAdiantamento,
      avancoFisico: totalBaseline > 0 ? totalRealizado / totalBaseline : 0,
      avancoFinanceiro: valorContratual > 0 ? totalRealizado / valorContratual : 0,
      saldo: valorContratual - totalRealizado,
    };
  }, [state]);

  const getCurvaS = useCallback((): CurvaSPoint[] => {
    let baselineAcum = 0, previstoAcum = 0, projetadoAcum = 0, realizadoAcum = 0;
    return state.periods.map(p => {
      baselineAcum += p.baseline;
      previstoAcum += p.previsto;
      projetadoAcum += p.projetado;
      realizadoAcum += p.realizado;
      return {
        period: p.label,
        baseline: p.baseline,
        previsto: p.previsto,
        projetado: p.projetado,
        realizado: p.realizado,
        baselineAcum,
        previstoAcum,
        projetadoAcum,
        realizadoAcum,
      };
    });
  }, [state]);

  return (
    <CronogramaContext.Provider value={{ state, updatePeriod, toggleFechamento, getMetrics, getCurvaS }}>
      {children}
    </CronogramaContext.Provider>
  );
}

export function useCronograma() {
  const ctx = useContext(CronogramaContext);
  if (!ctx) throw new Error("useCronograma must be used within CronogramaProvider");
  return ctx;
}
