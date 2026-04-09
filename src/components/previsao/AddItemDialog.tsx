import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, X } from "lucide-react";
import { formatCompact } from "@/lib/format";
import { useSaldoPPU } from "@/hooks/useAcompanhamento";

interface PPUItem {
  item_ppu: string;
  descricao: string;
  fase: string;
  subfase: string;
  agrupamento: string;
  disc: string;
  valor_total: number;
  preco_unit: number;
  qtd: number;
}

interface SelectedItemData {
  ippu: string;
  descricao: string;
  disciplina: string;
  preco_unit: number;
  qtd_disponivel: number;
  valor_total: number;
  qtd_prevista: string;
  valor_previsto: string;
  comentario: string;
  valor_manual: boolean; // if user manually edited valor
}

interface Props {
  open: boolean;
  onClose: () => void;
  bmName: string;
  ppuItems: PPUItem[];
  existingIppus: Set<string>;
  sconMap?: Map<string, number>;
  classifMap?: Map<string, { disciplina: string }>;
}

export function AddItemDialog({ open, onClose, bmName, ppuItems, existingIppus, sconMap, classifMap }: Props) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: saldoMap } = useSaldoPPU();

  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [discFilter, setDiscFilter] = useState("all");
  const [faseFilter, setFaseFilter] = useState("all");
  const [subfaseFilter, setSubfaseFilter] = useState("all");
  const [agrupFilter, setAgrupFilter] = useState("all");
  const [valorMinFilter, setValorMinFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [itemData, setItemData] = useState<Map<string, SelectedItemData>>(new Map());

  // Available PPUs
  const { available, totalFiltered } = useMemo(() => {
    let items = ppuItems.filter(p => (Number(p.valor_total) || 0) > 0 && !existingIppus.has(p.item_ppu));
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(p =>
        p.item_ppu.toLowerCase().includes(s) || (p.descricao || "").toLowerCase().includes(s)
      );
    }
    if (discFilter !== "all") {
      items = items.filter(p => {
        const cl = classifMap?.get(p.item_ppu);
        return (cl?.disciplina || p.disc || "") === discFilter;
      });
    }
    if (faseFilter !== "all") {
      items = items.filter(p => (p.fase || "") === faseFilter);
    }
    if (subfaseFilter !== "all") {
      items = items.filter(p => (p.subfase || "") === subfaseFilter);
    }
    if (agrupFilter !== "all") {
      items = items.filter(p => (p.agrupamento || "") === agrupFilter);
    }
    if (valorMinFilter) {
      const min = Number(valorMinFilter) || 0;
      items = items.filter(p => (Number(p.valor_total) || 0) >= min);
    }
    items.sort((a, b) => (Number(b.valor_total) || 0) - (Number(a.valor_total) || 0));
    return {
      available: items.slice(0, 200),
      totalFiltered: items.length
    };
  }, [ppuItems, search, discFilter, faseFilter, subfaseFilter, agrupFilter, valorMinFilter, classifMap, existingIppus]);

  const disciplinas = useMemo(() => {
    const set = new Set<string>();
    ppuItems.forEach(p => {
      const d = classifMap?.get(p.item_ppu)?.disciplina || p.disc;
      if (d) set.add(d);
    });
    return [...set].sort();
  }, [ppuItems, classifMap]);

  const fases = useMemo(() => [...new Set(ppuItems.map(p => p.fase).filter(Boolean))].sort(), [ppuItems]);
  const subfases = useMemo(() => {
    const items = faseFilter !== "all" ? ppuItems.filter(p => p.fase === faseFilter) : ppuItems;
    return [...new Set(items.map(p => p.subfase).filter(Boolean))].sort();
  }, [ppuItems, faseFilter]);
  const agrupamentos = useMemo(() => [...new Set(ppuItems.map(p => p.agrupamento).filter(Boolean))].sort(), [ppuItems]);

  const toggleItem = useCallback((ippu: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(ippu)) next.delete(ippu);
      else next.add(ippu);
      return next;
    });
  }, []);

  const goToStep2 = () => {
    // Initialize itemData for selected items
    const data = new Map<string, SelectedItemData>();
    selected.forEach(ippu => {
      const existing = itemData.get(ippu);
      if (existing) {
        data.set(ippu, existing);
        return;
      }
      const ppu = ppuItems.find(p => p.item_ppu === ippu);
      const preco = Number(ppu?.preco_unit) || 0;
      const qtd = Number(ppu?.qtd) || 0;
      const cl = classifMap?.get(ippu);
      data.set(ippu, {
        ippu,
        descricao: ppu?.descricao || "",
        disciplina: cl?.disciplina || ppu?.disc || "",
        preco_unit: preco,
        qtd_disponivel: qtd,
        valor_total: Number(ppu?.valor_total) || 0,
        qtd_prevista: qtd > 0 ? String(qtd) : "",
        valor_previsto: preco > 0 && qtd > 0 ? String(preco * qtd) : String(Number(ppu?.valor_total) || 0),
        comentario: "",
        valor_manual: false,
      });
    });
    setItemData(data);
    setStep(2);
  };

  const updateItemField = (ippu: string, field: keyof SelectedItemData, value: string) => {
    setItemData(prev => {
      const next = new Map(prev);
      const item = { ...next.get(ippu)! };
      if (field === "qtd_prevista") {
        item.qtd_prevista = value;
        // Auto-recalc valor if not manually edited
        if (!item.valor_manual && item.preco_unit > 0) {
          const q = Number(value) || 0;
          item.valor_previsto = String(q * item.preco_unit);
        }
      } else if (field === "valor_previsto") {
        item.valor_previsto = value;
        item.valor_manual = true;
      } else if (field === "comentario") {
        item.comentario = value;
      }
      next.set(ippu, item);
      return next;
    });
  };

  const totalValor = useMemo(() => {
    let s = 0;
    itemData.forEach(d => { s += Number(d.valor_previsto) || 0; });
    return s;
  }, [itemData]);

  const handleSave = async () => {
    if (!user || itemData.size === 0) return;
    setSaving(true);
    try {
      let count = 0;
      for (const [, item] of itemData) {
        const { data: prev, error } = await supabase
          .from("previsao_medicao")
          .insert({
            bm_name: bmName,
            ippu: String(item.ippu).replace(/_/g, "-"), // normaliza para traços
            responsavel_id: user.id,
            responsavel_nome: profile?.full_name || "",
            disciplina: item.disciplina || "",
            status: "previsto",
            qtd_prevista: Number(item.qtd_prevista) || 0,
            valor_previsto: Number(item.valor_previsto) || 0,
            justificativa: item.comentario || "",
          } as any)
          .select()
          .single();
        if (error) throw error;

        // Register history
        await supabase.from("previsao_historico").insert({
          previsao_id: (prev as any).id,
          bm_name: bmName,
          ippu: String(item.ippu).replace(/_/g, "-"),
          status_anterior: "",
          status_novo: "previsto",
          justificativa: "Adicionado à previsão",
          alterado_por: user.id,
          alterado_por_nome: profile?.full_name || "",
        } as any);

        count++;
      }

      toast.success(`${count} ${count === 1 ? "item adicionado" : "itens adicionados"} à previsão do ${bmName}`);
      queryClient.invalidateQueries({ queryKey: ["previsao", bmName] });
      queryClient.invalidateQueries({ queryKey: ["previsao-resumo", bmName] });
      resetAndClose();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setSearch("");
    setDiscFilter("all");
    setFaseFilter("all");
    setSubfaseFilter("all");
    setAgrupFilter("all");
    setValorMinFilter("");
    setSelected(new Set());
    setItemData(new Map());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) resetAndClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Adicionar Itens à Previsão — {bmName}</span>
            <div className="flex items-center gap-1 ml-auto">
              <StepIndicator n={1} active={step === 1} done={step === 2} label="Selecionar" />
              <div className="w-6 h-px bg-border" />
              <StepIndicator n={2} active={step === 2} done={false} label="Detalhar" />
            </div>
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <Step1
            available={available}
            totalFiltered={totalFiltered}
            existingIppus={existingIppus}
            selected={selected}
            onToggle={toggleItem}
            search={search}
            onSearch={setSearch}
            discFilter={discFilter}
            onDiscFilter={setDiscFilter}
            faseFilter={faseFilter}
            onFaseFilter={v => { setFaseFilter(v); setSubfaseFilter("all"); }}
            subfaseFilter={subfaseFilter}
            onSubfaseFilter={setSubfaseFilter}
            agrupFilter={agrupFilter}
            onAgrupFilter={setAgrupFilter}
            valorMinFilter={valorMinFilter}
            onValorMinFilter={setValorMinFilter}
            disciplinas={disciplinas}
            fases={fases}
            subfases={subfases}
            agrupamentos={agrupamentos}
            sconMap={sconMap}
            classifMap={classifMap}
          />
        ) : (
          <Step2
            itemData={itemData}
            onUpdateField={updateItemField}
            saldoMap={saldoMap}
          />
        )}

        <DialogFooter className="border-t pt-3 mt-auto">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-muted-foreground">
              {step === 1
                ? `${selected.size} ${selected.size === 1 ? "item selecionado" : "itens selecionados"}`
                : `Adicionando ${itemData.size} itens — ${formatCompact(totalValor)}`
              }
            </span>
            <div className="flex gap-2">
              {step === 2 && (
                <Button variant="outline" size="sm" onClick={() => setStep(1)} className="gap-1">
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar
                </Button>
              )}
              {step === 1 ? (
                <Button size="sm" disabled={selected.size === 0} onClick={goToStep2} className="gap-1">
                  Próximo <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button size="sm" disabled={saving || itemData.size === 0} onClick={handleSave} className="gap-1">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                  Adicionar à Previsão
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Step indicator ─────────────────────────────────────────────
function StepIndicator({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${
        active ? "bg-primary text-primary-foreground" :
        done ? "bg-primary/20 text-primary" :
        "bg-muted text-muted-foreground"
      }`}>
        {done ? "✓" : n}
      </div>
      <span className={`text-[11px] ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

// ── Step 1: Select items ───────────────────────────────────────
function Step1({
  available, totalFiltered, existingIppus, selected, onToggle, search, onSearch,
  discFilter, onDiscFilter, faseFilter, onFaseFilter, subfaseFilter, onSubfaseFilter,
  agrupFilter, onAgrupFilter, valorMinFilter, onValorMinFilter,
  disciplinas, fases, subfases, agrupamentos, sconMap, classifMap,
}: {
  available: PPUItem[];
  totalFiltered: number;
  existingIppus: Set<string>;
  selected: Set<string>;
  onToggle: (ippu: string) => void;
  search: string;
  onSearch: (v: string) => void;
  discFilter: string;
  onDiscFilter: (v: string) => void;
  faseFilter: string;
  onFaseFilter: (v: string) => void;
  subfaseFilter: string;
  onSubfaseFilter: (v: string) => void;
  agrupFilter: string;
  onAgrupFilter: (v: string) => void;
  valorMinFilter: string;
  onValorMinFilter: (v: string) => void;
  disciplinas: string[];
  fases: string[];
  subfases: string[];
  agrupamentos: string[];
  sconMap?: Map<string, number>;
  classifMap?: Map<string, { disciplina: string }>;
}) {
  const hasFilters = search || discFilter !== "all" || faseFilter !== "all" || subfaseFilter !== "all" || agrupFilter !== "all" || valorMinFilter;

  if (available.length === 0 && !hasFilters) {
    return (
      <div className="flex-1 flex items-center justify-center py-12 text-center">
        <div>
          <CheckCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Todos os PPUs já foram adicionados a este BM.</p>
        </div>
      </div>
    );
  }

  const clearAll = () => {
    onSearch(""); onDiscFilter("all"); onFaseFilter("all"); onSubfaseFilter("all"); onAgrupFilter("all"); onValorMinFilter("");
  };

  return (
    <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
      {/* Row 1: Search + value min */}
      <div className="flex gap-2">
        <Input
          placeholder="Buscar iPPU ou descrição..."
          value={search}
          onChange={e => onSearch(e.target.value)}
          className="h-8 text-xs flex-1"
        />
        <Input
          placeholder="Valor mín. (R$)"
          type="number"
          value={valorMinFilter}
          onChange={e => onValorMinFilter(e.target.value)}
          className="h-8 text-xs w-32"
        />
      </div>
      {/* Row 2: Dropdown filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={discFilter} onValueChange={onDiscFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Disciplina" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Disc.</SelectItem>
            {disciplinas.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={faseFilter} onValueChange={onFaseFilter}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Fase" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Fases</SelectItem>
            {fases.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={subfaseFilter} onValueChange={onSubfaseFilter}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Subfase" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Subfases</SelectItem>
            {subfases.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={agrupFilter} onValueChange={onAgrupFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Agrupamento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Agrup.</SelectItem>
            {agrupamentos.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 text-xs gap-1 px-2">
            <X className="h-3 w-3" /> Limpar
          </Button>
        )}
      </div>

      {totalFiltered > 200 && (
        <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 rounded-md border border-amber-200 dark:border-amber-900/40 font-medium">
          Mostrando os 200 de maior valor ({totalFiltered} encontrados). Refine os filtros.
        </div>
      )}

      {/* Table with proper scroll */}
      <div className="flex-1 min-h-0 border rounded-lg overflow-y-auto max-h-[50vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 sticky top-0 bg-background z-10" />
                <TableHead className="text-xs w-28 sticky top-0 bg-background z-10">iPPU</TableHead>
                <TableHead className="text-xs sticky top-0 bg-background z-10">Descrição</TableHead>
                <TableHead className="text-xs w-24 sticky top-0 bg-background z-10">Disciplina</TableHead>
                <TableHead className="text-xs text-right w-24 sticky top-0 bg-background z-10">Valor Total</TableHead>
                <TableHead className="text-xs w-20 sticky top-0 bg-background z-10">SCON %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {available.map(ppu => {
                const normalizedIppu = String(ppu.item_ppu).replace(/_/g, "-");
                const isExisting = existingIppus.has(normalizedIppu);
                const isChecked = selected.has(ppu.item_ppu);
                const scon = sconMap?.get(normalizedIppu) || 0;
                const disc = classifMap?.get(ppu.item_ppu)?.disciplina || ppu.disc || "";

                return (
                  <TableRow
                    key={ppu.item_ppu}
                    className={isExisting ? "opacity-50" : isChecked ? "bg-primary/5" : "cursor-pointer hover:bg-muted/50"}
                    onClick={() => !isExisting && onToggle(ppu.item_ppu)}
                  >
                    <TableCell className="pr-0">
                      {isExisting ? (
                        <Badge variant="outline" className="text-[9px] border-0 bg-muted text-muted-foreground">Já add.</Badge>
                      ) : (
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => onToggle(ppu.item_ppu)}
                          onClick={e => e.stopPropagation()}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-[11px] text-primary">{ppu.item_ppu}</span>
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{ppu.descricao || "—"}</TableCell>
                    <TableCell>
                      {disc ? <Badge variant="outline" className="text-[10px]">{disc}</Badge> : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{formatCompact(Number(ppu.valor_total) || 0)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Progress value={scon} className="h-1.5 w-10" />
                        <span className="text-[10px] tabular-nums text-muted-foreground">{scon.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {available.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum item encontrado com os filtros atuais.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}

// ── Step 2: Detail items ───────────────────────────────────────
function Step2({
  itemData,
  onUpdateField,
  saldoMap,
}: {
  itemData: Map<string, SelectedItemData>;
  onUpdateField: (ippu: string, field: keyof SelectedItemData, value: string) => void;
  saldoMap?: Map<string, { qtd_contratada: number; valor_contratado: number; valor_medido: number; saldo: number }>;
}) {
  const items = [...itemData.values()];

  return (
    <ScrollArea className="flex-1 max-h-[450px]">
      <div className="space-y-3 pr-3">
        {items.map(item => (
          <div key={item.ippu} className="border rounded-lg p-3 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded">
                {item.ippu}
              </span>
              <span className="text-xs text-muted-foreground truncate flex-1">{item.descricao}</span>
              {item.disciplina && (
                <Badge variant="outline" className="text-[10px] shrink-0">{item.disciplina}</Badge>
              )}
            </div>

            {/* Saldo indicator */}
            {(() => {
              const saldo = saldoMap?.get(item.ippu);
              if (!saldo) return null;
              const valorPrev = Number(item.valor_previsto) || 0;
              const excede = valorPrev > saldo.saldo && saldo.saldo >= 0;
              return (
                <div className={`text-[10px] px-2 py-1.5 rounded border ${excede ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-muted/50 border-border text-muted-foreground"}`}>
                  <div className="flex items-center justify-between">
                    <span>Contratado: {formatCompact(saldo.valor_contratado)}</span>
                    <span>Já medido: {formatCompact(saldo.valor_medido)}</span>
                    <span className="font-semibold">Saldo: {formatCompact(saldo.saldo)}</span>
                  </div>
                  {excede && (
                    <div className="flex items-center gap-1 mt-1 font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      Valor previsto ({formatCompact(valorPrev)}) excede o saldo disponível
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">Qtd Prevista</Label>
                <Input
                  type="number"
                  value={item.qtd_prevista}
                  onChange={e => onUpdateField(item.ippu, "qtd_prevista", e.target.value)}
                  className="h-8 text-xs mt-0.5"
                  placeholder="0"
                />
                {item.qtd_disponivel > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Disponível: {item.qtd_disponivel.toLocaleString("pt-BR")} un
                  </p>
                )}
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Valor Previsto (R$)</Label>
                <Input
                  type="number"
                  value={item.valor_previsto}
                  onChange={e => onUpdateField(item.ippu, "valor_previsto", e.target.value)}
                  className="h-8 text-xs mt-0.5"
                  placeholder="0"
                />
                {item.preco_unit > 0 && !item.valor_manual && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Auto: Qtd × R$ {item.preco_unit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>

            {/* Comment */}
            <div>
              <Label className="text-[11px] text-muted-foreground">Comentário (opcional)</Label>
              <Textarea
                value={item.comentario}
                onChange={e => onUpdateField(item.ippu, "comentario", e.target.value)}
                className="text-xs mt-0.5 min-h-[40px] resize-none"
                placeholder="Observação sobre este item..."
                rows={1}
              />
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
