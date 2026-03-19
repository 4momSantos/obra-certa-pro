import { useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ProcessingResults } from '@/types/etf';
import { buildRelatorioETF, buildPontoConsolidado, downloadWorkbook } from '@/lib/etf-export';
import { toast } from 'sonner';

interface Props {
  results: ProcessingResults;
  semana: number;
  inicio: string;
  fim: string;
  onBack: () => void;
}

export default function ETFWizardExport({ results, semana, inicio, fim, onBack }: Props) {
  const [downloading, setDownloading] = useState<string | null>(null);

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
      <div className="grid md:grid-cols-3 gap-4">
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
