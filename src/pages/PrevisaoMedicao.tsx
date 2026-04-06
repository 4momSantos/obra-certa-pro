import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ClipboardList, Plus, Lock, FileCheck, Loader2, Activity, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useBMPeriodos, usePrevisaoBM, usePrevisaoResumo, usePPUElegiveis, useSconMap, useClassifMap, useProjetadoBM } from "@/hooks/usePrevisao";
import { useSconExecucaoBM, useItensNaoMedidos } from "@/hooks/useSconExecucao";
import { PrevisaoKPIs } from "@/components/previsao/PrevisaoKPIs";
import { PrevisaoResumo } from "@/components/previsao/PrevisaoResumo";
import { PrevisaoTable } from "@/components/previsao/PrevisaoTable";
import { SconExecucaoTable } from "@/components/previsao/SconExecucaoTable";
import { PassivosTable } from "@/components/previsao/PassivosTable";
import { AddItemDialog } from "@/components/previsao/AddItemDialog";
import { useGerarBoletim, useBoletim } from "@/hooks/useBoletim";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

function formatDateBR(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR");
}

export default function PrevisaoMedicao() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: periodos, isLoading: loadingPeriodos } = useBMPeriodos();
  const { data: ppuItems } = usePPUElegiveis();
  const { data: sconMap } = useSconMap();
  const { data: classifMap } = useClassifMap();
  const [addOpen, setAddOpen] = useState(false);

  const defaultBm = useMemo(() => {
    if (!periodos) return null;
    const aberto = periodos.find((p: any) => p.status === "aberto");
    if (aberto) return aberto;
    const fechados = periodos.filter((p: any) => p.status === "fechado");
    if (fechados.length > 0) {
      const maxNum = Math.max(...fechados.map((f: any) => f.bm_number));
      // Tenta o próximo BM após o mais recente fechado; senão retorna o mais recente fechado
      return periodos.find((p: any) => p.bm_number === maxNum + 1)
        || periodos.find((p: any) => p.bm_number === maxNum)
        || periodos[periodos.length - 1];
    }
    return periodos[periodos.length - 1] || periodos[0];
  }, [periodos]);

  const [selectedBmName, setSelectedBmName] = useState<string | null>(null);
  const effectiveBm = selectedBmName || defaultBm?.bm_name || "BM-01";

  const selectedPeriodo = periodos?.find((p: any) => p.bm_name === effectiveBm);
  const isFechado = selectedPeriodo?.status === "fechado";

  const { data: previsoes, isLoading: loadingPrevisoes } = usePrevisaoBM(effectiveBm);
  const { data: resumo } = usePrevisaoResumo(effectiveBm);
  const { data: projetado } = useProjetadoBM(effectiveBm);
  const { data: sconExecucao, isLoading: loadingScon } = useSconExecucaoBM(effectiveBm);
  const { data: passivos, isLoading: loadingPassivos } = useItensNaoMedidos(effectiveBm);

  const ppuMap = useMemo(() => {
    const m = new Map<string, any>();
    (ppuItems || []).forEach((p: any) => {
      // Normaliza para traços para compatibilidade com item_wbs do SCON
      const key = String(p.item_ppu).replace(/_/g, "-");
      m.set(key, p);
    });
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

  const itensAtivos = enrichedItems.filter(i => i.status === "previsto" || i.status === "confirmado").length;
  const valorAtivo = enrichedItems.filter(i => i.status === "previsto" || i.status === "confirmado").reduce((s, i) => s + i.valor_previsto, 0);
  const postergados = enrichedItems.filter(i => i.status === "postergado").length;
  const valorPostergado = enrichedItems.filter(i => i.status === "postergado").reduce((s, i) => s + i.valor_previsto, 0);
  // Normaliza para traços para compatibilidade com item_wbs do SCON e item_ppu da PPU
  const existingIppus = new Set<string>(enrichedItems.map(i => String(i.ippu).replace(/_/g, "-")));
  const hasConfirmed = itensAtivos > 0;

  const isLoading = loadingPeriodos || loadingPrevisoes;

  // Bulk add items from SCON or Passivos
  const handleBulkAdd = async (ippus: string[]) => {
    if (!user) return;
    const newIppus = ippus.filter(ippu => !existingIppus.has(ippu));
    if (newIppus.length === 0) {
      toast.info("Todos os itens já estão na previsão.");
      return;
    }

    const inserts = newIppus.map(ippu => {
      const ppu = ppuMap.get(ippu);
      const classif = classifMap?.get(ippu);
      return {
        bm_name: effectiveBm,
        ippu,
        responsavel_id: user.id,
        responsavel_nome: profile?.full_name || "",
        disciplina: classif?.disciplina || ppu?.disc || "",
        status: "previsto",
        valor_previsto: ppu?.valor_total || 0,
        qtd_prevista: ppu?.qtd || 0,
      };
    });

    const { error } = await supabase.from("previsao_medicao").insert(inserts as any);
    if (error) {
      toast.error("Erro ao adicionar itens: " + error.message);
      return;
    }
    toast.success(`${newIppus.length} itens adicionados à previsão.`);
    queryClient.invalidateQueries({ queryKey: ["previsao", effectiveBm] });
    queryClient.invalidateQueries({ queryKey: ["previsao-resumo", effectiveBm] });
  };

  // Counts for tab badges
  const sconCount = sconExecucao?.length || 0;
  const passivosCount = passivos?.length || 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-4 md:p-6">
      <PageHeader
        effectiveBm={effectiveBm}
        periodos={periodos}
        selectedPeriodo={selectedPeriodo}
        isFechado={isFechado}
        onSelectBm={setSelectedBmName}
        onAddClick={() => setAddOpen(true)}
        hasConfirmed={hasConfirmed}
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
          sconExecutados={sconCount}
          cobertura={sconCount > 0 ? (existingIppus.size / sconCount) * 100 : 0}
          passivosCount={passivosCount}
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

      {/* Tabs */}
      <Tabs defaultValue="scon" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scon" className="gap-1.5 text-xs">
            <Activity className="h-3.5 w-3.5" />
            Execução SCON
            {sconCount > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">{sconCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="previsao" className="gap-1.5 text-xs">
            <ClipboardList className="h-3.5 w-3.5" />
            Previsão Atual
            {enrichedItems.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">{enrichedItems.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="passivos" className="gap-1.5 text-xs">
            <AlertTriangle className="h-3.5 w-3.5" />
            Passivos
            {passivosCount > 0 && <Badge variant="destructive" className="ml-1 text-[10px] h-5 px-1.5">{passivosCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scon">
          {loadingScon ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
            </div>
          ) : (
            <SconExecucaoTable
              items={sconExecucao || []}
              existingIppus={existingIppus}
              onAddItems={handleBulkAdd}
            />
          )}
        </TabsContent>

        <TabsContent value="previsao">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
            </div>
          ) : enrichedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <ClipboardList className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhuma previsão para {effectiveBm}. Use a aba "Execução SCON" para selecionar itens.</p>
              {!isFechado && (
                <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Adicionar Manualmente
                </Button>
              )}
            </div>
          ) : (
            <PrevisaoTable items={enrichedItems} readonly={isFechado} bmName={effectiveBm} />
          )}
        </TabsContent>

        <TabsContent value="passivos">
          {loadingPassivos ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
            </div>
          ) : (
            <PassivosTable items={passivos || []} onAddItems={handleBulkAdd} />
          )}
        </TabsContent>
      </Tabs>

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
  effectiveBm, periodos, selectedPeriodo, isFechado, onSelectBm, onAddClick, hasConfirmed,
}: {
  effectiveBm: string;
  periodos: any[] | undefined;
  selectedPeriodo: any;
  isFechado: boolean;
  onSelectBm: (v: string) => void;
  onAddClick: () => void;
  hasConfirmed: boolean;
}) {
  const navigate = useNavigate();
  const gerarBoletim = useGerarBoletim();
  const { data: existingBoletim } = useBoletim(effectiveBm);

  const handleGerar = () => {
    gerarBoletim.mutate(
      { bmName: effectiveBm },
      {
        onSuccess: ({ bmName }) => {
          toast.success("Boletim gerado com sucesso");
          navigate(`/boletim/${bmName}`);
        },
        onError: (err: any) => toast.error("Erro: " + (err.message || "desconhecido")),
      }
    );
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Previsão de Medição — {effectiveBm}</h1>
          {isFechado && (
            <Badge variant="outline" className="text-[10px] gap-1 border-destructive/30 text-destructive">
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
        {existingBoletim ? (
          <Button size="sm" variant="outline" onClick={() => navigate(`/boletim/${effectiveBm}`)} className="gap-1">
            <FileCheck className="h-3.5 w-3.5" /> Ver Boletim
          </Button>
        ) : (
          !isFechado && hasConfirmed && (
            <Button size="sm" variant="outline" onClick={handleGerar} disabled={gerarBoletim.isPending} className="gap-1">
              {gerarBoletim.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCheck className="h-3.5 w-3.5" />}
              Gerar Boletim
            </Button>
          )
        )}
      </div>
    </div>
  );
}
