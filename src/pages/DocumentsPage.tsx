import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText } from "lucide-react";
import { DocumentDetailSheet } from "@/components/documents/DocumentDetailSheet";
import {
  useDocumentStats, useDocuments, useRecusados, useDocumentStatuses,
  defaultDocFilters, type DocFilters,
} from "@/hooks/useDocuments";

const fmt = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(0)}K` : `R$ ${v.toFixed(0)}`;

const statusColor = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "Recusado") return "destructive";
  if (s === "Certificado" || s === "Sem Comentários") return "default";
  if (s === "Para Construção") return "secondary";
  return "outline";
};

const DocumentsPage: React.FC = () => {
  const [filters, setFilters] = useState<DocFilters>(defaultDocFilters);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [limit, setLimit] = useState(100);

  const { data: stats, isLoading: loadingStats } = useDocumentStats();
  const { data: docs, isLoading: loadingDocs } = useDocuments(filters, limit);
  const { data: recusados, isLoading: loadingRecusados } = useRecusados();
  const { data: statuses } = useDocumentStatuses();

  const isEmpty = !loadingStats && stats?.total === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Nenhum documento importado.</p>
        <Button asChild><Link to="/import"><Upload className="h-4 w-4 mr-2" /> Importar via Upload</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6 px-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Documentos SIGEM</h1>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/import"><Upload className="h-4 w-4 mr-2" /> Importar</Link>
        </Button>
      </div>

      {/* KPIs */}
      {loadingStats ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-12" /></CardContent></Card>)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Documentos</p>
            <p className="text-2xl font-bold">{stats.total.toLocaleString("pt-BR")}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Top Status</p>
            <div className="mt-1 space-y-1">
              {stats.byStatus.slice(0, 3).map(s => (
                <div key={s.status} className="flex items-center justify-between text-xs">
                  <Badge variant={statusColor(s.status)} className="text-[10px]">{s.status}</Badge>
                  <span className="text-muted-foreground">{s.count} ({s.pct}%)</span>
                </div>
              ))}
            </div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Recusados c/ GITEC</p>
            <p className="text-2xl font-bold">{stats.recusadosComGitec}</p>
            <p className="text-xs text-muted-foreground">{fmt(stats.valorGitecImpactado)} impactado</p>
          </CardContent></Card>
        </div>
      )}

      {/* Funil documental */}
      {stats && stats.byStatus.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Funil Documental</p>
          <div className="flex h-8 rounded-lg overflow-hidden">
            {stats.byStatus.map(s => (
              <div
                key={s.status}
                className={`flex items-center justify-center text-[10px] font-medium text-primary-foreground ${
                  s.status === "Recusado" ? "bg-destructive" :
                  s.status === "Certificado" ? "bg-primary" :
                  s.status === "Sem Comentários" ? "bg-primary/70" :
                  s.status === "Para Construção" ? "bg-secondary text-secondary-foreground" :
                  "bg-accent text-accent-foreground"
                }`}
                style={{ width: `${s.pct}%`, minWidth: s.pct > 3 ? undefined : "0" }}
              >
                {s.pct > 6 && `${s.status} (${s.pct}%)`}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {stats.byStatus.map(s => (
              <span key={s.status}>{s.status}: {s.count}</span>
            ))}
          </div>
        </div>
      )}

      {/* Recusas */}
      {!loadingRecusados && recusados && recusados.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <p className="text-sm font-medium">Recusas ({recusados.length})</p>
            <div className="rounded-lg border overflow-auto max-h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Rev.</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>UP</TableHead>
                    <TableHead>PPU</TableHead>
                    <TableHead>GITEC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recusados.slice(0, 50).map(r => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedDoc(r.documento)}>
                      <TableCell className="font-mono text-xs">{r.documento}</TableCell>
                      <TableCell className="text-xs">{r.revisao}</TableCell>
                      <TableCell className="text-xs max-w-[180px] truncate">{r.titulo || "-"}</TableCell>
                      <TableCell className="text-xs">{r.up || "-"}</TableCell>
                      <TableCell className="text-xs">{r.ppu || "-"}</TableCell>
                      <TableCell>
                        {r.gitecCount > 0 ? (
                          <Badge variant="default" className="text-[10px]">✓ {r.gitecCount} eventos</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar documento, título..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="w-[240px]"
        />
        <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {(statuses ?? []).filter(s => s && s.trim() !== "").map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.vinculo} onValueChange={(v) => setFilters({ ...filters, vinculo: v })}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Vínculo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="gitec">Com GITEC</SelectItem>
            <SelectItem value="recusa">Com Recusa</SelectItem>
          </SelectContent>
        </Select>
        {(filters.search || filters.status !== "all" || filters.vinculo !== "all") && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilters(defaultDocFilters)}>
            Limpar filtros ✕
          </Badge>
        )}
      </div>

      {/* Documents table */}
      {loadingDocs ? <Skeleton className="h-64 w-full" /> : (
        <>
          {(!docs || docs.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum documento encontrado</p>
          ) : (
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Rev.</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>UP</TableHead>
                    <TableHead>PPU</TableHead>
                    <TableHead>GITEC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map(d => (
                    <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedDoc(d.documento)}>
                      <TableCell className="font-mono text-xs">{d.documento}</TableCell>
                      <TableCell className="text-xs">{d.revisao}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{d.titulo || "-"}</TableCell>
                      <TableCell><Badge variant={statusColor(d.status)} className="text-[10px]">{d.status || "-"}</Badge></TableCell>
                      <TableCell className="text-xs">{d.up || "-"}</TableCell>
                      <TableCell className="text-xs">{d.ppu || "-"}</TableCell>
                      <TableCell>
                        {d.hasGitec ? (
                          <Badge variant="default" className="text-[10px]">✓ {d.gitecCount}</Badge>
                        ) : d.hasRecusa ? (
                          <Badge variant="destructive" className="text-[10px]">Recusa</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {docs && docs.length >= limit && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setLimit(l => l + 100)}>Carregar mais</Button>
            </div>
          )}
        </>
      )}

      <DocumentDetailSheet documento={selectedDoc} open={!!selectedDoc} onClose={() => setSelectedDoc(null)} />
    </div>
  );
};

export default DocumentsPage;
