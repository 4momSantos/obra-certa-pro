/**
 * Adiantamento (advance payment) query and alert logic.
 * Mirrors AdiantQuery and AdiantAlerts from SPLAN Explorer.
 *
 * Works entirely in-memory on data already fetched from Supabase.
 * Feed it the output of useGitecEventsAll().
 */

import { classifyEvento, isAdiantamento, isFaturado, EventoClasse } from './gitec-classify';
import { dateToBM } from './bm-utils';

export interface AdiantItem {
  oc: string;             // Ordem de Compra — first segment of TAG before '_'
  ippu: string;
  tag: string;
  etapa: string;
  status: string;
  valor: number;
  classe: EventoClasse;
  bm: string | null;      // BM derived from data_aprovacao
  data_aprovacao: string | null;
  numero_evidencias?: string;
}

export interface AdiantTotals {
  total_adiant: number;
  total_faturado: number;
  saldo: number;
  count_ocs: number;
  count_items_adiant: number;
  count_items_faturado: number;
}

export interface OcSummary {
  oc: string;
  total_adiant: number;
  total_faturado: number;
  saldo: number;
  pct_faturado: number;
  items: AdiantItem[];
}

function extractOC(tag: string): string {
  if (!tag) return '';
  return tag.split('_')[0] || tag;
}

/**
 * Builds AdiantItem list from raw GITEC events.
 * Filters to C- and D- prefix items (Suprimento only).
 */
export function buildAdiantamentoItems(
  gitecEvents: Array<{
    ippu: string;
    tag: string;
    etapa: string;
    status: string;
    valor: number;
    data_aprovacao: string | null;
    numero_evidencias?: string;
  }>
): AdiantItem[] {
  return gitecEvents
    .filter(ev => /^[CD]-/i.test((ev.ippu || '').trim()))
    .map(ev => ({
      oc: extractOC(ev.tag || ''),
      ippu: ev.ippu || '',
      tag: ev.tag || '',
      etapa: ev.etapa || '',
      status: ev.status || '',
      valor: ev.valor || 0,
      classe: classifyEvento({
        ippu: ev.ippu || '',
        tag: ev.tag || '',
        etapa: ev.etapa || '',
        status: ev.status || '',
        valor: ev.valor || 0,
        numero_evidencias: ev.numero_evidencias,
      }),
      bm: ev.data_aprovacao ? dateToBM(ev.data_aprovacao) : null,
      data_aprovacao: ev.data_aprovacao,
      numero_evidencias: ev.numero_evidencias,
    }));
}

// ── AdiantQuery ───────────────────────────────────────────────────────────────

export function adiantTotals(items: AdiantItem[]): AdiantTotals {
  let total_adiant = 0, total_faturado = 0, count_adiant = 0, count_fat = 0;
  const ocs = new Set<string>();
  for (const it of items) {
    if (it.oc) ocs.add(it.oc);
    if (isAdiantamento(it.classe)) { total_adiant += it.valor; count_adiant++; }
    if (isFaturado(it.classe)) { total_faturado += it.valor; count_fat++; }
  }
  return {
    total_adiant, total_faturado,
    saldo: total_adiant - total_faturado,
    count_ocs: ocs.size,
    count_items_adiant: count_adiant,
    count_items_faturado: count_fat,
  };
}

export function adiantByBm(items: AdiantItem[]): Map<string, AdiantTotals> {
  const byBm = new Map<string, AdiantItem[]>();
  for (const it of items) {
    const bm = it.bm || 'Sem BM';
    if (!byBm.has(bm)) byBm.set(bm, []);
    byBm.get(bm)!.push(it);
  }
  const result = new Map<string, AdiantTotals>();
  for (const [bm, bmItems] of byBm.entries()) result.set(bm, adiantTotals(bmItems));
  return result;
}

export function adiantAcumuladoAte(items: AdiantItem[], bmTarget: number): AdiantTotals {
  return adiantTotals(
    items.filter(it => {
      if (!it.bm) return false;
      return parseInt(it.bm.replace('BM-', '')) <= bmTarget;
    })
  );
}

export function topOCs(
  items: AdiantItem[],
  n = 10,
  orderBy: 'saldo' | 'adiant' | 'faturado' = 'saldo'
): OcSummary[] {
  const ocMap = new Map<string, AdiantItem[]>();
  for (const it of items) {
    if (!it.oc) continue;
    if (!ocMap.has(it.oc)) ocMap.set(it.oc, []);
    ocMap.get(it.oc)!.push(it);
  }
  const summaries: OcSummary[] = [];
  for (const [oc, ocItems] of ocMap.entries()) {
    const t = adiantTotals(ocItems);
    summaries.push({
      oc,
      total_adiant: t.total_adiant,
      total_faturado: t.total_faturado,
      saldo: t.saldo,
      pct_faturado: t.total_adiant > 0 ? (t.total_faturado / t.total_adiant) * 100 : 0,
      items: ocItems,
    });
  }
  const sortKey = orderBy === 'saldo'
    ? (s: OcSummary) => s.saldo
    : orderBy === 'adiant'
    ? (s: OcSummary) => s.total_adiant
    : (s: OcSummary) => s.total_faturado;
  return summaries.sort((a, b) => sortKey(b) - sortKey(a)).slice(0, n);
}

export function detailOC(items: AdiantItem[], oc: string): AdiantItem[] {
  return items
    .filter(it => it.oc === oc)
    .sort((a, b) => {
      if (!a.data_aprovacao) return 1;
      if (!b.data_aprovacao) return -1;
      return a.data_aprovacao.localeCompare(b.data_aprovacao);
    });
}

// ── AdiantAlerts ─────────────────────────────────────────────────────────────

/** OCs with outstanding adiantamento >= minValor but 0% faturado */
export function alertStuck(items: AdiantItem[], minValor = 100_000): OcSummary[] {
  return topOCs(items, 200, 'adiant').filter(
    oc => oc.saldo >= minValor && oc.total_faturado === 0
  );
}

/** OCs with old adiantamentos (>= mesesLimite months) still not converted */
export function alertStaleOCs(items: AdiantItem[], mesesLimite = 6): OcSummary[] {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - mesesLimite);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const ocMap = new Map<string, AdiantItem[]>();
  for (const it of items) {
    if (!it.oc) continue;
    if (!ocMap.has(it.oc)) ocMap.set(it.oc, []);
    ocMap.get(it.oc)!.push(it);
  }

  const stale: OcSummary[] = [];
  for (const [oc, ocItems] of ocMap.entries()) {
    const hasOldAdiant = ocItems.some(
      it => isAdiantamento(it.classe) && it.data_aprovacao && it.data_aprovacao < cutoffStr
    );
    if (!hasOldAdiant) continue;
    const t = adiantTotals(ocItems);
    if (t.saldo > 0) {
      stale.push({
        oc, ...t,
        pct_faturado: t.total_adiant > 0 ? (t.total_faturado / t.total_adiant) * 100 : 0,
        items: ocItems,
      });
    }
  }
  return stale.sort((a, b) => b.saldo - a.saldo);
}

/** D- items with Concluída etapa but without NF evidence */
export function alertConcluidaSemNf(items: AdiantItem[]): AdiantItem[] {
  return items.filter(it => it.classe === 'conclui_prat_sem_nf');
}
