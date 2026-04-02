import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import type { ProcessingResults } from '@/types/etf';
import { fmtDate, fmtTime } from '@/lib/etf-processing';

interface Props {
  results: ProcessingResults;
  onBack: () => void;
  onExport: () => void;
}

export default function ETFWizardResults({ results, onBack, onExport }: Props) {
  const matsComPonto = new Set(results.apontamento.map(a => a.chapa));
  const semPonto = results.planejamento.filter(p => !p.hasPonto).length;

  const stats = [
    { label: 'Registros Ponto', value: results.pontoRaw.length, color: 'text-blue-500' },
    { label: 'Chapas ETF', value: results.efetivoETF.size, color: 'text-green-500' },
    { label: 'Planejamento', value: results.planejamento.length, color: 'text-purple-500' },
    { label: 'Apontamento', value: results.apontamento.length, color: 'text-orange-500' },
    { label: 'ETF c/ Ponto', value: matsComPonto.size, color: 'text-yellow-500' },
    { label: 'ETF s/ Ponto', value: semPonto, color: 'text-red-500' },
    ...(results.substitutos.length > 0 ? [{ label: 'Substitutos', value: results.substitutos.length, color: 'text-purple-400' }] : []),
  ];

  const pontoByMatSet = useMemo(() => {
    const map = new Map<string, Set<string>>();
    results.canteiro.forEach(c => {
      if (!map.has(c.matricula)) map.set(c.matricula, new Set());
      map.get(c.matricula)!.add(c.dateKey);
    });
    return map;
  }, [results.canteiro]);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
        {stats.map(s => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-3 text-center">
              <p className={`text-lg sm:text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <Tabs defaultValue="dist">
            <ScrollArea className="w-full">
              <TabsList className="inline-flex w-auto">
                <TabsTrigger value="dist">Distribuição Função</TabsTrigger>
                <TabsTrigger value="plan">Planejamento</TabsTrigger>
                <TabsTrigger value="apont">Apontamento</TabsTrigger>
                <TabsTrigger value="faltas">Faltas ({results.faltas.length})</TabsTrigger>
                <TabsTrigger value="subs">Substitutos ({results.substitutos.length})</TabsTrigger>
                <TabsTrigger value="aus">Ausentes ({results.ausentes.length})</TabsTrigger>
                <TabsTrigger value="ponto">Ponto Consolidado</TabsTrigger>
              </TabsList>
            </ScrollArea>

            {/* DIST POR FUNÇÃO */}
            <TabsContent value="dist">
              <ScrollArea className="max-h-[500px]">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Função</TableHead>
                        {results.allDates.map(dk => (
                          <TableHead key={dk} className="text-center text-xs min-w-[70px]">
                            {fmtDate(new Date(dk + 'T00:00:00'))}
                          </TableHead>
                        ))}
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Equipe</TableHead>
                        <TableHead className="text-center">PB</TableHead>
                        <TableHead className="text-center">Dif</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.distFuncao.map(f => (
                        <TableRow key={f.funcao}>
                          <TableCell className="text-xs font-medium">{f.funcao}</TableCell>
                          {results.allDates.map(dk => (
                            <TableCell key={dk} className="text-center text-xs font-mono">{f.dates[dk] || 0}</TableCell>
                          ))}
                          <TableCell className="text-center font-bold text-xs">{f.total}</TableCell>
                          <TableCell className="text-center font-bold text-xs">{f.totalEquipe}</TableCell>
                          <TableCell className="text-center text-xs">{f.aprovPB}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={f.dif < 0 ? 'destructive' : f.dif > 0 ? 'default' : 'secondary'} className="text-xs">
                              {f.dif}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* PLANEJAMENTO */}
            <TabsContent value="plan">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Líder</TableHead>
                      <TableHead>Equipe</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Função ETF</TableHead>
                      <TableHead>Chapa</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.planejamento.slice(0, 500).map((p, i) => (
                      <TableRow key={i} className={p.isSubstituto ? 'bg-purple-500/5' : ''}>
                        <TableCell className="text-xs">{p.lider}</TableCell>
                        <TableCell className="text-xs">{p.equipe}</TableCell>
                        <TableCell className="text-xs font-medium">{p.nome}</TableCell>
                        <TableCell className="text-xs">{p.funcaoETF}</TableCell>
                        <TableCell className="text-xs font-mono">{p.chapa}</TableCell>
                        <TableCell>
                          {p.isSubstituto ? (
                            <Badge className="bg-purple-500/20 text-purple-400 text-xs">SUB</Badge>
                          ) : p.hasPonto ? (
                            <Badge className="bg-green-500/20 text-green-500 text-xs">✓</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">✗</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            {/* APONTAMENTO */}
            <TabsContent value="apont">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data Início</TableHead>
                      <TableHead>Data Fim</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Função ETF</TableHead>
                      <TableHead>Equipe</TableHead>
                      <TableHead>Chapa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.apontamento.slice(0, 500).map((a, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{a.dataInicio}</TableCell>
                        <TableCell className="text-xs">{a.dataFim}</TableCell>
                        <TableCell className="text-xs font-medium">{a.nome}</TableCell>
                        <TableCell className="text-xs">{a.funcaoETF}</TableCell>
                        <TableCell className="text-xs">{a.equipe}</TableCell>
                        <TableCell className="text-xs font-mono">{a.chapa}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            {/* FALTAS */}
            <TabsContent value="faltas">
              <ScrollArea className="max-h-[500px]">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Profissional</TableHead>
                        <TableHead>Função ETF</TableHead>
                        <TableHead>Equipe</TableHead>
                        {results.allDates.map(dk => (
                          <TableHead key={dk} className="text-center text-xs min-w-[60px]">
                            {fmtDate(new Date(dk + 'T00:00:00')).slice(0, 5)}
                          </TableHead>
                        ))}
                        <TableHead className="text-center">Faltas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.faltas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={99} className="text-center py-8 text-green-500">
                            Todos presentes todos os dias ✓
                          </TableCell>
                        </TableRow>
                      ) : results.faltas.map((f, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-medium">{f.nome}</TableCell>
                          <TableCell className="text-xs">{f.funcaoETF}</TableCell>
                          <TableCell className="text-xs">{f.equipe}</TableCell>
                          {results.allDates.map(dk => (
                            <TableCell key={dk} className="text-center">
                              {f.diasPresente.has(dk) ? (
                                <span className="text-green-500 text-xs">✓</span>
                              ) : (
                                <span className="text-red-500 text-xs font-bold">✗</span>
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-center">
                            <Badge variant="destructive" className="text-xs">{f.totalFaltas}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* SUBSTITUTOS */}
            <TabsContent value="subs">
              <ScrollArea className="max-h-[500px]">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Profissional</TableHead>
                        <TableHead>Função ETF</TableHead>
                        <TableHead>Equipe</TableHead>
                        {results.allDates.map(dk => (
                          <TableHead key={dk} className="text-center text-xs min-w-[60px]">
                            {fmtDate(new Date(dk + 'T00:00:00')).slice(0, 5)}
                          </TableHead>
                        ))}
                        <TableHead className="text-center">Dias</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.substitutos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={99} className="text-center py-8 text-muted-foreground">
                            Nenhuma substituição necessária
                          </TableCell>
                        </TableRow>
                      ) : results.substitutos.map((s, i) => {
                        const diasSub = results.subsDiarios.get(s.chapa) || new Set();
                        const diasPonto = pontoByMatSet.get(s.chapa) || new Set();
                        let totalSub = 0;
                        return (
                          <TableRow key={i}>
                            <TableCell className="text-xs font-medium">{s.nome}</TableCell>
                            <TableCell className="text-xs">{s.funcaoETF}</TableCell>
                            <TableCell className="text-xs">{s.equipe}</TableCell>
                            {results.allDates.map(dk => {
                              if (diasSub.has(dk)) { totalSub++; return <TableCell key={dk} className="text-center text-green-500 text-xs">✓ SUB</TableCell>; }
                              if (diasPonto.has(dk)) return <TableCell key={dk} className="text-center text-yellow-500 text-xs">excede</TableCell>;
                              return <TableCell key={dk} className="text-center text-red-500 text-xs">✗</TableCell>;
                            })}
                            <TableCell className="text-center font-bold text-xs">{diasSub.size}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* AUSENTES */}
            <TabsContent value="aus">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Função ETF</TableHead>
                      <TableHead>Equipe</TableHead>
                      <TableHead>Líder</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.ausentes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-green-500">
                          Nenhum ausente ✓
                        </TableCell>
                      </TableRow>
                    ) : results.ausentes.map((a, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-medium">{a.nome}</TableCell>
                        <TableCell className="text-xs">{a.funcaoETF}</TableCell>
                        <TableCell className="text-xs">{a.equipe}</TableCell>
                        <TableCell className="text-xs">{a.lider}</TableCell>
                        <TableCell className="text-xs text-destructive">{a.motivo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            {/* PONTO CONSOLIDADO */}
            <TabsContent value="ponto">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Saída</TableHead>
                      <TableHead className="text-right">HH</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.canteiro.slice(0, 300).map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-mono">{c.matricula}</TableCell>
                        <TableCell className="text-xs">{c.nome}</TableCell>
                        <TableCell className="text-xs">{c.cargo}</TableCell>
                        <TableCell className="text-xs">{c.local}</TableCell>
                        <TableCell className="text-xs">{fmtDate(c.date)}</TableCell>
                        <TableCell className="text-xs">{c.entrada ? fmtTime(c.entrada) : '-'}</TableCell>
                        <TableCell className="text-xs">{c.saida ? fmtTime(c.saida) : '-'}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{c.hh}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Reconfigurar</Button>
        <Button onClick={onExport}>Exportar →</Button>
      </div>
    </div>
  );
}
