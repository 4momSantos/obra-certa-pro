import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, ChevronDown, FileUp, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { useCronogramaTree, useCronogramaBm, useUltimoBm } from "@/hooks/useCronogramaData";
import { formatCurrencyFull } from "@/lib/format";
import { Link } from "react-router-dom";

export default function Cronograma() {
  const { data: tree, isLoading: loadingTree } = useCronogramaTree();
  const { data: bmData } = useCronogramaBm();
  const { data: ultimoBm } = useUltimoBm();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loadingTree) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Carregando cronograma...
      </div>
    );
  }

  if (!tree || tree.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-64 gap-4"
      >
        <FileUp className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">Nenhum cronograma importado</p>
        <Button asChild>
          <Link to="/import">Importar Cronograma CR-5290</Link>
        </Button>
      </motion.div>
    );
  }

  // Build BM lookup: ippu -> bm_number -> { previsto, projetado, realizado }
  const bmByIppu = new Map<string, Map<number, { previsto: number; projetado: number; realizado: number }>>();
  bmData?.forEach(b => {
    if (!bmByIppu.has(b.ippu)) bmByIppu.set(b.ippu, new Map());
    bmByIppu.get(b.ippu)!.set(b.bm_number, b);
  });

  // Get unique BM numbers
  const bmNumbers = [...new Set(bmData?.map(b => b.bm_number) || [])].sort((a, b) => a - b);

  // Totals
  const totalPrevisto = tree.reduce((s, n) => s + (n.nivel === "5" ? n.total_previsto_bm : 0), 0);
  const totalProjetado = tree.reduce((s, n) => s + (n.nivel === "5" ? n.total_projetado_bm : 0), 0);
  const totalRealizado = tree.reduce((s, n) => s + (n.nivel === "5" ? n.total_realizado_bm : 0), 0);

  // Filter visible rows based on expansion
  const visibleRows = tree.filter(node => {
    if (node.nivel === "3") return true;
    if (node.nivel === "4") return expanded.has(node.fase_nome);
    if (node.nivel === "5") return expanded.has(node.fase_nome) && expanded.has(node.subfase_nome);
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cronograma Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Árvore EAP com valores por BM
          {ultimoBm ? ` — Último BM com realizado: BM-${String(ultimoBm).padStart(2, "0")}` : ""}
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Valor Contratual", value: tree.reduce((s, n) => s + (n.nivel === "3" ? n.valor : 0), 0), color: "text-foreground" },
          { label: "Total Previsto", value: totalPrevisto, color: "text-chart-2" },
          { label: "Total Projetado", value: totalProjetado, color: "text-chart-5" },
          { label: "Total Realizado", value: totalRealizado, color: "text-chart-3" },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{item.label}</p>
              <p className={`font-mono text-sm font-bold mt-1 ${item.color}`}>
                {formatCurrencyFull(item.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tree table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[280px] font-semibold sticky left-0 bg-card z-10">Estrutura EAP</TableHead>
                  <TableHead className="text-right font-semibold">Valor</TableHead>
                  <TableHead className="text-right font-semibold">Previsto</TableHead>
                  <TableHead className="text-right font-semibold">Projetado</TableHead>
                  <TableHead className="text-right font-semibold">Realizado</TableHead>
                  <TableHead className="text-right font-semibold">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map(node => {
                  const indent = node.nivel === "3" ? 0 : node.nivel === "4" ? 24 : 48;
                  const hasChildren = node.nivel !== "5" && tree.some(n =>
                    (node.nivel === "3" && n.nivel === "4" && n.fase_nome === node.nome) ||
                    (node.nivel === "4" && n.nivel === "5" && n.subfase_nome === node.nome)
                  );
                  const isExpanded = node.nivel === "3"
                    ? expanded.has(node.nome)
                    : node.nivel === "4" ? expanded.has(node.nome) : false;
                  const toggleKey = node.nome;

                  return (
                    <TableRow
                      key={node.id}
                      className={node.nivel === "3" ? "bg-muted/40 font-semibold" : node.nivel === "4" ? "bg-muted/20" : ""}
                    >
                      <TableCell className="sticky left-0 bg-inherit z-10">
                        <div className="flex items-center gap-1" style={{ paddingLeft: indent }}>
                          {hasChildren ? (
                            <button onClick={() => toggle(toggleKey)} className="p-0.5 hover:bg-accent rounded">
                              {isExpanded
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              }
                            </button>
                          ) : <span className="w-5" />}
                          <span className="text-xs truncate max-w-[220px]">
                            {node.ippu && <Badge variant="outline" className="mr-1.5 text-[9px] px-1 py-0">{node.ippu}</Badge>}
                            {node.nome}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatCurrencyFull(node.valor)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatCurrencyFull(node.total_previsto_bm)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatCurrencyFull(node.total_projetado_bm)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-chart-3">{formatCurrencyFull(node.total_realizado_bm)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatCurrencyFull(node.saldo)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
