import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, X, Search } from "lucide-react";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SconExecucaoRow } from "@/hooks/useSconExecucao";

interface Props {
  items: SconExecucaoRow[];
  existingIppus: Set<string>;
  onAddItems: (ippus: string[]) => void;
}

export function SconExecucaoTable({ items, existingIppus, onAddItems }: Props) {
  const [search, setSearch] = useState("");
  const [criterioFilter, setCriterioFilter] = useState("all");
  const [discFilter, setDiscFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const criterios = useMemo(
    () => [...new Set(items.map(i => i.criterio_nome).filter(Boolean) as string[])].sort(),
    [items]
  );
  const disciplinas = useMemo(
    () => [...new Set(items.map(i => i.disciplina).filter(Boolean))].sort(),
    [items]
  );

  // Aggregate by item_wbs (iPPU) + tag for display
  const aggregated = useMemo(() => {
    const map = new Map<string, {
      item_wbs: string;
      tag: string;
      tag_desc: string;
      disciplina: string;
      criterio_nome: string;
      item_criterio: string;
      dicionario_etapa: string;
      total_exec: number;
      valor_exec: number;
      avanco: number;
      unit_valor: number;
      semanas: string[];
      status_gitec: string;
      alreadyPrevisto: boolean;
    }>();

    for (const row of items) {
      const key = `${row.item_wbs}|${row.tag || row.componente}`;
      const existing = map.get(key);
      if (existing) {
        existing.total_exec += row.total_exec_semana;
        existing.valor_exec += row.valor_exec_semana;
        if (!existing.semanas.includes(row.semana)) existing.semanas.push(row.semana);
      } else {
        map.set(key, {
          item_wbs: row.item_wbs,
          tag: row.tag || row.componente,
          tag_desc: row.tag_desc || "",
          disciplina: row.disciplina,
          criterio_nome: row.criterio_nome || "",
          item_criterio: row.item_criterio || "",
          dicionario_etapa: row.dicionario_etapa || "",
          total_exec: row.total_exec_semana,
          valor_exec: row.valor_exec_semana,
          avanco: row.avanco_ponderado,
          unit_valor: row.unit_valor,
          semanas: [row.semana],
          status_gitec: row.status_gitec || "",
          alreadyPrevisto: existingIppus.has(row.item_wbs),
        });
      }
    }
    return [...map.values()];
  }, [items, existingIppus]);

  const filtered = useMemo(() => {
    let f = aggregated;
    if (search) {
      const s = search.toLowerCase();
      f = f.filter(i =>
        i.item_wbs.toLowerCase().includes(s) ||
        i.tag.toLowerCase().includes(s) ||
        i.tag_desc.toLowerCase().includes(s)
      );
    }
    if (criterioFilter !== "all") f = f.filter(i => i.criterio_nome === criterioFilter);
    if (discFilter !== "all") f = f.filter(i => i.disciplina === discFilter);
    return f;
  }, [aggregated, search, criterioFilter, discFilter]);

  const notPrevistoItems = filtered.filter(i => !i.alreadyPrevisto);
  const allSelected = notPrevistoItems.length > 0 && notPrevistoItems.every(i => selected.has(i.item_wbs));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(notPrevistoItems.map(i => i.item_wbs)));
    }
  };

  const toggleItem = (ippu: string) => {
    const next = new Set(selected);
    if (next.has(ippu)) next.delete(ippu);
    else next.add(ippu);
    setSelected(next);
  };

  const handleAdd = () => {
    if (selected.size > 0) {
      onAddItems([...selected]);
      setSelected(new Set());
    }
  };

  const hasFilters = search || criterioFilter !== "all" || discFilter !== "all";

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar TAG, iPPU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-56 h-8 text-xs pl-8"
          />
        </div>
        <Select value={criterioFilter} onValueChange={setCriterioFilter}>
          <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="Critério Medição" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Critérios</SelectItem>
            {criterios.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={discFilter} onValueChange={setDiscFilter}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Disciplina" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Disciplinas</SelectItem>
            {disciplinas.map(d => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setCriterioFilter("all"); setDiscFilter("all"); }} className="h-8 text-xs gap-1">
            <X className="h-3 w-3" /> Limpar
          </Button>
        )}
        {selected.size > 0 && (
          <Button size="sm" onClick={handleAdd} className="h-8 text-xs gap-1 ml-auto">
            <Plus className="h-3.5 w-3.5" /> Incluir {selected.size} na Previsão
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto max-h-[500px]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
              </TableHead>
              <TableHead className="text-xs w-20">Status</TableHead>
              <TableHead className="text-xs w-32">TAG</TableHead>
              <TableHead className="text-xs w-28">iPPU</TableHead>
              <TableHead className="text-xs">Critério Medição</TableHead>
              <TableHead className="text-xs w-24">Disciplina</TableHead>
              <TableHead className="text-xs text-right w-20">Exec. Sem.</TableHead>
              <TableHead className="text-xs text-right w-24">Valor Exec.</TableHead>
              <TableHead className="text-xs text-right w-20">Avanço %</TableHead>
              <TableHead className="text-xs w-20">GITEC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">
                  Nenhum item executado encontrado para este período.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row, i) => (
                <TableRow key={`${row.item_wbs}-${row.tag}-${i}`} className={cn(row.alreadyPrevisto && "opacity-50")}>
                  <TableCell>
                    {!row.alreadyPrevisto ? (
                      <Checkbox checked={selected.has(row.item_wbs)} onCheckedChange={() => toggleItem(row.item_wbs)} />
                    ) : (
                      <Badge variant="outline" className="text-[9px]">✓</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.alreadyPrevisto ? (
                      <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-0">Previsto</Badge>
                    ) : (
                      <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-0">Novo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs font-mono truncate block max-w-[120px]">{row.tag}</span>
                      </TooltipTrigger>
                      {row.tag_desc && <TooltipContent className="text-xs max-w-sm">{row.tag_desc}</TooltipContent>}
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px]">{row.item_wbs}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="truncate block max-w-[180px]">{row.criterio_nome || "—"}</span>
                      </TooltipTrigger>
                      {row.dicionario_etapa && <TooltipContent className="text-xs max-w-sm">{row.dicionario_etapa}</TooltipContent>}
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {row.disciplina ? <Badge variant="outline" className="text-[10px]">{row.disciplina}</Badge> : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{row.total_exec.toFixed(0)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{(row.avanco * 100).toFixed(1)}%</TableCell>
                  <TableCell>
                    {row.status_gitec ? (
                      <Badge variant="outline" className="text-[10px]">{row.status_gitec}</Badge>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="flex justify-between items-center px-3 py-2 bg-muted/50 rounded-lg text-sm">
          <span className="text-muted-foreground">
            <strong>{filtered.length}</strong> componentes · <strong>{notPrevistoItems.length}</strong> novos
          </span>
          <span className="text-muted-foreground">
            {selected.size > 0 && <strong>{selected.size} selecionados</strong>}
          </span>
        </div>
      )}
    </div>
  );
}
