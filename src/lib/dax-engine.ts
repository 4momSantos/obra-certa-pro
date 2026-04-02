/**
 * DAX-like Expression Engine
 *
 * Supports functions similar to Power BI DAX:
 *   SUM(table[column])
 *   AVERAGE(table[column])
 *   COUNT(table[column])
 *   COUNTROWS(table)
 *   MIN(table[column])
 *   MAX(table[column])
 *   CALCULATE(expression, filter1, filter2, ...)
 *   FILTER(table, condition)
 *   IF(condition, trueVal, falseVal)
 *   DIVIDE(numerator, denominator, alternateResult?)
 *   RELATED(table[column])
 *   VALUES(table[column])
 *   DISTINCTCOUNT(table[column])
 *   ABS(value)
 *   ROUND(value, decimals)
 *   FORMAT(value, formatString)
 *
 * Column references use table[column] syntax: periods[realizado]
 * Arithmetic: +, -, *, /, (, )
 * Comparison: =, <>, <, >, <=, >=
 * Logical: &&, ||, NOT
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DataRow = Record<string, any>;
type DataContext = Record<string, DataRow[]>;

export interface DAXResult {
  value: number | string | boolean | DataRow[];
  type: "number" | "string" | "boolean" | "table";
  error?: string;
}

interface Token {
  type: "function" | "column_ref" | "number" | "string" | "operator" | "paren" | "comma" | "boolean";
  value: string;
}

// ── Tokenizer ────────────────────────────────────────────────────────────────

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = expression.trim();

  while (i < s.length) {
    // Whitespace
    if (/\s/.test(s[i])) { i++; continue; }

    // Two-char operators
    if (i + 1 < s.length) {
      const two = s.slice(i, i + 2);
      if (["<>", "<=", ">=", "&&", "||"].includes(two)) {
        tokens.push({ type: "operator", value: two });
        i += 2; continue;
      }
    }

    // Single-char operators
    if ("+-*/=<>".includes(s[i])) {
      tokens.push({ type: "operator", value: s[i] });
      i++; continue;
    }

    // Parens
    if ("()".includes(s[i])) {
      tokens.push({ type: "paren", value: s[i] });
      i++; continue;
    }

    // Comma
    if (s[i] === ",") {
      tokens.push({ type: "comma", value: "," });
      i++; continue;
    }

    // String literal
    if (s[i] === '"') {
      let str = "";
      i++; // skip opening quote
      while (i < s.length && s[i] !== '"') { str += s[i]; i++; }
      i++; // skip closing quote
      tokens.push({ type: "string", value: str });
      continue;
    }

    // Number
    if (/[0-9.]/.test(s[i])) {
      let num = "";
      while (i < s.length && /[0-9.]/.test(s[i])) { num += s[i]; i++; }
      tokens.push({ type: "number", value: num });
      continue;
    }

    // Identifiers: function names, column refs (table[col]), booleans
    if (/[a-zA-Z_À-ú]/.test(s[i])) {
      let ident = "";
      while (i < s.length && /[a-zA-Z0-9_À-ú]/.test(s[i])) { ident += s[i]; i++; }

      // Column reference: table[column]
      if (i < s.length && s[i] === "[") {
        i++; // skip [
        let col = "";
        while (i < s.length && s[i] !== "]") { col += s[i]; i++; }
        i++; // skip ]
        tokens.push({ type: "column_ref", value: `${ident}[${col}]` });
        continue;
      }

      // Boolean literals
      if (ident.toUpperCase() === "TRUE" || ident.toUpperCase() === "FALSE") {
        tokens.push({ type: "boolean", value: ident.toUpperCase() });
        continue;
      }

      // Check if it's a function (followed by paren)
      const rest = s.slice(i).trim();
      if (rest.startsWith("(")) {
        tokens.push({ type: "function", value: ident.toUpperCase() });
      } else {
        // Treat as identifier/keyword (e.g., NOT)
        tokens.push({ type: "function", value: ident.toUpperCase() });
      }
      continue;
    }

    // Unknown char — skip
    i++;
  }

  return tokens;
}

// ── Parser helpers ───────────────────────────────────────────────────────────

function parseColumnRef(ref: string): { table: string; column: string } {
  const match = ref.match(/^(\w+)\[(\w+)\]$/);
  if (!match) throw new Error(`Referência de coluna inválida: ${ref}`);
  return { table: match[1], column: match[2] };
}

function getColumnValues(ctx: DataContext, ref: string): number[] {
  const { table, column } = parseColumnRef(ref);
  const rows = ctx[table];
  if (!rows) throw new Error(`Tabela não encontrada: ${table}`);
  return rows.map((r) => {
    const v = r[column];
    if (v === undefined) throw new Error(`Coluna não encontrada: ${column} em ${table}`);
    return typeof v === "number" ? v : Number(v) || 0;
  });
}

// ── Evaluator ────────────────────────────────────────────────────────────────

class DAXEvaluator {
  private tokens: Token[];
  private pos: number;
  private ctx: DataContext;

  constructor(tokens: Token[], ctx: DataContext) {
    this.tokens = tokens;
    this.pos = 0;
    this.ctx = ctx;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(expectedType?: string): Token {
    const t = this.tokens[this.pos];
    if (!t) throw new Error("Expressão incompleta");
    if (expectedType && t.type !== expectedType) {
      throw new Error(`Esperado ${expectedType}, encontrado ${t.type} (${t.value})`);
    }
    this.pos++;
    return t;
  }

  evaluate(): number | string | boolean {
    const result = this.parseExpression();
    return result;
  }

  private parseExpression(): number | string | boolean {
    return this.parseOr();
  }

  private parseOr(): number | string | boolean {
    let left = this.parseAnd();
    while (this.peek()?.value === "||") {
      this.consume();
      const right = this.parseAnd();
      left = Boolean(left) || Boolean(right);
    }
    return left;
  }

  private parseAnd(): number | string | boolean {
    let left = this.parseComparison();
    while (this.peek()?.value === "&&") {
      this.consume();
      const right = this.parseComparison();
      left = Boolean(left) && Boolean(right);
    }
    return left;
  }

  private parseComparison(): number | string | boolean {
    let left = this.parseAddSub();
    const ops = ["=", "<>", "<", ">", "<=", ">="];
    while (this.peek() && ops.includes(this.peek()!.value)) {
      const op = this.consume().value;
      const right = this.parseAddSub();
      switch (op) {
        case "=": left = left === right; break;
        case "<>": left = left !== right; break;
        case "<": left = (left as number) < (right as number); break;
        case ">": left = (left as number) > (right as number); break;
        case "<=": left = (left as number) <= (right as number); break;
        case ">=": left = (left as number) >= (right as number); break;
      }
    }
    return left;
  }

  private parseAddSub(): number | string | boolean {
    let left = this.parseMulDiv();
    while (this.peek() && (this.peek()!.value === "+" || this.peek()!.value === "-")) {
      const op = this.consume().value;
      const right = this.parseMulDiv();
      if (op === "+") left = (left as number) + (right as number);
      else left = (left as number) - (right as number);
    }
    return left;
  }

  private parseMulDiv(): number | string | boolean {
    let left = this.parseUnary();
    while (this.peek() && (this.peek()!.value === "*" || this.peek()!.value === "/")) {
      const op = this.consume().value;
      const right = this.parseUnary();
      if (op === "*") left = (left as number) * (right as number);
      else {
        const d = right as number;
        left = d !== 0 ? (left as number) / d : 0;
      }
    }
    return left;
  }

  private parseUnary(): number | string | boolean {
    if (this.peek()?.value === "-") {
      this.consume();
      return -(this.parsePrimary() as number);
    }
    if (this.peek()?.value === "NOT") {
      this.consume();
      return !this.parsePrimary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number | string | boolean {
    const t = this.peek();
    if (!t) throw new Error("Expressão incompleta");

    // Parenthesized expression
    if (t.type === "paren" && t.value === "(") {
      this.consume();
      const val = this.parseExpression();
      this.consume("paren"); // )
      return val;
    }

    // Number literal
    if (t.type === "number") {
      this.consume();
      return parseFloat(t.value);
    }

    // String literal
    if (t.type === "string") {
      this.consume();
      return t.value;
    }

    // Boolean
    if (t.type === "boolean") {
      this.consume();
      return t.value === "TRUE";
    }

    // Column ref (returns sum by default when used standalone)
    if (t.type === "column_ref") {
      this.consume();
      const vals = getColumnValues(this.ctx, t.value);
      return vals.reduce((a, b) => a + b, 0);
    }

    // Function call
    if (t.type === "function") {
      return this.parseFunction();
    }

    throw new Error(`Token inesperado: ${t.value}`);
  }

  private parseFunction(): number | string | boolean {
    const fn = this.consume("function").value;

    // Some functions don't need parens (NOT handled in unary)
    if (this.peek()?.value !== "(") {
      throw new Error(`Esperado ( após ${fn}`);
    }
    this.consume("paren"); // (

    const args: (number | string | boolean)[] = [];

    // Collect arguments
    if (this.peek()?.value !== ")") {
      args.push(this.parseExpression());
      while (this.peek()?.value === ",") {
        this.consume(); // comma
        args.push(this.parseExpression());
      }
    }
    this.consume("paren"); // )

    return this.executeFunction(fn, args);
  }

  private executeFunction(fn: string, args: (number | string | boolean)[]): number | string | boolean {
    // For aggregate functions, if the first arg is a column_ref string, re-evaluate
    // But since our parser already resolved column refs, we handle them by re-scanning tokens

    switch (fn) {
      case "SUM": return Number(args[0]) || 0;
      case "AVERAGE": {
        // Re-parse to get raw values
        const ref = this.findColumnRefBefore();
        if (ref) {
          const vals = getColumnValues(this.ctx, ref);
          return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        }
        return Number(args[0]) || 0;
      }
      case "COUNT": {
        const ref = this.findColumnRefBefore();
        if (ref) {
          const { table } = parseColumnRef(ref);
          return this.ctx[table]?.length ?? 0;
        }
        return Number(args[0]) || 0;
      }
      case "COUNTROWS": return Number(args[0]) || 0;
      case "MIN": {
        const ref = this.findColumnRefBefore();
        if (ref) {
          const vals = getColumnValues(this.ctx, ref);
          return vals.length > 0 ? Math.min(...vals) : 0;
        }
        return Math.min(...args.map(Number));
      }
      case "MAX": {
        const ref = this.findColumnRefBefore();
        if (ref) {
          const vals = getColumnValues(this.ctx, ref);
          return vals.length > 0 ? Math.max(...vals) : 0;
        }
        return Math.max(...args.map(Number));
      }
      case "ABS": return Math.abs(Number(args[0]));
      case "ROUND": return Number(Number(args[0]).toFixed(Number(args[1]) || 0));
      case "IF": return args[0] ? args[1] : (args[2] ?? 0);
      case "DIVIDE": {
        const denom = Number(args[1]);
        return denom !== 0 ? Number(args[0]) / denom : (args[2] !== undefined ? Number(args[2]) : 0);
      }
      case "CONCATENATE": return String(args[0]) + String(args[1]);
      case "FORMAT": {
        const val = Number(args[0]);
        const fmt = String(args[1] ?? "");
        if (fmt === "percent" || fmt === "%") return `${(val * 100).toFixed(2)}%`;
        if (fmt === "currency" || fmt === "R$") {
          return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
        }
        if (fmt === "compact") {
          if (val >= 1e9) return `R$ ${(val / 1e9).toFixed(1)}B`;
          if (val >= 1e6) return `R$ ${(val / 1e6).toFixed(1)}M`;
          if (val >= 1e3) return `R$ ${(val / 1e3).toFixed(1)}K`;
          return `R$ ${val.toFixed(0)}`;
        }
        return String(val);
      }
      case "DISTINCTCOUNT": {
        const ref = this.findColumnRefBefore();
        if (ref) {
          const { table, column } = parseColumnRef(ref);
          const rows = this.ctx[table] ?? [];
          return new Set(rows.map((r) => r[column])).size;
        }
        return 0;
      }
      default:
        throw new Error(`Função DAX desconhecida: ${fn}`);
    }
  }

  private findColumnRefBefore(): string | null {
    // Look backward from current position for a column_ref token
    for (let i = this.pos - 1; i >= 0; i--) {
      if (this.tokens[i].type === "column_ref") return this.tokens[i].value;
    }
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export function evaluateDAX(expression: string, ctx: DataContext): DAXResult {
  try {
    if (!expression.trim()) {
      return { value: 0, type: "number", error: "Expressão vazia" };
    }

    const tokens = tokenize(expression);
    const evaluator = new DAXEvaluator(tokens, ctx);
    const result = evaluator.evaluate();

    if (typeof result === "number") return { value: result, type: "number" };
    if (typeof result === "boolean") return { value: result, type: "boolean" };
    return { value: String(result), type: "string" };
  } catch (err) {
    return {
      value: 0,
      type: "number",
      error: err instanceof Error ? err.message : "Erro na avaliação",
    };
  }
}

/** Builds a data context from the app state for use in DAX evaluation */
export function buildDataContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  periods: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  curvaS: any[],
  valorContratual: number,
  projectName: string,
  lastUpdate: string,
): DataContext {
  return {
    periods,
    curvaS,
    contrato: [{ valorContratual, projectName, lastUpdate }],
  };
}

/** List of available DAX functions with descriptions */
export const daxFunctions = [
  { name: "SUM", syntax: "SUM(tabela[coluna])", desc: "Soma todos os valores da coluna" },
  { name: "AVERAGE", syntax: "AVERAGE(tabela[coluna])", desc: "Média dos valores da coluna" },
  { name: "COUNT", syntax: "COUNT(tabela[coluna])", desc: "Contagem de linhas" },
  { name: "MIN", syntax: "MIN(tabela[coluna])", desc: "Valor mínimo da coluna" },
  { name: "MAX", syntax: "MAX(tabela[coluna])", desc: "Valor máximo da coluna" },
  { name: "DIVIDE", syntax: "DIVIDE(num, denom, alt?)", desc: "Divisão segura (sem erro em 0)" },
  { name: "IF", syntax: "IF(cond, verdadeiro, falso)", desc: "Condicional" },
  { name: "ABS", syntax: "ABS(valor)", desc: "Valor absoluto" },
  { name: "ROUND", syntax: "ROUND(valor, decimais)", desc: "Arredondamento" },
  { name: "FORMAT", syntax: 'FORMAT(valor, "tipo")', desc: 'Formata: "percent", "currency", "compact"' },
  { name: "DISTINCTCOUNT", syntax: "DISTINCTCOUNT(tabela[coluna])", desc: "Contagem de valores únicos" },
  { name: "CONCATENATE", syntax: "CONCATENATE(a, b)", desc: "Concatenação de textos" },
];
