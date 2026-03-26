import { useState } from "react";
import { ColumnDef } from "@/lib/data-model";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon,
  Table2, Gauge, AreaChart, Plus, X, Settings2,
} from "lucide-react";

export type ChartType = "bar" | "line" | "area" | "pie" | "donut" | "gauge" | "table" | "kpi" | "html";

interface WidgetConfig {
  id: string;
  type: ChartType;
  title: string;
  xAxis?: ColumnDef;
  yAxis: ColumnDef[];
  measures: string[]; // DAX expressions
  table?: string;
  htmlContent?: string;
}

interface WidgetConfiguratorProps {
  onCreateWidget: (config: WidgetConfig) => void;
  onClose: () => void;
}

const chartTypes: { type: ChartType; label: string; icon: React.ElementType }[] = [
  { type: "bar", label: "Barras", icon: BarChart3 },
  { type: "line", label: "Linhas", icon: LineChartIcon },
  { type: "area", label: "Área", icon: AreaChart },
  { type: "pie", label: "Pizza", icon: PieChartIcon },
  { type: "donut", label: "Donut", icon: PieChartIcon },
  { type: "gauge", label: "Medidor", icon: Gauge },
  { type: "table", label: "Tabela", icon: Table2 },
  { type: "kpi", label: "KPI Card", icon: Settings2 },
];

export function WidgetConfigurator({ onCreateWidget, onClose }: WidgetConfiguratorProps) {
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [title, setTitle] = useState("");
  const [selectedFields, setSelectedFields] = useState<ColumnDef[]>([]);
  const [xAxisField, setXAxisField] = useState<ColumnDef | null>(null);
  const [measures, setMeasures] = useState<string[]>([]);
  const [newMeasure, setNewMeasure] = useState("");
  const [selectedTable, setSelectedTable] = useState("periods");

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fieldData = e.dataTransfer.getData("application/field");
    if (fieldData) {
      const field: ColumnDef = JSON.parse(fieldData);
      if (!selectedFields.find(f => f.name === field.name && f.table === field.table)) {
        setSelectedFields([...selectedFields, field]);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const removeField = (index: number) => {
    setSelectedFields(selectedFields.filter((_, i) => i !== index));
  };

  const addMeasure = () => {
    if (newMeasure.trim()) {
      setMeasures([...measures, newMeasure.trim()]);
      setNewMeasure("");
    }
  };

  const removeMeasure = (index: number) => {
    setMeasures(measures.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    const config: WidgetConfig = {
      id: `custom-${Date.now()}`,
      type: chartType,
      title: title || `Novo ${chartTypes.find(c => c.type === chartType)?.label}`,
      xAxis: xAxisField || undefined,
      yAxis: selectedFields.filter(f => f.type === "number"),
      measures,
      table: selectedTable,
    };
    onCreateWidget(config);
  };

  const needsXAxis = ["bar", "line", "area"].includes(chartType);

  return (
    <div className="glass-card rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold">Novo Visual</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Chart Type Selection */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tipo de Visualização</p>
        <div className="grid grid-cols-4 gap-1.5">
          {chartTypes.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] transition-all ${
                chartType === type
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 text-muted-foreground hover:bg-muted/30"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Título</p>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título do visual..."
          className="w-full h-8 px-3 text-xs bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Table Source */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Fonte de Dados</p>
        <Select value={selectedTable} onValueChange={setSelectedTable}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="periods">Períodos</SelectItem>
            <SelectItem value="curvaS">Curva S</SelectItem>
            <SelectItem value="contrato">Contrato</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* X Axis (for charts that need it) */}
      {needsXAxis && (
        <div
          onDrop={(e) => {
            e.preventDefault();
            const fieldData = e.dataTransfer.getData("application/field");
            if (fieldData) setXAxisField(JSON.parse(fieldData));
          }}
          onDragOver={handleDragOver}
          className="space-y-1"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Eixo X (Categoria)</p>
          <div className="min-h-[32px] px-3 py-1.5 border-2 border-dashed border-border/50 rounded-lg flex items-center text-xs text-muted-foreground">
            {xAxisField ? (
              <Badge variant="secondary" className="text-[10px] gap-1">
                {xAxisField.displayName}
                <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => setXAxisField(null)} />
              </Badge>
            ) : (
              "Arraste um campo aqui"
            )}
          </div>
        </div>
      )}

      {/* Values / Y Axis */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="space-y-1"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {chartType === "table" ? "Colunas" : "Valores (Eixo Y)"}
        </p>
        <div className="min-h-[32px] px-3 py-1.5 border-2 border-dashed border-border/50 rounded-lg flex flex-wrap gap-1.5">
          {selectedFields.length > 0 ? (
            selectedFields.map((f, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                {f.displayName}
                <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => removeField(i)} />
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">Arraste campos do painel lateral</span>
          )}
        </div>
      </div>

      {/* Custom Measures (DAX) */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Medidas (DAX)</p>
        {measures.map((m, i) => (
          <div key={i} className="flex items-center gap-1">
            <code className="text-[10px] font-mono bg-muted/30 px-2 py-0.5 rounded flex-1 truncate">{m}</code>
            <X className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-destructive" onClick={() => removeMeasure(i)} />
          </div>
        ))}
        <div className="flex gap-1">
          <input
            type="text"
            value={newMeasure}
            onChange={(e) => setNewMeasure(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addMeasure()}
            placeholder='SUM(periods[realizado])'
            className="flex-1 h-7 px-2 text-[10px] font-mono bg-muted/30 border border-border/50 rounded focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={addMeasure}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Create Button */}
      <Button onClick={handleCreate} className="w-full text-xs gap-1">
        <Plus className="h-3.5 w-3.5" />
        Criar Visual
      </Button>
    </div>
  );
}

export type { WidgetConfig };
