import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { EquipamentoInfo, EquipGridRow } from '@/types/etf';
import { dateKey, fmtDate } from '@/lib/etf-processing';

interface Props {
  equipamentos: EquipamentoInfo[];
  inicio: string;
  fim: string;
  equipGrid: EquipGridRow[];
  feriados: Set<string>;
  onEquipGridChange: (grid: EquipGridRow[]) => void;
  onFeriadosChange: (f: Set<string>) => void;
  onBack: () => void;
  onProcess: () => void;
}

function getAllDates(inicio: string, fim: string): string[] {
  const dates: string[] = [];
  const d1 = new Date(inicio + 'T00:00:00');
  const d2 = new Date(fim + 'T00:00:00');
  for (const d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) {
    dates.push(dateKey(d));
  }
  return dates;
}

function fmtDateShort(dk: string): string {
  const d = new Date(dk + 'T00:00:00');
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return fmtDate(d).slice(0, 5) + ' ' + dias[d.getDay()];
}

export default function ETFWizardEquipGrid({
  equipamentos, inicio, fim, equipGrid, feriados,
  onEquipGridChange, onFeriadosChange, onBack, onProcess,
}: Props) {
  const allDates = useMemo(() => getAllDates(inicio, fim), [inicio, fim]);

  const stats = useMemo(() => {
    const totalEquip = equipGrid.length;
    const totalDias = equipGrid.reduce((a, r) => a + Object.values(r.qtds).reduce((s, v) => s + v, 0), 0);
    const tipos = new Set(equipGrid.map(r => r.equip.nomeETF).filter(Boolean));
    return { totalEquip, totalDias, tipos: tipos.size, feriados: feriados.size };
  }, [equipGrid, feriados]);

  const updateQtd = (idx: number, dk: string, val: number) => {
    const newGrid = [...equipGrid];
    newGrid[idx] = { ...newGrid[idx], qtds: { ...newGrid[idx].qtds, [dk]: val } };
    onEquipGridChange(newGrid);
  };

  const toggleFeriado = (dk: string, checked: boolean) => {
    const newF = new Set(feriados);
    if (checked) {
      newF.add(dk);
      const newGrid = equipGrid.map(r => ({ ...r, qtds: { ...r.qtds, [dk]: 0 } }));
      onEquipGridChange(newGrid);
    } else {
      newF.delete(dk);
      const newGrid = equipGrid.map(r => ({ ...r, qtds: { ...r.qtds, [dk]: 1 } }));
      onEquipGridChange(newGrid);
    }
    onFeriadosChange(newF);
  };

  const fillAll = (val: number) => {
    const newGrid = equipGrid.map(r => {
      const qtds = { ...r.qtds };
      allDates.forEach(dk => { if (!feriados.has(dk)) qtds[dk] = val; });
      return { ...r, qtds };
    });
    onEquipGridChange(newGrid);
  };

  const removeRow = (idx: number) => {
    onEquipGridChange(equipGrid.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-2 sm:gap-4 flex-wrap">
        {[
          { label: 'Equip.', value: stats.totalEquip },
          { label: 'Tipos', value: stats.tipos },
          { label: 'Dias-Eq.', value: stats.totalDias },
          { label: 'Feriados', value: stats.feriados },
        ].map(s => (
          <Badge key={s.label} variant="secondary" className="text-sm px-3 py-1">
            <span className="font-bold mr-1">{s.value}</span> {s.label}
          </Badge>
        ))}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fillAll(1)}>Todos = 1</Button>
          <Button variant="outline" size="sm" onClick={() => fillAll(0)}>Zerar</Button>
        </div>
      </div>

      {/* Feriados */}
      <div className="flex items-center gap-3 flex-wrap text-xs">
        <span className="text-muted-foreground">Feriados:</span>
        {allDates.map(dk => (
          <label key={dk} className="flex items-center gap-1">
            <Checkbox
              checked={feriados.has(dk)}
              onCheckedChange={v => toggleFeriado(dk, !!v)}
            />
            <span className={feriados.has(dk) ? 'text-destructive font-medium' : ''}>{fmtDateShort(dk)}</span>
          </label>
        ))}
      </div>

      {/* Grid */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2 min-w-[80px]">Tag</th>
                    <th className="text-left px-3 py-2 min-w-[160px]">Nome ETF</th>
                    {allDates.map(dk => (
                      <th key={dk} className={`px-2 py-2 text-center min-w-[70px] ${feriados.has(dk) ? 'bg-destructive/10 text-destructive' : ''}`}>
                        {fmtDateShort(dk)}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center">Total</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {equipGrid.map((row, idx) => {
                    const total = allDates.reduce((a, dk) => a + (row.qtds[dk] || 0), 0);
                    return (
                      <tr key={idx} className="border-b hover:bg-muted/30">
                        <td className="px-3 py-1.5 font-mono font-medium">{row.equip.tag}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.equip.nomeETF || row.equip.nomeEquip}</td>
                        {allDates.map(dk => (
                          <td key={dk} className={`px-1 py-1 ${feriados.has(dk) ? 'bg-destructive/5' : ''}`}>
                            <Input
                              type="number"
                              min={0}
                              max={99}
                              value={row.qtds[dk] || 0}
                              disabled={feriados.has(dk)}
                              onChange={e => updateQtd(idx, dk, parseInt(e.target.value) || 0)}
                              className="h-8 w-14 text-center text-xs p-0.5"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-1.5 text-center">
                          <Badge variant={total > 0 ? 'default' : 'secondary'}>{total}</Badge>
                        </td>
                        <td className="px-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeRow(idx)}>✕</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Config</Button>
        <Button onClick={onProcess}>⚡ Processar</Button>
      </div>
    </div>
  );
}
