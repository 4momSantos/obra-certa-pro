import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ClipboardList, Plus, Lock, FileCheck, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBMPeriodos, usePrevisaoBM, usePrevisaoResumo, usePPUElegiveis, useSconMap, useClassifMap, useProjetadoBM } from "@/hooks/usePrevisao";
import { PrevisaoKPIs } from "@/components/previsao/PrevisaoKPIs";
import { PrevisaoResumo } from "@/components/previsao/PrevisaoResumo";
import { PrevisaoTable } from "@/components/previsao/PrevisaoTable";
import { AddItemDialog } from "@/components/previsao/AddItemDialog";

function formatDateBR(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR");
}

export default function PrevisaoMedicao() {
  const { data: periodos, isLoading: loadingPeriodos } = useBMPeriodos();
  const { data: ppuItems } = usePPUElegiveis();
  const { data: sconMap } = useSconMap();
  const { data: classifMap } = useClassifMap();
  const [addOpen, setAddOpen] = useState(false);

  // Find default BM (aberto or ultimo + 1)
  const defaultBm = useMemo(() => {
    if (!periodos) return null;
    const aberto = periodos.find((p: any) => p.status === "aberto");
    if (aberto) return aberto;
    const fechados = periodos.filter((p: any) => p.status === "fechado");
    if (fechados.length > 0) {
      const maxNum = Math.max(...fechados.map((f: any) => f.bm_number));
      return periodos.find((p: any) => p.bm_number === maxNum + 1) || periodos[0];
    }
    return periodos[0];
  }, [periodos]);

  const [selectedBmName, setSelectedBmName] = useState<string | null>(null);
  const effectiveBm = selectedBmName || defaultBm?.bm_name || "BM-01";

  const selectedPeriodo = periodos?.find((p: any) => p.bm_name === effectiveBm);
  const isFechado = selectedPeriodo?.status === "fechado";

  const { data: previsoes, isLoading: loadingPrevisoes } = usePrevisaoBM(effectiveBm);
  const { data: resumo } = usePrevisaoResumo(effectiveBm);
  const { data: projetado } = useProjetadoBM(effectiveBm);

  // Build enriched items
  const ppuMap = useMemo(() => {
    const m = new Map<string, any>();
    (ppuItems || []).forEach((p: any) => m.set(p.item_ppu, p));
    return m;
  }, [ppuItems]);

  const enrichedItems = useMemo(() => {
    if (!previsoes) return [];
    return previsoes.map((p: any) => {
      const ppu = ppuMap.get(p.ippu);
      const normalizedIppu = String(p.ippu).replace(/_/g, "-");
      return {
        id: p.id,
        ippu: p.ippu,
        status: p.status,
        disciplina: p.disciplina || ppu?.disc || "",
        responsavel_nome: p.responsavel_nome || "",
        qtd_prevista: Number(p.qtd_prevista) || 0,
        valor_previsto: Number(p.valor_previsto) || 0,
        justificativa: p.justificativa || "",
        descricao: ppu?.descricao || "",
        scon_pct: sconMap?.get(normalizedIppu) || 0,
      };
    });
  }, [previsoes, ppuMap, sconMap]);

  // KPI calculations
  const itensAtivos = enrichedItems.filter(i => i.status === "previsto" || i.status === "confirmado").length;
  const valorAtivo = enrichedItems.filter(i => i.status === "previsto" || i.status === "confirmado").reduce((s, i) => s + i.valor_previsto, 0);
  const postergados = enrichedItems.filter(i => i.status === "postergado").length;
  const valorPostergado = enrichedItems.filter(i => i.status === "postergado").reduce((s, i) => s + i.valor_previsto, 0);
  const existingIppus = new Set(enrichedItems.map(i => i.ippu));

  const isLoading = loadingPeriodos || loadingPrevisoes;

  // Empty state
  if (!isLoading && enrichedItems.length === 0 && !loadingPeriodos) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-4 md:p-6">
        <PageHeader
          effectiveBm={effectiveBm}
          periodos={periodos}
          selectedPeriodo={selectedPeriodo}
          isFechado={isFechado}
          onSelectBm={setSelectedBmName}
          onAddClick={() => setAddOpen(true)}
        />
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <ClipboardList className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg font-medium">Nenhuma previsão para {effectiveBm}</p>
          <p className="text-sm text-muted-foreground">Adicione itens que planeja medir neste boletim.</p>
          {!isFechado && (
            <Button onClick={() => setAddOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Adicionar Item
            </Button>
          )}
        </div>
        <AddItemDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          bmName={effectiveBm}
          ppuItems={ppuItems || []}
          existingIppus={existingIppus}
          sconMap={sconMap}
          classifMap={classifMap}
        />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-4 md:p-6">
      <PageHeader
        effectiveBm={effectiveBm}
        periodos={periodos}
        selectedPeriodo={selectedPeriodo}
        isFechado={isFechado}
        onSelectBm={setSelectedBmName}
        onAddClick={() => setAddOpen(true)}
      />

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : (
        <PrevisaoKPIs
          itensAtivos={itensAtivos}
          valorAtivo={valorAtivo}
          postergados={postergados}
          valorPostergado={valorPostergado}
          projetado={projetado || 0}
          preenchidos={existingIppus.size}
          totalElegiveis={ppuItems?.length || 0}
        />
      )}

      {/* Resumo */}
      {!isLoading && resumo && (
        <PrevisaoResumo
          data={(resumo || []).map((r: any) => ({
            disciplina: r.disciplina || "",
            responsavel_nome: r.responsavel_nome || "",
            total_itens: Number(r.total_itens) || 0,
            ativos: Number(r.ativos) || 0,
            postergados: Number(r.postergados) || 0,
            valor_ativo: Number(r.valor_ativo) || 0,
            valor_postergado: Number(r.valor_postergado) || 0,
          }))}
        />
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
        </div>
      ) : (
        <PrevisaoTable items={enrichedItems} readonly={isFechado} bmName={effectiveBm} />
      )}

      <AddItemDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        bmName={effectiveBm}
        ppuItems={ppuItems || []}
        existingIppus={existingIppus}
        sconMap={sconMap}
        classifMap={classifMap}
      />
    </motion.div>
  );
}

// ── Header sub-component ───────────────────────────────────────────
function PageHeader({
  effectiveBm, periodos, selectedPeriodo, isFechado, onSelectBm, onAddClick,
}: {
  effectiveBm: string;
  periodos: any[] | undefined;
  selectedPeriodo: any;
  isFechado: boolean;
  onSelectBm: (v: string) => void;
  onAddClick: () => void;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Previsão de Medição — {effectiveBm}</h1>
          {isFechado && (
            <Badge variant="outline" className="text-[10px] gap-1 border-red-300 text-red-600">
              <Lock className="h-3 w-3" /> FECHADO
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedPeriodo
            ? `Período: ${formatDateBR(selectedPeriodo.periodo_inicio)} → ${formatDateBR(selectedPeriodo.periodo_fim)}`
            : "Carregando período..."
          }
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Select value={effectiveBm} onValueChange={onSelectBm}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(periodos || []).map((p: any) => (
              <SelectItem key={p.bm_name} value={p.bm_name} className="text-xs">
                {p.bm_name} {p.status === "fechado" ? "(Fechado)" : p.status === "aberto" ? "(Aberto)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={onAddClick} size="sm" disabled={isFechado} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Adicionar Item
        </Button>
      </div>
    </div>
  );
}
