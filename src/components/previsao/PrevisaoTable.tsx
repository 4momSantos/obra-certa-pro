import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, X, AlertTriangle } from "lucide-react";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PrevisaoActions } from "./PrevisaoActions";

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  previsto:    { label: "Previsto",    bg: "bg-blue-100 dark:bg-blue-900/30",    text: "text-blue-700 dark:text-blue-300" },
  confirmado:  { label: "Confirmado",  bg: "bg-green-100 dark:bg-green-900/30",  text: "text-green-700 dark:text-green-300" },
  postergado:  { label: "Postergado",  bg: "bg-amber-100 dark:bg-amber-900/30",  text: "text-amber-700 dark:text-amber-300" },
  cancelado:   { label: "Cancelado",   bg: "bg-red-100 dark:bg-red-900/30",      text: "text-red-700 dark:text-red-300" },
  medido:      { label: "Medido",      bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300" },
};

interface PrevisaoRow {
  id: string;
  ippu: string;
  status: string;
  disciplina: string;
  responsavel_nome: string;
  qtd_prevista: number;
  valor_previsto: number;
  justificativa: string;
  // enriched
  descricao?: string;
  scon_pct?: number;
}

interface Props {
  items: PrevisaoRow[];
  readonly: boolean;
  bmName: string;
}

export function PrevisaoTable({ items, readonly }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [discFilter, setDiscFilter] = useState("all");
  const [respFilter, setRespFilter] = useState("all");
  const [expandedJust, setExpandedJust] = useState<string | null>(null);

  const disciplinas = useMemo(() => [...new Set(items.map(i => i.disciplina).filter(Boolean))].sort(), [items]);
  const responsaveis = useMemo(() => [...new Set(items.map(i => i.responsavel_nome).filter(Boolean))].sort(), [items]);

  const hasFilters = search || statusFilter !== "all" || discFilter !== "all" || respFilter !== "all";

  const filtered = useMemo(() => {
    let f = items;
    if (search) {
      const s = search.toLowerCase();
      f = f.filter(i => i.ippu.toLowerCase().includes(s) || (i.descricao || "").toLowerCase().includes(s));
    }
    if (statusFilter !== "all") f = f.filter(i => i.status === statusFilter);
    if (discFilter !== "all") f = f.filter(i => i.disciplina === discFilter);
    if (respFilter !== "all") f = f.filter(i => i.responsavel_nome === respFilter);
    return f;
  }, [items, search, statusFilter, discFilter, respFilter]);

  const totalValor = filtered.reduce((s, i) => s + i.valor_previsto, 0);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDiscFilter("all");
    setRespFilter("all");
  };

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Buscar iPPU ou descrição..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-56 h-8 text-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="previsto">Previstos</SelectItem>
            <SelectItem value="confirmado">Confirmados</SelectItem>
            <SelectItem value="postergado">Postergados</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
            <SelectItem value="medido">Medidos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={discFilter} onValueChange={setDiscFilter}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Disciplina" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Disciplinas</SelectItem>
            {disciplinas.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={respFilter} onValueChange={setRespFilter}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Responsável" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Responsáveis</SelectItem>
            {responsaveis.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1">
            <X className="h-3 w-3" /> Limpar filtros
          </Button>
        )}
      </div>

      {/* Active filter badges */}
      {hasFilters && (
        <div className="flex gap-1.5 flex-wrap">
          {search && <Badge variant="secondary" className="text-[10px]">Busca: {search}</Badge>}
          {statusFilter !== "all" && <Badge variant="secondary" className="text-[10px]">Status: {STATUS_STYLES[statusFilter]?.label}</Badge>}
          {discFilter !== "all" && <Badge variant="secondary" className="text-[10px]">Disciplina: {discFilter}</Badge>}
          {respFilter !== "all" && <Badge variant="secondary" className="text-[10px]">Responsável: {respFilter}</Badge>}
        </div>
      )}

      {/* Table */}
      <div className={cn("border rounded-lg overflow-auto", readonly && "opacity-70")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-24">Status</TableHead>
              <TableHead className="text-xs w-28">iPPU</TableHead>
              <TableHead className="text-xs">Descrição</TableHead>
              <TableHead className="text-xs w-24">Disciplina</TableHead>
              <TableHead className="text-xs w-28">Responsável</TableHead>
              <TableHead className="text-xs text-right w-20">Qtd Prev.</TableHead>
              <TableHead className="text-xs text-right w-24">Valor Prev.</TableHead>
              <TableHead className="text-xs w-20">SCON %</TableHead>
              <TableHead className="text-xs w-36">Justificativa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                  Nenhum item encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(item => {
                const st = STATUS_STYLES[item.status] || STATUS_STYLES.previsto;
                const isExpanded = expandedJust === item.id;
                return (
                  <>
                    <TableRow key={item.id} className="group">
                      <TableCell>
                        <Badge className={cn("text-[10px] border-0", st.bg, st.text)}>{st.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-0">
                          {item.ippu}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate block">{item.descricao || "—"}</span>
                          </TooltipTrigger>
                          {(item.descricao || "").length > 40 && (
                            <TooltipContent className="max-w-sm text-xs">{item.descricao}</TooltipContent>
                          )}
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {item.disciplina ? (
                          <Badge variant="outline" className="text-[10px]">{item.disciplina}</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{item.responsavel_nome || "—"}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {item.qtd_prevista > 0 ? item.qtd_prevista.toLocaleString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-medium">
                        {formatCompact(item.valor_previsto)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Progress value={item.scon_pct || 0} className="h-1.5 w-12" />
                          <span className="text-[10px] tabular-nums text-muted-foreground">{(item.scon_pct || 0).toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.justificativa ? (
                          <button
                            onClick={() => setExpandedJust(isExpanded ? null : item.id)}
                            className={cn(
                              "flex items-center gap-1 text-xs max-w-[140px]",
                              item.status === "postergado" ? "text-amber-600 font-semibold" : "text-muted-foreground"
                            )}
                          >
                            <MessageSquare className="h-3 w-3 shrink-0" />
                            <span className="truncate">{item.justificativa}</span>
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && item.justificativa && (
                      <TableRow key={`${item.id}-just`}>
                        <TableCell colSpan={9} className="py-2 pl-10 border-l-2 border-amber-400 bg-amber-50/50 dark:bg-amber-950/10">
                          <p className="text-xs text-foreground">{item.justificativa}</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Total row */}
      {filtered.length > 0 && (
        <div className="flex justify-between items-center px-3 py-2 bg-muted/50 rounded-lg text-sm">
          <span className="text-muted-foreground">
            <strong>{filtered.length}</strong> itens {hasFilters ? "(filtrado)" : ""}
          </span>
          <span className="font-bold">TOTAL: {formatCompact(totalValor)}</span>
        </div>
      )}
    </div>
  );
}
