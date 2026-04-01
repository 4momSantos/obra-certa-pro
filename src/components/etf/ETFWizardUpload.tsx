import { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Check, X, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { WizardFiles, WizardWorkbooks, EquipamentoInfo } from '@/types/etf';
import { autoDetectDates } from '@/lib/etf-processing';

interface FileSlot {
  key: keyof WizardFiles;
  label: string;
  required: boolean;
  icon: string;
}

const FILE_SLOTS: FileSlot[] = [
  { key: 'ponto', label: 'Ponto Bruto', required: true, icon: '📊' },
  { key: 'efetivo', label: 'Efetivo ETF', required: true, icon: '👥' },
  { key: 'prog', label: 'Programação', required: true, icon: '📅' },
  { key: 'modelo', label: 'Modelo DE PARA', required: false, icon: '🔄' },
  { key: 'equip', label: 'Equipamentos', required: false, icon: '🔧' },
];

interface Props {
  files: WizardFiles;
  workbooks: WizardWorkbooks;
  equipamentos: EquipamentoInfo[];
  onFilesChange: (files: WizardFiles) => void;
  onWorkbooksChange: (wbs: WizardWorkbooks) => void;
  onEquipamentosChange: (eqs: EquipamentoInfo[]) => void;
  onDatesDetected: (inicio: string, fim: string) => void;
  onNext: () => void;
}

export default function ETFWizardUpload({
  files, workbooks, equipamentos,
  onFilesChange, onWorkbooksChange, onEquipamentosChange, onDatesDetected, onNext,
}: Props) {
  const [dragOver, setDragOver] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadFile = useCallback((file: File, type: keyof WizardFiles) => {
    const newFiles = { ...files, [type]: file };
    onFilesChange(newFiles);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array', cellDates: true, cellText: false, cellNF: false });

      if (type === 'equip') {
        // Parse equipment
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const hdr = (rows[0] || []).map((h: any) => String(h).toUpperCase().trim());
        const cm: Record<string, number> = {};
        hdr.forEach((h: string, i: number) => {
          if (h.includes('TAG')) cm.tag = i;
          else if (h.includes('PLACA')) cm.placa = i;
          else if (h.includes('FABRICANTE')) cm.fabricante = i;
          else if (h.includes('NOME EQUIP') || h === 'NOME EQUIPAMENTO') cm.nomeEquip = i;
          else if (h.includes('NOME ETF')) cm.nomeETF = i;
          else if (h.includes('LOCADOR')) cm.locador = i;
          else if (h.includes('MODELO')) cm.modelo = i;
          else if (h.includes('LIDER') || h.includes('LÍDER')) cm.lider = i;
          else if (h === 'EQUIPE') cm.equipe = i;
        });
        const eqs: EquipamentoInfo[] = [];
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          const tag = String(row[cm.tag ?? 2] || '').trim();
          if (!tag) continue;
          eqs.push({
            tag,
            placa: String(row[cm.placa ?? 3] || '').trim(),
            fabricante: String(row[cm.fabricante ?? 4] || '').trim(),
            nomeEquip: String(row[cm.nomeEquip ?? 5] || '').trim(),
            nomeETF: String(row[cm.nomeETF ?? 6] || '').trim(),
            locador: String(row[cm.locador ?? 7] || '').trim(),
            modelo: String(row[cm.modelo ?? 8] || '').trim(),
            lider: String(row[cm.lider ?? 0] || '').trim(),
            equipe: String(row[cm.equipe ?? 1] || '').trim(),
          });
        }
        onEquipamentosChange(eqs);
        return;
      }

      const newWbs = { ...workbooks, [type]: wb };
      onWorkbooksChange(newWbs);

      if (type === 'ponto') {
        const { inicio, fim } = autoDetectDates(wb);
        if (inicio && fim) onDatesDetected(inicio, fim);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [files, workbooks, onFilesChange, onWorkbooksChange, onEquipamentosChange, onDatesDetected]);

  const handleDrop = useCallback((e: React.DragEvent, type: keyof WizardFiles) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file, type);
  }, [loadFile]);

  const isReady = workbooks.ponto && workbooks.efetivo && workbooks.prog;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {FILE_SLOTS.map(slot => {
          const isLoaded = slot.key === 'equip' ? equipamentos.length > 0 : !!workbooks[slot.key as keyof WizardWorkbooks];
          const file = files[slot.key];

          return (
            <Card
              key={slot.key}
              className={`cursor-pointer transition-all border-2 ${
                dragOver === slot.key ? 'border-primary bg-primary/5' :
                isLoaded ? 'border-green-500/50 bg-green-500/5' :
                'border-dashed border-border hover:border-primary/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(slot.key); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(e, slot.key)}
              onClick={() => inputRefs.current[slot.key]?.click()}
            >
              <CardContent className="p-5 text-center">
                <div className="text-2xl mb-2">{slot.icon}</div>
                <p className="text-sm font-medium mb-1">{slot.label}</p>
                {!slot.required && <Badge variant="outline" className="text-xs mb-2">Opcional</Badge>}

                {isLoaded ? (
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[180px]">
                      {file?.name || 'Carregado'}
                    </span>
                    {slot.key === 'equip' && (
                      <Badge variant="secondary" className="text-xs ml-1">{equipamentos.length}</Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">
                    Arraste ou clique
                  </p>
                )}

                <input
                  ref={el => { inputRefs.current[slot.key] = el; }}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) loadFile(f, slot.key);
                  }}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isReady && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          Carregue os 3 arquivos obrigatórios para prosseguir
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!isReady} className="gap-2">
          Configurar →
        </Button>
      </div>
    </div>
  );
}
