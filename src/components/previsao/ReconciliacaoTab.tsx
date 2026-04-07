import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, X, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ItemNaoMedido } from "@/hooks/useSconExecucao";

interface Props {
  items: ItemNaoMedido[];
  isLoading: boolean;
  periodos: any[];
  defaultBm: string;
  ppuMap: Map<string, any>;
  classifMap: Map<string, { disciplina: string }> | undefined;
}

export function ReconciliacaoTab({ items, isLoading, periodos, defaultBm, ppuMap, classifMap }: Props) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [discFilter, setDiscFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addDialog, setAddDialog] = useState<{ item: ItemNaoMedido } | null>(null);
  const [bulkDialog, setBulkDialog] = useState(false);
  const [targetBm, setTargetBm] = useState(defaultBm);
  const [singleQtd, setSingleQtd] = useState(0);

  // All items from all BMs (not filtered by current BM)
  const { data: allItems, isLoading: loadingAll } = useQuery({
    queryKey: ["reconciliacao-itens", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ItemNaoMedido[]> => {
      const rows: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("vw_itens_nao_medidos" as any)
          .select("*")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return rows.map((r: any) => ({
        item_wbs: r.item_wbs || "",
        componente: r.componente || "",
        disciplina: r.disciplina || "",
        bm_name_calc: r.bm_name_calc || "",
        criterio_nome: r.criterio_nome,
        item_criterio: r.item_criterio,
        tag: r.tag,
        tag_desc: r.tag_desc,
        total_exec_geral: Number(r.total_exec_geral) || 0,
        avanco_ponderado: Number(r.avanco_ponderado) || 0,
        unit_valor: Number(r.unit_valor) || 0,
        dicionario_etapa: r.dicionario_etapa,
      }));
    },
  });

  const effectiveItems = allItems || items;
  const effectiveLoading = isLoading || loadingAll;

  // Deduplicate by item_wbs
  const deduped = useMemo(() => {
    const map = new Map<string, ItemNaoMedido & { count: number; bms: string[] }>();
    for (const r of effectiveItems) {
      const key = r.item_wbs;
      const ex = map.get(key);
      if (ex) {
        ex.count++;
        if (r.bm_name_calc && !ex.bms.includes(r.bm_name_calc)) ex.bms.push(r.bm_name_calc);
      } else {
        map.set(key, { ...r, count: 1, bms: r.bm_name_calc ? [r.bm_name_calc] : [] });
      }
    }
    return [...map.values()];
  }, [effectiveItems]);

  const disciplinas = useMemo(
    () => [...new Set(deduped.map(i => i.disciplina).filter(Boolean))].sort(),
    [deduped]
  );

  const filtered = useMemo(() => {
    let f = deduped;
    if (search) {
      const s = search.toLowerCase();
      f = f.filter(i => i.item_wbs.toLowerCase().includes(s) || (i.tag || "").toLowerCase().includes(s));
    }
    if (discFilter !== "all") f = f.filter(i => i.disciplina === discFilter);
    return f;
  }, [deduped, search, discFilter]);

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

  const openSingle = (item: ItemNaoMedido) => {
    setAddDialog({ item });
    setTargetBm(defaultBm);
    setSingleQtd(item.total_exec_geral);
  };

  const bmOptions = (periodos || []).filter((p: any) => p.status !== "fechado");

  // Single add mutation
  const singleMut = useMutation({
    mutationFn: async () => {
      if (!addDialog || !user) throw new Error("Dados incompletos");
      const item = addDialog.item;
      const ppu = ppuMap.get(item.item_wbs);
      const classif = classifMap?.get(item.item_wbs);
      const valor = ppu?.preco_unit ? singleQtd * Number(ppu.preco_unit) : item.unit_valor * singleQtd;

      const { data: newRow, error } = await supabase
        .from("previsao_medicao")
        .insert({
          bm_name: targetBm,
          ippu: item.item_wbs,
          responsavel_id: user.id,
          responsavel_nome: profile?.full_name || "",
          disciplina: classif?.disciplina || item.disciplina || ppu?.disc || "",
          status: "previsto",
          qtd_prevista: singleQtd,
          valor_previsto: valor,
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("previsao_historico").insert({
        previsao_id: (newRow as any).id,
        bm_name: targetBm,
        ippu: item.item_wbs,
        status_anterior: "",
        status_novo: "previsto",
        justificativa: "Adicionado via reconciliação",
        alterado_por: user.id,
        alterado_por_nome: profile?.full_name || "",
      } as any);
    },
    onSuccess: () => {
      toast.success(`${addDialog!.item.item_wbs} adicionado à previsão ${targetBm}`);
      queryClient.invalidateQueries({ queryKey: ["previsao"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliacao-itens"] });
      queryClient.invalidateQueries({ queryKey: ["itens-nao-medidos"] });
      setAddDialog(null);
    },
    onError: (err: any) => toast.error("Erro: " + (err.message || "desconhecido")),
  });

  // Bulk add mutation
  const bulkMut = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      const selectedItems = deduped.filter(i => selected.has(i.item_wbs));
      let ok = 0;

      for (const item of selectedItems) {
        try {
          const ppu = ppuMap.get(item.item_wbs);
          const classif = classifMap?.get(item.item_wbs);
          const qtd = item.total_exec_geral || ppu?.qtd || 0;
          const valor = ppu?.preco_unit ? qtd * Number(ppu.preco_unit) : item.unit_valor * qtd;

          const { data: newRow, error } = await supabase
            .from("previsao_medicao")
            .insert({
              bm_name: targetBm,
              ippu: item.item_wbs,
              responsavel_id: user.id,
              responsavel_nome: profile?.full_name || "",
              disciplina: classif?.disciplina || item.disciplina || ppu?.disc || "",
              status: "previsto",
              qtd_prevista: qtd,
              valor_previsto: valor,
            } as any)
            .select("id")
            .single();
          if (error) continue;

          await supabase.from("previsao_historico").insert({
            previsao_id: (newRow as any).id,
            bm_name: targetBm,
            ippu: item.item_wbs,
            status_anterior: "",
            status_novo: "previsto",
            justificativa: "Adicionado via reconciliação em lote",
            alterado_por: user.id,
            alterado_por_nome: profile?.full_name || "",
          } as any);
          ok++;
        } catch { /* skip */ }
      }
      return ok;
    },
    onSuccess: (count) => {
      toast.success(`${count} itens adicionados à previsão ${targetBm}`);
      queryClient.invalidateQueries({ queryKey: ["previsao"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliacao-itens"] });
      queryClient.invalidateQueries({ queryKey: ["itens-nao-medidos"] });
      setSelected(new Set());
      setBulkDialog(false);
    },
    onError: (err: any) => toast.error("Erro: " + (err.message || "desconhecido")),
  });

  if (effectiveLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
      </div>
    );
  }

  if (deduped.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <CheckCircle2 className="h-12 w-12 text-emerald-500/40" />
        <p className="text-sm text-muted-foreground">Todos os itens executados estão cobertos — parabéns! 🎉</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar iPPU ou TAG..." value={search} onChange={e => setSearch(e.target.value)} className="w-56 h-8 text-xs pl-8" />
        </div>
        <Select value={discFilter} onValueChange={setDiscFilter}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Disciplina" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Disciplinas</SelectItem>
            {disciplinas.map(d => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || discFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setDiscFilter("all"); }} className="h-8 text-xs gap-1">
            <X className="h-3 w-3" /> Limpar
          </Button>
        )}
        {selected.size > 0 && (
          <Button size="sm" onClick={() => { setTargetBm(defaultBm); setBulkDialog(true); }} className="h-8 text-xs gap-1 ml-auto">
            <Plus className="h-3.5 w-3.5" /> Adicionar {selected.size} ao BM
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto max-h-[420px]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></TableHead>
              <TableHead className="text-xs">iPPU</TableHead>
              <TableHead className="text-xs">TAG</TableHead>
              <TableHead className="text-xs">Disciplina</TableHead>
              <TableHead className="text-xs text-right">Qtd Exec.</TableHead>
              <TableHead className="text-xs text-right">Avanço %</TableHead>
              <TableHead className="text-xs">BM Origem</TableHead>
              <TableHead className="text-xs w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row, i) => (
              <TableRow key={`${row.item_wbs}-${i}`}>
                <TableCell><Checkbox checked={selected.has(row.item_wbs)} onCheckedChange={() => toggleItem(row.item_wbs)} /></TableCell>
                <TableCell><Badge variant="outline" className="font-mono text-[10px]">{row.item_wbs}</Badge></TableCell>
                <TableCell className="text-xs font-mono truncate max-w-[120px]">{row.tag || "—"}</TableCell>
                <TableCell>{row.disciplina ? <Badge variant="outline" className="text-[10px]">{row.disciplina}</Badge> : "—"}</TableCell>
                <TableCell className="text-xs text-right tabular-nums font-mono">{row.total_exec_geral.toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-xs text-right tabular-nums">
                  <div className="flex items-center gap-1 justify-end">
                    <Progress value={row.avanco_ponderado * 100} className="h-1.5 w-10" />
                    <span className="text-[10px]">{(row.avanco_ponderado * 100).toFixed(0)}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {row.bms.map(b => <Badge key={b} variant="secondary" className="text-[9px]">{b}</Badge>)}
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => openSingle(row)}>
                    <Plus className="h-3 w-3" /> Incluir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between items-center px-3 py-2 bg-muted/50 rounded-lg text-sm">
        <span className="text-muted-foreground"><strong>{filtered.length}</strong> itens não conciliados</span>
        {selected.size > 0 && <span className="font-medium">{selected.size} selecionados</span>}
      </div>

      {/* Single Add Dialog */}
      <Dialog open={!!addDialog} onOpenChange={v => { if (!v) setAddDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Adicionar {addDialog?.item.item_wbs} à Previsão</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">BM Destino</label>
              <Select value={targetBm} onValueChange={setTargetBm}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {bmOptions.map((p: any) => (
                    <SelectItem key={p.bm_name} value={p.bm_name} className="text-xs">{p.bm_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Qtd Prevista</label>
              <Input
                type="number"
                value={singleQtd}
                onChange={e => setSingleQtd(Number(e.target.value) || 0)}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddDialog(null)}>Cancelar</Button>
            <Button size="sm" onClick={() => singleMut.mutate()} disabled={singleMut.isPending} className="gap-1">
              {singleMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={bulkDialog} onOpenChange={v => { if (!v) setBulkDialog(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Adicionar {selected.size} itens ao BM</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-xs font-medium">BM Destino</label>
            <Select value={targetBm} onValueChange={setTargetBm}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {bmOptions.map((p: any) => (
                  <SelectItem key={p.bm_name} value={p.bm_name} className="text-xs">{p.bm_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Cada item será incluído com a quantidade executada como qtd_prevista.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkDialog(false)}>Cancelar</Button>
            <Button size="sm" onClick={() => bulkMut.mutate()} disabled={bulkMut.isPending} className="gap-1">
              {bulkMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Adicionar {selected.size} Itens
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
