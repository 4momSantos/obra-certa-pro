import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle, BarChart3, LineChart, AreaChart, PieChart, CircleDot, Gauge,
  ArrowRight, ArrowLeft, Check,
} from "lucide-react";
import { dataModel } from "@/lib/data-model";
import type { CustomVisualType, CustomWidgetConfig } from "@/lib/custom-widgets";
import { CustomWidgetPreview } from "./CustomWidget";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";

const VISUAL_TYPES: { type: CustomVisualType; label: string; icon: React.ElementType }[] = [
  { type: "bar", label: "Barras", icon: BarChart3 },
  { type: "line", label: "Linhas", icon: LineChart },
  { type: "area", label: "Área", icon: AreaChart },
  { type: "pie", label: "Pizza", icon: PieChart },
  { type: "donut", label: "Donut", icon: CircleDot },
  { type: "kpi", label: "KPI Card", icon: Gauge },
];

interface VisualBuilderProps {
  customCount: number;
  onAdd: (config: CustomWidgetConfig) => void;
}

export function VisualBuilder({ customCount, onAdd }: VisualBuilderProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<CustomVisualType | null>(null);
  const [table, setTable] = useState("");
  const [xAxis, setXAxis] = useState("");
  const [valueColumns, setValueColumns] = useState<string[]>([]);
  const [title, setTitle] = useState("");

  const atLimit = customCount >= 10;

  const selectedTable = useMemo(
    () => dataModel.find((t) => t.name === table),
    [table]
  );

  const textColumns = useMemo(
    () => selectedTable?.columns.filter((c) => c.type === "text" || c.type === "date") ?? [],
    [selectedTable]
  );

  const numColumns = useMemo(
    () => selectedTable?.columns.filter((c) => c.type === "number") ?? [],
    [selectedTable]
  );

  const toggleValueCol = (col: string) => {
    setValueColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const canAdvanceStep2 = table && xAxis && valueColumns.length > 0 && title.trim();

  const previewConfig = useMemo<CustomWidgetConfig | null>(() => {
    if (!selectedType || !table || !xAxis || valueColumns.length === 0) return null;
    return {
      id: "preview",
      type: selectedType,
      title: title || "Preview",
      table,
      xAxis,
      valueColumns,
      createdAt: Date.now(),
    };
  }, [selectedType, table, xAxis, valueColumns, title]);

  const handleCreate = () => {
    if (!selectedType || !canAdvanceStep2) return;
    const config: CustomWidgetConfig = {
      id: `custom-${Date.now()}`,
      type: selectedType,
      title: title.trim(),
      table,
      xAxis,
      valueColumns,
      createdAt: Date.now(),
    };
    onAdd(config);
    // Reset
    setOpen(false);
    setStep(1);
    setSelectedType(null);
    setTable("");
    setXAxis("");
    setValueColumns([]);
    setTitle("");
  };

  const reset = () => {
    setStep(1);
    setSelectedType(null);
    setTable("");
    setXAxis("");
    setValueColumns([]);
    setTitle("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          disabled={atLimit}
          title={atLimit ? "Máximo de 10 widgets customizados" : undefined}
        >
          <PlusCircle className="h-3 w-3" />
          Novo Visual
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Novo Visual — Passo {step} de 3
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Visual Type */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Escolha o tipo de visualização:</p>
            <div className="grid grid-cols-3 gap-2">
              {VISUAL_TYPES.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:bg-muted/50 ${
                    selectedType === type
                      ? "border-accent bg-accent/10"
                      : "border-border"
                  }`}
                >
                  <Icon className={`h-6 w-6 ${selectedType === type ? "text-accent" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button size="sm" className="text-xs gap-1" disabled={!selectedType} onClick={() => setStep(2)}>
                Próximo <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Data Config */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Título do Widget</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Baseline vs Realizado"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Tabela Fonte</Label>
              <Select value={table} onValueChange={(v) => { setTable(v); setXAxis(""); setValueColumns([]); }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecionar tabela" />
                </SelectTrigger>
                <SelectContent>
                  {dataModel.filter(t => t.columns.some(c => c.type === "number")).map((t) => (
                    <SelectItem key={t.name} value={t.name} className="text-xs">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTable && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Eixo X (Categoria)</Label>
                  <Select value={xAxis} onValueChange={setXAxis}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecionar campo" />
                    </SelectTrigger>
                    <SelectContent>
                      {textColumns.map((c) => (
                        <SelectItem key={c.name} value={c.name} className="text-xs">{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Valores (numéricos)</Label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-auto">
                    {numColumns.map((c) => (
                      <label
                        key={c.name}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-xs"
                      >
                        <Checkbox
                          checked={valueColumns.includes(c.name)}
                          onCheckedChange={() => toggleValueCol(c.name)}
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-between">
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setStep(1)}>
                <ArrowLeft className="h-3 w-3" /> Voltar
              </Button>
              <Button size="sm" className="text-xs gap-1" disabled={!canAdvanceStep2} onClick={() => setStep(3)}>
                Próximo <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview + Create */}
        {step === 3 && previewConfig && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Preview do widget:</p>
            <div className="border border-border rounded-lg p-2 h-[220px]">
              <CustomWidgetPreview config={previewConfig} />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setStep(2)}>
                <ArrowLeft className="h-3 w-3" /> Voltar
              </Button>
              <Button size="sm" className="text-xs gap-1" onClick={handleCreate}>
                <Check className="h-3 w-3" /> Adicionar ao Dashboard
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
