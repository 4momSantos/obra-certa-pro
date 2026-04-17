export function bmRange(bmName: string) {
  const num = parseInt(bmName.replace('BM-', ''));
  const refMonth = 6 + num;
  const refYear = 2025 + Math.floor((refMonth - 1) / 12);
  const rMonth = ((refMonth - 1) % 12) + 1;
  const prevMonth = rMonth === 1 ? 12 : rMonth - 1;
  const prevYear = rMonth === 1 ? refYear - 1 : refYear;
  return {
    start: new Date(prevYear, prevMonth - 1, 26),
    end: new Date(refYear, rMonth - 1, 25),
    label: `${String(prevMonth).padStart(2, '0')}/${prevYear} → ${String(rMonth).padStart(2, '0')}/${refYear}`,
  };
}

export function dateToBM(dateInput: string | Date): string | null {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return null;
  let year = d.getFullYear(), month = d.getMonth() + 1;
  if (d.getDate() >= 26) { month++; if (month > 12) { month = 1; year++; } }
  const n = (year - 2025) * 12 + month - 6;
  return (n >= 1 && n <= 22) ? 'BM-' + String(n).padStart(2, '0') : null;
}

export function allBMs() {
  return Array.from({ length: 22 }, (_, i) => {
    const name = 'BM-' + String(i + 1).padStart(2, '0');
    return { name, number: i + 1, range: bmRange(name) };
  });
}

export function diasRestantes(bmName: string): number {
  return Math.max(Math.ceil((bmRange(bmName).end.getTime() - Date.now()) / 86400000), 0);
}

export function parseDateBR(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const brMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const d = new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns current BM cycle progress details.
 * Mirrors getBmCycle() from SPLAN Explorer.
 *
 * BM-01 = 26/Jun/2025 – 25/Jul/2025
 * BM-22 = 26/Mar/2027 – 25/Apr/2027
 */
export function getBmCycle(today: Date = new Date()): {
  bmName: string | null;
  start: Date;
  end: Date;
  diasTotal: number;
  diasDecorridos: number;
  diasRestantes: number;
  pct: number;
  label: string;
  periodo: string;
} {
  const bmName = dateToBM(today);
  if (!bmName) {
    return {
      bmName: null, start: today, end: today,
      diasTotal: 0, diasDecorridos: 0, diasRestantes: 0,
      pct: 0, label: '', periodo: '',
    };
  }
  const { start, end } = bmRange(bmName);
  const diasTotal = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const diasDecorridos = Math.max(0, Math.round((today.getTime() - start.getTime()) / 86400000));
  const diasRestantesVal = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));
  const pct = diasTotal > 0 ? Math.min(100, Math.round((diasDecorridos / diasTotal) * 100)) : 0;
  const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const periodo = `${String(start.getDate()).padStart(2,'0')}/${MONTHS[start.getMonth()]} – ${String(end.getDate()).padStart(2,'0')}/${MONTHS[end.getMonth()]}/${end.getFullYear()}`;
  return {
    bmName, start, end,
    diasTotal, diasDecorridos, diasRestantes: diasRestantesVal,
    pct, label: bmName, periodo,
  };
}
