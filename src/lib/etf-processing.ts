import * as XLSX from 'xlsx';
import type {
  EfetivoInfo, PontoRaw, ConsolidatedRecord, PlanejamentoRow,
  ApontamentoRow, AusenteRow, DistFuncaoRow, FaltaRow,
  WizardConfig, ProcessingResults, LogEntry, EquipGridRow,
} from '@/types/etf';

type Logger = (msg: string, type?: LogEntry['type']) => void;

// ===== UTILS =====
function norm(s: string | undefined | null): string {
  if (!s) return '';
  return String(s).trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function normChapa(s: string | number | undefined | null): string {
  if (!s) return '';
  return String(s).trim().replace(/\D/g, '');
}

function normEquipe(s: string | undefined | null): string {
  if (!s) return '';
  return String(s).trim().replace(/0+(\d)/g, '$1');
}

export function parsePontoDate(str: string | undefined | null): Date | null {
  if (!str) return null;
  const s = String(str).trim();
  const m = s.match(/(\d{1,2}):(\d{2})\s+\w{3}\s+(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) {
    return new Date(parseInt(m[5]), parseInt(m[4]) - 1, parseInt(m[3]), parseInt(m[1]), parseInt(m[2]));
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function dateKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function fmtDate(d: Date | null): string {
  if (!d) return '';
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}

export function fmtDateTime(d: Date | null): string {
  if (!d) return '';
  return fmtDate(d) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

export function fmtTime(d: Date | null): string {
  if (!d) return '';
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function extractLider(encarregado: string): string {
  if (!encarregado) return '';
  return encarregado.split(' - ')[0].trim();
}

function resolveFuncaoETF(funcaoETF: string, funcaoConsag: string, dePara: Map<string, string>): string {
  if (funcaoETF) return funcaoETF;
  return dePara.get(norm(funcaoConsag)) || funcaoConsag || '';
}

function getAllDates(inicio: string, fim: string): string[] {
  const dates: string[] = [];
  const d1 = new Date(inicio + 'T00:00:00');
  const d2 = new Date(fim + 'T00:00:00');
  for (const d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) {
    dates.push(dateKey(d));
  }
  return dates;
}

// ===== HARDCODED FALLBACKS =====
const HARDCODED_DE_PARA: [string, string][] = [
  ['AJUDANTE','Ajudante'],['CALDEIREIRO I','Caldeireiro'],['ELETRICISTA DE FORCA E CONTROLE','Eletricista de Força e Controle'],
  ['ELETRICISTA DE MANUTENCAO','Eletricista Montador'],['ELETRICISTA MONTADOR','Eletricista Montador'],
  ['ENCANADOR INDUSTRIAL','Encanador Industrial'],['ENCARREGADO DE ELETRICA','Encarregado de Elétrica ou Instrumentação'],
  ['ENCARREGADO DE ELETRICA II','Encarregado de Elétrica ou Instrumentação'],['ENCARREGADO DE INSTRUMENTACAO','Encarregado de Elétrica ou Instrumentação'],
  ['ENCARREGADO DE PRODUCAO I (ANDAIME)','Encarregado de Turma (andaime)'],['ENCARREGADO DE PRODUCAO I  - (MECANICA)','Encarregado de Turma (estático/dinâmico)'],
  ['ENCARREGADO DE PRODUCAO I - (MECANICA)','Encarregado de Turma (estático/dinâmico)'],['ENCARREGADO DE PRODUCAO I - CIVIL','Encarregado de Turma (redes subterrâneas)'],
  ['ENCARREGADO DE PRODUCAO II - (ANDAIME)','Encarregado de Turma (andaime)'],['ENCARREGADO DE PRODUCAO II - (MECANICA)','Encarregado de Turma (estático/dinâmico)'],
  ['ENCARREGADO DE PRODUCAO II - CIVIL','Encarregado de Turma (acabamentos)'],['ENCARREGADO DE SOLDA','Encarregado de Turma (solda)'],
  ['ENCARREGADO DE TUBULACAO','Encarregado de Turma (tubulação)'],['INSTRUMENTISTA','Instrumentista Montador'],
  ['LIXADOR','Lixador'],['MACARIQUEIRO','Maçariqueiro'],['MECANICO AJUSTADOR','Mecânico Ajustador'],
  ['MECANICO MONTADOR','Mecânico Montador'],['MONTADOR','Montador'],['MONTADOR DE ANDAIME','Montador de Andaime'],
  ['PEDREIRO','Pedreiro'],['SOLDADOR I','Soldador de Chaparia'],['SOLDADOR II','Soldador Qualificado API (6G), TIG e MIG'],
  ['PINTOR INDUSTRIAL','Pintor Industrial'],['PINTOR LETRISTA','Pintor Letrista'],
  ['TECNICO DE INSTRUMENTACAO','Técnico em Instrumentação'],['CHEFE DE COMISSIONAMENTO','Técnico de Automação'],
  ['ENCARREGADO DE PRODUCAO II - CALDERARIA','Caldeireiro'],['AJUDANTE ','Ajudante'],
  ['FUNILEIRO MONTADOR','Isolador'],['ENGENHEIRO DE OBRAS III','Engenheiro de Disciplina Sr'],
];

const HARDCODED_APROV_PB: [string, number][] = [
  ['Ajudante',120],['Caldeireiro',20],['Eletricista Montador',14],
  ['Eletricista de Força e Controle',12],['Encanador Industrial',56],
  ['Encarregado de Elétrica ou Instrumentação',10],['Encarregado de Pintura ou Isolamento',0],
  ['Encarregado de Turma (acabamentos)',2],['Encarregado de Turma (andaime)',20],
  ['Encarregado de Turma (estrutura metálica)',2],['Encarregado de Turma (estático/dinâmico)',7],
  ['Encarregado de Turma (pintura/isolamento)',3],['Encarregado de Turma (redes subterrâneas)',0],
  ['Encarregado de Turma (solda)',5],['Encarregado de Turma (tubulação)',15],
  ['Engenheiro de Disciplina Sr',1],['Instrumentista Montador',12],
  ['Isolador',0],['Lavador de fachada',0],['Lixador',40],['Maçariqueiro',8],
  ['Mecânico Ajustador',22],['Mecânico Montador',27],['Montador',3],
  ['Montador de Andaime',199],['Pedreiro',2],['Pintor Industrial',17],
  ['Pintor Letrista',0],['Soldador Qualificado API (6G), TIG e MIG',25],
  ['Soldador de Chaparia',8],['Técnico de Automação',1],['Técnico em Instrumentação',1],
];

// ===== STEP 1 =====
export async function step1_parseEfetivo(
  wb: any, log: Logger
): Promise<{ efetivoETF: Map<string, EfetivoInfo>; removidos: Map<string, EfetivoInfo>; aprovPB: Map<string, number> }> {
  log('📋 Lendo Efetivo ETF...', 'info');
  const efetivoETF = new Map<string, EfetivoInfo>();
  const removidos = new Map<string, EfetivoInfo>();
  const aprovPB = new Map<string, number>();

  let mainSheet = wb.SheetNames.find((s: string) => s.toLowerCase().includes('efetivo') && !s.toLowerCase().includes('removid') && !s.toLowerCase().includes('fora'));
  if (!mainSheet) mainSheet = wb.SheetNames[0];

  const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[mainSheet], { header: 1, defval: '' });
  const hdr = rows[0] || [];
  const colMap: Record<string, number> = {};
  hdr.forEach((h: any, i: number) => {
    const hn = norm(String(h));
    if (hn.includes('CHAPA')) colMap.chapa = i;
    else if (hn.includes('CPF')) colMap.cpf = i;
    else if (hn.includes('AREA') || hn.includes('ATIVI')) colMap.areaAtivi = i;
    else if (hn === 'NOME' || hn.includes('NOME')) colMap.nome = i;
    else if (hn.includes('FUNCAO ETF') || hn.includes('FUNÇÃO ETF')) colMap.funcaoETF = i;
    else if ((hn.includes('FUNCAO') || hn.includes('FUNÇÃO')) && !hn.includes('ETF')) colMap.funcao = i;
    else if (hn.includes('ADMISSAO')) colMap.admissao = i;
    else if (hn.includes('LOCALIZAC')) colMap.local = i;
    else if (hn.includes('SETOR')) colMap.setor = i;
    else if (hn.includes('GERENTE')) colMap.gerente = i;
    else if (hn.includes('COORDENADOR')) colMap.coordenador = i;
    else if (hn.includes('SUPERVISOR')) colMap.supervisor = i;
    else if (hn.includes('ENCARREGADO')) colMap.encarregado = i;
  });
  if (colMap.chapa === undefined) colMap.chapa = 1;
  if (colMap.cpf === undefined) colMap.cpf = 2;
  if (colMap.areaAtivi === undefined) colMap.areaAtivi = 3;
  if (colMap.nome === undefined) colMap.nome = 4;
  if (colMap.funcao === undefined) colMap.funcao = 5;
  if (colMap.funcaoETF === undefined) colMap.funcaoETF = 6;
  if (colMap.encarregado === undefined) colMap.encarregado = 15;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const chapa = normChapa(row[colMap.chapa]);
    if (!chapa) continue;
    efetivoETF.set(chapa, {
      nome: String(row[colMap.nome] || '').trim(),
      cpf: String(row[colMap.cpf] || '').trim(),
      areaAtivi: String(row[colMap.areaAtivi] || '').trim(),
      funcao: String(row[colMap.funcao] || '').trim(),
      funcaoETF: String(row[colMap.funcaoETF] || '').trim(),
      encarregado: String(row[colMap.encarregado] || '').trim(),
      supervisor: String(row[colMap.supervisor !== undefined ? colMap.supervisor : 14] || '').trim(),
      coordenador: String(row[colMap.coordenador !== undefined ? colMap.coordenador : 13] || '').trim(),
    });
  }
  log(`  → ${efetivoETF.size} chapas ETF ativas`, 'ok');

  // Removidos
  const remSheet = wb.SheetNames.find((s: string) => s.toLowerCase().includes('removid'));
  if (remSheet) {
    const remRows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[remSheet], { header: 1, defval: '' });
    for (let r = 1; r < remRows.length; r++) {
      const row = remRows[r];
      const chapa = normChapa(row[1]);
      if (!chapa) continue;
      removidos.set(chapa, {
        nome: String(row[4] || '').trim(),
        cpf: String(row[2] || '').trim(),
        areaAtivi: String(row[3] || '').trim(),
        funcao: String(row[5] || '').trim(),
        funcaoETF: String(row[6] || '').trim(),
        encarregado: String(row[15] || '').trim(),
      });
    }
    log(`  → ${removidos.size} chapas removidas`, 'warn');
  }

  // Aprov PB
  const pbSheet = wb.SheetNames.find((s: string) => s.toLowerCase().includes('aprov'));
  if (pbSheet) {
    const pbRows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[pbSheet], { header: 1, defval: '', range: 0 });
    log(`  → Aba "${pbSheet}" encontrada (${pbRows.length} linhas)`, 'info');
    for (let r = 0; r < pbRows.length; r++) {
      const row = pbRows[r];
      let fn = String(row[1] || '').trim();
      let qtd = parseFloat(row[2]);
      if (!fn || isNaN(qtd)) {
        fn = String(row[0] || '').trim();
        qtd = parseFloat(row[1]);
      }
      if (fn && !isNaN(qtd) && fn !== 'ETF MÃO DE OBRA' && fn !== 'PREVISTO CONTRATO - MÃO DE OBRA' && fn !== 'QTD EfetivoAprovado M7 (H/mês)') {
        aprovPB.set(fn, qtd);
      }
    }
    log(`  → ${aprovPB.size} funções com aprovação PB`, aprovPB.size > 0 ? 'ok' : 'warn');
  }

  if (aprovPB.size === 0) {
    log('  → Usando Aprovados PB padrão (hardcoded)', 'warn');
    HARDCODED_APROV_PB.forEach(([fn, qtd]) => aprovPB.set(fn, qtd));
  }

  return { efetivoETF, removidos, aprovPB };
}

// ===== STEP 2 =====
export async function step2_parsePonto(
  wb: any, config: WizardConfig, log: Logger
): Promise<PontoRaw[]> {
  log('📋 Lendo Ponto Bruto...', 'info');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const pontoRaw: PontoRaw[] = [];
  const periodoInicio = new Date(config.inicio + 'T00:00:00');
  const periodoFim = new Date(config.fim + 'T23:59:59');

  let total = 0, filtered = 0, inPeriod = 0;

  for (let r = 5; r < rows.length; r++) {
    const row = rows[r];
    const nome = String(row[0] || '').trim();
    if (!nome) continue;
    total++;

    const status = String(row[6] || '').trim();
    const motivo = String(row[4] || '').trim();

    let include = false;
    if (config.filtroAprovado && status === 'Aprovado') include = true;
    if (config.filtroPendente && status === 'Pendente' && motivo.toLowerCase().includes('esqueci')) include = true;
    if (config.filtroInvalido && status === 'Inválido') include = true;
    if (!include) { filtered++; continue; }

    const dateStr = String(row[2] || '');
    const dt = parsePontoDate(dateStr);
    if (!dt) continue;

    if (dt < periodoInicio || dt > periodoFim) continue;
    inPeriod++;

    pontoRaw.push({
      nome,
      ponto: String(row[1] || '').trim(),
      date: dt,
      dateKey: dateKey(dt),
      motivo,
      status,
      cpf: String(row[7] || '').trim(),
      matricula: normChapa(row[8]),
      cargo: String(row[9] || '').trim(),
      localizacao: String(row[10] || '').trim(),
    });
  }

  log(`  → ${total} registros lidos`, '');
  log(`  → ${filtered} filtrados por status`, 'warn');
  log(`  → ${inPeriod} dentro do período`, 'ok');
  log(`  → ${pontoRaw.length} registros válidos`, 'ok');

  return pontoRaw;
}

// ===== STEP 3 =====
export async function step3_parseProgramacao(
  wb: any, targetWeek: number, log: Logger
): Promise<Map<string, string>> {
  log('📅 Lendo Programação...', 'info');
  const progLookup = new Map<string, string>();
  let totalCount = 0;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length < 2) continue;

    const hdr = rows[0] || [];
    let colPacote = -1, colSemana = -1, colEquipe = -1;
    hdr.forEach((h: any, i: number) => {
      const hn = norm(String(h));
      if (hn.includes('PACOTE') && colPacote === -1) colPacote = i;
      if (hn.includes('SEMANA') && colSemana === -1) colSemana = i;
      if (hn === 'EQUIPE' && colEquipe === -1) colEquipe = i;
    });

    if (colSemana === -1 || colEquipe === -1 || colPacote === -1) {
      log(`  → Aba "${sheetName}": sem colunas SEMANA/EQUIPE/PACOTE, pulando`, 'warn');
      continue;
    }

    let sheetCount = 0;
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const semana = parseInt(String(row[colSemana]).replace(/^0+/, '') || '0');
      if (semana !== targetWeek) continue;
      const equipe = String(row[colEquipe] || '').trim();
      const pacote = String(row[colPacote] || '').trim();
      if (equipe && pacote && !progLookup.has(equipe)) {
        progLookup.set(equipe, pacote);
        sheetCount++;
      }
    }
    if (sheetCount > 0) log(`  → Aba "${sheetName}": ${sheetCount} equipes mapeadas (semana ${targetWeek})`, 'ok');
    totalCount += sheetCount;
  }

  log(`  → ${progLookup.size} equipes totais mapeadas`, totalCount > 0 ? 'ok' : 'warn');
  return progLookup;
}

// ===== STEP 4 =====
export async function step4_parseModelo(
  wb: any | null, log: Logger
): Promise<Map<string, string>> {
  const dePara = new Map<string, string>();

  if (wb) {
    log('📊 Lendo Modelo (DE PARA)...', 'info');
    const dpSheet = wb.SheetNames.find((s: string) => s.toUpperCase().includes('DE PARA'));
    if (dpSheet) {
      const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[dpSheet], { header: 1, defval: '' });
      for (let r = 1; r < rows.length; r++) {
        const fConsag = String(rows[r][0] || '').trim();
        const fContrato = String(rows[r][1] || '').trim();
        if (fConsag && fContrato) dePara.set(norm(fConsag), fContrato);
      }
      log(`  → ${dePara.size} mapeamentos DE PARA`, 'ok');
    }
  }

  if (dePara.size === 0) {
    log('  → Usando DE PARA padrão (hardcoded)', 'warn');
    HARDCODED_DE_PARA.forEach(([k, v]) => dePara.set(norm(k), v));
  }

  return dePara;
}

// ===== STEP 5 =====
export async function step5_consolidate(
  pontoRaw: PontoRaw[], config: WizardConfig, log: Logger
): Promise<{ consolidated: ConsolidatedRecord[]; canteiro: ConsolidatedRecord[]; fora: ConsolidatedRecord[] }> {
  log('🔄 Consolidando ponto...', 'info');

  if (config.allAsCanteiro) {
    log('  → Sem coluna Localização — todos tratados como Canteiro', 'warn');
  } else {
    log(`  → ${config.canteiroLocs.size} localizações marcadas como Canteiro`, '');
  }

  const groups = new Map<string, PontoRaw[]>();
  pontoRaw.forEach(p => {
    const key = p.matricula + '|' + p.dateKey;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  });

  const consolidated: ConsolidatedRecord[] = [];
  groups.forEach((records, key) => {
    const [mat, dk] = key.split('|');
    const first = records[0];

    const entradas = records.filter(r => r.ponto === 'Entrada').sort((a, b) => a.date.getTime() - b.date.getTime());
    const saidas = records.filter(r => r.ponto === 'Saída').sort((a, b) => a.date.getTime() - b.date.getTime());

    const entrada = entradas.length > 0 ? entradas[0].date : null;
    const saida = saidas.length > 0 ? saidas[saidas.length - 1].date : null;

    let hh = 0;
    if (entrada && saida) {
      hh = (saida.getTime() - entrada.getTime()) / (1000 * 60 * 60);
      if (hh < 0) hh = 0;
      if (hh > 14) hh = 0;
    }

    const isCanteiro = config.allAsCanteiro ? true : config.canteiroLocs.has(first.localizacao);

    consolidated.push({
      matricula: mat,
      nome: first.nome,
      dateKey: dk,
      date: new Date(dk + 'T00:00:00'),
      entrada,
      saida,
      hh: Math.round(hh * 100) / 100,
      local: first.localizacao || (config.allAsCanteiro ? 'CANTEIRO (auto)' : ''),
      isCanteiro,
      cpf: first.cpf,
      cargo: first.cargo,
      totalRecords: records.length,
    });
  });

  const canteiro = consolidated.filter(c => c.isCanteiro);
  const fora = consolidated.filter(c => !c.isCanteiro);

  log(`  → ${consolidated.length} registros consolidados`, 'ok');
  log(`  → ${canteiro.length} Canteiro/Avançado | ${fora.length} Fora`, '');
  const matsCanteiro = new Set(canteiro.map(c => c.matricula));
  log(`  → ${matsCanteiro.size} matrículas no canteiro`, '');

  return { consolidated, canteiro, fora };
}

// ===== STEP 6 =====
export async function step6_generateOutputs(
  efetivoETF: Map<string, EfetivoInfo>,
  removidos: Map<string, EfetivoInfo>,
  aprovPB: Map<string, number>,
  dePara: Map<string, string>,
  progLookup: Map<string, string>,
  canteiro: ConsolidatedRecord[],
  fora: ConsolidatedRecord[],
  config: WizardConfig,
  log: Logger
): Promise<{
  planejamento: PlanejamentoRow[];
  apontamento: ApontamentoRow[];
  ausentes: AusenteRow[];
  substitutos: PlanejamentoRow[];
  subsDiarios: Map<string, Set<string>>;
  distFuncao: DistFuncaoRow[];
  faltas: FaltaRow[];
  allDates: string[];
}> {
  log('📊 Gerando PLANEJAMENTO ETF...', 'info');

  const allDates = getAllDates(config.inicio, config.fim);

  const pontoByMat = new Map<string, ConsolidatedRecord[]>();
  canteiro.forEach(c => {
    if (!pontoByMat.has(c.matricula)) pontoByMat.set(c.matricula, []);
    pontoByMat.get(c.matricula)!.push(c);
  });

  const progNorm = new Map<string, string>();
  progLookup.forEach((pacote, equipe) => {
    progNorm.set(normEquipe(equipe), pacote);
    progNorm.set(equipe, pacote);
  });

  function findPacote(equipe: string): string {
    return progNorm.get(equipe) || progNorm.get(normEquipe(equipe)) || '';
  }

  const chapasWithPonto = new Set(canteiro.map(c => c.matricula));
  const chapasNoPlanejamento = new Set<string>();

  const planejamento: PlanejamentoRow[] = [];
  const substitutos: PlanejamentoRow[] = [];

  // 1. Add all active ETF
  efetivoETF.forEach((info, chapa) => {
    const equipe = normEquipe(info.areaAtivi);
    const lider = extractLider(info.encarregado);
    const pacote = findPacote(info.areaAtivi);
    const funcaoETF = resolveFuncaoETF(info.funcaoETF, info.funcao, dePara);

    planejamento.push({
      lider, equipe, pacote,
      nome: info.nome,
      funcao: info.funcao,
      funcaoETF,
      cpf: info.cpf,
      chapa,
      hasPonto: chapasWithPonto.has(chapa),
      isSubstituto: false,
    });
    chapasNoPlanejamento.add(chapa);
  });

  log(`  → ${planejamento.length} ativos no Efetivo ETF`, 'ok');
  log(`  → ${planejamento.filter(p => p.hasPonto).length} com ponto`, '');

  // 2. SUBSTITUIÇÃO DIÁRIA
  log('🔄 Substituição DIÁRIA (Removidos)...', 'info');
  const subsDiarios = new Map<string, Set<string>>();

  if (removidos.size > 0) {
    const ativosPorFuncaoDia = new Map<string, number>();
    planejamento.forEach(p => {
      if (!p.funcaoETF) return;
      const dias = pontoByMat.get(p.chapa) || [];
      dias.forEach(rec => {
        const key = p.funcaoETF + '|' + rec.dateKey;
        ativosPorFuncaoDia.set(key, (ativosPorFuncaoDia.get(key) || 0) + 1);
      });
    });

    const remInfos: { chapa: string; info: EfetivoInfo; funcaoETF: string; aprovado: number; diasPonto: ConsolidatedRecord[] }[] = [];
    removidos.forEach((info, chapa) => {
      if (chapasNoPlanejamento.has(chapa)) return;
      const diasPonto = pontoByMat.get(chapa);
      if (!diasPonto || diasPonto.length === 0) return;
      const funcaoETF = resolveFuncaoETF(info.funcaoETF, info.funcao, dePara);
      const aprovado = aprovPB.get(funcaoETF) || 0;
      if (aprovado === 0) return;
      remInfos.push({ chapa, info, funcaoETF, aprovado, diasPonto });
    });

    log(`  → ${remInfos.length} removidos candidatos (com ponto e função com PB)`, '');

    const jaPreenchidoPorFuncaoDia = new Map<string, number>();
    allDates.forEach(dk => {
      remInfos.forEach(rem => {
        const hasPonto = rem.diasPonto.some(rec => rec.dateKey === dk);
        if (!hasPonto) return;
        const key = rem.funcaoETF + '|' + dk;
        const ativosHoje = ativosPorFuncaoDia.get(key) || 0;
        const jaPreenchidasHoje = jaPreenchidoPorFuncaoDia.get(key) || 0;
        const totalHoje = ativosHoje + jaPreenchidasHoje;
        if (totalHoje >= rem.aprovado) return;
        if (!subsDiarios.has(rem.chapa)) subsDiarios.set(rem.chapa, new Set());
        subsDiarios.get(rem.chapa)!.add(dk);
        jaPreenchidoPorFuncaoDia.set(key, jaPreenchidasHoje + 1);
      });
    });

    subsDiarios.forEach((diasSub, chapa) => {
      const info = removidos.get(chapa)!;
      const funcaoETF = resolveFuncaoETF(info.funcaoETF, info.funcao, dePara);
      const sub: PlanejamentoRow = {
        lider: extractLider(info.encarregado),
        equipe: normEquipe(info.areaAtivi),
        pacote: findPacote(info.areaAtivi),
        nome: info.nome, funcao: info.funcao, funcaoETF,
        cpf: info.cpf, chapa,
        hasPonto: true, isSubstituto: true, diasSubstituto: diasSub,
      };
      planejamento.push(sub);
      substitutos.push(sub);
      chapasNoPlanejamento.add(chapa);
    });

    if (substitutos.length > 0) {
      let totalDias = 0;
      subsDiarios.forEach(s => totalDias += s.size);
      log(`  → ${substitutos.length} removidos SUBSTITUTOS (${totalDias} dias-pessoa)`, 'ok');
    } else {
      log('  → Nenhuma substituição possível', '');
    }
  }

  planejamento.sort((a, b) => {
    if (a.equipe !== b.equipe) return a.equipe.localeCompare(b.equipe);
    if (a.lider !== b.lider) return a.lider.localeCompare(b.lider);
    return a.nome.localeCompare(b.nome);
  });

  log(`  → ${planejamento.length} total no PLANEJAMENTO (${substitutos.length} removidos)`, 'ok');

  // APONTAMENTO
  log('📊 Gerando APONTAMENTO MO. ETF...', 'info');
  const apontamento: ApontamentoRow[] = [];
  planejamento.forEach(p => {
    const records = pontoByMat.get(p.chapa) || [];
    if (records.length === 0) return;
    const allowedDays = p.isSubstituto ? (subsDiarios.get(p.chapa) || new Set()) : null;
    const sorted = [...records].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    sorted.forEach(rec => {
      if (allowedDays && !allowedDays.has(rec.dateKey)) return;
      apontamento.push({
        dataInicio: rec.entrada ? fmtDateTime(rec.entrada) : '',
        dataFim: rec.saida ? fmtDateTime(rec.saida) : '',
        lider: p.lider, equipe: p.equipe, pacote: p.pacote,
        nome: p.nome, funcao: p.funcao, funcaoETF: p.funcaoETF,
        cpf: p.cpf, chapa: p.chapa,
        dataAjust: rec.dateKey ? fmtDate(rec.date) : '',
        isSubstituto: p.isSubstituto || false,
      });
    });
  });
  log(`  → ${apontamento.length} linhas no APONTAMENTO`, 'ok');

  // AUSENTES
  log('🚫 Identificando AUSENTES...', 'info');
  const ausentes: AusenteRow[] = [];
  planejamento.forEach(p => {
    if (!p.hasPonto) {
      const foraRecords = fora.filter(f => f.matricula === p.chapa);
      let motivo = 'Sem registro de ponto no período';
      if (foraRecords.length > 0) {
        const locs = [...new Set(foraRecords.map(f => f.local))].join(', ');
        motivo = 'Ponto registrado fora do canteiro: ' + locs;
      }
      ausentes.push({
        chapa: p.chapa, nome: p.nome, cpf: p.cpf,
        funcao: p.funcao, funcaoETF: p.funcaoETF,
        equipe: p.equipe, lider: p.lider, motivo,
        diasFora: foraRecords.length,
      });
    }
  });
  ausentes.sort((a, b) => a.equipe.localeCompare(b.equipe) || a.nome.localeCompare(b.nome));
  log(`  → ${ausentes.length} profissionais ausentes do canteiro`, ausentes.length > 0 ? 'warn' : 'ok');

  // DISTRIBUIÇÃO POR FUNÇÃO
  log('📊 Gerando DISTRIBUIÇÃO POR FUNÇÃO...', 'info');
  const funcDist = new Map<string, Map<string, Set<string>>>();
  apontamento.forEach(a => {
    if (!a.funcaoETF) return;
    if (!funcDist.has(a.funcaoETF)) funcDist.set(a.funcaoETF, new Map());
    const fd = funcDist.get(a.funcaoETF)!;
    const dk = a.dataAjust;
    if (!fd.has(dk)) fd.set(dk, new Set());
    fd.get(dk)!.add(a.chapa);
  });

  const distFuncao: DistFuncaoRow[] = [];
  funcDist.forEach((dateMap, funcao) => {
    const row: DistFuncaoRow = { funcao, dates: {}, total: 0, totalEquipe: 0, aprovPB: aprovPB.get(funcao) || 0, dif: 0 };
    const allChapas = new Set<string>();
    allDates.forEach(dk => {
      const fdk = fmtDate(new Date(dk + 'T00:00:00'));
      const chapas = dateMap.get(fdk) || new Set();
      row.dates[dk] = chapas.size;
      row.total += chapas.size;
      chapas.forEach(c => allChapas.add(c));
    });
    row.totalEquipe = allChapas.size;
    row.dif = row.aprovPB - row.totalEquipe;
    distFuncao.push(row);
  });
  distFuncao.sort((a, b) => a.funcao.localeCompare(b.funcao));
  log(`  → ${distFuncao.length} funções na DISTRIBUIÇÃO`, 'ok');

  // FALTAS
  const pontoByMatSet = new Map<string, Set<string>>();
  canteiro.forEach(c => {
    if (!pontoByMatSet.has(c.matricula)) pontoByMatSet.set(c.matricula, new Set());
    pontoByMatSet.get(c.matricula)!.add(c.dateKey);
  });

  const faltas: FaltaRow[] = [];
  planejamento.forEach(p => {
    if (!p.hasPonto) return;
    const diasPresente = pontoByMatSet.get(p.chapa) || new Set();
    const diasFalta = allDates.filter(dk => !diasPresente.has(dk));
    if (diasFalta.length === 0) return;
    faltas.push({
      chapa: p.chapa, nome: p.nome, funcaoETF: p.funcaoETF,
      equipe: p.equipe, lider: p.lider,
      diasPresente, diasFalta, totalFaltas: diasFalta.length,
    });
  });
  faltas.sort((a, b) => b.totalFaltas - a.totalFaltas || a.equipe.localeCompare(b.equipe));

  return { planejamento, apontamento, ausentes, substitutos, subsDiarios, distFuncao, faltas, allDates };
}

// ===== DETECT LOCATIONS =====
export function detectLocations(wbPonto: any): { locations: string[]; hasLocationData: boolean } {
  const ws = wbPonto.Sheets[wbPonto.SheetNames[0]];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const locs = new Set<string>();
  for (let r = 5; r <= Math.min(range.e.r, 5000); r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 10 })];
    if (cell && cell.v && String(cell.v).trim()) locs.add(String(cell.v).trim());
  }
  return { locations: [...locs].sort(), hasLocationData: locs.size > 0 };
}

// ===== AUTO DETECT DATES =====
export function autoDetectDates(wbPonto: any): { inicio: string; fim: string } {
  const ws = wbPonto.Sheets[wbPonto.SheetNames[0]];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const dates = new Set<string>();
  for (let r = 5; r <= Math.min(range.e.r, 200); r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 2 })];
    if (cell && cell.v) {
      const d = parsePontoDate(String(cell.v));
      if (d) dates.add(d.toISOString().slice(0, 10));
    }
  }
  const sorted = [...dates].sort();
  return {
    inicio: sorted[0] || '',
    fim: sorted[sorted.length - 1] || '',
  };
}

// ===== FULL PROCESSING PIPELINE =====
export async function processETF(
  workbooks: { ponto: any; efetivo: any; prog: any; modelo: any | null },
  config: WizardConfig,
  equipGrid: EquipGridRow[],
  log: Logger,
  setProgress: (pct: number) => void
): Promise<ProcessingResults> {
  setProgress(0);
  await sleep(50);

  const { efetivoETF, removidos, aprovPB } = await step1_parseEfetivo(workbooks.efetivo, log);
  setProgress(15);
  await sleep(30);

  const pontoRaw = await step2_parsePonto(workbooks.ponto, config, log);
  setProgress(35);
  await sleep(30);

  const progLookup = await step3_parseProgramacao(workbooks.prog, config.semana, log);
  setProgress(50);
  await sleep(30);

  const dePara = await step4_parseModelo(workbooks.modelo, log);
  setProgress(55);
  await sleep(30);

  const { consolidated, canteiro, fora } = await step5_consolidate(pontoRaw, config, log);
  setProgress(70);
  await sleep(30);

  const outputs = await step6_generateOutputs(efetivoETF, removidos, aprovPB, dePara, progLookup, canteiro, fora, config, log);
  setProgress(90);
  await sleep(30);

  log('✅ Processamento concluído com sucesso!', 'ok');
  setProgress(100);

  return {
    pontoRaw,
    efetivoETF,
    removidos,
    dePara,
    aprovPB,
    progLookup,
    consolidated,
    canteiro,
    fora,
    planejamento: outputs.planejamento,
    apontamento: outputs.apontamento,
    ausentes: outputs.ausentes,
    substitutos: outputs.substitutos,
    subsDiarios: outputs.subsDiarios,
    distFuncao: outputs.distFuncao,
    faltas: outputs.faltas,
    equipGrid,
    allDates: outputs.allDates,
  };
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
