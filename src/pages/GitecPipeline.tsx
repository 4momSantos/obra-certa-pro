import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, X } from "lucide-react";
import { GitecKPIs } from "@/components/gitec/GitecKPIs";
import { GitecFunnel } from "@/components/gitec/GitecFunnel";
import { GitecRanking } from "@/components/gitec/GitecRanking";
import { GitecEventsTable } from "@/components/gitec/GitecEventsTable";
import { GitecFiltersBar } from "@/components/gitec/GitecFiltersBar";
import { GitecDetailSheet } from "@/components/gitec/GitecDetailSheet";
import { FiscaisTab } from "@/components/gitec/FiscaisTab";
import { AgrupamentosTab } from "@/components/gitec/AgrupamentosTab";
import { PPUDetailSheet } from "@/components/medicao/PPUDetailSheet";
import {
  useGitecStats, useGitecEvents, useGitecByIPPU, useGitecFiscais,
  defaultFilters, type GitecFilters,
} from "@/hooks/useGitec";

const GitecPipeline: React.FC = () => {
  const [filters, setFilters] = useState<GitecFilters>(defaultFilters);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedPPU, setSelectedPPU] = useState<{ item_ppu: string; item_gitec: string } | null>(null);
  const [limit, setLimit] = useState(100);
  const [activeTab, setActiveTab] = useState("pipeline");

  const { data: stats, isLoading: loadingStats } = useGitecStats();
  const { data: events, isLoading: loadingEvents } = useGitecEvents(filters, limit);
  const { data: ranking, isLoading: loadingRanking } = useGitecByIPPU();
  const { data: fiscais } = useGitecFiscais();

  const isEmpty = !loadingStats && stats?.total === 0;

  const handleFilterFiscal = (fiscal: string) => {
    setFilters({ ...defaultFilters, fiscal });
    setActiveTab("pipeline");
  };

  const handleSelectPPU = (itemPpu: string) => {
    setSelectedPPU({ item_ppu: itemPpu, item_gitec: itemPpu });
  };

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Importe REL_EVENTO primeiro.</p>
        <Button asChild>
          <Link to="/import">
            <Upload className="h-4 w-4 mr-2" /> Importar Dados
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6 px-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pipeline GITEC</h1>
        <Button variant="outline" size="sm" asChild>
          <Link to="/import"><Upload className="h-4 w-4 mr-2" /> Importar</Link>
        </Button>
      </div>

      <GitecKPIs stats={stats} loading={loadingStats} />
      <GitecFunnel stats={stats} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="fiscais">Fiscais</TabsTrigger>
          <TabsTrigger value="por-ppu">Por PPU</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4 mt-4">
          {(filters.fiscal !== "all" || filters.search || filters.status !== "all" || filters.agingRange !== "all") && (
            <div className="flex items-center gap-2 flex-wrap">
              {filters.fiscal !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Fiscal: {filters.fiscal}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, fiscal: "all" })} />
                </Badge>
              )}
              {filters.search && (
                <Badge variant="secondary" className="gap-1">
                  Busca: {filters.search}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, search: "" })} />
                </Badge>
              )}
            </div>
          )}

          <GitecFiltersBar filters={filters} onChange={setFilters} fiscais={fiscais ?? []} />
          <GitecRanking data={ranking} loading={loadingRanking} onSelect={(ppu) => setFilters({ ...filters, search: ppu })} />

          <div className="space-y-2">
            <p className="text-sm font-medium">Eventos {filters.status !== "all" ? `— ${filters.status}` : ""}</p>
            <GitecEventsTable events={events} loading={loadingEvents} onSelect={setSelectedEvent} />
            {events && events.length >= limit && (
              <div className="flex justify-center">
                <Button variant="outline" size="sm" onClick={() => setLimit(l => l + 100)}>Carregar mais</Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="fiscais" className="mt-4">
          <FiscaisTab onFilterFiscal={handleFilterFiscal} />
        </TabsContent>

        <TabsContent value="por-ppu" className="mt-4">
          <AgrupamentosTab data={ranking} loading={loadingRanking} onSelect={handleSelectPPU} />
        </TabsContent>
      </Tabs>

      <GitecDetailSheet eventId={selectedEvent} open={!!selectedEvent} onClose={() => setSelectedEvent(null)} />
      
      {selectedPPU && (
        <PPUDetailSheet
          item={{
            item_ppu: selectedPPU.item_ppu,
            item_gitec: selectedPPU.item_gitec,
            descricao: "",
            fase: "",
            subfase: "",
            disciplina: "",
            agrupamento: "",
            valor_total: 0,
            valor_medido: 0,
            scon_avg_avanco: 0,
            scon_total: 0,
            scon_concluidos: 0,
            scon_em_andamento: 0,
            scon_nao_iniciados: 0,
            scon_valor_estimado: 0,
            sigem_total: 0,
            sigem_ok: 0,
            sigem_recusados: 0,
            gitec_total: 0,
            gitec_valor_aprovado: 0,
            eac_previsto: 0,
            eac_realizado: 0,
            gap: 0,
            semaforo: "futuro" as const,
          }}
          onClose={() => setSelectedPPU(null)}
        />
      )}
    </div>
  );
};

export default GitecPipeline;
