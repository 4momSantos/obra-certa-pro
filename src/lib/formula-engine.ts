import { dataModel } from "./data-model";
import type { PeriodData, CurvaSPoint } from "@/types/cronograma";
import { formatCurrency, formatPercent, formatCompact } from "./format";

// Data source resolver
export interface FormulaDataSource {
  filteredPeriods: PeriodData[];
  filteredCurvaS: CurvaSPoint[];
  filteredMetrics: Record<string, number>;
  contractInfo: { valorContratual: number; projectName: string; lastUpdate: string };
}

export interface FormulaResult {
  value: number;
  formatted: string;
  error?: string;
}

function resolveColumn(tableName: string, columnName: string, data: FormulaDataSource): number[] | null {
  const tableDef = dataModel.find((t) => t.name === tableName);
  if (!tableDef) return null;
  const colDef = tableDef.columns.find((c) => c.name === columnName);
  if (!colDef) return null;

  switch (tableName) {
    case "periodos":
      return data.filteredPeriods.map((p) => {
        const val = (p as any)[columnName];
        return typeof val === "number" ? val : typeof val === "boolean" ? (val ? 1 : 0) : 0;
      });
    case "curva_s":
      return data.filteredCurvaS.map((c) => {
        const val = (c as any)[columnName];
        return typeof val === "number" ? val : 0;
      });
    case "metricas":
      return [data.filteredMetrics[columnName] ?? 0];
    case "contrato":
      const cv = (data.contractInfo as any)[columnName];
      return [typeof cv === "number" ? cv : 0];
    default:
      return null;
  }
}

function getFormat(tableName: string, columnName: string): string | undefined {
  const t = dataModel.find((t) => t.name === tableName);
  const c = t?.columns.find((c) => c.name === columnName);
  return c?.format;
}

function formatValue(value: number, fmt?: string): string {
  switch (fmt) {
    case "currency":
      return formatCompact(value);
    case "percent":
      return formatPercent(value);
    case "integer":
      return Math.round(value).toLocaleString("pt-BR");
    default:
      return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  }
}

// Regex patterns
const REF_PATTERN = /^([a-z_]+)\.([a-z_]+)$/i;
const FUNC_PATTERN = /^(SUM|AVERAGE|COUNT|MIN|MAX|DIVIDE)\((.+)\)$/i;

function evaluateExpression(expr: string, data: FormulaDataSource): FormulaResult {
  expr = expr.trim();

  const funcMatch = expr.match(FUNC_PATTERN);
  if (!funcMatch) {
    // Try direct reference
    const refMatch = expr.match(REF_PATTERN);
    if (refMatch) {
      const values = resolveColumn(refMatch[1], refMatch[2], data);
      if (!values) return { value: 0, formatted: "", error: `Coluna "${expr}" não encontrada` };
      const sum = values.reduce((s, v) => s + v, 0);
      return { value: sum, formatted: formatValue(sum, getFormat(refMatch[1], refMatch[2])) };
    }
    // Try parsing as number
    const num = parseFloat(expr);
    if (!isNaN(num)) return { value: num, formatted: num.toString() };
    return { value: 0, formatted: "", error: `Expressão não reconhecida: "${expr}"` };
  }

  const funcName = funcMatch[1].toUpperCase();
  const argsStr = funcMatch[2];

  if (funcName === "DIVIDE") {
    // Split on top-level comma (handles nested functions)
    const args = splitTopLevelComma(argsStr);
    if (args.length !== 2) return { value: 0, formatted: "", error: "DIVIDE requer 2 argumentos" };
    const num = evaluateExpression(args[0], data);
    if (num.error) return num;
    const den = evaluateExpression(args[1], data);
    if (den.error) return den;
    if (den.value === 0) return { value: 0, formatted: "0", error: undefined };
    const result = num.value / den.value;
    return { value: result, formatted: formatPercent(result) };
  }

  // Single-argument aggregate functions
  const innerResult = resolveOrEvaluate(argsStr, data);
  if ("error" in innerResult && innerResult.error) return innerResult as FormulaResult;

  const values = "values" in innerResult ? innerResult.values : [innerResult.value];

  let result: number;
  let fmt: string | undefined;

  // Try to get format from reference
  const refM = argsStr.trim().match(REF_PATTERN);
  if (refM) fmt = getFormat(refM[1], refM[2]);

  switch (funcName) {
    case "SUM":
      result = values.reduce((s, v) => s + v, 0);
      break;
    case "AVERAGE":
      result = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
      break;
    case "COUNT":
      result = values.length;
      fmt = "integer";
      break;
    case "MIN":
      result = values.length > 0 ? Math.min(...values) : 0;
      break;
    case "MAX":
      result = values.length > 0 ? Math.max(...values) : 0;
      break;
    default:
      return { value: 0, formatted: "", error: `Função "${funcName}" não suportada` };
  }

  return { value: result, formatted: formatValue(result, fmt) };
}

function resolveOrEvaluate(expr: string, data: FormulaDataSource): { values: number[] } | FormulaResult {
  expr = expr.trim();
  const refMatch = expr.match(REF_PATTERN);
  if (refMatch) {
    const values = resolveColumn(refMatch[1], refMatch[2], data);
    if (!values) return { value: 0, formatted: "", error: `Coluna "${expr}" não encontrada` };
    return { values };
  }
  // Nested function call
  return evaluateExpression(expr, data);
}

function splitTopLevelComma(str: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of str) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function executeFormula(formula: string, data: FormulaDataSource): FormulaResult {
  try {
    return evaluateExpression(formula, data);
  } catch (e) {
    return { value: 0, formatted: "", error: `Erro: ${e instanceof Error ? e.message : "desconhecido"}` };
  }
}

export const AVAILABLE_FUNCTIONS = [
  { name: "SUM", syntax: "SUM(tabela.coluna)", description: "Soma todos os valores" },
  { name: "AVERAGE", syntax: "AVERAGE(tabela.coluna)", description: "Média dos valores" },
  { name: "COUNT", syntax: "COUNT(tabela.coluna)", description: "Contagem de registros" },
  { name: "MIN", syntax: "MIN(tabela.coluna)", description: "Valor mínimo" },
  { name: "MAX", syntax: "MAX(tabela.coluna)", description: "Valor máximo" },
  { name: "DIVIDE", syntax: "DIVIDE(num, den)", description: "Divisão segura (0 se divisor=0)" },
];
