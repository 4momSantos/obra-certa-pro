import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { WizardConfig } from '@/types/etf';
import { detectLocations } from '@/lib/etf-processing';

interface Props {
  config: WizardConfig;
  wbPonto: any;
  onConfigChange: (config: WizardConfig) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function ETFWizardConfig({ config, wbPonto, onConfigChange, onBack, onNext }: Props) {
  const [locations, setLocations] = useState<string[]>([]);
  const [hasLocationData, setHasLocationData] = useState(true);

  useEffect(() => {
    if (wbPonto) {
      const { locations: locs, hasLocationData: hasLoc } = detectLocations(wbPonto);
      setLocations(locs);
      setHasLocationData(hasLoc);
      if (!hasLoc) {
        onConfigChange({ ...config, noLocationData: true, allAsCanteiro: true });
      } else {
        // Auto-select canteiro locations
        const canteiroLocs = new Set<string>();
        locs.forEach(l => {
          if (l.toUpperCase().includes('CANTEIRO') || l.toUpperCase().includes('AVANÇADO') || l.toUpperCase().includes('AVANCADO')) {
            canteiroLocs.add(l);
          }
        });
        onConfigChange({ ...config, noLocationData: false, allAsCanteiro: false, canteiroLocs });
      }
    }
  }, [wbPonto]);

  const update = (partial: Partial<WizardConfig>) => {
    onConfigChange({ ...config, ...partial });
  };

  const toggleLoc = (loc: string, checked: boolean) => {
    const newLocs = new Set(config.canteiroLocs);
    if (checked) newLocs.add(loc); else newLocs.delete(loc);
    update({ canteiroLocs: newLocs });
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Período</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Semana</Label>
                <Input
                  type="number"
                  min={1} max={52}
                  value={config.semana}
                  onChange={e => update({ semana: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label className="text-xs">Início</Label>
                <Input
                  type="date"
                  value={config.inicio}
                  onChange={e => update({ inicio: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Fim</Label>
                <Input
                  type="date"
                  value={config.fim}
                  onChange={e => update({ fim: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Filtros de Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={config.filtroAprovado}
                onCheckedChange={v => update({ filtroAprovado: !!v })}
              />
              Aprovado
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={config.filtroPendente}
                onCheckedChange={v => update({ filtroPendente: !!v })}
              />
              Pendente (com "esqueci")
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={config.filtroInvalido}
                onCheckedChange={v => update({ filtroInvalido: !!v })}
              />
              Inválido
            </label>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Localizações de Canteiro</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasLocationData ? (
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3">
              <p className="text-sm font-medium text-yellow-600">⚠ Coluna "Localização" não encontrada</p>
              <p className="text-xs text-muted-foreground mt-1">
                Todos os registros serão considerados como Canteiro.
              </p>
              <label className="flex items-center gap-2 text-sm mt-2">
                <Checkbox checked={config.allAsCanteiro} onCheckedChange={v => update({ allAsCanteiro: !!v })} />
                Considerar TODOS como Canteiro
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
              {locations.map(loc => (
                <label key={loc} className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={config.canteiroLocs.has(loc)}
                    onCheckedChange={v => toggleLoc(loc, !!v)}
                  />
                  <span className="truncate">{loc}</span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Upload</Button>
        <Button onClick={onNext} disabled={!config.inicio || !config.fim}>
          {/* Skip equip step if no equipment */}
          Avançar →
        </Button>
      </div>
    </div>
  );
}
