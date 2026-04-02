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
  // Try DD/MM/YYYY HH:MM:SS
  const brMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const d = new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  // Try ISO / YYYY-MM-DD
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}
