import { motion } from 'framer-motion';
import { Upload, Settings, Grid3X3, Zap, BarChart3, Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useETF } from '@/contexts/ETFContext';
import ETFWizardUpload from '@/components/etf/ETFWizardUpload';
import ETFWizardConfig from '@/components/etf/ETFWizardConfig';
import ETFWizardEquipGrid from '@/components/etf/ETFWizardEquipGrid';
import ETFWizardProcess from '@/components/etf/ETFWizardProcess';
import ETFWizardResults from '@/components/etf/ETFWizardResults';
import ETFWizardExport from '@/components/etf/ETFWizardExport';
import type { WizardStep } from '@/types/etf';
import { dateKey } from '@/lib/etf-processing';

const STEPS: { num: WizardStep; label: string; icon: React.ReactNode }[] = [
  { num: 1, label: 'Upload', icon: <Upload className="h-4 w-4" /> },
  { num: 2, label: 'Config', icon: <Settings className="h-4 w-4" /> },
  { num: 3, label: 'Equipamentos', icon: <Grid3X3 className="h-4 w-4" /> },
  { num: 4, label: 'Processar', icon: <Zap className="h-4 w-4" /> },
  { num: 5, label: 'Resultados', icon: <BarChart3 className="h-4 w-4" /> },
  { num: 6, label: 'Exportar', icon: <Download className="h-4 w-4" /> },
];

export default function ETF() {
  const {
    step, setStep, files, setFiles, workbooks, setWorkbooks,
    config, setConfig, equipamentos, setEquipamentos,
    equipGrid, setEquipGrid, feriados, setFeriados,
    logs, progress, isProcessing, results,
    startProcessing, resetWizard,
  } = useETF();

  const handleConfigNext = () => {
    if (equipamentos.length > 0) {
      // Init equip grid
      if (equipGrid.length === 0) {
        const allDates: string[] = [];
        const d1 = new Date(config.inicio + 'T00:00:00');
        const d2 = new Date(config.fim + 'T00:00:00');
        for (const d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) {
          allDates.push(dateKey(d));
        }
        const grid = equipamentos.map(eq => {
          const qtds: Record<string, number> = {};
          allDates.forEach(dk => { qtds[dk] = 1; });
          return { equip: eq, qtds };
        });
        setEquipGrid(grid);
      }
      setStep(3);
    } else {
      startProcessing();
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wizard ETF Semanal</h1>
          <p className="text-sm text-muted-foreground mt-1">Processamento de Efetivo Técnico e Funcional</p>
        </div>
        {step > 1 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={resetWizard}>
            <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
          </Button>
        )}
      </div>

      {/* Stepper */}
      <div className="flex gap-1">
        {STEPS.map(s => {
          const isActive = s.num === step;
          const isDone = s.num < step;
          const isDisabled = s.num > step;
          return (
            <div
              key={s.num}
              className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all text-xs font-medium
                ${isActive ? 'bg-primary/10 border border-primary/30 text-primary' : ''}
                ${isDone ? 'bg-green-500/10 border border-green-500/20 text-green-600' : ''}
                ${isDisabled ? 'text-muted-foreground opacity-50' : ''}
                ${!isActive && !isDone && !isDisabled ? 'text-muted-foreground' : ''}
              `}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                ${isActive ? 'bg-primary text-primary-foreground' : ''}
                ${isDone ? 'bg-green-500 text-white' : ''}
                ${isDisabled ? 'bg-muted text-muted-foreground' : ''}
              `}>
                {isDone ? '✓' : s.num}
              </div>
              <span className="hidden md:inline">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      {step === 1 && (
        <ETFWizardUpload
          files={files}
          workbooks={workbooks}
          equipamentos={equipamentos}
          onFilesChange={setFiles}
          onWorkbooksChange={setWorkbooks}
          onEquipamentosChange={setEquipamentos}
          onDatesDetected={(inicio, fim) => setConfig({ ...config, inicio, fim })}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <ETFWizardConfig
          config={config}
          wbPonto={workbooks.ponto}
          onConfigChange={setConfig}
          onBack={() => setStep(1)}
          onNext={handleConfigNext}
        />
      )}

      {step === 3 && (
        <ETFWizardEquipGrid
          equipamentos={equipamentos}
          inicio={config.inicio}
          fim={config.fim}
          equipGrid={equipGrid}
          feriados={feriados}
          onEquipGridChange={setEquipGrid}
          onFeriadosChange={setFeriados}
          onBack={() => setStep(2)}
          onProcess={startProcessing}
        />
      )}

      {step === 4 && (
        <ETFWizardProcess
          progress={progress}
          logs={logs}
          isComplete={!isProcessing}
        />
      )}

      {step === 5 && results && (
        <ETFWizardResults
          results={results}
          onBack={() => setStep(2)}
          onExport={() => setStep(6)}
        />
      )}

      {step === 6 && results && (
        <ETFWizardExport
          results={results}
          semana={config.semana}
          inicio={config.inicio}
          fim={config.fim}
          onBack={() => setStep(5)}
        />
      )}
    </motion.div>
  );
}
