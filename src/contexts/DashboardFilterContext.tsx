import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from "react";
import { useCronograma } from "@/contexts/CronogramaContext";
import { CurvaSPoint, PeriodData } from "@/types/cronograma";

export interface DashboardFilters {
  periodRange: [number, number]; // indices into periods array
  status: "all" | "aberto" | "fechado";
  selectedPeriod: string | null; // cross-filter: clicked period
  seriesVisibility: {
    baseline: boolean;
    previsto: boolean;
    projetado: boolean;
    realizado: boolean;
  };
}

interface DashboardFilterContextType {
  filters: DashboardFilters;
  setPeriodRange: (range: [number, number]) => void;
  setStatus: (status: DashboardFilters["status"]) => void;
  setSelectedPeriod: (period: string | null) => void;
  toggleSeries: (series: keyof DashboardFilters["seriesVisibility"]) => void;
  resetFilters: () => void;
  filteredPeriods: PeriodData[];
  filteredCurvaS: CurvaSPoint[];
  filteredMetrics: {
    totalBaseline: number;
    totalPrevisto: number;
    totalProjetado: number;
    totalRealizado: number;
    totalAdiantamento: number;
    avancoFinanceiro: number;
    avancoFisico: number;
    saldo: number;
    valorContratual: number;
    periodCount: number;
    closedCount: number;
    openCount: number;
  };
}

const defaultFilters: DashboardFilters = {
  periodRange: [0, 19],
  status: "all",
  selectedPeriod: null,
  seriesVisibility: {
    baseline: true,
    previsto: true,
    projetado: true,
    realizado: true,
  },
};

const DashboardFilterContext = createContext<DashboardFilterContextType | null>(null);

export function DashboardFilterProvider({ children }: { children: ReactNode }) {
  const { state, getCurvaS } = useCronograma();
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);

  const setPeriodRange = useCallback((range: [number, number]) => {
    setFilters(prev => ({ ...prev, periodRange: range }));
  }, []);

  const setStatus = useCallback((status: DashboardFilters["status"]) => {
    setFilters(prev => ({ ...prev, status }));
  }, []);

  const setSelectedPeriod = useCallback((period: string | null) => {
    setFilters(prev => ({
      ...prev,
      selectedPeriod: prev.selectedPeriod === period ? null : period,
    }));
  }, []);

  const toggleSeries = useCallback((series: keyof DashboardFilters["seriesVisibility"]) => {
    setFilters(prev => ({
      ...prev,
      seriesVisibility: {
        ...prev.seriesVisibility,
        [series]: !prev.seriesVisibility[series],
      },
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ ...defaultFilters, periodRange: [0, state.periods.length - 1] });
  }, [state.periods.length]);

  const filteredPeriods = useMemo(() => {
    const [start, end] = filters.periodRange;
    let periods = state.periods.slice(start, end + 1);
    if (filters.status === "fechado") periods = periods.filter(p => p.fechado);
    if (filters.status === "aberto") periods = periods.filter(p => !p.fechado);
    return periods;
  }, [state.periods, filters.periodRange, filters.status]);

  const filteredCurvaS = useMemo(() => {
    const allCurvaS = getCurvaS();
    const [start, end] = filters.periodRange;
    let data = allCurvaS.slice(start, end + 1);
    if (filters.status === "fechado") {
      const fechadoLabels = new Set(state.periods.filter(p => p.fechado).map(p => p.label));
      data = data.filter(d => fechadoLabels.has(d.period));
    }
    if (filters.status === "aberto") {
      const abertoLabels = new Set(state.periods.filter(p => !p.fechado).map(p => p.label));
      data = data.filter(d => abertoLabels.has(d.period));
    }
    // Recalculate accumulated values for filtered data
    let baselineAcum = 0, previstoAcum = 0, projetadoAcum = 0, realizadoAcum = 0;
    return data.map(d => {
      baselineAcum += d.baseline;
      previstoAcum += d.previsto;
      projetadoAcum += d.projetado;
      realizadoAcum += d.realizado;
      return { ...d, baselineAcum, previstoAcum, projetadoAcum, realizadoAcum };
    });
  }, [getCurvaS, filters.periodRange, filters.status, state.periods]);

  const filteredMetrics = useMemo(() => {
    const totalBaseline = filteredPeriods.reduce((s, p) => s + p.baseline, 0);
    const totalPrevisto = filteredPeriods.reduce((s, p) => s + p.previsto, 0);
    const totalProjetado = filteredPeriods.reduce((s, p) => s + p.projetado, 0);
    const totalRealizado = filteredPeriods.reduce((s, p) => s + p.realizado, 0);
    const totalAdiantamento = filteredPeriods.reduce((s, p) => s + p.adiantamento, 0);
    const { valorContratual } = state;

    return {
      totalBaseline,
      totalPrevisto,
      totalProjetado,
      totalRealizado,
      totalAdiantamento,
      avancoFinanceiro: valorContratual > 0 ? totalRealizado / valorContratual : 0,
      avancoFisico: totalBaseline > 0 ? totalRealizado / totalBaseline : 0,
      saldo: valorContratual - totalRealizado,
      valorContratual,
      periodCount: filteredPeriods.length,
      closedCount: filteredPeriods.filter(p => p.fechado).length,
      openCount: filteredPeriods.filter(p => !p.fechado).length,
    };
  }, [filteredPeriods, state]);

  return (
    <DashboardFilterContext.Provider
      value={{
        filters, setPeriodRange, setStatus, setSelectedPeriod,
        toggleSeries, resetFilters, filteredPeriods, filteredCurvaS, filteredMetrics,
      }}
    >
      {children}
    </DashboardFilterContext.Provider>
  );
}

export function useDashboardFilters() {
  const ctx = useContext(DashboardFilterContext);
  if (!ctx) throw new Error("useDashboardFilters must be used within DashboardFilterProvider");
  return ctx;
}
