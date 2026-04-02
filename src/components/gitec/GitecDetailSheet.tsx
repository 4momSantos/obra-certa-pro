import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useGitecEventDetail, agingBadge } from "@/hooks/useGitec";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

interface Props {
  eventId: string | null;
  open: boolean;
  onClose: () => void;
}

export const GitecDetailSheet: React.FC<Props> = ({ eventId, open, onClose }) => {
  const { data: detail, isLoading } = useGitecEventDetail(eventId);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {isLoading && <Skeleton className="h-96 w-full" />}
        {!isLoading && !detail && <p className="text-sm text-muted-foreground">Evento não encontrado</p>}
        {!isLoading && detail && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span className="font-mono">{detail.tag || detail.agrupamento_ippu || "Evento"}</span>
                <Badge variant={detail.status === "Aprovado" ? "default" : "secondary"}>{detail.status}</Badge>
              </SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Item PPU" value={detail.item_ppu ?? "-"} />
                <Field label="Agrupamento" value={detail.agrupamento ?? "-"} />
                <Field label="Valor" value={fmt(detail.valor)} />
                <Field label="Etapa" value={detail.etapa || "-"} />
                <Field label="Fiscal" value={detail.fiscal_responsavel || "-"} />
                <Field label="Executado por" value={detail.executado_por || "-"} />
                <Field label="Qtd Ponderada" value={String(Number(detail.quantidade_ponderada) || 0)} />
                <Field label="Peso Financeiro" value={String(Number(detail.peso_financeiro) || 0)} />
                <Field label="Data Execução" value={detail.data_execucao ?? "-"} />
                <Field label="Data Inf. Exec." value={detail.data_inf_execucao ?? "-"} />
                <Field label="Data Aprovação" value={detail.data_aprovacao ?? "-"} />
                {detail.data_inf_execucao && (
                  <div>
                    <p className="text-xs text-muted-foreground">Aging</p>
                    <Badge variant={agingBadge(detail.aging).variant}>{agingBadge(detail.aging).label}</Badge>
                  </div>
                )}
              </div>

              {detail.comentario && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Comentário</p>
                    <p className="text-sm">{detail.comentario}</p>
                  </div>
                </>
              )}

              {detail.evidenceNums.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Evidências ({detail.evidenceNums.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {detail.evidenceNums.map((n: string) => (
                        <Badge key={n} variant="outline" className="font-mono text-xs">{n}</Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {detail.documents.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Documentos Vinculados ({detail.documents.length})</p>
                    <div className="space-y-2">
                      {detail.documents.map((doc: any) => (
                        <div key={doc.id} className="rounded border p-2 text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="font-mono font-medium">{doc.documento}</span>
                            <Badge variant={doc.status === "Recusado" ? "destructive" : "secondary"} className="text-xs">{doc.status}</Badge>
                          </div>
                          <p className="text-muted-foreground truncate">{doc.titulo}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {detail.revisions.filter((r: any) => r.status === "Recusado").length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-destructive mb-2">Recusas</p>
                    <div className="space-y-2">
                      {detail.revisions.filter((r: any) => r.status === "Recusado").map((rev: any) => (
                        <div key={rev.id} className="rounded border border-destructive/30 bg-destructive/5 p-2 text-xs space-y-1">
                          <span className="font-mono font-medium">{rev.documento} Rev. {rev.revisao}</span>
                          <p className="text-muted-foreground">{rev.texto_consolidacao || "Sem motivo informado"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
