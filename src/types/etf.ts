export type ETFCategoria = 'Engenheiro' | 'Técnico' | 'Encarregado' | 'Operário' | 'Administrativo';

export type ETFStatus = 'Ativo' | 'Afastado' | 'Férias' | 'Desligado';

export interface ETFRecord {
  id: string;
  nome: string;
  categoria: ETFCategoria;
  empresa: string;
  horasTrabalhadas: number;
  horasExtras: number;
  faltas: number;
  semana: string; // formato "YYYY-WXX"
  status: ETFStatus;
}

export interface ETFCategoriaSummary {
  categoria: ETFCategoria;
  total: number;
  horas: number;
  horasExtras: number;
  faltas: number;
}

export interface ETFWeekSummary {
  semana: string;
  totalEfetivo: number;
  totalHoras: number;
  totalHorasExtras: number;
  totalFaltas: number;
  porCategoria: ETFCategoriaSummary[];
}

export const CATEGORIAS: ETFCategoria[] = [
  'Engenheiro',
  'Técnico',
  'Encarregado',
  'Operário',
  'Administrativo',
];

export const STATUS_OPTIONS: ETFStatus[] = ['Ativo', 'Afastado', 'Férias', 'Desligado'];
