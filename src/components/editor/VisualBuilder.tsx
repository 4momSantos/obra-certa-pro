import { useState, useMemo } from "react";
import {
  BarChart3, LineChart as LineIcon, AreaChart as AreaIcon,
  PieChart as PieIcon, CircleDot, Gauge, GitCompareArrows,
  Table2, CreditCard, ArrowLeft, ArrowRight, Loader2, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { dataModel, type TableDef, type ColumnDef } from "@/lib/data-model";
import { toast } from "sonner";

const WIDGET_TYPES = [
  { type: "bar", label: "Barras", icon: BarChart3 },
  { type: "line", label: "Linhas", icon: LineIcon },
  { type: "area", label: "Área", icon: AreaIcon },
  { type: "pie", label: "Pizza", icon: PieIcon },
  { type: "donut", label: "Donut", icon: CircleDot },
  { type: "gauge", label: "Gauge", icon: Gauge },
  { type: "waterfall", label: "Waterfall", icon: GitCompareArrows },
  { type: "table", label: "Tabela", icon: Table2 },
  { type: "kpi", label: "KPI Card", icon: CreditCard },
] as const;

type WidgetType = (typeof WIDGET_TYPES)[number]["type"];

export interface VisualBuilderResult {
  type: string;
  title: string;
  config: Record<string, unknown>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (result: VisualBuilderResult) => void;
  isPending?: boolean;
  widgetCount: number;
  /** For edit mode: pre-fill with existing config */
  editConfig?: { type: string; title: string; config: Record<string, unknown> } | null;
}

const MAX_WIDGETS = 15;

export function VisualBuilder({ open, onOpenChange, onSubmit, isPending, widgetCount, editConfig }: Props) {
  const isEdit = !!editConfig;
  const [step, setStep] = useState(isEdit ? 2 : 1);
  const [selectedType, setSelectedType] = useState<WidgetType>((editConfig?.type as WidgetType) ?? "bar");
  const [title, setTitle] = useState(editConfig?.title ?? "");
  const [tableName, setTableName] = useState<string>((editConfig?.config?.table as string) ?? "");
  const [xAxis, setXAxis] = useState<string>((editConfig?.config?.xField as string) ?? "");
  const [valueColumns, setValueColumns] = useState<string[]>((editConfig?.config?.yFields as string[]) ?? []);
  const [format, setFormat] = useState<string>((editConfig?.config?.format as string) ?? "currency");
  const [maxField, setMaxField] = useState<string>((editConfig?.config?.maxField as string) ?? "");

  // Reset on open/close
  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setTimeout(() => {
        setStep(1);
        setSelectedType("bar");
        setTitle("");
        setTableName("");
        setXAxis("");
        setValueColumns([]);
        setFormat("currency");
        setMaxField("");
      }, 200);
    }
    onOpenChange(v);
  };

  const selectedTable: TableDef | undefined = useMemo(
    () => dataModel.find((t) => t.name === tableName),
    [tableName]
  );

  const textDateCols = useMemo(
    () => selectedTable?.columns.filter((c) => c.type === "text" || c.type === "date") ?? [],
    [selectedTable]
  );

  const numericCols = useMemo(
    () => selectedTable?.columns.filter((c) => c.type === "number") ?? [],
    [selectedTable]
  );

  const toggleValueColumn = (col: string) => {
    setValueColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const atLimit = widgetCount >= MAX_WIDGETS && !isEdit;

  const canProceedStep2 = () => {
    if (!tableName) return false;
    if (selectedType === "kpi" || selectedType === "gauge") return valueColumns.length >= 1 || !!xAxis;
    return !!xAxis && valueColumns.length >= 1;
  };

  const handleSubmit = () => {
    if (atLimit) {
      toast.error("Máximo de 15 widgets atingido");
      return;
    }

    const finalTitle = title.trim() || `${WIDGET_TYPES.find((t) => t.type === selectedType)?.label ?? "Widget"} — ${selectedTable?.label ?? ""}`;

    onSubmit({
      type: selectedType,
      title: finalTitle,
      config: {
        table: tableName,
        xField: xAxis,
        yFields: valueColumns,
        format,
        maxField: maxField || undefined,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Widget" : "Adicionar Widget"} — Passo {step}/3
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Type selection */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Escolha o tipo de visualização:</p>
            <div className="grid grid-cols-3 gap-2">
              {WIDGET_TYPES.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-all ${
                    selectedType === type
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-muted-foreground/30 text-muted-foreground"
                  }`}
                  onClick={() => setSelectedType(type)}
                >
                  <Icon className="h-6 w-6" />
                  {label}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} className="gap-1">
                Próximo <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Data config */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título do Widget</Label>
              <Input
                placeholder="Ex: Avanço por Período"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tabela fonte</Label>
              <Select value={tableName} onValueChange={(v) => { setTableName(v); setXAxis(""); setValueColumns([]); setMaxField(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {dataModel.map((t) => (
                    <SelectItem key={t.name} value={t.name}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTable && selectedType !== "kpi" && selectedType !== "gauge" && (
              <div className="space-y-2">
                <Label>Eixo X</Label>
                <Select value={xAxis} onValueChange={setXAxis}>
                  <SelectTrigger><SelectValue placeholder="Selecione campo..." /></SelectTrigger>
                  <SelectContent>
                    {textDateCols.map((c) => (
                      <SelectItem key={c.name} value={c.name}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedTable && selectedType !== "gauge" && (
              <div className="space-y-2">
                <Label>{selectedType === "kpi" ? "Campo de valor" : "Valores (séries)"}</Label>
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto border rounded-md p-2">
                  {numericCols.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum campo numérico</p>
                  ) : (
                    numericCols.map((c) => (
                      <div key={c.name} className="flex items-center gap-2">
                        <Checkbox
                          id={`vc-${c.name}`}
                          checked={valueColumns.includes(c.name)}
                          onCheckedChange={() => toggleValueColumn(c.name)}
                        />
                        <label htmlFor={`vc-${c.name}`} className="text-sm cursor-pointer">{c.label}</label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {selectedTable && selectedType === "gauge" && (
              <>
                <div className="space-y-2">
                  <Label>Campo de valor</Label>
                  <Select value={xAxis} onValueChange={setXAxis}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {numericCols.map((c) => (
                        <SelectItem key={c.name} value={c.name}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Campo máximo</Label>
                  <Select value={maxField} onValueChange={setMaxField}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {numericCols.map((c) => (
                        <SelectItem key={c.name} value={c.name}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {selectedType === "kpi" && (
              <div className="space-y-2">
                <Label>Formato</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="currency">R$ (moeda)</SelectItem>
                    <SelectItem value="percent">% (porcentagem)</SelectItem>
                    <SelectItem value="integer">Número inteiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-between">
              {!isEdit && (
                <Button variant="ghost" onClick={() => setStep(1)} className="gap-1">
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar
                </Button>
              )}
              <Button
                onClick={() => setStep(3)}
                disabled={!canProceedStep2()}
                className="gap-1 ml-auto"
              >
                Próximo <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview + Create */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-muted/30">
              <h4 className="text-sm font-medium mb-2">{title || "Preview"}</h4>
              <div className="h-32 flex items-center justify-center">
                <div className="text-center space-y-1">
                  {(() => {
                    const Icon = WIDGET_TYPES.find((t) => t.type === selectedType)?.icon ?? BarChart3;
                    return <Icon className="h-10 w-10 mx-auto text-primary/60" />;
                  })()}
                  <p className="text-xs text-muted-foreground">
                    {WIDGET_TYPES.find((t) => t.type === selectedType)?.label} — {selectedTable?.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedType === "gauge"
                      ? `Valor: ${selectedTable?.columns.find((c) => c.name === xAxis)?.label ?? xAxis}`
                      : `X: ${selectedTable?.columns.find((c) => c.name === xAxis)?.label ?? xAxis} · Séries: ${valueColumns.map((v) => selectedTable?.columns.find((c) => c.name === v)?.label ?? v).join(", ")}`
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)} className="gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending || atLimit}
                className="gap-1.5"
                title={atLimit ? "Limite de 15 widgets atingido" : undefined}
              >
                {isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {isEdit ? "Salvando..." : "Criando..."}</>
                ) : (
                  <><Check className="h-4 w-4" /> {isEdit ? "Salvar" : "Adicionar ao Dashboard"}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
