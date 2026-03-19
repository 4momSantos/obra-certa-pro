import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { ProcessingResults, EquipGridRow } from '@/types/etf';
import { fmtDate, fmtTime, fmtDateTime, dateKey } from './etf-processing';

const BLUE_DARK: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
const GRAY_HDR: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE4E4E4' } };
const GRAY_ALT: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
const GREEN_OK: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
const RED_FAIL: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } };
const YELLOW_W: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };

const fontTitle: Partial<ExcelJS.Font> = { name: 'Segoe UI Emoji', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
const fontTitleSm: Partial<ExcelJS.Font> = { name: 'Aptos Narrow', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
const fontHdr: Partial<ExcelJS.Font> = { name: 'Aptos Narrow', size: 11, bold: true };
const fontData: Partial<ExcelJS.Font> = { name: 'Aptos Narrow', size: 11 };
const fontDataSm: Partial<ExcelJS.Font> = { name: 'Aptos Narrow', size: 10 };
const fontBold: Partial<ExcelJS.Font> = { name: 'Aptos Narrow', size: 11, bold: true };
const fontRed: Partial<ExcelJS.Font> = { name: 'Aptos Narrow', size: 11, bold: true, color: { argb: 'FFC00000' } };
const fontGreen: Partial<ExcelJS.Font> = { name: 'Aptos Narrow', size: 11, bold: true, color: { argb: 'FF006100' } };

const alignC: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };
const alignL: Partial<ExcelJS.Alignment> = { horizontal: 'left', vertical: 'middle' };
const alignR: Partial<ExcelJS.Alignment> = { horizontal: 'right', vertical: 'middle' };
const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }, bottom: { style: 'thin' },
};

function applyHeaderBlock(ws: ExcelJS.Worksheet, title: string, lastCol: number, semana: number, periodoShort: string, emissaoStr: string) {
  ws.mergeCells(2, 1, 2, lastCol);
  const c2 = ws.getCell(2, 1);
  c2.value = '  ' + title;
  c2.font = fontTitle; c2.fill = BLUE_DARK; c2.alignment = alignL;
  for (let c = 1; c <= lastCol; c++) ws.getCell(2, c).fill = BLUE_DARK;

  ws.mergeCells(3, 1, 3, Math.floor(lastCol / 2));
  ws.getCell(3, 1).value = 'Semana ' + semana;
  ws.getCell(3, 1).font = fontTitleSm; ws.getCell(3, 1).fill = BLUE_DARK; ws.getCell(3, 1).alignment = alignL;
  ws.mergeCells(3, Math.floor(lastCol / 2) + 1, 3, lastCol);
  ws.getCell(3, Math.floor(lastCol / 2) + 1).value = 'Período: ' + periodoShort;
  ws.getCell(3, Math.floor(lastCol / 2) + 1).font = fontTitleSm; ws.getCell(3, Math.floor(lastCol / 2) + 1).fill = BLUE_DARK;
  ws.getCell(3, Math.floor(lastCol / 2) + 1).alignment = alignR;
  for (let c = 1; c <= lastCol; c++) ws.getCell(3, c).fill = BLUE_DARK;

  ws.mergeCells(4, 1, 4, lastCol);
  ws.getCell(4, 1).value = emissaoStr;
  ws.getCell(4, 1).font = { name: 'Aptos Narrow', size: 9, italic: true, color: { argb: 'FFFFFFFF' } };
  ws.getCell(4, 1).fill = BLUE_DARK; ws.getCell(4, 1).alignment = alignR;
  for (let c = 1; c <= lastCol; c++) ws.getCell(4, c).fill = BLUE_DARK;
}

function styleHeaderRow(ws: ExcelJS.Worksheet, row: number, cols: number) {
  for (let c = 1; c <= cols; c++) {
    const cell = ws.getCell(row, c);
    cell.font = fontHdr; cell.fill = GRAY_HDR; cell.alignment = alignC; cell.border = thinBorder;
  }
}

function styleDataRow(ws: ExcelJS.Worksheet, row: number, cols: number, isAlt: boolean) {
  for (let c = 1; c <= cols; c++) {
    const cell = ws.getCell(row, c);
    cell.font = fontData; cell.alignment = alignC; cell.border = thinBorder;
    if (isAlt) cell.fill = GRAY_ALT;
  }
}

function normEquipe(s: string): string {
  if (!s) return '';
  return String(s).trim().replace(/0+(\d)/g, '$1');
}

function extractLider(enc: string): string {
  if (!enc) return '';
  return enc.split(' - ')[0].trim();
}

export async function buildRelatorioETF(results: ProcessingResults, semana: number, inicio: string, fim: string): Promise<ExcelJS.Workbook> {
  const dInicio = new Date(inicio + 'T00:00:00');
  const dFim = new Date(fim + 'T00:00:00');
  const periodoShort = fmtDate(dInicio).slice(0, 5) + ' a ' + fmtDate(dFim).slice(0, 5);
  const now = new Date();
  const emissaoStr = 'Emissão: ' + fmtDate(now) + ' ' + fmtTime(now);
  const allDates = results.allDates;
  const nDays = allDates.length;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ERP ETF Module';

  // DISTRIBUIÇÃO POR FUNÇÃO
  const wsDist = wb.addWorksheet('DISTRIBUICAO POR FUNCAO');
  const distLastCol = 2 + nDays + 4;
  applyHeaderBlock(wsDist, 'Equipe ETF - Distribuição por Função', distLastCol, semana, periodoShort, emissaoStr);
  wsDist.getColumn(1).width = 3; wsDist.getColumn(2).width = 42;
  for (let i = 0; i < nDays; i++) wsDist.getColumn(3 + i).width = 14;
  wsDist.getColumn(3 + nDays).width = 8; wsDist.getColumn(4 + nDays).width = 2;
  wsDist.getColumn(5 + nDays).width = 14; wsDist.getColumn(6 + nDays).width = 12; wsDist.getColumn(7 + nDays).width = 8;

  const distHdrRow = 6;
  wsDist.getCell(distHdrRow, 2).value = 'Função';
  allDates.forEach((dk, i) => { wsDist.getCell(distHdrRow, 3 + i).value = fmtDate(new Date(dk + 'T00:00:00')); });
  wsDist.getCell(distHdrRow, 3 + nDays).value = 'Total';
  wsDist.getCell(distHdrRow, 5 + nDays).value = 'Total Equipe';
  wsDist.getCell(distHdrRow, 6 + nDays).value = 'Aprov. PB';
  wsDist.getCell(distHdrRow, 7 + nDays).value = 'Dif';
  styleHeaderRow(wsDist, distHdrRow, distLastCol);

  let distRow = 7;
  const tDates: Record<string, number> = {}; allDates.forEach(dk => tDates[dk] = 0);
  let tTotal = 0, tEquipe = 0, tPB = 0;

  results.distFuncao.forEach((f, idx) => {
    const r = distRow + idx;
    wsDist.getCell(r, 2).value = f.funcao; wsDist.getCell(r, 2).alignment = alignL;
    allDates.forEach((dk, i) => { wsDist.getCell(r, 3 + i).value = f.dates[dk] || 0; tDates[dk] += (f.dates[dk] || 0); });
    wsDist.getCell(r, 3 + nDays).value = f.total;
    wsDist.getCell(r, 5 + nDays).value = f.totalEquipe; wsDist.getCell(r, 5 + nDays).font = fontBold;
    wsDist.getCell(r, 6 + nDays).value = f.aprovPB;
    wsDist.getCell(r, 7 + nDays).value = f.dif;
    if (f.dif < 0) { wsDist.getCell(r, 7 + nDays).font = fontRed; wsDist.getCell(r, 7 + nDays).fill = RED_FAIL; }
    else if (f.dif > 0) { wsDist.getCell(r, 7 + nDays).font = fontGreen; wsDist.getCell(r, 7 + nDays).fill = GREEN_OK; }
    styleDataRow(wsDist, r, distLastCol, idx % 2 === 1);
    wsDist.getCell(r, 2).alignment = alignL;
    tTotal += f.total; tEquipe += f.totalEquipe; tPB += f.aprovPB;
  });

  const tR = distRow + results.distFuncao.length;
  wsDist.getCell(tR, 2).value = 'Total';
  allDates.forEach((dk, i) => { wsDist.getCell(tR, 3 + i).value = tDates[dk]; });
  wsDist.getCell(tR, 3 + nDays).value = tTotal;
  wsDist.getCell(tR, 5 + nDays).value = tEquipe;
  wsDist.getCell(tR, 6 + nDays).value = tPB;
  wsDist.getCell(tR, 7 + nDays).value = tPB - tEquipe;
  for (let c = 1; c <= distLastCol; c++) {
    const cell = wsDist.getCell(tR, c);
    cell.font = fontBold; cell.fill = GRAY_HDR; cell.alignment = alignC; cell.border = thinBorder;
  }

  // Planilha1 (Aprovados PB)
  const wsPb = wb.addWorksheet('Planilha1');
  wsPb.getCell(1, 1).value = 'PREVISTO CONTRATO - MÃO DE OBRA'; wsPb.getCell(1, 1).font = fontBold;
  let pbTotal = 0; results.aprovPB.forEach(v => pbTotal += v);
  wsPb.getCell(3, 1).value = 'ETF MÃO DE OBRA'; wsPb.getCell(3, 2).value = pbTotal;
  wsPb.getCell(3, 1).font = fontBold; wsPb.getCell(3, 2).font = fontBold;
  wsPb.getCell(4, 2).value = 'QTD EfetivoAprovado M7 (H/mês)'; wsPb.getCell(4, 2).font = fontHdr;
  let pbRow = 5;
  results.aprovPB.forEach((qtd, fn) => {
    wsPb.getCell(pbRow, 1).value = fn; wsPb.getCell(pbRow, 2).value = qtd;
    wsPb.getCell(pbRow, 1).font = fontData; wsPb.getCell(pbRow, 2).font = fontData;
    pbRow++;
  });
  wsPb.getColumn(1).width = 45; wsPb.getColumn(2).width = 15;

  // PLANEJAMENTO ETF
  const wsPlan = wb.addWorksheet('PLANEJAMENTO ETF');
  const planCols = 9;
  applyHeaderBlock(wsPlan, 'Planejamento de Mão de Obra - Equipe ETF', planCols, semana, periodoShort, emissaoStr);
  const planHeaders = ['Líder', 'Equipe', 'Programação Semanal', 'Profissional', 'Função CONSAG', 'Função ETF', 'CPF', 'Chapa', 'Status'];
  const planWidths = [42, 15, 28, 44, 35, 37, 16, 14, 18];
  planHeaders.forEach((h, i) => { wsPlan.getCell(5, i + 1).value = h; wsPlan.getColumn(i + 1).width = planWidths[i]; });
  styleHeaderRow(wsPlan, 5, planCols);

  results.planejamento.forEach((p, idx) => {
    const r = 6 + idx;
    const status = p.isSubstituto ? 'SUBSTITUTO' : (p.hasPonto ? 'OK' : 'SEM PONTO');
    const vals = [p.lider, p.equipe, p.pacote, p.nome, p.funcao, p.funcaoETF, p.cpf, isNaN(Number(p.chapa)) ? p.chapa : Number(p.chapa), status];
    vals.forEach((v, i) => { wsPlan.getCell(r, i + 1).value = v; });
    styleDataRow(wsPlan, r, planCols, idx % 2 === 1);
    wsPlan.getCell(r, 1).alignment = alignL; wsPlan.getCell(r, 4).alignment = alignL;
    if (status === 'SEM PONTO') { wsPlan.getCell(r, 9).font = fontRed; wsPlan.getCell(r, 9).fill = RED_FAIL; }
    else if (status === 'SUBSTITUTO') { wsPlan.getCell(r, 9).font = { name: 'Aptos Narrow', size: 11, bold: true, color: { argb: 'FF7030A0' } }; wsPlan.getCell(r, 9).fill = YELLOW_W; }
    else { wsPlan.getCell(r, 9).font = fontGreen; wsPlan.getCell(r, 9).fill = GREEN_OK; }
  });

  // APONTAMENTO MO. ETF
  const wsApont = wb.addWorksheet('APONTAMENTO MO. ETF');
  const apontCols = 11;
  applyHeaderBlock(wsApont, 'Apontamento de Mão de Obra - Equipe ETF', apontCols, semana, periodoShort, emissaoStr);
  const apontHeaders = ['Data Inicio', 'Data Fim', 'Líder', 'Equipe', 'Programação Semanal', 'Profissional', 'Função', 'Função ETF', 'CPF', 'Chapa', 'DataAjust'];
  const apontWidths = [18, 18, 38, 13, 28, 42, 33, 37, 16, 14, 12];
  apontHeaders.forEach((h, i) => { wsApont.getCell(5, i + 1).value = h; wsApont.getColumn(i + 1).width = apontWidths[i]; });
  styleHeaderRow(wsApont, 5, apontCols);
  results.apontamento.forEach((a, idx) => {
    const r = 6 + idx;
    const vals = [a.dataInicio, a.dataFim, a.lider, a.equipe, a.pacote, a.nome, a.funcao, a.funcaoETF, a.cpf, isNaN(Number(a.chapa)) ? a.chapa : Number(a.chapa), a.dataAjust];
    vals.forEach((v, i) => { wsApont.getCell(r, i + 1).value = v; });
    styleDataRow(wsApont, r, apontCols, idx % 2 === 1);
    wsApont.getCell(r, 1).alignment = alignL; wsApont.getCell(r, 2).alignment = alignL;
    wsApont.getCell(r, 6).alignment = alignL; wsApont.getCell(r, 7).alignment = alignL;
  });

  // FALTAS
  const wsFaltas = wb.addWorksheet('FALTAS');
  const faltasCols = 5 + nDays + 1;
  applyHeaderBlock(wsFaltas, 'Controle de Faltas - Equipe ETF', faltasCols, semana, periodoShort, emissaoStr);
  const faltasHeaders = ['Chapa', 'Profissional', 'Função ETF', 'Equipe', 'Líder'];
  allDates.forEach(dk => faltasHeaders.push(fmtDate(new Date(dk + 'T00:00:00'))));
  faltasHeaders.push('Faltas');
  faltasHeaders.forEach((h, i) => { wsFaltas.getCell(5, i + 1).value = h; });
  styleHeaderRow(wsFaltas, 5, faltasCols);
  wsFaltas.getColumn(1).width = 14; wsFaltas.getColumn(2).width = 40; wsFaltas.getColumn(3).width = 30;
  wsFaltas.getColumn(4).width = 15; wsFaltas.getColumn(5).width = 35;
  for (let i = 0; i < nDays; i++) wsFaltas.getColumn(6 + i).width = 14;
  wsFaltas.getColumn(6 + nDays).width = 8;

  let faltasRow = 6;
  results.faltas.forEach((f, idx) => {
    const r = faltasRow + idx;
    wsFaltas.getCell(r, 1).value = isNaN(Number(f.chapa)) ? f.chapa : Number(f.chapa);
    wsFaltas.getCell(r, 2).value = f.nome; wsFaltas.getCell(r, 3).value = f.funcaoETF;
    wsFaltas.getCell(r, 4).value = f.equipe; wsFaltas.getCell(r, 5).value = f.lider;
    allDates.forEach((dk, i) => {
      const cell = wsFaltas.getCell(r, 6 + i);
      if (f.diasPresente.has(dk)) { cell.value = '✓'; cell.font = fontGreen; cell.fill = GREEN_OK; }
      else { cell.value = '✗'; cell.font = fontRed; cell.fill = RED_FAIL; }
      cell.alignment = alignC; cell.border = thinBorder;
    });
    wsFaltas.getCell(r, 6 + nDays).value = f.totalFaltas; wsFaltas.getCell(r, 6 + nDays).font = fontRed;
    styleDataRow(wsFaltas, r, 5, idx % 2 === 1);
    wsFaltas.getCell(r, 2).alignment = alignL;
  });

  // SUBSTITUÍDOS
  const wsSubs = wb.addWorksheet('SUBSTITUIDOS');
  const subsCols = 6 + nDays + 1;
  applyHeaderBlock(wsSubs, 'Substituições (Removidos sem Saldo) - Equipe ETF', subsCols, semana, periodoShort, emissaoStr);
  const subsHeaders = ['Chapa', 'Profissional', 'Função CONSAG', 'Função ETF', 'Equipe', 'Líder'];
  allDates.forEach(dk => subsHeaders.push(fmtDate(new Date(dk + 'T00:00:00'))));
  subsHeaders.push('Dias Sub.');
  subsHeaders.forEach((h, i) => { wsSubs.getCell(5, i + 1).value = h; });
  styleHeaderRow(wsSubs, 5, subsCols);
  wsSubs.getColumn(1).width = 14; wsSubs.getColumn(2).width = 40; wsSubs.getColumn(3).width = 30;
  wsSubs.getColumn(4).width = 30; wsSubs.getColumn(5).width = 15; wsSubs.getColumn(6).width = 35;
  for (let i = 0; i < nDays; i++) wsSubs.getColumn(7 + i).width = 14;
  wsSubs.getColumn(7 + nDays).width = 10;

  const pontoByMatSet = new Map<string, Set<string>>();
  results.canteiro.forEach(c => {
    if (!pontoByMatSet.has(c.matricula)) pontoByMatSet.set(c.matricula, new Set());
    pontoByMatSet.get(c.matricula)!.add(c.dateKey);
  });

  let subsRow = 6;
  results.substitutos.forEach((s, idx) => {
    const r = subsRow + idx;
    wsSubs.getCell(r, 1).value = isNaN(Number(s.chapa)) ? s.chapa : Number(s.chapa);
    wsSubs.getCell(r, 2).value = s.nome; wsSubs.getCell(r, 3).value = s.funcao;
    wsSubs.getCell(r, 4).value = s.funcaoETF; wsSubs.getCell(r, 5).value = s.equipe; wsSubs.getCell(r, 6).value = s.lider;
    const diasSub = results.subsDiarios.get(s.chapa) || new Set();
    const diasPonto = pontoByMatSet.get(s.chapa) || new Set();
    let totalSub = 0;
    allDates.forEach((dk, i) => {
      const cell = wsSubs.getCell(r, 7 + i);
      if (diasSub.has(dk)) { cell.value = '✓ SUB'; cell.font = fontGreen; cell.fill = GREEN_OK; totalSub++; }
      else if (diasPonto.has(dk)) { cell.value = '— (excede)'; cell.font = { name: 'Aptos Narrow', size: 10, color: { argb: 'FF808080' } }; cell.fill = YELLOW_W; }
      else { cell.value = '✗'; cell.font = fontRed; cell.fill = RED_FAIL; }
      cell.alignment = alignC; cell.border = thinBorder;
    });
    wsSubs.getCell(r, 7 + nDays).value = totalSub; wsSubs.getCell(r, 7 + nDays).font = fontBold;
    styleDataRow(wsSubs, r, 6, idx % 2 === 1);
    wsSubs.getCell(r, 2).alignment = alignL;
  });

  // EQUIPAMENTOS (if present)
  if (results.equipGrid.length > 0) {
    const wsEqDist = wb.addWorksheet('DISTRIBUICAO POR EQUIPAMENTO');
    const eqDistLastCol = 2 + nDays + 2;
    applyHeaderBlock(wsEqDist, 'Equipe ETF - Distribuição por Equipamento', eqDistLastCol, semana, periodoShort, emissaoStr);
    wsEqDist.getColumn(1).width = 3; wsEqDist.getColumn(2).width = 50;
    for (let i = 0; i < nDays; i++) wsEqDist.getColumn(3 + i).width = 14;
    wsEqDist.getColumn(3 + nDays).width = 8; wsEqDist.getColumn(4 + nDays).width = 8;
    const eqHdrRow = 6;
    wsEqDist.getCell(eqHdrRow, 2).value = 'MÁQUINA / TAG';
    allDates.forEach((dk, i) => wsEqDist.getCell(eqHdrRow, 3 + i).value = fmtDate(new Date(dk + 'T00:00:00')));
    wsEqDist.getCell(eqHdrRow, 3 + nDays).value = 'Total';
    wsEqDist.getCell(eqHdrRow, 4 + nDays).value = 'Pico';
    styleHeaderRow(wsEqDist, eqHdrRow, eqDistLastCol);

    const byType = new Map<string, EquipGridRow[]>();
    results.equipGrid.forEach(r => {
      const tipo = r.equip.nomeETF || r.equip.nomeEquip || r.equip.tag;
      if (!byType.has(tipo)) byType.set(tipo, []);
      byType.get(tipo)!.push(r);
    });

    let eqRow = 7;
    byType.forEach((items, tipo) => {
      wsEqDist.getCell(eqRow, 2).value = tipo; wsEqDist.getCell(eqRow, 2).font = fontBold;
      let typePico = 0;
      allDates.forEach((dk, i) => {
        const daySum = items.reduce((a, r) => a + (r.qtds[dk] || 0), 0);
        wsEqDist.getCell(eqRow, 3 + i).value = daySum; wsEqDist.getCell(eqRow, 3 + i).alignment = alignC;
        if (daySum > typePico) typePico = daySum;
      });
      const typeTotal = items.reduce((a, r) => a + Object.values(r.qtds).reduce((s, v) => s + v, 0), 0);
      wsEqDist.getCell(eqRow, 3 + nDays).value = typeTotal; wsEqDist.getCell(eqRow, 3 + nDays).font = fontBold;
      wsEqDist.getCell(eqRow, 4 + nDays).value = typePico; wsEqDist.getCell(eqRow, 4 + nDays).font = fontBold;
      for (let c = 2; c <= eqDistLastCol; c++) wsEqDist.getCell(eqRow, c).border = thinBorder;
      eqRow++;
      items.forEach(r => {
        wsEqDist.getCell(eqRow, 2).value = r.equip.tag; wsEqDist.getCell(eqRow, 2).font = fontData;
        allDates.forEach((dk, i) => { wsEqDist.getCell(eqRow, 3 + i).value = r.qtds[dk] || 0; wsEqDist.getCell(eqRow, 3 + i).font = fontData; wsEqDist.getCell(eqRow, 3 + i).alignment = alignC; });
        for (let c = 2; c <= eqDistLastCol; c++) wsEqDist.getCell(eqRow, c).border = thinBorder;
        eqRow++;
      });
    });

    // APONTAMENTO EQP. ETF
    const wsEqAp = wb.addWorksheet('APONTAMENTO EQP. ETF');
    const eqApCols = 12;
    applyHeaderBlock(wsEqAp, 'Apontamento de Recursos - Equipamentos ETF', eqApCols, semana, periodoShort, emissaoStr);
    const eqApHeaders = ['Data Inicio', 'Data Fim', 'Líder', 'Equipe', 'Tag Equipamento', 'Placa', 'Fabricante', 'Nome Equipamento', 'Nome ETF', 'Locador', 'Modelo', 'DataAjust'];
    const eqApWidths = [18, 18, 38, 13, 15, 12, 14, 30, 45, 35, 14, 12];
    eqApHeaders.forEach((h, i) => { wsEqAp.getCell(5, i + 1).value = h; wsEqAp.getColumn(i + 1).width = eqApWidths[i]; });
    styleHeaderRow(wsEqAp, 5, eqApCols);
    const defaultLider = 'VALDINEY WILSON DOS SANTOS';
    const defaultEquipe = 'ETF_APOIO';
    let eqApRow = 6;
    results.equipGrid.forEach(r => {
      const eq = r.equip;
      allDates.forEach(dk => {
        const qtd = r.qtds[dk] || 0;
        if (qtd === 0) return;
        for (let q = 0; q < qtd; q++) {
          const dateStr = fmtDate(new Date(dk + 'T00:00:00'));
          const vals = [dateStr + ' 07:00', dateStr + ' 17:00', eq.lider || defaultLider, eq.equipe || defaultEquipe, eq.tag, eq.placa, eq.fabricante, eq.nomeEquip, eq.nomeETF, eq.locador, eq.modelo, dateStr];
          vals.forEach((v, i) => { wsEqAp.getCell(eqApRow, i + 1).value = v; wsEqAp.getCell(eqApRow, i + 1).font = fontData; wsEqAp.getCell(eqApRow, i + 1).border = thinBorder; wsEqAp.getCell(eqApRow, i + 1).alignment = alignC; });
          if (eqApRow % 2 === 0) for (let c = 1; c <= eqApCols; c++) wsEqAp.getCell(eqApRow, c).fill = GRAY_ALT;
          eqApRow++;
        }
      });
    });
  }

  // AUSENTES
  const wsAus = wb.addWorksheet('AUSENTES');
  const ausCols = 9;
  applyHeaderBlock(wsAus, 'Profissionais Ausentes - Equipe ETF', ausCols, semana, periodoShort, emissaoStr);
  const ausHeaders = ['Chapa', 'Profissional', 'CPF', 'Função CONSAG', 'Função ETF', 'Equipe', 'Líder', 'Motivo da Ausência', 'Dias Fora'];
  const ausWidths = [14, 40, 16, 30, 30, 15, 35, 40, 10];
  ausHeaders.forEach((h, i) => { wsAus.getCell(5, i + 1).value = h; wsAus.getColumn(i + 1).width = ausWidths[i]; });
  styleHeaderRow(wsAus, 5, ausCols);
  results.ausentes.forEach((a, idx) => {
    const r = 6 + idx;
    const vals = [isNaN(Number(a.chapa)) ? a.chapa : Number(a.chapa), a.nome, a.cpf, a.funcao, a.funcaoETF, a.equipe, a.lider, a.motivo, a.diasFora];
    vals.forEach((v, i) => { wsAus.getCell(r, i + 1).value = v; });
    styleDataRow(wsAus, r, ausCols, idx % 2 === 1);
    wsAus.getCell(r, 2).alignment = alignL; wsAus.getCell(r, 8).alignment = alignL; wsAus.getCell(r, 8).font = fontRed;
  });

  // DE PARA
  const wsDp = wb.addWorksheet('DE PARA - HISTOGRAMA');
  wsDp.getCell(1, 1).value = 'FUNÇÃO CONSAG'; wsDp.getCell(1, 2).value = 'FUNÇÃO CONTRATO';
  wsDp.getCell(1, 1).font = fontHdr; wsDp.getCell(1, 2).font = fontHdr;
  wsDp.getCell(1, 1).fill = GRAY_HDR; wsDp.getCell(1, 2).fill = GRAY_HDR;
  wsDp.getColumn(1).width = 45; wsDp.getColumn(2).width = 45;
  let dpRow = 2;
  results.dePara.forEach((v, k) => {
    wsDp.getCell(dpRow, 1).value = k; wsDp.getCell(dpRow, 2).value = v;
    wsDp.getCell(dpRow, 1).font = fontData; wsDp.getCell(dpRow, 2).font = fontData;
    dpRow++;
  });

  return wb;
}

export async function buildPontoConsolidado(results: ProcessingResults, allDates: string[]): Promise<ExcelJS.Workbook> {
  const nDays = allDates.length;
  const wbPonto = new ExcelJS.Workbook();
  const diasSem = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Efetivo Canteiro
  const wsCant = wbPonto.addWorksheet('Efetivo Canteiro');
  const cantHeaders = ['Matrícula', 'Nome', 'CPF', 'Cargo', 'Localização', 'Data', 'Dia', 'Entrada', 'Saída', 'HH Decimal', 'Concat Entrada', 'Concat Saída'];
  cantHeaders.forEach((h, i) => { wsCant.getCell(1, i + 1).value = h; });
  styleHeaderRow(wsCant, 1, cantHeaders.length);
  const sortedCanteiro = [...results.canteiro].sort((a, b) => a.nome.localeCompare(b.nome) || a.dateKey.localeCompare(b.dateKey));
  sortedCanteiro.forEach((c, idx) => {
    const r = 2 + idx;
    const vals = [isNaN(Number(c.matricula)) ? c.matricula : Number(c.matricula), c.nome, c.cpf, c.cargo, c.local,
      fmtDate(c.date), diasSem[c.date.getDay()],
      c.entrada ? fmtTime(c.entrada) : '', c.saida ? fmtTime(c.saida) : '', c.hh,
      c.entrada ? fmtDateTime(c.entrada) : '', c.saida ? fmtDateTime(c.saida) : ''];
    vals.forEach((v, i) => { wsCant.getCell(r, i + 1).value = v; wsCant.getCell(r, i + 1).font = fontDataSm; });
  });
  [14, 35, 16, 30, 20, 12, 6, 8, 8, 10, 18, 18].forEach((w, i) => wsCant.getColumn(i + 1).width = w);

  // Fora do Canteiro
  const wsFora = wbPonto.addWorksheet('Fora do Canteiro');
  const foraHeaders = ['Matrícula', 'Nome', 'CPF', 'Cargo', 'Localização', 'Data', 'Dia', 'Entrada', 'Saída', 'HH Decimal'];
  foraHeaders.forEach((h, i) => { wsFora.getCell(1, i + 1).value = h; });
  styleHeaderRow(wsFora, 1, foraHeaders.length);
  const sortedFora = [...results.fora].sort((a, b) => a.nome.localeCompare(b.nome) || a.dateKey.localeCompare(b.dateKey));
  sortedFora.forEach((c, idx) => {
    const r = 2 + idx;
    const vals = [isNaN(Number(c.matricula)) ? c.matricula : Number(c.matricula), c.nome, c.cpf, c.cargo, c.local,
      fmtDate(c.date), diasSem[c.date.getDay()],
      c.entrada ? fmtTime(c.entrada) : '', c.saida ? fmtTime(c.saida) : '', c.hh];
    vals.forEach((v, i) => { wsFora.getCell(r, i + 1).value = v; wsFora.getCell(r, i + 1).font = fontDataSm; });
  });
  [14, 35, 16, 30, 25, 12, 6, 8, 8, 10].forEach((w, i) => wsFora.getColumn(i + 1).width = w);

  // Resumo Semanal
  const wsResumo = wbPonto.addWorksheet('Resumo Semanal');
  const resHeaders = ['Matrícula', 'Nome', 'Função', 'Função ETF', 'Equipe', 'Líder'];
  allDates.forEach(dk => resHeaders.push(fmtDate(new Date(dk + 'T00:00:00'))));
  resHeaders.push('Total Dias');
  resHeaders.forEach((h, i) => { wsResumo.getCell(1, i + 1).value = h; });
  styleHeaderRow(wsResumo, 1, resHeaders.length);
  [14, 35, 25, 30, 15, 35].forEach((w, i) => wsResumo.getColumn(i + 1).width = w);
  for (let i = 0; i < nDays; i++) wsResumo.getColumn(7 + i).width = 14;
  wsResumo.getColumn(7 + nDays).width = 10;

  const pontoByMatAll = new Map<string, Map<string, typeof results.canteiro[0]>>();
  results.canteiro.forEach(c => {
    if (!pontoByMatAll.has(c.matricula)) pontoByMatAll.set(c.matricula, new Map());
    pontoByMatAll.get(c.matricula)!.set(c.dateKey, c);
  });
  const matsCanteiro = [...new Set(results.canteiro.map(c => c.matricula))];
  matsCanteiro.sort((a, b) => {
    const na = pontoByMatAll.get(a)?.values().next().value?.nome || '';
    const nb = pontoByMatAll.get(b)?.values().next().value?.nome || '';
    return na.localeCompare(nb);
  });

  matsCanteiro.forEach((mat, idx) => {
    const r = 2 + idx;
    const recs = pontoByMatAll.get(mat)!;
    const first = recs.values().next().value;
    const etfInfo = results.efetivoETF.get(mat);
    wsResumo.getCell(r, 1).value = isNaN(Number(mat)) ? mat : Number(mat);
    wsResumo.getCell(r, 2).value = first?.nome || '';
    wsResumo.getCell(r, 3).value = first?.cargo || '';
    wsResumo.getCell(r, 4).value = etfInfo?.funcaoETF || '';
    wsResumo.getCell(r, 5).value = normEquipe(etfInfo?.areaAtivi || '');
    wsResumo.getCell(r, 6).value = etfInfo ? extractLider(etfInfo.encarregado) : '';
    let totalDias = 0;
    allDates.forEach((dk, i) => {
      const cell = wsResumo.getCell(r, 7 + i);
      if (recs.has(dk)) { cell.value = '✓'; cell.font = fontGreen; cell.fill = GREEN_OK; totalDias++; }
      else { cell.value = '✗'; cell.font = fontRed; cell.fill = RED_FAIL; }
      cell.alignment = alignC; cell.border = thinBorder;
    });
    wsResumo.getCell(r, 7 + nDays).value = totalDias;
    for (let c = 1; c <= 6; c++) wsResumo.getCell(r, c).font = fontDataSm;
  });

  return wbPonto;
}

export async function downloadWorkbook(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
}
