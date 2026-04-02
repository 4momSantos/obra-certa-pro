import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Layers, FileText, AlertTriangle, SlidersHorizontal, Palette } from "lucide-react";
import { useContratoConfig } from "@/hooks/useContratoConfig";
import { useContrato } from "@/contexts/ContratoContext";
import { DisciplinasTab } from "@/components/settings/DisciplinasTab";
import { StatusMapTab } from "@/components/settings/StatusMapTab";
import { FiltroDocsTab } from "@/components/settings/FiltroDocsTab";
import { RegrasTab } from "@/components/settings/RegrasTab";
import { AlertasTab } from "@/components/settings/AlertasTab";

const Settings: React.FC = () => {
  const { contratoAtivo, roleNoContrato } = useContrato();
  const config = useContratoConfig();

  const isAdmin = roleNoContrato === "admin_contrato" || roleNoContrato === "admin";
  const isGestor = roleNoContrato === "gestor";
  const canEditAll = isAdmin;
  const canEditPartial = isAdmin || isGestor;

  if (!contratoAtivo) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <div className="rounded-lg border bg-muted/30 p-8 text-center text-muted-foreground">
          Selecione um contrato para acessar as configurações.
        </div>
      </div>
    );
  }

  if (config.isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            {contratoAtivo.nome} — {contratoAtivo.codigo}
          </p>
        </div>
        {!canEditAll && (
          <Badge variant="secondary" className="ml-auto">
            {isGestor ? "Edição parcial" : "Somente leitura"}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="disciplinas">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="disciplinas" className="gap-1">
            <Layers className="h-3.5 w-3.5" /> Disciplinas
            <Badge variant="secondary" className="text-[10px] ml-1">{config.disciplinas.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="status" className="gap-1">
            <Palette className="h-3.5 w-3.5" /> Status
            <Badge variant="secondary" className="text-[10px] ml-1">{config.statusMap.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="filtros" className="gap-1">
            <FileText className="h-3.5 w-3.5" /> Filtro Docs
            <Badge variant="secondary" className="text-[10px] ml-1">{config.filtros.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="regras" className="gap-1">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Regras
          </TabsTrigger>
          <TabsTrigger value="alertas" className="gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Alertas
            <Badge variant="secondary" className="text-[10px] ml-1">{config.alertas.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="disciplinas" className="mt-4">
          <DisciplinasTab
            data={config.disciplinas}
            readonly={!canEditPartial}
            contratoId={contratoAtivo.id}
          />
        </TabsContent>

        <TabsContent value="status" className="mt-4">
          <StatusMapTab
            data={config.statusMap}
            readonly={!canEditAll}
            contratoId={contratoAtivo.id}
          />
        </TabsContent>

        <TabsContent value="filtros" className="mt-4">
          <FiltroDocsTab
            data={config.filtros}
            readonly={!canEditPartial}
            contratoId={contratoAtivo.id}
          />
        </TabsContent>

        <TabsContent value="regras" className="mt-4">
          <RegrasTab
            data={config.regras}
            readonly={!canEditAll}
            contratoId={contratoAtivo.id}
          />
        </TabsContent>

        <TabsContent value="alertas" className="mt-4">
          <AlertasTab
            data={config.alertas}
            readonly={!canEditAll}
            contratoId={contratoAtivo.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
