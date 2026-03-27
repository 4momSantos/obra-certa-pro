import React, { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";
import type { ParsedSigemRow, ParsedRelEventoRow, ParsedSconRow } from "@/hooks/useImport";

interface Props {
  sigem: ParsedSigemRow[];
  relEvento: ParsedRelEventoRow[];
  scon: ParsedSconRow[];
  warnings: string[];
}

function KpiCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${color || "text-foreground"}`}>{value}</p>
    </div>
  );
}

function StatusBar({ items }: { items: { label: string; count: number; color: string }[] }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  if (total === 0) return null;
  return (
    <div className="space-y-1">
      <div className="flex h-3 rounded-full overflow-hidden">
        {items.filter(i => i.count > 0).map(i => (
          <div key={i.label} className={`${i.color}`} style={{ width: `${(i.count / total) * 100}%` }} title={`${i.label}: ${i.count}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        {items.filter(i => i.count > 0).map(i => (
          <span key={i.label} className="flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-full ${i.color}`} />
            {i.label}: {i.count.toLocaleString("pt-BR")}
          </span>
        ))}
      </div>
    </div>
  );
}

export const ImportPreview: React.FC<Props> = ({ sigem, relEvento, scon, warnings }) => {
  const sigemKpis = useMemo(() => {
    const byStatus: Record<string, number> = {};
    sigem.forEach(r => { byStatus[r.status_correto || "Outros"] = (byStatus[r.status_correto || "Outros"] || 0) + 1; });
    return byStatus;
  }, [sigem]);

  const relKpis = useMemo(() => {
    const concluida = relEvento.filter(r => r.etapa === "Concluída").length;
    const pendente = relEvento.length - concluida;
    const valTotal = relEvento.reduce((s, r) => s + r.valor, 0);
    const noItem = relEvento.filter(r => !r.item_ppu).length;
    return { concluida, pendente, valTotal, noItem };
  }, [relEvento]);

  const sconKpis = useMemo(() => {
    const zero = scon.filter(r => r.avanco_ponderado === 0).length;
    const low = scon.filter(r => r.avanco_ponderado > 0 && r.avanco_ponderado <= 50).length;
    const mid = scon.filter(r => r.avanco_ponderado > 50 && r.avanco_ponderado < 100).length;
    const done = scon.filter(r => r.avanco_ponderado >= 100).length;
    return { zero, low, mid, done };
  }, [scon]);

  const hasData = sigem.length > 0 || relEvento.length > 0 || scon.length > 0;
  if (!hasData) return null;

  const defaultTab = sigem.length > 0 ? "sigem" : relEvento.length > 0 ? "rel" : "scon";

  return (
    <div className="space-y-4">
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <Alert key={i} variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">{w}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {sigem.length > 0 && (
            <TabsTrigger value="sigem">
              SIGEM <Badge variant="secondary" className="ml-2">{sigem.length.toLocaleString("pt-BR")}</Badge>
            </TabsTrigger>
          )}
          {relEvento.length > 0 && (
            <TabsTrigger value="rel">
              REL_EVENTO <Badge variant="secondary" className="ml-2">{relEvento.length.toLocaleString("pt-BR")}</Badge>
            </TabsTrigger>
          )}
          {scon.length > 0 && (
            <TabsTrigger value="scon">
              SCON <Badge variant="secondary" className="ml-2">{scon.length.toLocaleString("pt-BR")}</Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {/* SIGEM tab */}
        {sigem.length > 0 && (
          <TabsContent value="sigem" className="space-y-4">
            <StatusBar items={[
              { label: "Sem Comentários", count: sigemKpis["Sem Comentários"] || 0, color: "bg-emerald-500" },
              { label: "Para Construção", count: sigemKpis["Para Construção"] || 0, color: "bg-primary" },
              { label: "Com Comentários", count: sigemKpis["Com Comentários"] || 0, color: "bg-amber-500" },
              { label: "Recusado", count: sigemKpis["Recusado"] || 0, color: "bg-destructive" },
              { label: "Em Workflow", count: sigemKpis["Em Workflow"] || 0, color: "bg-blue-500" },
              { label: "Outros", count: Object.entries(sigemKpis).filter(([k]) => !["Sem Comentários","Para Construção","Com Comentários","Recusado","Em Workflow"].includes(k)).reduce((s,[,v])=>s+v,0), color: "bg-muted-foreground/50" },
            ]} />
            <div className="rounded-lg border overflow-auto max-h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Revisão</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>PPU</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sigem.slice(0, 15).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{r.documento}</TableCell>
                      <TableCell className="text-xs">{r.revisao}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{r.titulo || "-"}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{r.status_correto || "-"}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{r.ppu || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {sigem.length > 15 && <p className="text-xs text-muted-foreground text-center">Mostrando 15 de {sigem.length.toLocaleString("pt-BR")}</p>}
          </TabsContent>
        )}

        {/* REL_EVENTO tab */}
        {relEvento.length > 0 && (
          <TabsContent value="rel" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Concluídos" value={relKpis.concluida.toLocaleString("pt-BR")} color="text-emerald-500" />
              <KpiCard label="Pendentes" value={relKpis.pendente.toLocaleString("pt-BR")} color="text-amber-500" />
              <KpiCard label="Valor Total" value={`R$ ${(relKpis.valTotal / 1e6).toFixed(2)}M`} color="text-primary" />
              {relKpis.noItem > 0 && <KpiCard label="Sem Item PPU" value={relKpis.noItem} color="text-destructive" />}
            </div>
            <div className="rounded-lg border overflow-auto max-h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item PPU</TableHead>
                    <TableHead>TAG</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Fiscal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relEvento.slice(0, 15).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{r.item_ppu || "-"}</TableCell>
                      <TableCell className="text-xs">{r.tag || "-"}</TableCell>
                      <TableCell className="text-xs">{r.etapa || "-"}</TableCell>
                      <TableCell><Badge variant={r.status === "Aprovado" ? "default" : "secondary"} className="text-xs">{r.status || "-"}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-xs">{r.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                      <TableCell className="text-xs">{r.fiscal_responsavel || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {relEvento.length > 15 && <p className="text-xs text-muted-foreground text-center">Mostrando 15 de {relEvento.length.toLocaleString("pt-BR")}</p>}
          </TabsContent>
        )}

        {/* SCON tab */}
        {scon.length > 0 && (
          <TabsContent value="scon" className="space-y-4">
            <StatusBar items={[
              { label: "100%", count: sconKpis.done, color: "bg-emerald-500" },
              { label: "51-99%", count: sconKpis.mid, color: "bg-amber-500" },
              { label: "1-50%", count: sconKpis.low, color: "bg-orange-500" },
              { label: "0%", count: sconKpis.zero, color: "bg-muted-foreground/50" },
            ]} />
            <div className="rounded-lg border overflow-auto max-h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ItemWBS</TableHead>
                    <TableHead>TAG</TableHead>
                    <TableHead>Disciplina</TableHead>
                    <TableHead className="text-right">Avanço</TableHead>
                    <TableHead className="text-right">Qtd Etapa</TableHead>
                    <TableHead className="text-right">Exec Acum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scon.slice(0, 15).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{r.item_wbs || "-"}</TableCell>
                      <TableCell className="text-xs">{r.tag || "-"}</TableCell>
                      <TableCell className="text-xs">{r.disciplina || "-"}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{r.avanco_ponderado.toFixed(1)}%</TableCell>
                      <TableCell className="text-right font-mono text-xs">{r.qtde_etapa.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{r.qtde_etapa_exec_acum.toLocaleString("pt-BR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {scon.length > 15 && <p className="text-xs text-muted-foreground text-center">Mostrando 15 de {scon.length.toLocaleString("pt-BR")}</p>}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
