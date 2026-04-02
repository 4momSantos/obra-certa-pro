import { motion } from "framer-motion";
import { Layers, Component, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisciplinas } from "@/hooks/useSconViews";

export default function Disciplinas() {
  const { data: disciplinas, isLoading } = useDisciplinas();

  const totalDisc = disciplinas?.length ?? 0;
  const totalComps = disciplinas?.reduce((a, b) => a + (b.total_componentes ?? 0), 0) ?? 0;
  const totalConcluidos = disciplinas?.reduce((a, b) => a + (b.concluidos ?? 0), 0) ?? 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Disciplinas</h1>
        <p className="text-sm text-muted-foreground mt-1">Breakdown por disciplina SCON</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5"><Layers className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Disciplinas</p>
                <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16" /> : totalDisc}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent/10 p-2.5"><Component className="h-5 w-5 text-accent" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Componentes</p>
                <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16" /> : totalComps.toLocaleString("pt-BR")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-chart-3/10 p-2.5"><CheckCircle2 className="h-5 w-5 text-chart-3" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Concluídos</p>
                <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16" /> : totalConcluidos.toLocaleString("pt-BR")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" /> Disciplinas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Disciplina</TableHead>
                  <TableHead className="text-right">Linhas SCON</TableHead>
                  <TableHead className="text-right">Componentes</TableHead>
                  <TableHead className="text-right">Concluídos</TableHead>
                  <TableHead className="text-right">Em Andamento</TableHead>
                  <TableHead className="text-right">Não Iniciados</TableHead>
                  <TableHead className="w-[160px]">% Exec</TableHead>
                  <TableHead className="text-right">PPU</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disciplinas?.sort((a, b) => (b.total_componentes ?? 0) - (a.total_componentes ?? 0)).map((d) => {
                  const total = d.total_componentes ?? 0;
                  const concl = d.concluidos ?? 0;
                  const emAnd = Math.max(0, total - concl);
                  const naoIni = 0; // view doesn't distinguish; shown as 0
                  const pct = total > 0 ? (concl / total) * 100 : 0;
                  return (
                    <TableRow key={d.disciplina}>
                      <TableCell className="font-medium">{d.disciplina}</TableCell>
                      <TableCell className="text-right font-mono">{d.total_linhas?.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right font-mono">{total.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">{concl.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right font-mono text-amber-600">{emAnd.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{naoIni}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-2 flex-1" />
                          <span className="text-xs font-mono w-12 text-right">{pct.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{d.total_ppu}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
