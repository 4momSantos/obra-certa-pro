import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, AlertCircle, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useETF } from '@/contexts/ETFContext';
import type { ETFCategoria, ETFStatus } from '@/types/etf';
import { CATEGORIAS, STATUS_OPTIONS } from '@/types/etf';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  nome: string;
  categoria: ETFCategoria;
  empresa: string;
  horasTrabalhadas: number;
  horasExtras: number;
  faltas: number;
  semana: string;
  status: ETFStatus;
}

function inferCategoria(val: string): ETFCategoria {
  const v = val?.toLowerCase().trim() || '';
  if (v.includes('eng')) return 'Engenheiro';
  if (v.includes('téc') || v.includes('tec')) return 'Técnico';
  if (v.includes('enc')) return 'Encarregado';
  if (v.includes('oper') || v.includes('opér')) return 'Operário';
  if (v.includes('admin')) return 'Administrativo';
  return 'Operário';
}

function inferStatus(val: string): ETFStatus {
  const v = val?.toLowerCase().trim() || '';
  if (v.includes('afast')) return 'Afastado';
  if (v.includes('fér') || v.includes('fer')) return 'Férias';
  if (v.includes('desl')) return 'Desligado';
  return 'Ativo';
}

export default function ETFImportDialog({ open, onOpenChange }: Props) {
  const { importarRegistros } = useETF();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [semana, setSemana] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const resetState = () => {
    setRows([]);
    setRawHeaders([]);
    setFileName('');
  };

  const processFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

        if (json.length === 0) {
          toast.error('Planilha vazia');
          return;
        }

        const headers = Object.keys(json[0]);
        setRawHeaders(headers);

        // Try to auto-map columns
        const findCol = (keywords: string[]) =>
          headers.find(h => keywords.some(k => h.toLowerCase().includes(k))) || '';

        const colNome = findCol(['nome', 'name', 'funcionário', 'colaborador']);
        const colCategoria = findCol(['categoria', 'cargo', 'função', 'funcao']);
        const colEmpresa = findCol(['empresa', 'company', 'contratada']);
        const colHoras = findCol(['horas', 'trabalhad', 'hours']);
        const colExtras = findCol(['extra', 'overtime', 'he']);
        const colFaltas = findCol(['falta', 'absence', 'ausência']);
        const colStatus = findCol(['status', 'situação', 'situacao']);

        const parsed: ParsedRow[] = json.map((row: Record<string, unknown>) => ({
          nome: String(row[colNome] || 'Sem nome'),
          categoria: inferCategoria(String(row[colCategoria] || '')),
          empresa: String(row[colEmpresa] || 'Não informada'),
          horasTrabalhadas: Number(row[colHoras]) || 44,
          horasExtras: Number(row[colExtras]) || 0,
          faltas: Number(row[colFaltas]) || 0,
          semana: semana,
          status: inferStatus(String(row[colStatus] || 'Ativo')),
        }));

        setRows(parsed);
      } catch {
        toast.error('Erro ao processar arquivo');
      }
    };
    reader.readAsArrayBuffer(file);
  }, [semana]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleImport = () => {
    if (rows.length === 0) return;
    const finalRows = rows.map(r => ({ ...r, semana: semana || r.semana }));
    importarRegistros(finalRows);
    toast.success(`${rows.length} registros importados`);
    resetState();
    onOpenChange(false);
  };

  // Generate current week for default
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const weekNum = Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
  const defaultWeek = `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

  if (!semana) setSemana(defaultWeek);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Planilha ETF
          </DialogTitle>
          <DialogDescription>
            Importe dados de ponto a partir de arquivo Excel (.xlsx) ou CSV
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Semana:</label>
            <input
              type="week"
              value={semana}
              onChange={e => setSemana(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            />
          </div>

          {rows.length === 0 ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer
                ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
              `}
              onClick={() => document.getElementById('etf-file-input')?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-sm text-muted-foreground mb-1">
                Arraste um arquivo .xlsx ou .csv aqui
              </p>
              <p className="text-xs text-muted-foreground/60">
                ou clique para selecionar
              </p>
              <input
                id="etf-file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <Badge variant="secondary">{rows.length} registros</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={resetState}>
                  Trocar arquivo
                </Button>
              </div>

              <div className="rounded-lg border overflow-auto max-h-[40vh]">
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 20).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{r.categoria}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">{r.empresa}</TableCell>
                        <TableCell className="text-right font-mono">{r.horasTrabalhadas}</TableCell>
                        <TableCell className="text-right font-mono">{r.horasExtras}</TableCell>
                        <TableCell className="text-right font-mono">{r.faltas}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'Ativo' ? 'default' : 'secondary'} className="text-xs">
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rows.length > 20 && (
                  <p className="text-xs text-center text-muted-foreground py-2">
                    ... e mais {rows.length - 20} registros
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                Verifique os dados acima antes de confirmar a importação
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetState(); onOpenChange(false); }}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={rows.length === 0} className="gap-2">
            <Upload className="h-4 w-4" />
            Importar {rows.length > 0 ? `(${rows.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
