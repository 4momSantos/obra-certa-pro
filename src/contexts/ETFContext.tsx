import React, { createContext, useContext, useState, useCallback } from 'react';
import type {
  WizardFiles, WizardWorkbooks, WizardConfig, WizardStep,
  ProcessingResults, LogEntry, EquipamentoInfo, EquipGridRow,
} from '@/types/etf';
import { processETF, dateKey } from '@/lib/etf-processing';

interface ETFContextType {
  // Wizard state
  step: WizardStep;
  setStep: (s: WizardStep) => void;
  files: WizardFiles;
  setFiles: (f: WizardFiles) => void;
  workbooks: WizardWorkbooks;
  setWorkbooks: (w: WizardWorkbooks) => void;
  config: WizardConfig;
  setConfig: (c: WizardConfig) => void;
  equipamentos: EquipamentoInfo[];
  setEquipamentos: (e: EquipamentoInfo[]) => void;
  equipGrid: EquipGridRow[];
  setEquipGrid: (g: EquipGridRow[]) => void;
  feriados: Set<string>;
  setFeriados: (f: Set<string>) => void;
  // Processing
  logs: LogEntry[];
  progress: number;
  isProcessing: boolean;
  results: ProcessingResults | null;
  startProcessing: () => Promise<void>;
  resetWizard: () => void;
}

const ETFContext = createContext<ETFContextType | null>(null);

function getDefaultConfig(): WizardConfig {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const week = Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
  return {
    semana: week,
    inicio: '',
    fim: '',
    filtroAprovado: true,
    filtroPendente: true,
    filtroInvalido: false,
    canteiroLocs: new Set(),
    allAsCanteiro: false,
    noLocationData: false,
    liderEquip: 'VALDINEY WILSON DOS SANTOS',
    equipeEquip: 'ETF_APOIO',
  };
}

export function ETFProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<WizardStep>(1);
  const [files, setFiles] = useState<WizardFiles>({ ponto: null, efetivo: null, prog: null, modelo: null, equip: null });
  const [workbooks, setWorkbooks] = useState<WizardWorkbooks>({ ponto: null, efetivo: null, prog: null, modelo: null });
  const [config, setConfig] = useState<WizardConfig>(getDefaultConfig());
  const [equipamentos, setEquipamentos] = useState<EquipamentoInfo[]>([]);
  const [equipGrid, setEquipGrid] = useState<EquipGridRow[]>([]);
  const [feriados, setFeriados] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResults | null>(null);

  const log = useCallback((msg: string, type: LogEntry['type'] = '') => {
    setLogs(prev => [...prev, { msg, type }]);
  }, []);

  const startProcessing = useCallback(async () => {
    setIsProcessing(true);
    setLogs([]);
    setProgress(0);
    setStep(4);

    try {
      // Init equip grid if needed
      let grid = equipGrid;
      if (equipamentos.length > 0 && equipGrid.length === 0) {
        const allDates: string[] = [];
        const d1 = new Date(config.inicio + 'T00:00:00');
        const d2 = new Date(config.fim + 'T00:00:00');
        for (const d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) {
          allDates.push(dateKey(d));
        }
        grid = equipamentos.map(eq => {
          const qtds: Record<string, number> = {};
          allDates.forEach(dk => { qtds[dk] = feriados.has(dk) ? 0 : 1; });
          return { equip: eq, qtds };
        });
        setEquipGrid(grid);
      }

      const res = await processETF(
        { ponto: workbooks.ponto, efetivo: workbooks.efetivo, prog: workbooks.prog, modelo: workbooks.modelo },
        config,
        grid,
        log,
        setProgress
      );
      setResults(res);
      setStep(5);
    } catch (e: any) {
      log('❌ ERRO: ' + e.message, 'err');
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  }, [workbooks, config, equipamentos, equipGrid, feriados, log]);

  const resetWizard = useCallback(() => {
    setStep(1);
    setFiles({ ponto: null, efetivo: null, prog: null, modelo: null, equip: null });
    setWorkbooks({ ponto: null, efetivo: null, prog: null, modelo: null });
    setConfig(getDefaultConfig());
    setEquipamentos([]);
    setEquipGrid([]);
    setFeriados(new Set());
    setLogs([]);
    setProgress(0);
    setResults(null);
  }, []);

  return (
    <ETFContext.Provider value={{
      step, setStep, files, setFiles, workbooks, setWorkbooks,
      config, setConfig, equipamentos, setEquipamentos,
      equipGrid, setEquipGrid, feriados, setFeriados,
      logs, progress, isProcessing, results,
      startProcessing, resetWizard,
    }}>
      {children}
    </ETFContext.Provider>
  );
}

export function useETF() {
  const ctx = useContext(ETFContext);
  if (!ctx) throw new Error('useETF must be used within ETFProvider');
  return ctx;
}
