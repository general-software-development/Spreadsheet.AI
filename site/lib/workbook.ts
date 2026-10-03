import type { CellMap, SheetData, WorkbookData } from "./types";

export class WorkbookFactory {
  static create(): WorkbookData {
    const sheet = WorkbookFactory.createSheet("Sheet 1");
    return { version: 1, activeSheetId: sheet.id, sheets: [sheet] };
  }

  static createSheet(name: string): SheetData {
    return {
      id: globalThis.crypto?.randomUUID?.() ?? `sheet-${Date.now()}`,
      name,
      cells: {},
    };
  }
}

class ExpressionParser {
  private index = 0;
  private readonly tokens: string[];

  constructor(expression: string) {
    this.tokens = expression.match(/\d+(?:\.\d+)?|[()+\-*/]/g) ?? [];
    if (this.tokens.join("") !== expression.replace(/\s+/g, "")) {
      throw new Error("Unsupported expression");
    }
  }

  parse(): number {
    const value = this.parseExpression();
    if (this.index !== this.tokens.length) {
      throw new Error("Unexpected token");
    }
    return value;
  }

  private parseExpression(): number {
    let value = this.parseTerm();
    while (this.peek() === "+" || this.peek() === "-") {
      const operator = this.next();
      const right = this.parseTerm();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  }

  private parseTerm(): number {
    let value = this.parseFactor();
    while (this.peek() === "*" || this.peek() === "/") {
      const operator = this.next();
      const right = this.parseFactor();
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  }

  private parseFactor(): number {
    const token = this.next();
    if (token === "-") {
      return -this.parseFactor();
    }
    if (token === "(") {
      const value = this.parseExpression();
      if (this.next() !== ")") {
        throw new Error("Missing closing parenthesis");
      }
      return value;
    }
    const value = Number(token);
    if (!Number.isFinite(value)) {
      throw new Error("Expected a number");
    }
    return value;
  }

  private peek(): string | undefined {
    return this.tokens[this.index];
  }

  private next(): string | undefined {
    const token = this.tokens[this.index];
    this.index += 1;
    return token;
  }
}

export class FormulaEngine {
  private readonly cells: CellMap;

  constructor(cells: CellMap) {
    this.cells = cells;
  }

  evaluate(cellId: string): string {
    return this.evaluateValue(cellId, new Set<string>());
  }

  private evaluateValue(cellId: string, visiting: Set<string>): string {
    const raw = this.cells[cellId] ?? "";
    if (!raw.startsWith("=")) {
      return raw;
    }
    if (visiting.has(cellId)) {
      return "#CYCLE!";
    }
    const nextVisiting = new Set(visiting);
    nextVisiting.add(cellId);
    try {
      return this.evaluateFormula(raw.slice(1), nextVisiting);
    } catch {
      return "#ERROR!";
    }
  }

  private evaluateFormula(formula: string, visiting: Set<string>): string {
    const functionMatch = formula.match(/^\s*(SUM|AVERAGE|MIN|MAX)\(([A-Z]+\d+):([A-Z]+\d+)\)\s*$/i);
    if (functionMatch) {
      const values = this.rangeValues(functionMatch[2], functionMatch[3], visiting);
      if (values.length === 0) {
        return "0";
      }
      const functionName = functionMatch[1].toUpperCase();
      const result = functionName === "SUM"
        ? values.reduce((sum, value) => sum + value, 0)
        : functionName === "AVERAGE"
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : functionName === "MIN"
            ? Math.min(...values)
            : Math.max(...values);
      return FormulaEngine.formatNumber(result);
    }

    const replaced = formula.replace(/\b([A-Z]+\d+)\b/gi, (reference: string) => {
      const resolved = this.evaluateValue(reference.toUpperCase(), visiting);
      if (resolved.startsWith("#")) {
        throw new Error(resolved);
      }
      const value = Number(resolved);
      return Number.isFinite(value) ? String(value) : "0";
    });
    const result = new ExpressionParser(replaced).parse();
    return FormulaEngine.formatNumber(result);
  }

  private rangeValues(start: string, end: string, visiting: Set<string>): number[] {
    const startParts = FormulaEngine.cellParts(start);
    const endParts = FormulaEngine.cellParts(end);
    const values: number[] = [];
    for (let row = Math.min(startParts.row, endParts.row); row <= Math.max(startParts.row, endParts.row); row += 1) {
      for (let column = Math.min(startParts.column, endParts.column); column <= Math.max(startParts.column, endParts.column); column += 1) {
        const id = `${FormulaEngine.columnName(column)}${row}`;
        const resolved = this.evaluateValue(id, visiting);
        if (resolved.startsWith("#")) {
          throw new Error(resolved);
        }
        const value = Number(resolved);
        if (Number.isFinite(value)) {
          values.push(value);
        }
      }
    }
    return values;
  }

  private static cellParts(id: string): { column: number; row: number } {
    const match = id.toUpperCase().match(/^([A-Z]+)(\d+)$/);
    if (!match) {
      throw new Error("Invalid cell reference");
    }
    let column = 0;
    for (const character of match[1]) {
      column = column * 26 + character.charCodeAt(0) - 64;
    }
    return { column, row: Number(match[2]) };
  }

  static columnName(column: number): string {
    let value = column;
    let name = "";
    while (value > 0) {
      const remainder = (value - 1) % 26;
      name = String.fromCharCode(65 + remainder) + name;
      value = Math.floor((value - 1) / 26);
    }
    return name;
  }

  private static formatNumber(value: number): string {
    if (!Number.isFinite(value)) {
      return "#ERROR!";
    }
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(8)));
  }
}
