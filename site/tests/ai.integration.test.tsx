/** @vitest-environment jsdom */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GeminiSettingsPanel } from "../components/GeminiSettingsPanel";
import { SpreadsheetEditor } from "../components/SpreadsheetEditor";
import type { SpreadsheetApi } from "../lib/api";
import type { AIMessageResponse, GeminiSettings, SpreadsheetDocument } from "../lib/types";

vi.mock("next/link", () => ({ default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => <a href={href} className={className}>{children}</a> }));

const configured: GeminiSettings = {
  configured: true,
  status: "valid",
  primary_model: "gemini-3.8-flash",
  fallback_model: "gemini-3.5-flash-lite",
  validated_at: "2026-10-28T10:00:00Z",
};

class FakeSettingsApi {
  saveGeminiKey = vi.fn(async (_apiKey: string) => configured);
  async geminiSettings(): Promise<GeminiSettings> { return { ...configured, configured: false, status: "not_configured", validated_at: null }; }
}

class FakeAIEditorApi {
  readonly document: SpreadsheetDocument = {
    id: "sheet-1",
    title: "Budget",
    created_at: "2026-10-28T10:00:00Z",
    updated_at: "2026-10-28T10:00:00Z",
    workbook: { version: 1, activeSheetId: "tab-1", sheets: [{ id: "tab-1", name: "Sheet 1", cells: { A1: "100" } }] },
  };
  createAIAccessGrant = vi.fn(async () => ({
    token: "grant-token",
    spreadsheet_id: "sheet-1",
    permission: "read_write",
    expires_at: "2026-10-28T11:00:00Z",
  }));
  aiMessage = vi.fn(async (): Promise<AIMessageResponse> => ({
    mode: "assist",
    model: "gemini-3.8-flash",
    message: "I can help with that.",
    sections: {},
    changed_ranges: [],
    spreadsheet: null,
  }));
  update = vi.fn(async (_id: string, title: string, workbook: SpreadsheetDocument["workbook"]) => ({ ...this.document, title, workbook }));
  async get(): Promise<SpreadsheetDocument> { return this.document; }
  async geminiSettings(): Promise<GeminiSettings> { return configured; }
}

describe("Gemini UI integration", () => {
  it("saves a Gemini key through Settings", async () => {
    const api = new FakeSettingsApi();
    render(<GeminiSettingsPanel api={api as unknown as SpreadsheetApi} />);

    await screen.findByText("Not configured");
    fireEvent.change(screen.getByLabelText("Gemini API key"), { target: { value: "user-gemini-key-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Save & validate" }));

    await waitFor(() => expect(api.saveGeminiKey).toHaveBeenCalledWith("user-gemini-key-123"));
    expect(await screen.findByText("Gemini key saved and validated.")).toBeInTheDocument();
  });

  it("requires an explicit Assist grant before AI requests can be sent", async () => {
    const api = new FakeAIEditorApi();
    render(<SpreadsheetEditor id="sheet-1" api={api as unknown as SpreadsheetApi} />);

    await screen.findByLabelText("Cell A1");
    fireEvent.click(screen.getByRole("button", { name: "✦ AI" }));
    await screen.findByText(/No spreadsheet access/);

    const composer = screen.getByLabelText("Ask Spreadsheet AI");
    fireEvent.change(composer, { target: { value: "Calculate the total" } });
    expect(screen.getByLabelText("Send to Gemini")).toBeDisabled();
    expect(api.aiMessage).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Allow read & write" }));
    await screen.findByText(/Read & write allowed/);
    expect(api.createAIAccessGrant).toHaveBeenCalledWith("sheet-1");

    fireEvent.click(screen.getByLabelText("Send to Gemini"));
    await waitFor(() => expect(api.aiMessage).toHaveBeenCalledWith("assist", "Calculate the total", "sheet-1", "grant-token", "A1", "current_sheet"));
    expect(await screen.findByText("I can help with that.")).toBeInTheDocument();
  });
});
