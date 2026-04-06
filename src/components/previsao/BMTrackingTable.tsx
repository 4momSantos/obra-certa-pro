import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AcompanhamentoRow } from "@/hooks/useAcompanhamento";

const SEMAFORO_STYLES = {
  verde: { icon: "🟢", label: "GITEC ≥ 90%", bg: "bg-emerald-100 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-300" },
  amarelo: { icon: "🟡", label: "Em progresso", bg: "bg-amber-100 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-300" },
  vermelho: { icon: "🔴", label: "Sem avanço", bg: "bg-red-100 dark:bg-red-900/20", text: "text-red-700 dark:text-red-300" },
  cinza: { icon: "⚫", label: "Inativo", bg: "bg-muted", text: "text-muted-foreground" },
};

interface Props {
  items: AcompanhamentoRow[];
  isLoading: boolean;
}

function PctBadge({ value, className }: { value: number; className?: string }) {
  if (value === 0) return <span className="text-muted-foreground text-[11px]">–</span>;
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Progress value={Math.min(value, 100)} className="h-1.5 w-8" />
      <span className="text-[10px] tabular-nums font-medium">{value.toFixed(1)}%</span>
    </div>
  );
}

export function BMTrackingTable({ items, isLoading }: Props) {
  const [search, setSearch] = useState("");
  const [semaforoFilter, setSemaforoFilter] = useState("all");

  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(i =>
        i.ippu.toLowerCase().includes(s) || i.descricao.toLowerCase().includes(s)
      );
    }
    if (semaforoFilter !== "all") {
      result = result.filter(i => i.semaforo === semaforoFilter);
    }
    return result;
  }, [items, search, semaforoFilter]);

  const totals = useMemo(() => ({
    valor_previsto: filtered.reduce((s, i) => s + i.valor_previsto, 0),
    scon_valor: filtered.reduce((s, i) => s + i.scon_valor, 0),
    gitec_valor: filtered.reduce((s, i) => s + i.gitec_valor_aprovado, 0),
    verdes: filtered.filter(i => i.semaforo === "verde").length,
    amarelos: filtered.filter(i => i.semaforo === "amarelo").length,
    vermelhos: filtered.filter(i => i.semaforo === "vermelho").length,
  }), [filtered]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <span className="text-3xl">📋</span>
        <p className="text-sm text-muted-foreground">Nenhum item na previsão deste BM para acompanhar.</p>
        <p className="text-xs text-muted-foreground">Adicione itens na aba "Previsão Atual" primeiro.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Semáforo summary */}
      <div className="flex items-center gap-4 text-xs">
        <span className="text-muted-foreground font-medium">Resumo:</span>
        <span className="flex items-center gap-1">🟢 {totals.verdes}</span>
        <span className="flex items-center gap-1">🟡 {totals.amarelos}</span>
        <span className="flex items-center gap-1">🔴 {totals.vermelhos}</span>
        <span className="text-muted-foreground ml-2">
          Previsto: {formatCompact(totals.valor_previsto)} · SCON: {formatCompact(totals.scon_valor)} · GITEC: {formatCompact(totals.gitec_valor)}
        </span>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Input
          placeholder="Buscar iPPU ou descrição..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 text-xs flex-1 max-w-xs"
        />
        <Select value={semaforoFilter} onValueChange={setSemaforoFilter}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Semáforo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="verde">🟢 Verde</SelectItem>
            <SelectItem value="amarelo">🟡 Amarelo</SelectItem>
            <SelectItem value="vermelho">🔴 Vermelho</SelectItem>
            <SelectItem value="cinza">⚫ Cinza</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <ScrollArea className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] w-8">🚦</TableHead>
              <TableHead className="text-[10px] w-28">iPPU</TableHead>
              <TableHead className="text-[10px]">Descrição</TableHead>
              <TableHead className="text-[10px] w-16">Disc.</TableHead>
              <TableHead className="text-[10px] text-right w-20">Previsto</TableHead>
              <TableHead className="text-[10px] text-center w-20">SCON</TableHead>
              <TableHead className="text-[10px] text-center w-24">SIGEM</TableHead>
              <TableHead className="text-[10px] text-center w-24">GITEC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(row => {
              const sem = SEMAFORO_STYLES[row.semaforo];
              return (
                <TableRow key={row.ippu} className={cn(sem.bg, "border-b")}>
                  <TableCell className="py-2">
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="text-sm">{sem.icon}</span>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">{sem.label}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="font-mono text-[11px] text-blue-700 dark:text-blue-300">{row.ippu}</span>
                  </TableCell>
                  <TableCell className="py-2 text-xs max-w-[180px] truncate">{row.descricao || "–"}</TableCell>
                  <TableCell className="py-2">
                    {row.disciplina ? (
                      <Badge variant="outline" className="text-[9px]">{row.disciplina}</Badge>
                    ) : "–"}
                  </TableCell>
                  <TableCell className="py-2 text-xs text-right tabular-nums font-medium">
                    {formatCompact(row.valor_previsto)}
                  </TableCell>
                  {/* SCON */}
                  <TableCell className="py-2 text-center">
                    <PctBadge value={row.pct_scon} />
                  </TableCell>
                  {/* SIGEM */}
                  <TableCell className="py-2 text-center">
                    {row.sigem_docs_total > 0 ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <PctBadge value={row.pct_sigem} />
                        <span className="text-[9px] text-muted-foreground">{row.sigem_docs_ok}/{row.sigem_docs_total} docs</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">–</span>
                    )}
                  </TableCell>
                  {/* GITEC */}
                  <TableCell className="py-2 text-center">
                    {row.gitec_eventos_total > 0 ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <PctBadge value={row.pct_gitec} />
                        <span className="text-[9px] text-muted-foreground">
                          {formatCompact(row.gitec_valor_aprovado)}
                          {row.gitec_status && (
                            <Badge variant="outline" className="ml-1 text-[8px] px-1 py-0">{row.gitec_status}</Badge>
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">–</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-muted/50 font-medium">
              <TableCell colSpan={4} className="text-xs">Total ({filtered.length} itens)</TableCell>
              <TableCell className="text-xs text-right tabular-nums">{formatCompact(totals.valor_previsto)}</TableCell>
              <TableCell className="text-xs text-center tabular-nums">{formatCompact(totals.scon_valor)}</TableCell>
              <TableCell />
              <TableCell className="text-xs text-center tabular-nums">{formatCompact(totals.gitec_valor)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </ScrollArea>
    </div>
  );
}
