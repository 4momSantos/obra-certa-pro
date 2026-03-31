import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocumentDetail } from "@/hooks/useDocuments";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  documento: string | null;
  open: boolean;
  onClose: () => void;
}

export const DocumentDetailSheet: React.FC<Props> = ({ documento, open, onClose }) => {
  const { data, isLoading } = useDocumentDetail(documento);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {isLoading && <Skeleton className="h-96 w-full" />}
        {!isLoading && !data?.doc && <p className="text-sm text-muted-foreground">Documento não encontrado</p>}
        {!isLoading && data?.doc && (
          <>
            <SheetHeader>
              <SheetTitle className="font-mono text-lg">{data.doc.documento}</SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Título" value={data.doc.titulo || "-"} span={2} />
                <Field label="Revisão" value={data.doc.revisao || "-"} />
                <Field label="Status" value={data.doc.status_correto || "-"} />
                <Field label="UP" value={data.doc.up || "-"} />
                <Field label="PPU" value={data.doc.ppu || "-"} />
                <Field label="Status GITEC" value={data.doc.status_gitec || "-"} />
                <Field label="Incluído em" value={data.doc.incluido_em || "-"} />
              </div>

              {/* Revisões (múltiplas entradas do mesmo documento) */}
              {data.revisions.length > 1 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-3">Revisões ({data.revisions.length})</p>
                    <div className="relative pl-4 border-l-2 border-muted space-y-4">
                      {data.revisions.map((rev: any, i: number) => (
                        <div key={rev.id} className="relative">
                          <div className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full ${rev.status_correto === "Recusado" ? "bg-destructive" : "bg-primary"}`} />
                          <div className={`rounded-lg border p-3 text-xs ${rev.status_correto === "Recusado" ? "border-destructive/30 bg-destructive/5" : ""}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">Rev. {rev.revisao || i + 1}</span>
                              <Badge variant={rev.status_correto === "Recusado" ? "destructive" : "secondary"} className="text-[10px]">
                                {rev.status_correto || "-"}
                              </Badge>
                            </div>
                            {rev.incluido_em && <p className="text-muted-foreground text-[10px]">{rev.incluido_em}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* GITEC vinculados */}
              {data.gitecEvents.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Eventos GITEC Vinculados ({data.gitecEvents.length})</p>
                    <div className="space-y-1">
                      {data.gitecEvents.map((ge: any) => (
                        <div key={ge.id} className="flex items-center justify-between text-xs rounded border p-2">
                          <span className="font-mono">{ge.tag || ge.ippu || "-"}</span>
                          <Badge variant={ge.status === "Aprovado" ? "default" : "secondary"} className="text-[10px]">{ge.status}</Badge>
                          <span className="font-mono">{fmt(ge.valor)}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Valor total: {fmt(data.gitecEvents.reduce((s: number, e: any) => s + e.valor, 0))}
                    </p>
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

function Field({ label, value, span }: { label: string; value: string; span?: number }) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
