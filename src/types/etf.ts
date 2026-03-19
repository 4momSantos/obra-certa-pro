// ===== CATEGORIAS SIMPLES (legado) =====
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
  semana: string;
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

export const CATEGORIAS: ETFCategoria[] = ['Engenheiro', 'Técnico', 'Encarregado', 'Operário', 'Administrativo'];
export const STATUS_OPTIONS: ETFStatus[] = ['Ativo', 'Afastado', 'Férias', 'Desligado'];

// ===== WIZARD ETF TYPES =====

export interface EfetivoInfo {
  nome: string;
  cpf: string;
  areaAtivi: string;
  funcao: string;
  funcaoETF: string;
  encarregado: string;
  supervisor?: string;
  coordenador?: string;
}

export interface PontoRaw {
  nome: string;
  ponto: string; // 'Entrada' | 'Saída'
  date: Date;
  dateKey: string;
  motivo: string;
  status: string;
  cpf: string;
  matricula: string;
  cargo: string;
  localizacao: string;
}

export interface ConsolidatedRecord {
  matricula: string;
  nome: string;
  dateKey: string;
  date: Date;
  entrada: Date | null;
  saida: Date | null;
  hh: number;
  local: string;
  isCanteiro: boolean;
  cpf: string;
  cargo: string;
  totalRecords: number;
}

export interface PlanejamentoRow {
  lider: string;
  equipe: string;
  pacote: string;
  nome: string;
  funcao: string;
  funcaoETF: string;
  cpf: string;
  chapa: string;
  hasPonto: boolean;
  isSubstituto: boolean;
  diasSubstituto?: Set<string>;
}

export interface ApontamentoRow {
  dataInicio: string;
  dataFim: string;
  lider: string;
  equipe: string;
  pacote: string;
  nome: string;
  funcao: string;
  funcaoETF: string;
  cpf: string;
  chapa: string;
  dataAjust: string;
  isSubstituto: boolean;
}

export interface AusenteRow {
  chapa: string;
  nome: string;
  cpf: string;
  funcao: string;
  funcaoETF: string;
  equipe: string;
  lider: string;
  motivo: string;
  diasFora: number;
}

export interface DistFuncaoRow {
  funcao: string;
  dates: Record<string, number>;
  total: number;
  totalEquipe: number;
  aprovPB: number;
  dif: number;
}

export interface FaltaRow {
  chapa: string;
  nome: string;
  funcaoETF: string;
  equipe: string;
  lider: string;
  diasPresente: Set<string>;
  diasFalta: string[];
  totalFaltas: number;
}

export interface SubstitutoRow extends PlanejamentoRow {
  isSubstituto: true;
  diasSubstituto: Set<string>;
}

export interface EquipamentoInfo {
  tag: string;
  placa: string;
  fabricante: string;
  nomeEquip: string;
  nomeETF: string;
  locador: string;
  modelo: string;
  lider: string;
  equipe: string;
}

export interface EquipGridRow {
  equip: EquipamentoInfo;
  qtds: Record<string, number>;
}

export interface WizardConfig {
  semana: number;
  inicio: string;
  fim: string;
  filtroAprovado: boolean;
  filtroPendente: boolean;
  filtroInvalido: boolean;
  canteiroLocs: Set<string>;
  allAsCanteiro: boolean;
  noLocationData: boolean;
  liderEquip: string;
  equipeEquip: string;
}

export interface WizardFiles {
  ponto: File | null;
  efetivo: File | null;
  prog: File | null;
  modelo: File | null;
  equip: File | null;
}

export interface WizardWorkbooks {
  ponto: any | null;
  efetivo: any | null;
  prog: any | null;
  modelo: any | null;
}

export interface ProcessingResults {
  pontoRaw: PontoRaw[];
  efetivoETF: Map<string, EfetivoInfo>;
  removidos: Map<string, EfetivoInfo>;
  dePara: Map<string, string>;
  aprovPB: Map<string, number>;
  progLookup: Map<string, string>;
  consolidated: ConsolidatedRecord[];
  canteiro: ConsolidatedRecord[];
  fora: ConsolidatedRecord[];
  planejamento: PlanejamentoRow[];
  apontamento: ApontamentoRow[];
  ausentes: AusenteRow[];
  substitutos: PlanejamentoRow[];
  subsDiarios: Map<string, Set<string>>;
  distFuncao: DistFuncaoRow[];
  faltas: FaltaRow[];
  equipGrid: EquipGridRow[];
  allDates: string[];
}

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface LogEntry {
  msg: string;
  type: 'info' | 'ok' | 'warn' | 'err' | '';
}
