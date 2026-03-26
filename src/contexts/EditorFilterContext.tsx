import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

export interface EditorFilterState {
  selectedPeriod: string | null;
  periodRange: [number, number] | null;
  statusFilter: "all" | "open" | "closed";
  seriesVisibility: Record<string, boolean>;
}

interface EditorFilterContextType extends EditorFilterState {
  setSelectedPeriod: (period: string | null) => void;
  setPeriodRange: (range: [number, number] | null) => void;
  setStatusFilter: (status: "all" | "open" | "closed") => void;
  setSeriesVisibility: (key: string, visible: boolean) => void;
  clearAllFilters: () => void;
  activeFilterCount: number;
  onFiltersChange?: (filters: EditorFilterState) => void;
}

const DEFAULT_SERIES: Record<string, boolean> = {
  baseline: true,
  previsto: true,
  projetado: true,
  realizado: true,
};

const DEFAULT_STATE: EditorFilterState = {
  selectedPeriod: null,
  periodRange: null,
  statusFilter: "all",
  seriesVisibility: { ...DEFAULT_SERIES },
};

const EditorFilterContext = createContext<EditorFilterContextType>({
  ...DEFAULT_STATE,
  setSelectedPeriod: () => {},
  setPeriodRange: () => {},
  setStatusFilter: () => {},
  setSeriesVisibility: () => {},
  clearAllFilters: () => {},
  activeFilterCount: 0,
});

export const useEditorFilters = () => useContext(EditorFilterContext);

interface Props {
  children: React.ReactNode;
  initialFilters?: Partial<EditorFilterState>;
  onFiltersChange?: (filters: EditorFilterState) => void;
}

export function EditorFilterProvider({ children, initialFilters, onFiltersChange }: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(initialFilters?.selectedPeriod ?? null);
  const [periodRange, setPeriodRange] = useState<[number, number] | null>(initialFilters?.periodRange ?? null);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">(initialFilters?.statusFilter ?? "all");
  const [seriesVisibility, setSeriesVis] = useState<Record<string, boolean>>(initialFilters?.seriesVisibility ?? { ...DEFAULT_SERIES });

  const notify = useCallback(
    (state: EditorFilterState) => onFiltersChange?.(state),
    [onFiltersChange]
  );

  const wrappedSetSelectedPeriod = useCallback((p: string | null) => {
    setSelectedPeriod(p);
    // Don't persist period selection — it's ephemeral
  }, []);

  const wrappedSetPeriodRange = useCallback((r: [number, number] | null) => {
    setPeriodRange(r);
    notify({ selectedPeriod, periodRange: r, statusFilter, seriesVisibility });
  }, [notify, selectedPeriod, statusFilter, seriesVisibility]);

  const wrappedSetStatusFilter = useCallback((s: "all" | "open" | "closed") => {
    setStatusFilter(s);
    notify({ selectedPeriod, periodRange, statusFilter: s, seriesVisibility });
  }, [notify, selectedPeriod, periodRange, seriesVisibility]);

  const wrappedSetSeriesVisibility = useCallback((key: string, visible: boolean) => {
    setSeriesVis((prev) => {
      const next = { ...prev, [key]: visible };
      notify({ selectedPeriod, periodRange, statusFilter, seriesVisibility: next });
      return next;
    });
  }, [notify, selectedPeriod, periodRange, statusFilter]);

  const clearAllFilters = useCallback(() => {
    setSelectedPeriod(null);
    setPeriodRange(null);
    setStatusFilter("all");
    setSeriesVis({ ...DEFAULT_SERIES });
    notify(DEFAULT_STATE);
  }, [notify]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (periodRange) count++;
    if (statusFilter !== "all") count++;
    const hiddenSeries = Object.values(seriesVisibility).filter((v) => !v).length;
    if (hiddenSeries > 0) count++;
    return count;
  }, [periodRange, statusFilter, seriesVisibility]);

  const value = useMemo(
    () => ({
      selectedPeriod,
      periodRange,
      statusFilter,
      seriesVisibility,
      setSelectedPeriod: wrappedSetSelectedPeriod,
      setPeriodRange: wrappedSetPeriodRange,
      setStatusFilter: wrappedSetStatusFilter,
      setSeriesVisibility: wrappedSetSeriesVisibility,
      clearAllFilters,
      activeFilterCount,
    }),
    [
      selectedPeriod, periodRange, statusFilter, seriesVisibility,
      wrappedSetSelectedPeriod, wrappedSetPeriodRange, wrappedSetStatusFilter,
      wrappedSetSeriesVisibility, clearAllFilters, activeFilterCount,
    ]
  );

  return (
    <EditorFilterContext.Provider value={value}>
      {children}
    </EditorFilterContext.Provider>
  );
}
