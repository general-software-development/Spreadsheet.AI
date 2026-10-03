import { afterEach, describe, expect, it, vi } from "vitest";
import { SpreadsheetApi } from "../lib/api";
import { WorkbookFactory } from "../lib/workbook";

describe("SpreadsheetApi integration contract", () => {
  afterEach(() => vi.restoreAllMocks());

  it("creates and updates a workbook using credentialed JSON requests", async () => {
    const workbook = WorkbookFactory.create();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "1", title: "Lab", workbook, created_at: "2026-10-03T10:00:00Z", updated_at: "2026-10-03T10:00:00Z" }), { status: 201, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "1", title: "Lab 2", workbook, created_at: "2026-10-03T10:00:00Z", updated_at: "2026-10-03T10:01:00Z" }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const api = new SpreadsheetApi("http://api.test");
    const created = await api.create("Lab", workbook);
    const updated = await api.update(created.id, "Lab 2", workbook);

    expect(created.id).toBe("1");
    expect(updated.title).toBe("Lab 2");
    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://api.test/api/spreadsheets", expect.objectContaining({ method: "POST", credentials: "include" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://api.test/api/spreadsheets/1", expect.objectContaining({ method: "PUT", credentials: "include" }));
  });
});
