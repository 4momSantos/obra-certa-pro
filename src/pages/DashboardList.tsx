import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutGrid, Inbox, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/dashboards/DashboardCard";
import { CreateDashboardDialog } from "@/components/dashboards/CreateDashboardDialog";
import {
  useDashboards, useCreateDashboard, useUpdateDashboard,
  useDeleteDashboard, useDuplicateDashboard,
} from "@/hooks/useDashboards";

export default function DashboardList() {
  const navigate = useNavigate();
  const { data: dashboards, isLoading, isError } = useDashboards();
  const createMut = useCreateDashboard();
  const updateMut = useUpdateDashboard();
  const deleteMut = useDeleteDashboard();
  const duplicateMut = useDuplicateDashboard();

  const own = useMemo(() => (dashboards ?? []).filter((d) => d.permission === "owner"), [dashboards]);
  const shared = useMemo(() => (dashboards ?? []).filter((d) => d.permission !== "owner"), [dashboards]);

  const handleCreate = (name: string, template: string) => {
    createMut.mutate({ name, template }, {
      onSuccess: (data) => navigate(`/dashboards/${data.id}`),
    });
  };

  const handleRename = (id: string, name: string) => {
    updateMut.mutate({ id, updates: { name } });
  };

  const handleDuplicate = (id: string) => {
    duplicateMut.mutate(id, {
      onSuccess: (data) => navigate(`/dashboards/${data.id}`),
    });
  };

  const handleDelete = (id: string) => {
    deleteMut.mutate(id);
  };

  const renderGrid = (items: typeof own, emptyMsg: string) => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <Inbox className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">{emptyMsg}</p>
          {emptyMsg.includes("primeiro") && (
            <CreateDashboardDialog isPending={createMut.isPending} onCreate={handleCreate} />
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((d) => (
          <DashboardCard
            key={d.id}
            dashboard={d}
            onRename={handleRename}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-accent" />
            Meus Dashboards
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie e organize seus painéis de controle
          </p>
        </div>
        <CreateDashboardDialog isPending={createMut.isPending} onCreate={handleCreate} />
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>Erro ao carregar dashboards. Tente novamente.</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="own" className="w-full">
        <TabsList>
          <TabsTrigger value="own" className="gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" /> Meus
          </TabsTrigger>
          <TabsTrigger value="shared" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Compartilhados comigo
          </TabsTrigger>
        </TabsList>
        <TabsContent value="own" className="mt-4">
          {renderGrid(own, "Nenhum dashboard ainda. Crie o primeiro!")}
        </TabsContent>
        <TabsContent value="shared" className="mt-4">
          {renderGrid(shared, "Nenhum dashboard compartilhado com você ainda")}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
