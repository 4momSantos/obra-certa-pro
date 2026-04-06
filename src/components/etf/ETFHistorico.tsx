import { useState } from 'react';
import { Loader2, Eye, Trash2, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useETFSession, type ETFSession } from '@/hooks/useETFSession';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

function fmtCompetencia(c: string): string {
  // YYYY-MM-DD → MM/YYYY
  if (!c || c.length < 7) return c;
  const [y, m] = c.split('-');
  return `${m}/${y}`;
}

function fmtNum(n: number, digits = 0): string {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n ?? 0);
}

export default function ETFHistorico() {
  const { sessions, loading, error, loadSessions, loadSessionDetail, deleteSession } = useETFSession();
  const { user } = useAuth();
  const [detail, setDetail] = useState<ETFSession | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleViewDetail = async (id: string) => {
    setLoadingDetail(true);
    const d = await loadSessionDetail(id);
    setLoadingDetail(false);
    if (d) setDetail(d);
    else toast.error('Não foi possível carregar o detalhe da sessão');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta sessão? Esta ação não pode ser desfeita.')) return;
    setDeletingId(id);
    const ok = await deleteSession(id);
    setDeletingId(null);
    if (ok) toast.success('Sessão excluída');
    else toast.error('Falha ao excluir sessão');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Histórico de Sessões ETF</h2>
          <p className="text-xs text-muted-foreground">Sessões persistidas por competência e BM</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={loadSessions} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Atualizar
        </Button>
      </div>

      {error && (
        <Card className="glass-card border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">Erro: {error}</CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competência</TableHead>
                  <TableHead>BM</TableHead>
                  <TableHead className="text-right">Headcount</TableHead>
                  <TableHead className="text-right">H. Trab.</TableHead>
                  <TableHead className="text-right">Eficiência</TableHead>
                  <TableHead className="text-right">Absenteísmo</TableHead>
                  <TableHead>Upload</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && sessions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando…
                    </TableCell>
                  </TableRow>
                )}
                {!loading && sessions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                      Nenhuma sessão salva ainda.
                    </TableCell>
                  </TableRow>
                )}
                {sessions.map(s => {
                  const isOwner = user?.id && s.uploaded_by === user.id;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{fmtCompetencia(s.competencia)}</TableCell>
                      <TableCell>BM {s.bm_numero}</TableCell>
                      <TableCell className="text-right">{fmtNum(s.headcount_etf)}</TableCell>
                      <TableCell className="text-right">{fmtNum(s.horas_trabalhadas, 1)}</TableCell>
                      <TableCell className="text-right">{fmtNum(s.eficiencia_pct, 1)}%</TableCell>
                      <TableCell className="text-right">{fmtNum(s.absenteismo_pct, 1)}%</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(s.uploaded_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewDetail(s.id)}
                            disabled={loadingDetail}
                            title="Ver detalhe"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {isOwner && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(s.id)}
                              disabled={deletingId === s.id}
                              title="Excluir"
                              className="text-destructive hover:text-destructive"
                            >
                              {deletingId === s.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {detail ? `Sessão ${fmtCompetencia(detail.competencia)} — BM ${detail.bm_numero}` : ''}
            </SheetTitle>
            <SheetDescription>
              {detail?.colaboradores?.length ?? 0} colaboradores
            </SheetDescription>
          </SheetHeader>
          {detail && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <KPI label="Headcount ETF" value={fmtNum(detail.headcount_etf)} />
                <KPI label="Horas Trab." value={fmtNum(detail.horas_trabalhadas, 1)} />
                <KPI label="Eficiência" value={`${fmtNum(detail.eficiencia_pct, 1)}%`} />
                <KPI label="Absenteísmo" value={`${fmtNum(detail.absenteismo_pct, 1)}%`} />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chapa</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead className="text-right">Horas</TableHead>
                      <TableHead className="text-right">Faltas</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.colaboradores?.map(c => (
                      <TableRow key={c.chapa}>
                        <TableCell className="font-mono text-xs">{c.chapa}</TableCell>
                        <TableCell className="text-xs">{c.nome}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.limite_m7 ?? c.funcao ?? '—'}</TableCell>
                        <TableCell className="text-right text-xs">{fmtNum(c.horas_total, 1)}</TableCell>
                        <TableCell className="text-right text-xs">{c.faltas}</TableCell>
                        <TableCell className="text-xs">{c.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card/50 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
