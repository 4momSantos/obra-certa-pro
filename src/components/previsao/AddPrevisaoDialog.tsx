import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface PPUItem {
  item_ppu: string;
  descricao: string;
  fase: string;
  disc: string;
  valor_total: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  bmName: string;
  ppuItems: PPUItem[];
  existingIppus: Set<string>;
}

export function AddPrevisaoDialog({ open, onClose, bmName, ppuItems, existingIppus }: Props) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPpu, setSelectedPpu] = useState<string>("");
  const [valorPrevisto, setValorPrevisto] = useState("");
  const [qtdPrevista, setQtdPrevista] = useState("");

  const available = useMemo(() => {
    const filtered = ppuItems.filter(p => !existingIppus.has(p.item_ppu));
    if (!search) return filtered.slice(0, 50);
    const s = search.toLowerCase();
    return filtered.filter(p =>
      p.item_ppu.toLowerCase().includes(s) || (p.descricao || "").toLowerCase().includes(s)
    ).slice(0, 50);
  }, [ppuItems, existingIppus, search]);

  const selectedItem = ppuItems.find(p => p.item_ppu === selectedPpu);

  const handleSave = async () => {
    if (!selectedPpu || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("previsao_medicao").insert({
        bm_name: bmName,
        ippu: selectedPpu,
        responsavel_id: user.id,
        responsavel_nome: profile?.full_name || "",
        disciplina: selectedItem?.disc || "",
        status: "previsto",
        qtd_prevista: Number(qtdPrevista) || 0,
        valor_previsto: Number(valorPrevisto) || selectedItem?.valor_total || 0,
      } as any);
      if (error) throw error;
      toast.success(`Item ${selectedPpu} adicionado à previsão`);
      queryClient.invalidateQueries({ queryKey: ["previsao", bmName] });
      queryClient.invalidateQueries({ queryKey: ["previsao-resumo", bmName] });
      onClose();
      setSelectedPpu("");
      setValorPrevisto("");
      setQtdPrevista("");
      setSearch("");
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Item à Previsão — {bmName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Buscar iPPU</Label>
            <Input
              placeholder="Filtrar por iPPU ou descrição..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 text-xs mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Item PPU</Label>
            <Select value={selectedPpu} onValueChange={setSelectedPpu}>
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue placeholder="Selecione um item..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {available.map(p => (
                  <SelectItem key={p.item_ppu} value={p.item_ppu} className="text-xs">
                    <span className="font-mono">{p.item_ppu}</span>
                    <span className="text-muted-foreground ml-2">{(p.descricao || "").slice(0, 40)}</span>
                  </SelectItem>
                ))}
                {available.length === 0 && (
                  <div className="p-2 text-xs text-muted-foreground text-center">Nenhum item disponível</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedItem && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              <p><strong>Descrição:</strong> {selectedItem.descricao}</p>
              <p><strong>Fase:</strong> {selectedItem.fase} · <strong>Disciplina:</strong> {selectedItem.disc}</p>
              <p><strong>Valor contratual:</strong> R$ {(selectedItem.valor_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Qtd Prevista</Label>
              <Input
                type="number"
                value={qtdPrevista}
                onChange={e => setQtdPrevista(e.target.value)}
                className="h-8 text-xs mt-1"
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">Valor Previsto (R$)</Label>
              <Input
                type="number"
                value={valorPrevisto}
                onChange={e => setValorPrevisto(e.target.value)}
                className="h-8 text-xs mt-1"
                placeholder={selectedItem ? String(selectedItem.valor_total) : "0"}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} size="sm">Cancelar</Button>
          <Button onClick={handleSave} size="sm" disabled={!selectedPpu || saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
