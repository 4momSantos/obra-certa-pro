import { motion } from "framer-motion";
import { ShieldAlert, ShieldCheck, AlertTriangle, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useCobertura } from "@/hooks/useSconViews";
import { formatCompact, formatPercent } from "@/lib/format";

const semaforoColors: Record<string, string> = {
  verde: "bg-emerald-500",
  laranja: "bg-amber-500",
  azul: "bg-blue-500",
  cinza: "bg-muted-foreground/40",
};

export default function Cobertura() {
  const { data, isLoading } = useCobertura();

  const semSconCount = data?.semScon.length ?? 0;
  const semSconValor = data?.semSconValor ?? 0;
  const anomaliasCount = data?.anomalias.length ?? 0;
  const cobertura = data?.cobertura ?? 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cobertura SCON</h1>
        <p className="text-sm text-muted-foreground mt-1">Análise de cobertura de componentes SCON sobre o cronograma</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-destructive/10 p-2.5"><ShieldAlert className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Sem SCON</p>
                <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16" /> : semSconCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-destructive/10 p-2.5"><DollarSign className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Valor s/ SCON</p>
                <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16" /> : formatCompact(semSconValor)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2.5"><AlertTriangle className="h-5 w-5 text-amber-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Anomalias (&gt;105%)</p>
                <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16" /> : anomaliasCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2.5"><ShieldCheck className="h-5 w-5 text-emerald-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Cobertura</p>
                <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16" /> : formatPercent(cobertura)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardContent className="pt-6">
          <Tabs defaultValue="sem-scon">
            <TabsList>
              <TabsTrigger value="sem-scon">Sem SCON ({semSconCount})</TabsTrigger>
              <TabsTrigger value="anomalias">Anomalias ({anomaliasCount})</TabsTrigger>
            </TabsList>
            <TabsContent value="sem-scon">
              {isLoading ? (
                <div className="space-y-2 mt-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>iPPU</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Semáforo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.semScon.sort((a, b) => b.valor - a.valor).slice(0, 200).map((item) => (
                      <TableRow key={item.ippu}>
                        <TableCell className="font-mono text-xs">{item.ippu}</TableCell>
                        <TableCell>{item.nome}</TableCell>
                        <TableCell className="text-right font-mono">{formatCompact(item.valor)}</TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-block h-3 w-3 rounded-full ${semaforoColors[item.semaforo]}`} title={item.semaforo} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {data?.semScon.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Todos os PPU têm cobertura SCON</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            <TabsContent value="anomalias">
              {isLoading ? (
                <div className="space-y-2 mt-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>iPPU</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Avanço SCON</TableHead>
                      <TableHead className="text-right">Componentes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.anomalias.sort((a, b) => b.avanco - a.avanco).map((item) => (
                      <TableRow key={item.ippu}>
                        <TableCell className="font-mono text-xs">{item.ippu}</TableCell>
                        <TableCell>{item.nome}</TableCell>
                        <TableCell className="text-right font-mono">
                          <Badge variant="destructive" className="text-xs">{(item.avanco * 100).toFixed(1)}%</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">{item.componentes}</TableCell>
                      </TableRow>
                    ))}
                    {data?.anomalias.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sem anomalias detectadas</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
