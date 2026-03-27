import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { MedicaoPPU, Semaforo } from "@/hooks/useMedicao";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const semaforoLabel: Record<Semaforo, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  medido: { label: "Medido", variant: "default" },
  executado: { label: "Executado", variant: "secondary" },
  previsto: { label: "Previsto", variant: "outline" },
  futuro: { label: "Futuro", variant: "outline" },
};

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

interface Props {
  item: MedicaoPPU | null;
  onClose: () => void;
}

export function MedicaoDetailSheet({ item, onClose }: Props) {
  if (!item) return null;
  const sem = semaforoLabel[item.semaforo];

  return (
    <Sheet open={!!item} onOpenChange={() => onClose()}>
      <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="font-mono">{item.item_ppu}</span>
            <Badge variant={sem.variant}>{sem.label}</Badge>
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{item.descricao}</p>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Classificação */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Classificação</h4>
            <Row label="Fase" value={item.fase || "-"} />
            <Row label="Subfase" value={item.subfase || "-"} />
            <Row label="Agrupamento" value={item.agrupamento || "-"} />
            <Row label="Disciplina" value={item.disciplina || "-"} />
          </div>

          <Separator />

          {/* Valores */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Valores</h4>
            <Row label="Valor Total" value={fmtBRL(item.valor_total)} mono />
            <Row label="Valor Medido" value={fmtBRL(item.valor_medido)} mono />
            <Row label="Estimado SCON" value={fmtBRL(item.scon_valor_estimado)} mono />
            <Row label="Gap" value={
              <span className={item.gap > 0 ? "text-emerald-600" : item.gap < 0 ? "text-destructive" : ""}>
                {fmtBRL(item.gap)}
              </span>
            } mono />
          </div>

          <Separator />

          {/* SCON */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">SCON</h4>
            <div className="flex items-center gap-2 mb-2">
              <Progress
                value={item.scon_avg_avanco}
                className={`h-3 flex-1 ${item.scon_avg_avanco >= 100 ? "[&>div]:bg-emerald-500" : item.scon_avg_avanco > 0 ? "[&>div]:bg-amber-500" : "[&>div]:bg-muted-foreground/30"}`}
              />
              <span className="text-sm font-mono font-bold">{item.scon_avg_avanco.toFixed(1)}%</span>
            </div>
            <Row label="Total Componentes" value={item.scon_total} />
            <Row label="Concluídos" value={item.scon_concluidos} />
            <Row label="Em Andamento" value={item.scon_andamento} />
            <Row label="Não Iniciados" value={item.scon_nao_iniciados} />
          </div>

          <Separator />

          {/* SIGEM */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">SIGEM</h4>
            <Row label="Total Documentos" value={item.sigem_total} />
            <Row label="OK (Sem Coment. + P/ Construção)" value={<span className="text-emerald-600">{item.sigem_ok}</span>} />
            <Row label="Recusados" value={item.sigem_recusados > 0 ? <span className="text-destructive">{item.sigem_recusados}</span> : 0} />
            <Row label="Em Workflow" value={item.sigem_workflow} />
            <Row label="Com Comentários" value={item.sigem_comentarios} />
          </div>

          <Separator />

          {/* GITEC */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">GITEC</h4>
            <Row label="Total Eventos" value={item.gitec_total_eventos} />
            <Row label="Concluídos" value={item.gitec_eventos_concluidos} />
            <Row label="Valor Aprovado" value={fmtBRL(item.gitec_valor_aprovado)} mono />
            <Row label="Valor Pendente" value={fmtBRL(item.gitec_valor_pendente)} mono />
          </div>

          <Separator />

          {/* EAC */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">EAC</h4>
            <Row label="Previsto" value={`${(item.eac_previsto * 100).toFixed(2)}%`} />
            <Row label="Realizado" value={`${(item.eac_realizado * 100).toFixed(2)}%`} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
