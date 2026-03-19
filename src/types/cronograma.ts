export interface PeriodData {
  id: string;
  label: string;
  baseline: number;
  previsto: number;
  projetado: number;
  realizado: number;
  adiantamento: number;
  fechado: boolean;
}

export interface CronogramaState {
  periods: PeriodData[];
  valorContratual: number;
  projectName: string;
  lastUpdate: string;
}

export interface DashboardMetrics {
  valorContratual: number;
  totalBaseline: number;
  totalPrevisto: number;
  totalProjetado: number;
  totalRealizado: number;
  totalAdiantamento: number;
  avancoFisico: number;
  avancoFinanceiro: number;
  saldo: number;
}

export interface CurvaSPoint {
  period: string;
  baseline: number;
  previsto: number;
  projetado: number;
  realizado: number;
  baselineAcum: number;
  previstoAcum: number;
  projetadoAcum: number;
  realizadoAcum: number;
}
