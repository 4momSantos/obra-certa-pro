import { useState, useRef, useCallback } from "react";
import { evaluateDAX, daxFunctions, buildDataContext } from "@/lib/dax-engine";
import { useCronograma } from "@/contexts/CronogramaContext";
import { Button } from "@/components/ui/button";
import { FunctionSquare, Play, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Copy } from "lucide-react";

interface FormulaBarProps {
  onResult?: (result: string, expression: string) => void;
}

export function FormulaBar({ onResult }: FormulaBarProps) {
  const { state, getCurvaS } = useCronograma();
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState<{ value: string; error?: string } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const evaluate = useCallback(() => {
    if (!expression.trim()) return;

    const ctx = buildDataContext(
      state.periods,
      getCurvaS(),
      state.valorContratual,
      state.projectName,
      state.lastUpdate,
    );

    const res = evaluateDAX(expression, ctx);

    if (res.error) {
      setResult({ value: "", error: res.error });
    } else {
      const display = typeof res.value === "number"
        ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(res.value)
        : String(res.value);
      setResult({ value: display });
      onResult?.(display, expression);
    }
  }, [expression, state, getCurvaS, onResult]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      evaluate();
    }
  };

  const insertFunction = (fn: string) => {
    const textarea = inputRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const before = expression.slice(0, start);
      const after = expression.slice(textarea.selectionEnd);
      const newExpr = before + fn + "()" + after;
      setExpression(newExpr);
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + fn.length + 1;
      }, 0);
    } else {
      setExpression(prev => prev + fn + "()");
    }
    setShowSuggestions(false);
  };

  const copyResult = () => {
    if (result?.value) navigator.clipboard.writeText(result.value);
  };

  return (
    <div className="glass-card rounded-xl p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FunctionSquare className="h-4 w-4 text-accent" />
        <span className="text-xs font-semibold text-foreground">Barra de Fórmulas DAX</span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-8 sm:h-6 text-[10px] gap-1"
          onClick={() => setShowHelp(!showHelp)}
        >
          {showHelp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Referência
        </Button>
      </div>

      {/* Formula Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <div className="absolute left-2 top-2 text-xs font-mono text-accent font-bold">fx</div>
          <textarea
            ref={inputRef}
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder='SUM(periods[realizado])'
            className="w-full h-14 sm:h-16 pl-8 pr-2 py-2 text-xs font-mono bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>
        <Button onClick={evaluate} size="sm" className="h-14 sm:h-16 px-3 sm:px-4 gap-1">
          <Play className="h-3.5 w-3.5" />
          Executar
        </Button>
      </div>

      {/* Result */}
      {result && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
          result.error
            ? "bg-destructive/10 text-destructive border border-destructive/20"
            : "bg-chart-3/10 text-chart-3 border border-chart-3/20"
        }`}>
          {result.error
            ? <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            : <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          }
          <span className="font-mono flex-1">
            {result.error ? `Erro: ${result.error}` : `= ${result.value}`}
          </span>
          {!result.error && (
            <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-6 sm:w-6 p-0" onClick={copyResult}>
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Function suggestions */}
      {showSuggestions && (
        <div className="flex flex-wrap gap-1">
          {daxFunctions.slice(0, 8).map((fn) => (
            <button
              key={fn.name}
              onClick={() => insertFunction(fn.name)}
              className="px-2 py-0.5 text-[10px] font-mono bg-muted/50 hover:bg-primary/10 hover:text-primary border border-border/30 rounded transition-colors"
              title={fn.desc}
            >
              {fn.name}
            </button>
          ))}
          <button
            onClick={() => setShowSuggestions(false)}
            className="px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
          >
            fechar
          </button>
        </div>
      )}

      {/* Help Reference */}
      {showHelp && (
        <div className="border border-border/30 rounded-lg p-3 bg-muted/20 max-h-48 sm:max-h-60 overflow-auto">
          <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Funções Disponíveis</p>
          <div className="grid gap-1">
            {daxFunctions.map((fn) => (
              <div
                key={fn.name}
                className="flex items-start gap-3 text-[11px] py-1 cursor-pointer hover:bg-muted/30 rounded px-1"
                onClick={() => insertFunction(fn.name)}
              >
                <code className="font-mono text-primary font-medium whitespace-nowrap">{fn.syntax}</code>
                <span className="text-muted-foreground">{fn.desc}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-border/30">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">Referência de Colunas</p>
            <p className="text-[10px] text-muted-foreground">
              Use <code className="font-mono text-primary">tabela[coluna]</code> para referenciar dados.
              Ex: <code className="font-mono text-primary">periods[realizado]</code>,
              <code className="font-mono text-primary">contrato[valorContratual]</code>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Operadores: <code className="font-mono">+ - * / = &lt;&gt; &lt; &gt; &lt;= &gt;= && ||</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
