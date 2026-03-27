import React, { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";
import type { ParsedGitecRow, ParsedDocumentRow, ParsedRevisionRow } from "@/hooks/useImport";

interface Props {
  gitec: ParsedGitecRow[];
  documents: ParsedDocumentRow[];
  revisions: ParsedRevisionRow[];
  warnings: string[];
}

export const ImportPreview: React.FC<Props> = ({ gitec, documents, revisions, warnings }) => {
  const gitecKpis = useMemo(() => {
    const aprovados = gitec.filter(r => r.status === "Aprovado").length;
    const pendVerif = gitec.filter(r => r.status === "Pendente de Verificação").length;
    const pendAprov = gitec.filter(r => r.status === "Pendente de Aprovação").length;
    const valTotal = gitec.reduce((s, r) => s + r.valor, 0);
    return { aprovados, pendVerif, pendAprov, valTotal };
  }, [gitec]);

  const hasData = gitec.length > 0 || documents.length > 0 || revisions.length > 0;
  if (!hasData) return null;

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

      <Tabs defaultValue={gitec.length > 0 ? "gitec" : documents.length > 0 ? "docs" : "revs"}>
        <TabsList>
          {gitec.length > 0 && <TabsTrigger value="gitec">GITEC <Badge variant="secondary" className="ml-2">{gitec.length}</Badge></TabsTrigger>}
          {documents.length > 0 && <TabsTrigger value="docs">Documentos <Badge variant="secondary" className="ml-2">{documents.length}</Badge></TabsTrigger>}
          {revisions.length > 0 && <TabsTrigger value="revs">Revisões <Badge variant="secondary" className="ml-2">{revisions.length}</Badge></TabsTrigger>}
        </TabsList>

        {gitec.length > 0 && (
          <TabsContent value="gitec" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Aprovados" value={gitecKpis.aprovados} color="text-emerald-500" />
              <KpiCard label="Pend. Verificação" value={gitecKpis.pendVerif} color="text-amber-500" />
              <KpiCard label="Pend. Aprovação" value={gitecKpis.pendAprov} color="text-orange-500" />
              <KpiCard label="Valor Total" value={`R$ ${(gitecKpis.valTotal / 1e6).toFixed(2)}M`} color="text-primary" />
            </div>
            <div className="rounded-lg border overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>iPPU</TableHead>
                    <TableHead>TAG</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Fiscal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gitec.slice(0, 20).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{r.ippu ?? "-"}</TableCell>
                      <TableCell className="text-xs">{r.tag || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "Aprovado" ? "default" : "secondary"} className="text-xs">
                          {r.status || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{r.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                      <TableCell className="text-xs">{r.fiscal || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {gitec.length > 20 && <p className="text-xs text-muted-foreground text-center">Mostrando 20 de {gitec.length} registros</p>}
          </TabsContent>
        )}

        {documents.length > 0 && (
          <TabsContent value="docs">
            <div className="rounded-lg border overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Revisão</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.slice(0, 20).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{r.documento}</TableCell>
                      <TableCell className="text-xs">{r.revisao}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{r.titulo || "-"}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{r.status || "-"}</Badge></TableCell>
                      <TableCell className="text-xs">{r.tipo || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {documents.length > 20 && <p className="text-xs text-muted-foreground text-center mt-2">Mostrando 20 de {documents.length} registros</p>}
          </TabsContent>
        )}

        {revisions.length > 0 && (
          <TabsContent value="revs">
            <div className="rounded-lg border overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Revisão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Texto Consolidação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revisions.slice(0, 20).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{r.documento}</TableCell>
                      <TableCell className="text-xs">{r.revisao}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{r.status || "-"}</Badge></TableCell>
                      <TableCell className="text-xs max-w-[300px] truncate">{r.texto_consolidacao || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {revisions.length > 20 && <p className="text-xs text-muted-foreground text-center mt-2">Mostrando 20 de {revisions.length} registros</p>}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
