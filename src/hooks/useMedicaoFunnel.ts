/**
 * React hooks for the measurement funnel and SIGEM↔GITEC gap analysis.
 * Mirrors calcFunilBM() and analyzeSigemGitecGap() from SPLAN Explorer.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGitecEventsAll, useSigemDocumentsAll } from './useSharedData';
import {
  calcFunilBM,
  analyzeSigemGitecGap,
  detectGaps,
  FunilCronoItem,
  FunilBmResult,
  SigemGitecGapResult,
  GapItem,
} from '@/lib/medicao-funnel';

export type { FunilBmResult, SigemGitecGapResult, GapItem };

function useCronoItems() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['cronograma-bm-values-all', user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<FunilCronoItem[]> => {
      const { data, error } = await supabase
        .from('cronograma_bm_values')
        .select('ippu, bm_number, tipo, valor');
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ippu: d.ippu || '',
        nivel: '5 - Agrupamento',
        bm_number: Number(d.bm_number) || 0,
        tipo: d.tipo || 'Previsto',
        valor: Number(d.valor) || 0,
      }));
    },
  });
}

/**
 * Computes the measurement funnel for one BM.
 * Returns Previsto / Executado / SIGEM / GITEC totals and supply breakdown.
 */
export function useMedicaoFunnel(bmNum: number): {
  funnel: FunilBmResult | null;
  isLoading: boolean;
} {
  const { data: cronoItems = [], isLoading: cronoLoading } = useCronoItems();
  const { data: gitecEvents = [], isLoading: gitecLoading } = useGitecEventsAll();
  const { data: sigemDocs = [], isLoading: sigemLoading } = useSigemDocumentsAll();

  const funnel = useMemo(() => {
    if (cronoLoading || gitecLoading || sigemLoading) return null;
    return calcFunilBM(
      bmNum,
      cronoItems,
      gitecEvents.map(ev => ({
        ippu: ev.ippu || '',
        status: ev.status || '',
        valor: Number(ev.valor) || 0,
        data_aprovacao: ev.data_aprovacao,
        etapa: ev.etapa || '',
      })),
      sigemDocs.map(doc => ({
        documento: doc.documento || '',
        status_correto: doc.status_correto || '',
        ippu: doc.ppu ?? undefined,
      }))
    );
  }, [bmNum, cronoItems, gitecEvents, sigemDocs, cronoLoading, gitecLoading, sigemLoading]);

  return { funnel, isLoading: cronoLoading || gitecLoading || sigemLoading };
}

/**
 * Finds SIGEM docs ready to advance in GITEC and GITEC items missing SIGEM evidence.
 */
export function useSigemGitecGap(): {
  analysis: SigemGitecGapResult | null;
  isLoading: boolean;
} {
  const { data: gitecEvents = [], isLoading: gitecLoading } = useGitecEventsAll();
  const { data: sigemDocs = [], isLoading: sigemLoading } = useSigemDocumentsAll();

  const analysis = useMemo(() => {
    if (gitecLoading || sigemLoading) return null;
    return analyzeSigemGitecGap(
      sigemDocs.map(doc => ({
        documento: doc.documento || '',
        status_correto: doc.status_correto || '',
        ippu: doc.ppu ?? undefined,
      })),
      gitecEvents.map(ev => ({
        ippu: ev.ippu || '',
        status: ev.status || '',
        valor: Number(ev.valor) || 0,
        tag: ev.tag ?? undefined,
      }))
    );
  }, [sigemDocs, gitecEvents, gitecLoading, sigemLoading]);

  return { analysis, isLoading: gitecLoading || sigemLoading };
}

/**
 * Detects iPPUs where GITEC approved value exceeds Cronograma realizado
 * by more than the threshold (default R$50).
 */
export function useGapDetection(threshold = 50): {
  gaps: GapItem[];
  isLoading: boolean;
} {
  const { data: cronoItems = [], isLoading: cronoLoading } = useCronoItems();
  const { data: gitecEvents = [], isLoading: gitecLoading } = useGitecEventsAll();

  const gaps = useMemo(() => {
    if (cronoLoading || gitecLoading) return [];
    return detectGaps(
      gitecEvents.map(ev => ({
        ippu: ev.ippu || '',
        status: ev.status || '',
        valor: Number(ev.valor) || 0,
        tag: ev.tag ?? undefined,
      })),
      cronoItems,
      threshold
    );
  }, [cronoItems, gitecEvents, cronoLoading, gitecLoading, threshold]);

  return { gaps, isLoading: cronoLoading || gitecLoading };
}
