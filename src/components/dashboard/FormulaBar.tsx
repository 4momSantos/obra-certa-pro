import { useState, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FunctionSquare, Play, Copy, X, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { useCronograma } from "@/contexts/CronogramaContext";
import { executeFormula, AVAILABLE_FUNCTIONS, type FormulaDataSource, type FormulaResult } from "@/lib/formula-engine";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

export function FormulaBar() {
  const [visible, setVisible] = useState(false);
  const [formula, setFormula] = useState("");
  const [result, setResult] = useState<FormulaResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { filteredPeriods, filteredCurvaS, filteredMetrics } = useDashboardFilters();
  const { state } = useCronograma();

  const dataSource = useMemo<FormulaDataSource>(() => ({
    filteredPeriods,
    filteredCurvaS,
    filteredMetrics: filteredMetrics as unknown as Record<string, number>,
    contractInfo: {
      valorContratual: state.valorContratual,
      projectName: state.projectName,
      lastUpdate: state.lastUpdate,
    },
  }), [filteredPeriods, filteredCurvaS, filteredMetrics, state]);

  const handleExecute = useCallback(() => {
    if (!formula.trim()) return;
    const res = executeFormula(formula, dataSource);
    setResult(res);
  }, [formula, dataSource]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleExecute();
    if (e.key === "Escape") { setVisible(false); setResult(null); }
  }, [handleExecute]);

  const handleCopyResult = useCallback(() => {
    if (result && !result.error) {
      navigator.clipboard.writeText(result.formatted);
      toast.success("Resultado copiado!");
    }
  }, [result]);

  const handleInsertFunction = useCallback((syntax: string) => {
    setFormula(syntax);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  if (!visible) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5 font-mono"
        onClick={() => { setVisible(true); setTimeout(() => inputRef.current?.focus(), 100); }}
      >
        <FunctionSquare className="h-3 w-3" />
        fx
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card/80 backdrop-blur-sm">
      {/* fx label */}
      <Badge variant="outline" className="text-[10px] font-mono px-1.5 shrink-0">fx</Badge>

      {/* Functions dropdown */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 shrink-0">
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          <p className="text-[10px] font-medium text-muted-foreground mb-1.5 px-1">Funções disponíveis</p>
          {AVAILABLE_FUNCTIONS.map((fn) => (
            <button
              key={fn.name}
              onClick={() => handleInsertFunction(fn.syntax)}
              className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted/50 transition-colors"
            >
              <span className="font-mono font-medium text-accent">{fn.name}</span>
              <span className="text-muted-foreground ml-1">— {fn.description}</span>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{fn.syntax}</p>
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Input */}
      <Input
        ref={inputRef}
        value={formula}
        onChange={(e) => { setFormula(e.target.value); setResult(null); }}
        onKeyDown={handleKeyDown}
        placeholder="Ex: SUM(periodos.realizado)"
        className="h-7 text-xs font-mono flex-1 min-w-0"
      />

      {/* Execute */}
      <Button variant="default" size="sm" className="h-7 px-2 text-xs gap-1 shrink-0" onClick={handleExecute}>
        <Play className="h-3 w-3" />
      </Button>

      {/* Result */}
      {result && (
        <div className="flex items-center gap-1.5 shrink-0">
          {result.error ? (
            <span className="text-xs text-destructive max-w-[200px] truncate">{result.error}</span>
          ) : (
            <>
              <span className="text-sm font-bold font-mono text-foreground">{result.formatted}</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopyResult}>
                <Copy className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* Close */}
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => { setVisible(false); setResult(null); setFormula(""); }}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
