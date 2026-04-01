import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAuditLog } from "@/hooks/useAudit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ChevronDown, Search, History } from "lucide-react";

const ACOES = [
  { value: "__all__", label: "Todas as ações" },
  { value: "abrir_bm", label: "Abrir BM" },
  { value: "fechar_bm", label: "Fechar BM" },
  { value: "alterar_status_previsao", label: "Alterar Previsão" },
  { value: "criar_previsao", label: "Criar Previsão" },
  { value: "editar_previsao", label: "Editar Previsão" },
  { value: "gerar_boletim", label: "Gerar Boletim" },
  { value: "atualizar_configuracoes", label: "Atualizar Config" },
  { value: "finalizar_boletim", label: "Finalizar Boletim" },
  { value: "enviar_boletim", label: "Enviar Boletim" },
  { value: "aprovar_boletim", label: "Aprovar Boletim" },
];

function fmtDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function ActionBadge({ acao }: { acao: string }) {
  const colors: Record<string, string> = {
    abrir_bm: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    fechar_bm: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    alterar_status_previsao: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    criar_previsao: "bg-primary/10 text-primary",
    gerar_boletim: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    atualizar_configuracoes: "bg-muted text-muted-foreground",
  };
  const c = colors[acao] || "bg-muted text-muted-foreground";
  return <Badge className={`text-[10px] border-0 px-1.5 py-0 ${c}`}>{acao}</Badge>;
}

export default function AuditLogPage() {
  const [page, setPage] = useState(0);
  const [usuario, setUsuario] = useState("");
  const [acao, setAcao] = useState("__all__");
  const [referencia, setReferencia] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filters = useMemo(() => ({
    offset: page * 50,
    usuario: usuario.trim() || undefined,
    acao: acao === "__all__" ? undefined : acao,
    referencia: referencia.trim() || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }), [page, usuario, acao, referencia, dateFrom, dateTo]);

  const { data: logs, isLoading } = useAuditLog(filters);

  const hasNext = (logs?.length ?? 0) === 50;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <History className="h-6 w-6" /> Histórico de Auditoria
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Registro de todas as ações realizadas no sistema</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase">Usuário</label>
          <Input
            placeholder="Buscar usuário..."
            value={usuario}
            onChange={e => { setUsuario(e.target.value); setPage(0); }}
            className="h-8 w-40 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase">Ação</label>
          <Select value={acao} onValueChange={v => { setAcao(v); setPage(0); }}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACOES.map(a => (
                <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase">Referência</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="iPPU, BM, doc..."
              value={referencia}
              onChange={e => { setReferencia(e.target.value); setPage(0); }}
              className="h-8 w-40 text-xs pl-7"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase">De</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(0); }}
            className="h-8 w-36 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase">Até</label>
          <Input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(0); }}
            className="h-8 w-36 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-[140px]">Data</TableHead>
              <TableHead className="text-xs">Usuário</TableHead>
              <TableHead className="text-xs">Ação</TableHead>
              <TableHead className="text-xs">Entidade</TableHead>
              <TableHead className="text-xs">Referência</TableHead>
              <TableHead className="text-xs w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : logs && logs.length > 0 ? (
              logs.map((log: any) => (
                <Collapsible key={log.id} open={expandedRow === log.id} onOpenChange={open => setExpandedRow(open ? log.id : null)} asChild>
                  <>
                    <CollapsibleTrigger asChild>
                      <TableRow className="cursor-pointer hover:bg-muted/60">
                        <TableCell className="text-[11px] font-mono text-muted-foreground">{fmtDate(log.created_at)}</TableCell>
                        <TableCell className="text-xs">{log.user_nome || "—"}</TableCell>
                        <TableCell><ActionBadge acao={log.acao} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.entidade}</TableCell>
                        <TableCell className="text-xs font-mono">{log.referencia || "—"}</TableCell>
                        <TableCell>
                          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expandedRow === log.id ? "rotate-180" : ""}`} />
                        </TableCell>
                      </TableRow>
                    </CollapsibleTrigger>
                    <CollapsibleContent asChild>
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/30 p-3">
                          <p className="text-[10px] text-muted-foreground mb-1 uppercase font-semibold">Detalhes</p>
                          <pre className="text-[11px] font-mono bg-background rounded p-3 border overflow-auto max-h-[200px] whitespace-pre-wrap">
                            {JSON.stringify(log.detalhes, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Página {page + 1} · {logs?.length ?? 0} registros
        </p>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-7 gap-1 text-xs">
            <ChevronLeft className="h-3 w-3" /> Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage(p => p + 1)} className="h-7 gap-1 text-xs">
            Próxima <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
