import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Unlock, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { useCronograma } from "@/contexts/CronogramaContext";
import { formatCurrencyFull, formatPercent } from "@/lib/format";
import { toast } from "sonner";

function EditableCell({
  value, onChange, disabled,
}: {
  value: number; onChange: (v: number) => void; disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(String(value));

  if (disabled) {
    return (
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        {formatCurrencyFull(value)}
      </span>
    );
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        className="w-full bg-transparent border border-primary/30 rounded px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        value={temp}
        onChange={(e) => setTemp(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const num = parseFloat(temp);
          if (!isNaN(num)) onChange(num);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEditing(false);
            const num = parseFloat(temp);
            if (!isNaN(num)) onChange(num);
          }
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      onClick={() => { setTemp(String(value)); setEditing(true); }}
      className="font-mono text-xs tabular-nums hover:text-primary cursor-pointer transition-colors text-left w-full"
    >
      {formatCurrencyFull(value)}
    </button>
  );
}

export default function Cronograma() {
  const { state, updatePeriod, toggleFechamento, getMetrics } = useCronograma();
  const metrics = getMetrics();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cronograma Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Períodos BM-01 a BM-20 — Clique em um valor para editar
          </p>
        </div>
        <Button
          onClick={() => toast.success("Dados salvos com sucesso!")}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Salvar
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
        {[
          { label: "Baseline", value: metrics.totalBaseline, color: "text-chart-1" },
          { label: "Previsto", value: metrics.totalPrevisto, color: "text-chart-2" },
          { label: "Projetado", value: metrics.totalProjetado, color: "text-chart-5" },
          { label: "Realizado", value: metrics.totalRealizado, color: "text-chart-3" },
          { label: "Adiantamento", value: metrics.totalAdiantamento, color: "text-chart-4" },
        ].map((item) => (
          <Card key={item.label} className="glass-card">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{item.label}</p>
              <p className={`font-mono text-xs sm:text-sm font-bold mt-1 truncate ${item.color}`}>
                {formatCurrencyFull(item.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto -mx-px">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[100px] font-semibold">Período</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Baseline</TableHead>
                  <TableHead className="text-right font-semibold">Previsto</TableHead>
                  <TableHead className="text-right font-semibold">Projetado</TableHead>
                  <TableHead className="text-right font-semibold">Realizado</TableHead>
                  <TableHead className="text-right font-semibold">Adiantamento</TableHead>
                  <TableHead className="text-right font-semibold">% Avanço</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.periods.map((period) => {
                  const pct = period.baseline > 0 ? period.realizado / period.baseline : 0;
                  return (
                    <TableRow
                      key={period.id}
                      className={period.fechado ? "bg-muted/30" : ""}
                    >
                      <TableCell className="font-semibold text-sm">{period.label}</TableCell>
                      <TableCell>
                        <Badge variant={period.fechado ? "secondary" : "default"} className="text-[10px]">
                          {period.fechado ? "Fechado" : "Aberto"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell
                          value={period.baseline}
                          onChange={(v) => updatePeriod(period.id, "baseline", v)}
                          disabled={period.fechado}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell
                          value={period.previsto}
                          onChange={(v) => updatePeriod(period.id, "previsto", v)}
                          disabled={period.fechado}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell
                          value={period.projetado}
                          onChange={(v) => updatePeriod(period.id, "projetado", v)}
                          disabled={period.fechado}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell
                          value={period.realizado}
                          onChange={(v) => updatePeriod(period.id, "realizado", v)}
                          disabled={period.fechado}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell
                          value={period.adiantamento}
                          onChange={(v) => updatePeriod(period.id, "adiantamento", v)}
                          disabled={period.fechado}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono text-xs font-medium ${pct >= 1 ? 'text-chart-3' : pct > 0 ? 'text-chart-2' : 'text-muted-foreground'}`}>
                          {formatPercent(pct)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 sm:h-7 sm:w-7"
                          onClick={() => toggleFechamento(period.id)}
                          title={period.fechado ? "Reabrir período" : "Fechar período"}
                        >
                          {period.fechado ? (
                            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <Unlock className="h-3.5 w-3.5 text-chart-3" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
