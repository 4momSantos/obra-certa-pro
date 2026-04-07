import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BmSelector } from "@/components/gestao-bm/BmSelector";
import { BmKPIs } from "@/components/gestao-bm/BmKPIs";
import { GitecPipelineFunnel } from "@/components/gestao-bm/GitecPipelineFunnel";
import { BmPpuTable } from "@/components/gestao-bm/BmPpuTable";
import { BmCharts } from "@/components/gestao-bm/BmCharts";
import { BmPpuDetailSheet } from "@/components/gestao-bm/BmPpuDetailSheet";
import { BmFiscalAnalysis } from "@/components/gestao-bm/BmFiscalAnalysis";
import { BmConsolidatedTree } from "@/components/gestao-bm/BmConsolidatedTree";
import { BMStatusBanner } from "@/components/gestao-bm/BMStatusBanner";
import { TarefasTab } from "@/components/gestao-bm/TarefasTab";
import { allBMs } from "@/lib/bm-utils";
import { useRealtimeInvalidation } from "@/hooks/useRealtimeInvalidation";
import { LiveBadge } from "@/components/shared/LiveBadge";

const RT_CONFIGS = [
  { table: "bm_periodos", events: ["INSERT", "UPDATE"] as any, queryKeys: [["bm-periodos"], ["bm-data"]], showToast: true },
  { table: "boletins_medicao", events: ["INSERT", "UPDATE"] as any, queryKeys: [["boletins"], ["boletim"]], showToast: true },
];

export default function GestaoBM() {
  const bms = allBMs();
  const [selectedBm, setSelectedBm] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [detailPpu, setDetailPpu] = useState<string | null>(null);

  const effectiveBm = selectedBm ?? bms[0]?.name ?? "BM-01";

  const handleSelectBm = (bm: string) => {
    setSelectedBm(bm);
    setStatusFilter(null);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-foreground">Gestão de BM</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Visão consolidada por Boletim de Medição
        </p>
      </div>

      <Tabs defaultValue="por-bm" className="w-full">
        <TabsList>
          <TabsTrigger value="por-bm">Por BM</TabsTrigger>
          <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
          <TabsTrigger value="consolidado">Visão Consolidada</TabsTrigger>
        </TabsList>

        <TabsContent value="por-bm" className="space-y-6 mt-4">
          <BmSelector selected={selectedBm} onSelect={handleSelectBm} />
          <BMStatusBanner bmName={effectiveBm} />
          <BmKPIs bmName={effectiveBm} />
          <GitecPipelineFunnel
            bmName={effectiveBm}
            activeStatus={statusFilter}
            onFilterStatus={setStatusFilter}
          />
          <BmCharts bmName={effectiveBm} />
          <BmPpuTable
            bmName={effectiveBm}
            statusFilter={statusFilter}
            onRowClick={(ppu) => setDetailPpu(ppu)}
          />
          <BmFiscalAnalysis bmName={effectiveBm} />

          <BmPpuDetailSheet
            open={!!detailPpu}
            onClose={() => setDetailPpu(null)}
            itemPpu={detailPpu ?? ""}
            bmName={effectiveBm}
          />
        </TabsContent>

        <TabsContent value="tarefas" className="space-y-6 mt-4">
          <BmSelector selected={selectedBm} onSelect={handleSelectBm} />
          <TarefasTab bmName={effectiveBm} />
        </TabsContent>

        <TabsContent value="consolidado" className="mt-4">
          <BmConsolidatedTree />
        </TabsContent>
      </Tabs>
    </div>
  );
}
