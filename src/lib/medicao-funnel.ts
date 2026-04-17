/**
 * Measurement funnel logic: Previsto → Executado → SIGEM → GITEC.
 * Mirrors calcFunilBM(), analyzeSigemGitecGap(), and gap detection
 * from SPLAN Explorer.
 */

import { bmRange } from './bm-utils';

/** SIGEM document statuses considered valid for measurement progression */
export const SIGEM_STATUS_VALIDOS = new Set([
  'Sem Comentários',
  'Para Construção',
  'Para Compra',
  'Certificado',
  'Pendente Certificação',
]);

export interface FunilCronoItem {
  ippu: string;
  nivel: string;
  bm_number: number;
  tipo: string; // 'Previsto' | 'Realizado' | 'Projetado'
  valor: number;
}

export interface FunilGitecEvent {
  ippu: string;
  status: string;
  valor: number;
  data_aprovacao: string | null;
  etapa: string;
}

export interface FunilSigemDoc {
  documento: string;
  status_correto: string;
  ippu?: string;
  ppu?: string;
}

export interface FunilBmResult {
  bmNum: number;
  bmKey: string;
  totPrev: number;
  totExec: number;
  totSigem: number;
  totGitec: number;
  servAprov: number;
  suprFat: number;
  suprLiquido: number;
}

/**
 * Computes the measurement funnel for a given BM number.
 * Uses only level-5 (Agrupamento) Cronograma items to avoid double-counting.
 *
 * totPrev  = scheduled (Previsto) from Cronograma
 * totExec  = realized (Realizado) from Cronograma
 * totSigem = count of SIGEM docs with valid status
 * totGitec = sum of GITEC Aprovado values with approval date in BM window
 */
export function calcFunilBM(
  bmNum: number,
  cronoItems: FunilCronoItem[],
  gitecEvents: FunilGitecEvent[],
  sigemDocs: FunilSigemDoc[]
): FunilBmResult {
  const bmKey = 'BM-' + String(bmNum).padStart(2, '0');
  const { start, end } = bmRange(bmKey);
  const startTs = start.getTime();
  const endTs = end.getTime() + 86_400_000; // include end day

  // Only level-5 Agrupamento items
  const isLevel5 = (c: FunilCronoItem) =>
    c.nivel?.includes('5') || c.nivel?.toLowerCase().includes('agrupamento');

  const bmCrono = cronoItems.filter(c => c.bm_number === bmNum && isLevel5(c));

  const totPrev = bmCrono
    .filter(c => c.tipo === 'Previsto')
    .reduce((s, c) => s + (c.valor || 0), 0);

  const totExec = bmCrono
    .filter(c => c.tipo === 'Realizado' || c.tipo === 'Executado')
    .reduce((s, c) => s + (c.valor || 0), 0);

  const totSigem = sigemDocs.filter(d =>
    SIGEM_STATUS_VALIDOS.has(d.status_correto)
  ).length;

  // GITEC approved events with data_aprovacao inside this BM's window
  const isSuprimento = (ippu: string) => /^[CD]-/i.test(ippu || '');
  const gitecBm = gitecEvents.filter(ev => {
    if (ev.status !== 'Aprovado' || !ev.data_aprovacao) return false;
    const t = new Date(ev.data_aprovacao).getTime();
    return t >= startTs && t <= endTs;
  });

  const totGitec = gitecBm.reduce((s, ev) => s + (ev.valor || 0), 0);
  const servAprov = gitecBm
    .filter(ev => !isSuprimento(ev.ippu))
    .reduce((s, ev) => s + (ev.valor || 0), 0);
  const suprFat = gitecBm
    .filter(ev => isSuprimento(ev.ippu))
    .reduce((s, ev) => s + (ev.valor || 0), 0);

  return { bmNum, bmKey, totPrev, totExec, totSigem, totGitec, servAprov, suprFat, suprLiquido: suprFat };
}

// ── SIGEM ↔ GITEC Gap Analysis ──────────────────────────────────────────────

export interface SigemGitecGapItem {
  ippu: string;
  documento: string;
  status_sigem: string;
  reason: string;
}

export interface GitecOnlyGapItem {
  ippu: string;
  gitec_valor: number;
  reason: string;
}

export interface SigemGitecGapResult {
  tudo_ok: number;
  avancar: SigemGitecGapItem[];
  gap_sem_gitec: GitecOnlyGapItem[];
  stats: {
    sigem_total: number;
    sigem_validos: number;
    gitec_aprovados: number;
    gitec_pendentes: number;
  };
}

export interface SigemGitecEventInput {
  ippu: string;
  status: string;
  valor: number;
  tag?: string;
}

/**
 * Finds gaps between SIGEM and GITEC:
 * - "avancar": SIGEM doc valid but no GITEC approval yet → can be advanced
 * - "gap_sem_gitec": GITEC approved but no matching SIGEM doc
 *
 * Mirrors analyzeSigemGitecGap() from SPLAN Explorer.
 */
export function analyzeSigemGitecGap(
  sigemDocs: Array<FunilSigemDoc & { ippu?: string }>,
  gitecEvents: SigemGitecEventInput[]
): SigemGitecGapResult {
  const ippuWithValidSigem = new Set<string>();
  const docByIppu = new Map<string, FunilSigemDoc[]>();

  for (const doc of sigemDocs) {
    const ippu = (doc.ippu || doc.ppu || '').trim();
    if (!ippu) continue;
    if (!docByIppu.has(ippu)) docByIppu.set(ippu, []);
    docByIppu.get(ippu)!.push(doc);
    if (SIGEM_STATUS_VALIDOS.has(doc.status_correto)) ippuWithValidSigem.add(ippu);
  }

  const gitecByIppu = new Map<string, SigemGitecEventInput[]>();
  for (const ev of gitecEvents) {
    const ippu = (ev.ippu || '').trim();
    if (!ippu) continue;
    if (!gitecByIppu.has(ippu)) gitecByIppu.set(ippu, []);
    gitecByIppu.get(ippu)!.push(ev);
  }

  const avancar: SigemGitecGapItem[] = [];
  const gap_sem_gitec: GitecOnlyGapItem[] = [];
  let tudo_ok = 0;

  for (const [ippu, docs] of docByIppu.entries()) {
    const validDocs = docs.filter(d => SIGEM_STATUS_VALIDOS.has(d.status_correto));
    if (validDocs.length === 0) continue;

    const gitecEvs = gitecByIppu.get(ippu) || [];
    const hasAprovado = gitecEvs.some(ev => ev.status === 'Aprovado');
    const hasPendente = gitecEvs.some(ev => ev.status !== 'Aprovado');

    if (hasAprovado) {
      tudo_ok++;
    } else {
      const reason = hasPendente
        ? 'SIGEM aprovado, GITEC pendente de aprovação'
        : 'SIGEM aprovado mas sem evento GITEC';
      for (const doc of validDocs) {
        avancar.push({ ippu, documento: doc.documento, status_sigem: doc.status_correto, reason });
      }
    }
  }

  for (const [ippu, evs] of gitecByIppu.entries()) {
    const aprovados = evs.filter(ev => ev.status === 'Aprovado');
    if (aprovados.length === 0 || ippuWithValidSigem.has(ippu)) continue;
    gap_sem_gitec.push({
      ippu,
      gitec_valor: aprovados.reduce((s, ev) => s + (ev.valor || 0), 0),
      reason: 'GITEC aprovado mas sem doc SIGEM válido',
    });
  }

  return {
    tudo_ok,
    avancar,
    gap_sem_gitec,
    stats: {
      sigem_total: sigemDocs.length,
      sigem_validos: sigemDocs.filter(d => SIGEM_STATUS_VALIDOS.has(d.status_correto)).length,
      gitec_aprovados: gitecEvents.filter(ev => ev.status === 'Aprovado').length,
      gitec_pendentes: gitecEvents.filter(ev => ev.status !== 'Aprovado').length,
    },
  };
}

// ── Gap Detection ────────────────────────────────────────────────────────────

export interface GapItem {
  ippu: string;
  gitecAprov: number;
  medidoBM: number;
  gap: number;
  tags: string[];
}

/**
 * Detects iPPUs where GITEC approved > Cronograma realizado by more than threshold.
 * Mirrors gap detection in buildLookups() from SPLAN Explorer (default threshold: R$50).
 */
export function detectGaps(
  gitecEvents: Array<{ ippu: string; status: string; valor: number; tag?: string }>,
  cronoItems: FunilCronoItem[],
  threshold = 50
): GapItem[] {
  const gitecByIppu = new Map<string, { total: number; tags: Set<string> }>();
  for (const ev of gitecEvents) {
    if (ev.status !== 'Aprovado') continue;
    const ippu = (ev.ippu || '').trim();
    if (!ippu) continue;
    if (!gitecByIppu.has(ippu)) gitecByIppu.set(ippu, { total: 0, tags: new Set() });
    const entry = gitecByIppu.get(ippu)!;
    entry.total += ev.valor || 0;
    if (ev.tag) entry.tags.add(ev.tag);
  }

  const cronoByIppu = new Map<string, number>();
  for (const c of cronoItems) {
    if (c.tipo !== 'Realizado' && c.tipo !== 'Executado') continue;
    const ippu = (c.ippu || '').trim();
    if (!ippu) continue;
    cronoByIppu.set(ippu, (cronoByIppu.get(ippu) || 0) + (c.valor || 0));
  }

  const gaps: GapItem[] = [];
  for (const [ippu, gitec] of gitecByIppu.entries()) {
    const medidoBM = cronoByIppu.get(ippu) || 0;
    const gap = gitec.total - medidoBM;
    if (gap > threshold) {
      gaps.push({ ippu, gitecAprov: gitec.total, medidoBM, gap, tags: Array.from(gitec.tags) });
    }
  }
  return gaps.sort((a, b) => b.gap - a.gap);
}
