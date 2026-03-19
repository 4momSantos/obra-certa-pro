import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Upload, Plus, Search, Trash2, Pencil,
  HardHat, Wrench, Briefcase, Clock, AlertTriangle, ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useETF } from '@/contexts/ETFContext';
import ETFImportDialog from '@/components/etf/ETFImportDialog';
import ETFRecordForm from '@/components/etf/ETFRecordForm';
import ETFCategoryChart from '@/components/etf/ETFCategoryChart';
import type { ETFRecord, ETFCategoria } from '@/types/etf';
import { CATEGORIAS } from '@/types/etf';
import { toast } from 'sonner';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Engenheiro: <Briefcase className="h-5 w-5" />,
  Técnico: <Wrench className="h-5 w-5" />,
  Encarregado: <HardHat className="h-5 w-5" />,
  Operário: <Users className="h-5 w-5" />,
  Administrativo: <Briefcase className="h-5 w-5" />,
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  Engenheiro: 'gradient-primary',
  Técnico: 'gradient-accent',
  Encarregado: 'gradient-success',
  Operário: 'gradient-danger',
  Administrativo: 'gradient-primary',
};

export default function ETF() {
  const {
    semanas, semanaSelecionada, setSemana,
    filteredRecords, getWeekSummary, removeRegistro,
  } = useETF();

  const [importOpen, setImportOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ETFRecord | null>(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');

  const summary = getWeekSummary();

  const displayedRecords = useMemo(() => {
    let recs = filteredRecords;
    if (catFilter !== 'all') recs = recs.filter(r => r.categoria === catFilter);
    if (search) {
      const q = search.toLowerCase();
      recs = recs.filter(r => r.nome.toLowerCase().includes(q) || r.empresa.toLowerCase().includes(q));
    }
    return recs;
  }, [filteredRecords, catFilter, search]);

  const handleEdit = (record: ETFRecord) => {
    setEditRecord(record);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    removeRegistro(id);
    toast.success('Registro removido');
  };

  const summaryCards = [
    { title: 'Total Efetivo', value: summary.totalEfetivo, icon: <Users className="h-5 w-5" />, gradient: 'gradient-primary' },
    { title: 'Total Horas', value: summary.totalHoras, icon: <Clock className="h-5 w-5" />, gradient: 'gradient-accent', suffix: 'h' },
    { title: 'Horas Extras', value: summary.totalHorasExtras, icon: <Clock className="h-5 w-5" />, gradient: 'gradient-success', suffix: 'h' },
    { title: 'Faltas', value: summary.totalFaltas, icon: <AlertTriangle className="h-5 w-5" />, gradient: 'gradient-danger' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ETF Semanal</h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de Efetivo Técnico e Funcional</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={semanaSelecionada} onValueChange={setSemana}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Semana" />
            </SelectTrigger>
            <SelectContent>
              {semanas.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Importar
          </Button>
          <Button className="gap-2" onClick={() => { setEditRecord(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Novo
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <motion.div key={card.title} custom={i} variants={cardVariants} initial="hidden" animate="visible">
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {card.title}
                  </span>
                  <div className={`${card.gradient} p-1.5 rounded-lg text-primary-foreground`}>
                    {card.icon}
                  </div>
                </div>
                <p className="text-2xl font-bold font-mono tracking-tight">
                  {card.value}{card.suffix || ''}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Chart + Category breakdown */}
      <div className="grid lg:grid-cols-5 gap-4">
        <Card className="glass-card lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Efetivo por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ETFCategoryChart data={summary.porCategoria} />
          </CardContent>
        </Card>

        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resumo por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.porCategoria.filter(c => c.total > 0).map((cat, i) => (
              <motion.div
                key={cat.categoria}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className={`${CATEGORY_GRADIENTS[cat.categoria]} p-1.5 rounded-md text-primary-foreground`}>
                    {CATEGORY_ICONS[cat.categoria]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{cat.categoria}</p>
                    <p className="text-xs text-muted-foreground">{cat.horas}h trabalhadas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold font-mono">{cat.total}</p>
                  {cat.horasExtras > 0 && (
                    <p className="text-xs text-muted-foreground">+{cat.horasExtras}h extras</p>
                  )}
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">Registros da Semana</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 w-[200px] h-9"
                />
              </div>
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">HE</TableHead>
                  <TableHead className="text-right">Faltas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedRecords.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{r.categoria}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{r.empresa}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{r.horasTrabalhadas}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{r.horasExtras}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{r.faltas}</TableCell>
                      <TableCell>
                        <Badge
                          variant={r.status === 'Ativo' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {displayedRecords.length} de {filteredRecords.length} registros
          </p>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ETFImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ETFRecordForm
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditRecord(null); }}
        record={editRecord}
      />
    </motion.div>
  );
}
