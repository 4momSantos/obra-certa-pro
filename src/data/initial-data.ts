import { CronogramaState } from "@/types/cronograma";

function generateInitialPeriods() {
  const periods = [];
  const baseValues = [
    12000000, 18000000, 28000000, 42000000, 55000000, 68000000, 
    72000000, 75000000, 70000000, 65000000, 58000000, 52000000,
    48000000, 44000000, 40000000, 35000000, 30000000, 25000000,
    20000000, 15000000,
  ];

  for (let i = 0; i < 20; i++) {
    const base = baseValues[i];
    const variation = () => Math.round(base * (0.85 + Math.random() * 0.3));
    const isCompleted = i < 8;
    
    periods.push({
      id: `bm-${String(i + 1).padStart(2, '0')}`,
      label: `BM-${String(i + 1).padStart(2, '0')}`,
      baseline: base,
      previsto: variation(),
      projetado: variation(),
      realizado: isCompleted ? variation() : 0,
      adiantamento: isCompleted && Math.random() > 0.6 ? Math.round(base * 0.05) : 0,
      fechado: isCompleted,
    });
  }
  return periods;
}

export const initialCronogramaState: CronogramaState = {
  periods: generateInitialPeriods(),
  valorContratual: 915000000,
  projectName: "CONSAG / RNEST UDA U-12",
  lastUpdate: new Date().toISOString(),
};
