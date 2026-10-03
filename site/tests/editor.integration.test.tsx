/** @vitest-environment jsdom */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SpreadsheetEditor } from "../components/SpreadsheetEditor";
import type { SpreadsheetApi } from "../lib/api";
import type { SpreadsheetDocument } from "../lib/types";

vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

class FakeApi {
  readonly document: SpreadsheetDocument = {
    id: "sheet-1",
    title: "Budget",
    created_at: "2026-10-03T10:00:00Z",
    updated_at: "2026-10-03T10:00:00Z",
    workbook: { version: 1, activeSheetId: "tab-1", sheets: [{ id: "tab-1", name: "Sheet 1", cells: { A1: "5" } }] },
  };
  update = vi.fn(async (_id: string, title: string, workbook: SpreadsheetDocument["workbook"]) => ({ ...this.document, title, workbook }));
  async get(): Promise<SpreadsheetDocument> { return this.document; }
}

describe("SpreadsheetEditor integration", () => {
  it("loads a workbook and lets the user edit a cell", async () => {
    const api = new FakeApi();
    render(<SpreadsheetEditor id="sheet-1" api={api as unknown as SpreadsheetApi} />);
    const cell = await screen.findByLabelText("Cell A1");
    expect(cell).toHaveValue("5");
    fireEvent.change(cell, { target: { value: "9" } });
    expect(cell).toHaveValue("9");
    expect(screen.getByLabelText("Formula bar")).toHaveValue("9");
    await waitFor(() => expect(screen.getByText(/Saved|Saving/)).toBeInTheDocument());
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(api.update).toHaveBeenCalled();
  });
});
