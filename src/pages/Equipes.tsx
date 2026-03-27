import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Component, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEquipes, useSconComponentes } from "@/hooks/useSconViews";

export default function Equipes() {
  const { data: equipes, isLoading } = useEquipes();
  const { data: componentes } = useSconComponentes();
  const [selectedEquipe, setSelectedEquipe] = useState<string | null>(null);

  const totalEquipes = equipes?.length ?? 0;
  const totalComps = equipes?.reduce((a, b) => a + (b.total_componentes ?? 0), 0) ?? 0;

  const equipComps = componentes?.filter((c) => c.encarregado && selectedEquipe && 
    equipes?.find(e => e.equipe === selectedEquipe)?.encarregados?.includes(c.encarregado)
  ) ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Equipes</h1>
        <p className="text-sm text-muted-foreground mt-1">Ranking de equipes de campo</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Equipes Ativas</p>
                <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16" /> : totalEquipes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent/10 p-2.5">
                <Component className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Componentes</p>
                <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16" /> : totalComps.toLocaleString("pt-BR")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Ranking de Equipes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipe</TableHead>
                  <TableHead>Disciplinas</TableHead>
                  <TableHead>Encarregados</TableHead>
                  <TableHead className="text-right">Componentes</TableHead>
                  <TableHead className="text-right">Semanas</TableHead>
                  <TableHead className="text-right">Comps/Sem</TableHead>
                  <TableHead className="text-right">Linhas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipes?.sort((a, b) => (b.comps_por_semana ?? 0) - (a.comps_por_semana ?? 0)).map((eq) => (
                  <TableRow
                    key={eq.equipe}
                    className="cursor-pointer hover:bg-muted/60"
                    onClick={() => setSelectedEquipe(eq.equipe)}
                  >
                    <TableCell className="font-medium">{eq.equipe}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {eq.disciplinas?.slice(0, 3).map((d) => (
                          <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>
                        ))}
                        {(eq.disciplinas?.length ?? 0) > 3 && (
                          <Badge variant="outline" className="text-[10px]">+{(eq.disciplinas?.length ?? 0) - 3}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{eq.encarregados?.join(", ") ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">{eq.total_componentes?.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right font-mono">{eq.total_semanas}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{eq.comps_por_semana}</TableCell>
                    <TableCell className="text-right font-mono">{eq.total_linhas?.toLocaleString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedEquipe} onOpenChange={() => setSelectedEquipe(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Equipe: {selectedEquipe}</SheetTitle>
            <SheetDescription>Componentes atribuídos à equipe</SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Componente</TableHead>
                  <TableHead>Disciplina</TableHead>
                  <TableHead>CWP</TableHead>
                  <TableHead className="text-right">Avanço</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipComps.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>
                ) : equipComps.slice(0, 100).map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{c.componente}</TableCell>
                    <TableCell>{c.disciplina}</TableCell>
                    <TableCell>{c.cwp}</TableCell>
                    <TableCell className="text-right font-mono">{((c.avanco ?? 0) * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}
