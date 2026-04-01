import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Search, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ItemNaoMedido } from "@/hooks/useSconExecucao";

interface Props {
  items: ItemNaoMedido[];
  onAddItems: (ippus: string[]) => void;
}

export function PassivosTable({ items, onAddItems }: Props) {
  const [search, setSearch] = useState("");
  const [bmFilter, setBmFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const bms = useMemo(
    () => [...new Set(items.map(i => i.bm_name_calc).filter(Boolean))].sort(),
    [items]
  );

  // Deduplicate by item_wbs + bm
  const deduped = useMemo(() => {
    const map = new Map<string, ItemNaoMedido & { count: number }>();
    for (const r of items) {
      const key = `${r.item_wbs}|${r.bm_name_calc}`;
      const ex = map.get(key);
      if (ex) {
        ex.count++;
      } else {
        map.set(key, { ...r, count: 1 });
      }
    }
    return [...map.values()];
  }, [items]);

  const filtered = useMemo(() => {
    let f = deduped;
    if (search) {
      const s = search.toLowerCase();
      f = f.filter(i => i.item_wbs.toLowerCase().includes(s) || (i.tag || "").toLowerCase().includes(s));
    }
    if (bmFilter !== "all") f = f.filter(i => i.bm_name_calc === bmFilter);
    return f;
  }, [deduped, search, bmFilter]);

  const allSelected = filtered.length > 0 && filtered.every(i => selected.has(i.item_wbs));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(i => i.item_wbs)));
  };

  const toggleItem = (ippu: string) => {
    const next = new Set(selected);
    if (next.has(ippu)) next.delete(ippu); else next.add(ippu);
    setSelected(next);
  };

  const handleAdd = () => {
    if (selected.size > 0) {
      onAddItems([...selected]);
      setSelected(new Set());
    }
  };

  return (
    <div className="space-y-3">
      {/* Warning banner */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-800 dark:text-amber-300">
          Itens executados em BMs anteriores que não foram incluídos em nenhuma previsão ou boletim de medição.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar iPPU ou TAG..." value={search} onChange={e => setSearch(e.target.value)} className="w-56 h-8 text-xs pl-8" />
        </div>
        <Select value={bmFilter} onValueChange={setBmFilter}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="BM Origem" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos BMs</SelectItem>
            {bms.map(b => <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || bmFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setBmFilter("all"); }} className="h-8 text-xs gap-1">
            <X className="h-3 w-3" /> Limpar
          </Button>
        )}
        {selected.size > 0 && (
          <Button size="sm" onClick={handleAdd} className="h-8 text-xs gap-1 ml-auto">
            <Plus className="h-3.5 w-3.5" /> Incluir {selected.size} na Previsão Atual
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto max-h-[400px]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></TableHead>
              <TableHead className="text-xs w-20">BM Origem</TableHead>
              <TableHead className="text-xs w-28">iPPU</TableHead>
              <TableHead className="text-xs w-32">TAG</TableHead>
              <TableHead className="text-xs">Critério</TableHead>
              <TableHead className="text-xs w-24">Disciplina</TableHead>
              <TableHead className="text-xs text-right w-20">Avanço %</TableHead>
              <TableHead className="text-xs text-right w-16">Comps.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                  Nenhum item passivo encontrado. 🎉
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row, i) => (
                <TableRow key={`${row.item_wbs}-${row.bm_name_calc}-${i}`}>
                  <TableCell><Checkbox checked={selected.has(row.item_wbs)} onCheckedChange={() => toggleItem(row.item_wbs)} /></TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:text-amber-400">{row.bm_name_calc}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="font-mono text-[10px]">{row.item_wbs}</Badge></TableCell>
                  <TableCell className="text-xs font-mono truncate max-w-[120px]">{row.tag || "—"}</TableCell>
                  <TableCell className="text-xs truncate max-w-[160px]">{row.criterio_nome || "—"}</TableCell>
                  <TableCell>{row.disciplina ? <Badge variant="outline" className="text-[10px]">{row.disciplina}</Badge> : "—"}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{(row.avanco_ponderado * 100).toFixed(1)}%</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{row.count}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > 0 && (
        <div className="flex justify-between items-center px-3 py-2 bg-muted/50 rounded-lg text-sm">
          <span className="text-muted-foreground"><strong>{filtered.length}</strong> itens passivos</span>
          {selected.size > 0 && <span className="font-medium">{selected.size} selecionados</span>}
        </div>
      )}
    </div>
  );
}
