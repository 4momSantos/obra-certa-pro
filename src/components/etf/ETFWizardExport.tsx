import { useEffect, useState } from 'react';
import { Download, Loader2, Save, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ProcessingResults, WizardConfig } from '@/types/etf';
import { buildRelatorioETF, buildPontoConsolidado, downloadWorkbook } from '@/lib/etf-export';
import { buildETFPayload } from '@/lib/etf-persistence';
import { useETFSession } from '@/hooks/useETFSession';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BMOption {
  id: string;
  bm_number: number;
  bm_name: string;
  periodo_inicio: string;
  periodo_fim: string;
}

interface Props {
  results: ProcessingResults;
  semana: number;
  inicio: string;
  fim: string;
  config: WizardConfig;
  feriados: Set<string>;
  onBack: () => void;
  onGoToHistorico?: () => void;
}

export default function ETFWizardExport({ results, semana, inicio, fim, config, feriados, onBack, onGoToHistorico }: Props) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [bms, setBms] = useState<BMOption[]>([]);
  const [bmsLoading, setBmsLoading] = useState(false);
  const [selectedBm, setSelectedBm] = useState<string>('');
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const { saveSession, saving } = useETFSession();

  useEffect(() => {
    let cancelled = false;
    setBmsLoading(true);
    supabase
      .from('bm_periodos')
      .select('id, bm_number, bm_name, periodo_inicio, periodo_fim')
      .order('bm_number', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast.error('Falha ao carregar BMs: ' + error.message);
          setBms([]);
        } else {
          setBms((data ?? []) as BMOption[]);
        }
        setBmsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    const bm = bms.find(b => b.id === selectedBm);
    if (!bm) {
      toast.error('Selecione um BM antes de salvar');
      return;
    }
    try {
      const payload = buildETFPayload(
        results,
        config,
        feriados,
        { id: bm.id, numero: bm.bm_number },
        `ETF_Semana_${semana}`,
      );
      const result = await saveSession(payload);
      if (result.ok) {
        setSavedSessionId(result.sessionId ?? null);
        toast.success(`Sessão ETF salva (${payload.colaboradores.length} colaboradores)`);
      } else {
        toast.error('Erro ao salvar: ' + (result.error ?? 'desconhecido'));
      }
    } catch (e: any) {
      toast.error('Erro ao construir payload: ' + e.message);
      console.error(e);
    }
  };

  const handleDownload = async (type: 'relatorio' | 'ponto' | 'all') => {
    setDownloading(type);
    try {
      if (type === 'relatorio' || type === 'all') {
        const wb = await buildRelatorioETF(results, semana, inicio, fim);
        await downloadWorkbook(wb, `CONSAG_UDA_ETF_-_SEMANA_${semana}_-_RELATORIO_GERAL.xlsx`);
        toast.success('Relatório ETF exportado');
      }
      if (type === 'ponto' || type === 'all') {
        if (type === 'all') await new Promise(r => setTimeout(r, 500));
        const wb = await buildPontoConsolidado(results, results.allDates);
        await downloadWorkbook(wb, `Ponto_Consolidado_Semana_${semana}.xlsx`);
        toast.success('Ponto Consolidado exportado');
      }
    } catch (e: any) {
      toast.error('Erro ao exportar: ' + e.message);
      console.error(e);
    } finally {
      setDownloading(null);
    }
  };

  const exports = [
    {
      key: 'relatorio' as const,
      icon: '📊',
      title: `Relatório ETF — Semana ${semana}`,
      desc: 'DISTRIBUIÇÃO MO + PLANEJAMENTO + APONTAMENTO MO + FALTAS + SUBSTITUÍDOS + EQUIPAMENTOS + AUSENTES + DE PARA',
    },
    {
      key: 'ponto' as const,
      icon: '📋',
      title: `Ponto Consolidado — Semana ${semana}`,
      desc: 'Efetivo Canteiro + Fora do Canteiro + Resumo Semanal',
    },
    {
      key: 'all' as const,
      icon: '📦',
      title: 'Exportar Tudo',
      desc: 'Baixar os 2 arquivos de uma vez',
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Save className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Salvar Sessão no Banco</h4>
            {savedSessionId && (
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Sessão salva
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Persiste KPIs agregados e detalhamento por colaborador para esta competência. Vincular a um BM é obrigatório.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedBm} onValueChange={setSelectedBm} disabled={bmsLoading || saving}>
              <SelectTrigger className="sm:max-w-md">
                <SelectValue placeholder={bmsLoading ? 'Carregando BMs…' : 'Selecione um BM'} />
              </SelectTrigger>
              <SelectContent>
                {bms.map(bm => (
                  <SelectItem key={bm.id} value={bm.id}>
                    BM {bm.bm_number} — {bm.bm_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSave} disabled={!selectedBm || saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Sessão ETF
            </Button>
            {savedSessionId && onGoToHistorico && (
              <Button variant="outline" onClick={onGoToHistorico}>Ver no histórico →</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {exports.map(exp => (
          <Card key={exp.key} className="glass-card">
            <CardContent className="p-5 space-y-3">
              <div className="text-2xl">{exp.icon}</div>
              <h4 className="text-sm font-semibold">{exp.title}</h4>
              <p className="text-xs text-muted-foreground">{exp.desc}</p>
              <Button
                className="w-full gap-2"
                variant={exp.key === 'all' ? 'default' : 'outline'}
                onClick={() => handleDownload(exp.key)}
                disabled={downloading !== null}
              >
                {downloading === exp.key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Baixar .xlsx
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-start">
        <Button variant="outline" onClick={onBack}>← Resultados</Button>
      </div>
    </div>
  );
}
