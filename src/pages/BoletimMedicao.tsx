import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBoletim, useBoletimItens } from "@/hooks/useBoletim";
import { BoletimHeader } from "@/components/boletim/BoletimHeader";
import { BoletimTable } from "@/components/boletim/BoletimTable";
import { BoletimActions } from "@/components/boletim/BoletimActions";

export default function BoletimMedicao() {
  const { bmName } = useParams<{ bmName: string }>();
  const navigate = useNavigate();
  const effectiveBm = bmName || "BM-01";

  const { data: boletim, isLoading: loadingBoletim } = useBoletim(effectiveBm);
  const { data: itens, isLoading: loadingItens } = useBoletimItens(boletim?.id);

  const isLoading = loadingBoletim || loadingItens;
  const isReadonly = boletim?.status !== "rascunho";

  if (!isLoading && !boletim) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-4 md:p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/previsao")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Voltar à Previsão
        </Button>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <FileCheck className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg font-medium">Nenhum boletim para {effectiveBm}</p>
          <p className="text-sm text-muted-foreground">Gere um boletim a partir da página de Previsão.</p>
          <Button onClick={() => navigate("/previsao")} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Ir para Previsão
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-4 md:p-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/previsao")} className="gap-1.5">
        <ArrowLeft className="h-4 w-4" /> Voltar à Previsão
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-10 rounded" />
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
        </div>
      ) : (
        <>
          <BoletimHeader boletim={boletim!} bmName={effectiveBm} />
          <BoletimActions boletim={boletim!} bmName={effectiveBm} />
          <BoletimTable itens={itens || []} readonly={isReadonly} />
        </>
      )}
    </motion.div>
  );
}
