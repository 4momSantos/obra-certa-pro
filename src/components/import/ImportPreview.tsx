import React, { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";
import type { ParsedSigemRow, ParsedRelEventoRow, ParsedSconRow, ParsedSconProgRow } from "@/hooks/useImport";

interface Props {
  sigem: ParsedSigemRow[];
  relEvento: ParsedRelEventoRow[];
  scon: ParsedSconRow[];
  sconProg: ParsedSconProgRow[];
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

export const ImportPreview: React.FC<Props> = ({ sigem, relEvento, scon, sconProg, warnings }) => {
  const sigemKpis = useMemo(() => {
    const byStatus: Record<string, number> = {};
    sigem.forEach(r => { byStatus[r.status_correto || "Outros"] = (byStatus[r.status_correto || "Outros"] || 0) + 1; });
    return byStatus;
  }, [sigem]);

  const relKpis = useMemo(() => {
    const byStatus: Record<string, number> = {};
    relEvento.forEach(r => { byStatus[r.status || "Outros"] = (byStatus[r.status || "Outros"] || 0) + 1; });
    const valTotal = relEvento.reduce((s, r) => s + r.valor, 0);
    const distinctIppu = new Set(relEvento.map(r => r.agrupamento_ippu).filter(Boolean)).size;
    const distinctCriterio = new Set(relEvento.map(r => r.tag_criterio).filter(Boolean)).size;
    const distinctFiscal = new Set(relEvento.map(r => r.fiscal_responsavel).filter(Boolean)).size;
    return { byStatus, valTotal, distinctIppu, distinctCriterio, distinctFiscal };
  }, [relEvento]);

  const sconKpis = useMemo(() => {
    const zero = scon.filter(r => r.avanco_ponderado === 0).length;
    const low = scon.filter(r => r.avanco_ponderado > 0 && r.avanco_ponderado <= 50).length;
    const mid = scon.filter(r => r.avanco_ponderado > 50 && r.avanco_ponderado < 100).length;
    const done = scon.filter(r => r.avanco_ponderado >= 100).length;
    return { zero, low, mid, done };
  }, [scon]);

  const sconProgKpis = useMemo(() => {
    if (sconProg.length === 0) return null;
    const componentes = new Set(sconProg.map(r => r.componente));
    const disciplinas: Record<string, number> = {};
    const equipes: Record<string, number> = {};
    const semanas: string[] = [];
    sconProg.forEach(r => {
      if (r.disciplina) disciplinas[r.disciplina] = (disciplinas[r.disciplina] || 0) + 1;
      if (r.equipe) equipes[r.equipe] = (equipes[r.equipe] || 0) + 1;
      if (r.semana) semanas.push(r.semana);
    });
    const sortedSemanas = [...new Set(semanas)].sort((a, b) => Number(a) - Number(b));
    return {
      total: sconProg.length,
      componentes: componentes.size,
      disciplinas: Object.entries(disciplinas).sort((a, b) => b[1] - a[1]),
      equipes: Object.entries(equipes).sort((a, b) => b[1] - a[1]),
      semanaRange: sortedSemanas.length > 0 ? `${sortedSemanas[0]} → ${sortedSemanas[sortedSemanas.length - 1]}` : "—",
    };
  }, [sconProg]);

  const hasData = sigem.length > 0 || relEvento.length > 0 || scon.length > 0 || sconProg.length > 0;
  if (!hasData) return null;

  const defaultTab = sigem.length > 0 ? "sigem" : relEvento.length > 0 ? "rel" : scon.length > 0 ? "scon" : "sconprog";

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
          {sconProg.length > 0 && (
            <TabsTrigger value="sconprog">
              SCON Prog <Badge variant="secondary" className="ml-2">{sconProg.length.toLocaleString("pt-BR")}</Badge>
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <KpiCard label="Total Eventos" value={relEvento.length.toLocaleString("pt-BR")} />
              <KpiCard label="iPPU Extraídos" value={relKpis.distinctIppu} color="text-primary" />
              <KpiCard label="Critérios" value={relKpis.distinctCriterio} />
              <KpiCard label="Fiscais" value={relKpis.distinctFiscal} />
              <KpiCard label="Valor Total" value={`R$ ${(relKpis.valTotal / 1e6).toFixed(2)}M`} color="text-primary" />
            </div>
            <StatusBar items={
              Object.entries(relKpis.byStatus)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([ label, count ], i) => ({
                  label,
                  count,
                  color: ["bg-emerald-500", "bg-amber-500", "bg-blue-500", "bg-orange-500", "bg-destructive", "bg-muted-foreground/50"][i] || "bg-muted-foreground/50",
                }))
            } />
            <div className="rounded-lg border overflow-auto max-h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>iPPU</TableHead>
                    <TableHead>TAG</TableHead>
                    <TableHead>Critério</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Fiscal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relEvento.slice(0, 15).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{r.agrupamento_ippu || "-"}</TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">{r.tag || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.tag_criterio || "-"}</TableCell>
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

        {/* SCON Programação tab */}
        {sconProg.length > 0 && sconProgKpis && (
          <TabsContent value="sconprog" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Registros" value={sconProgKpis.total.toLocaleString("pt-BR")} />
              <KpiCard label="Componentes Únicos" value={sconProgKpis.componentes.toLocaleString("pt-BR")} color="text-primary" />
              <KpiCard label="Disciplinas" value={sconProgKpis.disciplinas.length} />
              <KpiCard label="Semanas" value={sconProgKpis.semanaRange} />
            </div>

            {sconProgKpis.disciplinas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sconProgKpis.disciplinas.slice(0, 8).map(([disc, count]) => (
                  <Badge key={disc} variant="outline" className="text-xs">
                    {disc}: {count.toLocaleString("pt-BR")}
                  </Badge>
                ))}
                {sconProgKpis.disciplinas.length > 8 && (
                  <Badge variant="secondary" className="text-xs">+{sconProgKpis.disciplinas.length - 8}</Badge>
                )}
              </div>
            )}

            {sconProgKpis.equipes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground mr-1">Equipes:</span>
                {sconProgKpis.equipes.slice(0, 6).map(([eq, count]) => (
                  <Badge key={eq} variant="outline" className="text-xs">
                    {eq}: {count.toLocaleString("pt-BR")}
                  </Badge>
                ))}
                {sconProgKpis.equipes.length > 6 && (
                  <Badge variant="secondary" className="text-xs">+{sconProgKpis.equipes.length - 6}</Badge>
                )}
              </div>
            )}

            <div className="rounded-lg border overflow-auto max-h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Componente</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Semana</TableHead>
                    <TableHead>Equipe</TableHead>
                    <TableHead>Disciplina</TableHead>
                    <TableHead className="text-right">Prog</TableHead>
                    <TableHead className="text-right">Exec Sem</TableHead>
                    <TableHead>ItemWBS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sconProg.slice(0, 15).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs max-w-[180px] truncate">{r.componente}</TableCell>
                      <TableCell className="text-xs">{r.etapa || "-"}</TableCell>
                      <TableCell className="text-xs">{r.semana || "-"}</TableCell>
                      <TableCell className="text-xs">{r.equipe || "-"}</TableCell>
                      <TableCell className="text-xs">{r.disciplina || "-"}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{r.programado_componente}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{r.total_exec_semana}</TableCell>
                      <TableCell className="font-mono text-xs">{r.item_wbs || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {sconProg.length > 15 && <p className="text-xs text-muted-foreground text-center">Mostrando 15 de {sconProg.length.toLocaleString("pt-BR")}</p>}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
