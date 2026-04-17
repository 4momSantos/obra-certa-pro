/**
 * React hook for Adiantamento (advance payment) tracking.
 * Derived entirely from useGitecEventsAll() — no extra Supabase fetch.
 */

import { useMemo } from 'react';
import { useGitecEventsAll } from './useSharedData';
import {
  buildAdiantamentoItems,
  adiantTotals,
  adiantByBm,
  topOCs,
  detailOC as detailOCFn,
  alertStuck,
  alertStaleOCs,
  alertConcluidaSemNf,
  AdiantItem,
  AdiantTotals,
  OcSummary,
} from '@/lib/adiantamento';

export type { AdiantItem, AdiantTotals, OcSummary };

export function useAdiantamento() {
  const { data: events = [], isLoading, error } = useGitecEventsAll();

  const items = useMemo(() =>
    buildAdiantamentoItems(
      events.map(ev => ({
        ippu: ev.ippu || '',
        tag: ev.tag || '',
        etapa: ev.etapa || '',
        status: ev.status || '',
        valor: Number(ev.valor) || 0,
        data_aprovacao: ev.data_aprovacao,
        numero_evidencias: (ev as any).evidencias ?? undefined,
      }))
    ),
    [events]
  );

  const totals = useMemo(() => adiantTotals(items), [items]);
  const byBm   = useMemo(() => adiantByBm(items), [items]);
  const top10  = useMemo(() => topOCs(items, 10, 'saldo'), [items]);

  const alerts = useMemo(() => ({
    stuck:          alertStuck(items),
    stale:          alertStaleOCs(items),
    concluidaSemNf: alertConcluidaSemNf(items),
  }), [items]);

  const getDetailOC = (oc: string) => detailOCFn(items, oc);

  return { items, totals, byBm, top10, alerts, getDetailOC, isLoading, error };
}
