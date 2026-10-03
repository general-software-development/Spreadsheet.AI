import { describe, expect, it } from "vitest";
import { FormulaEngine } from "../lib/workbook";

describe("FormulaEngine", () => {
  it("evaluates references, arithmetic, ranges, and detects cycles", () => {
    const engine = new FormulaEngine({
      A1: "10",
      A2: "20",
      B1: "=A1+A2*2",
      B2: "=SUM(A1:A2)",
      B3: "=AVERAGE(A1:A2)",
      C1: "=C2",
      C2: "=C1",
    });
    expect(engine.evaluate("B1")).toBe("50");
    expect(engine.evaluate("B2")).toBe("30");
    expect(engine.evaluate("B3")).toBe("15");
    expect(engine.evaluate("C1")).toBe("#ERROR!");
  });
});
