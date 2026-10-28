"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SpreadsheetApi } from "@/lib/api";
import type { AIAccessGrant, AIContextScope, AIMode, AIMessageResponse, GeminiSettings, SpreadsheetDocument, WorkbookData } from "@/lib/types";
import { FormulaEngine, WorkbookFactory } from "@/lib/workbook";

const ROWS = 60;
const COLUMNS = 20;

interface AIConversationItem {
  id: string;
  role: "user" | "assistant";
  text: string;
  response?: AIMessageResponse;
}

const MODE_COPY: Record<AIMode, { title: string; description: string; permission: string }> = {
  assist: {
    title: "Assist",
    description: "Helps you calculate, organize, and edit the workbook.",
    permission: "Read & write after you allow access",
  },
  interpret: {
    title: "Interpret",
    description: "Finds patterns and gives multiple reasonable conclusions with caveats.",
    permission: "Read-only",
  },
  explain: {
    title: "Explain",
    description: "Teaches you how to understand the spreadsheet step-by-step.",
    permission: "Read-only · no conclusions",
  },
};

export function SpreadsheetEditor({ id, api }: { id: string; api?: SpreadsheetApi }) {
  const [client] = useState(() => api ?? new SpreadsheetApi());
  const [document, setDocument] = useState<SpreadsheetDocument | null>(null);
  const [selectedCell, setSelectedCell] = useState("A1");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState<AIMode>("assist");
  const [aiSettings, setAiSettings] = useState<GeminiSettings | null>(null);
  const [aiGrant, setAiGrant] = useState<AIAccessGrant | null>(null);
  const [aiInput, setAiInput] = useState("");
  const [aiContextScope, setAiContextScope] = useState<AIContextScope>("current_sheet");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [conversation, setConversation] = useState<AIConversationItem[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDocument = useRef<SpreadsheetDocument | null>(null);

  const load = useCallback(async () => {
    try {
      const loaded = await client.get(id);
      latestDocument.current = loaded;
      setDocument(loaded);
    } catch {
      window.location.href = "/sheets";
    }
  }, [client, id]);

  useEffect(() => {
    void load();
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        const pending = latestDocument.current;
        if (pending) {
          void client.update(pending.id, pending.title, pending.workbook);
        }
      }
    };
  }, [client, load]);

  useEffect(() => {
    if (!aiOpen || aiSettings) {
      return;
    }
    const loadAISettings = async () => {
      try {
        setAiSettings(await client.geminiSettings());
      } catch (caught) {
        setAiError(caught instanceof Error ? caught.message : "Gemini settings could not be loaded.");
      }
    };
    void loadAISettings();
  }, [aiOpen, aiSettings, client]);

  const activeSheet = document?.workbook.sheets.find((sheet) => sheet.id === document.workbook.activeSheetId) ?? document?.workbook.sheets[0];
  const engine = useMemo(() => new FormulaEngine(activeSheet?.cells ?? {}), [activeSheet?.cells]);

  const persist = useCallback(async (nextDocument: SpreadsheetDocument) => {
    setSaveState("saving");
    try {
      const saved = await client.update(nextDocument.id, nextDocument.title, nextDocument.workbook);
      latestDocument.current = saved;
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [client]);

  const queueSave = useCallback((nextDocument: SpreadsheetDocument) => {
    latestDocument.current = nextDocument;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(() => {
      void persist(nextDocument);
    }, 650);
  }, [persist]);

  const updateDocument = useCallback((updater: (current: SpreadsheetDocument) => SpreadsheetDocument) => {
    setDocument((current) => {
      if (!current) {
        return current;
      }
      const next = updater(current);
      queueSave(next);
      return next;
    });
  }, [queueSave]);

  const setCell = (cellId: string, value: string) => {
    updateDocument((current) => ({
      ...current,
      workbook: {
        ...current.workbook,
        sheets: current.workbook.sheets.map((sheet) => sheet.id === current.workbook.activeSheetId
          ? { ...sheet, cells: { ...sheet.cells, [cellId]: value } }
          : sheet),
      },
    }));
  };

  const setTitle = (title: string) => {
    updateDocument((current) => ({ ...current, title: title || "Untitled spreadsheet" }));
  };

  const addSheet = () => {
    updateDocument((current) => {
      const sheet = WorkbookFactory.createSheet(`Sheet ${current.workbook.sheets.length + 1}`);
      return {
        ...current,
        workbook: { ...current.workbook, activeSheetId: sheet.id, sheets: [...current.workbook.sheets, sheet] },
      };
    });
  };

  const switchSheet = (sheetId: string) => {
    updateDocument((current) => ({
      ...current,
      workbook: { ...current.workbook, activeSheetId: sheetId },
    }));
    setSelectedCell("A1");
  };

  const moveSelection = (cellId: string, columnDelta: number, rowDelta: number) => {
    const match = cellId.match(/^([A-Z]+)(\d+)$/);
    if (!match) {
      return;
    }
    let column = 0;
    for (const character of match[1]) {
      column = column * 26 + character.charCodeAt(0) - 64;
    }
    const nextColumn = Math.min(COLUMNS, Math.max(1, column + columnDelta));
    const nextRow = Math.min(ROWS, Math.max(1, Number(match[2]) + rowDelta));
    const nextCell = `${FormulaEngine.columnName(nextColumn)}${nextRow}`;
    globalThis.requestAnimationFrame(() => {
      globalThis.document.querySelector<HTMLInputElement>(`[data-cell="${nextCell}"]`)?.focus();
    });
  };

  const allowAssist = async () => {
    setAiBusy(true);
    setAiError("");
    try {
      const grant = await client.createAIAccessGrant(id);
      setAiGrant(grant);
    } catch (caught) {
      setAiError(caught instanceof Error ? caught.message : "Access could not be granted.");
    } finally {
      setAiBusy(false);
    }
  };

  const revokeAssist = async () => {
    if (!aiGrant) {
      return;
    }
    setAiBusy(true);
    setAiError("");
    try {
      await client.revokeAIAccessGrant(aiGrant.token);
      setAiGrant(null);
    } catch (caught) {
      setAiError(caught instanceof Error ? caught.message : "Access could not be revoked.");
    } finally {
      setAiBusy(false);
    }
  };

  const sendAIMessage = async () => {
    const message = aiInput.trim();
    if (!message || !document) {
      return;
    }
    if (aiMode === "assist" && !aiGrant) {
      setAiError("Allow Assist read/write access to this spreadsheet before sending a request.");
      return;
    }
    setAiBusy(true);
    setAiError("");
    setAiInput("");
    const userItem: AIConversationItem = { id: `u-${Date.now()}`, role: "user", text: message };
    setConversation((current) => [...current, userItem]);
    try {
      const response = await client.aiMessage(aiMode, message, id, aiGrant?.token, selectedCell, aiContextScope);
      if (response.spreadsheet) {
        latestDocument.current = response.spreadsheet;
        setDocument(response.spreadsheet);
        setSaveState("saved");
      }
      const assistantItem: AIConversationItem = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: response.message,
        response,
      };
      setConversation((current) => [...current, assistantItem]);
    } catch (caught) {
      setAiError(caught instanceof Error ? caught.message : "Gemini could not answer this request.");
    } finally {
      setAiBusy(false);
    }
  };

  if (!document || !activeSheet) {
    return <main className="editor-loading">Loading spreadsheet…</main>;
  }

  const selectedRaw = activeSheet.cells[selectedCell] ?? "";
  const columnNames = Array.from({ length: COLUMNS }, (_, index) => FormulaEngine.columnName(index + 1));
  const workbook: WorkbookData = document.workbook;
  const modeCopy = MODE_COPY[aiMode as AIMode];

  return (
    <main className="editor-shell">
      <header className="editor-topbar">
        <Link href="/sheets" className="back-button" aria-label="Back to spreadsheets">←</Link>
        <div className="editor-title-group">
          <input aria-label="Spreadsheet title" className="title-input" value={document.title} onChange={(event) => setTitle(event.target.value)} />
          <span className={`save-state ${saveState}`}>{saveState === "saving" ? "Saving…" : saveState === "error" ? "Save failed" : "Saved"}</span>
        </div>
        <div className="editor-actions">
          <button className={`ai-open-button ${aiOpen ? "active" : ""}`} onClick={() => setAiOpen((current) => !current)}>✦ AI</button>
          <span className="secure-pill">● Encrypted at rest</span>
        </div>
      </header>
      <div className="toolbar">
        <span className="toolbar-label">Formula help</span>
        <span className="toolbar-divider" />
        <span className="formula-tip">Use arithmetic, cell references, SUM, AVERAGE, MIN, and MAX</span>
        <span className="toolbar-spacer" />
        <span className="formula-tip">Autosave is on</span>
      </div>
      <div className="formula-bar">
        <strong>{selectedCell}</strong><span className="fx">fx</span>
        <input aria-label="Formula bar" value={selectedRaw} onChange={(event) => setCell(selectedCell, event.target.value)} placeholder="Type a value or formula, e.g. =SUM(A1:A5)" />
      </div>
      <div className="grid-scroller">
        <div className="spreadsheet-grid" style={{ gridTemplateColumns: `52px repeat(${COLUMNS}, minmax(112px, 1fr))` }}>
          <div className="corner-cell" />
          {columnNames.map((column) => <div className="column-header" key={column}>{column}</div>)}
          {Array.from({ length: ROWS }, (_, rowIndex) => {
            const row = rowIndex + 1;
            return [
              <div className="row-header" key={`row-${row}`}>{row}</div>,
              ...columnNames.map((column) => {
                const cellId = `${column}${row}`;
                const raw = activeSheet.cells[cellId] ?? "";
                const display = raw.startsWith("=") ? engine.evaluate(cellId) : raw;
                return (
                  <input
                    className={`grid-cell ${selectedCell === cellId ? "selected" : ""}`}
                    data-cell={cellId}
                    key={cellId}
                    value={selectedCell === cellId ? raw : display}
                    onFocus={() => setSelectedCell(cellId)}
                    onChange={(event) => setCell(cellId, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === "ArrowDown") { event.preventDefault(); moveSelection(cellId, 0, 1); }
                      if (event.key === "ArrowUp") { event.preventDefault(); moveSelection(cellId, 0, -1); }
                      if (event.key === "ArrowRight") { event.preventDefault(); moveSelection(cellId, 1, 0); }
                      if (event.key === "ArrowLeft") { event.preventDefault(); moveSelection(cellId, -1, 0); }
                    }}
                    aria-label={`Cell ${cellId}`}
                  />
                );
              }),
            ];
          })}
        </div>
      </div>
      <footer className="sheet-tabs">
        <button className="add-sheet" onClick={addSheet} aria-label="Add sheet">＋</button>
        {workbook.sheets.map((sheet) => (
          <button key={sheet.id} onClick={() => switchSheet(sheet.id)} className={sheet.id === workbook.activeSheetId ? "active" : ""}>{sheet.name}</button>
        ))}
        <span className="sheet-spacer" /><span className="grid-size">{ROWS} × {COLUMNS}</span>
      </footer>

      {aiOpen ? (
        <aside className="ai-panel" aria-label="Spreadsheet AI">
          <div className="ai-panel-header">
            <div><span className="ai-spark">✦</span><strong>Spreadsheet AI</strong></div>
            <button aria-label="Close AI" onClick={() => setAiOpen(false)}>×</button>
          </div>
          <div className="ai-mode-tabs" role="tablist" aria-label="AI mode">
            {(Object.keys(MODE_COPY) as AIMode[]).map((mode) => (
              <button key={mode} className={aiMode === mode ? "active" : ""} onClick={() => { setAiMode(mode); setAiError(""); }}>{MODE_COPY[mode].title}</button>
            ))}
          </div>
          <div className="ai-mode-explainer">
            <strong>{modeCopy.title}</strong>
            <p>{modeCopy.description}</p>
            <span>{modeCopy.permission}</span>
          </div>

          {aiSettings && !aiSettings.configured ? (
            <div className="ai-config-card">
              <strong>Gemini needs an API key</strong>
              <p>Add your key once in Settings, then return here.</p>
              <Link href="/settings" className="button primary">Open Settings</Link>
              <Link href="/gemini-setup" className="text-link">Setup guide →</Link>
            </div>
          ) : null}

          {aiMode === "assist" && aiSettings?.configured ? (
            aiGrant ? (
              <div className="ai-access-card allowed">
                <div><strong>● Read & write allowed</strong><span>Only for “{document.title}” · expires {new Date(aiGrant.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
                <button disabled={aiBusy} onClick={() => void revokeAssist()}>Revoke</button>
              </div>
            ) : (
              <div className="ai-access-card locked">
                <div><strong>🔒 No spreadsheet access</strong><span>Assist cannot read or change this workbook until you explicitly allow it.</span></div>
                <button disabled={aiBusy} onClick={() => void allowAssist()}>Allow read & write</button>
              </div>
            )
          ) : null}

          <div className="ai-conversation">
            {conversation.length === 0 ? (
              <div className="ai-empty-copy">
                <strong>Ask about the spreadsheet</strong>
                <p>{aiMode === "assist" ? "Try “calculate the percentage change and add it in column D.”" : aiMode === "interpret" ? "Try “what patterns and plausible conclusions stand out?”" : "Try “teach me how to understand this table.”"}</p>
              </div>
            ) : conversation.map((item) => (
              <article className={`ai-message ${item.role}`} key={item.id}>
                <span>{item.role === "user" ? "You" : "Gemini"}</span>
                <p>{item.text}</p>
                {item.response ? (Object.entries(item.response.sections) as Array<[string, string[]]>).map(([section, items]) => items.length ? (
                  <div className="ai-response-section" key={section}>
                    <strong>{section.replaceAll("_", " ")}</strong>
                    <ul>{items.map((value, index) => <li key={`${section}-${index}`}>{value}</li>)}</ul>
                  </div>
                ) : null) : null}
                {item.response?.changed_ranges.length ? <div className="ai-changes"><strong>Changes applied</strong><span>{item.response.changed_ranges.join(" · ")}</span></div> : null}
                {item.response ? <small>{item.response.model}</small> : null}
              </article>
            ))}
          </div>

          {aiError ? <p className="ai-panel-error">{aiError}</p> : null}
          <div className="ai-composer">
            <div className="ai-context-row">
              <span>Context</span>
              <select aria-label="AI context" value={aiContextScope} onChange={(event) => setAiContextScope(event.target.value as AIContextScope)}>
                <option value="current_sheet">Current sheet · {activeSheet.name}</option>
                <option value="workbook">Entire spreadsheet</option>
              </select>
              <span>Selected {selectedCell}</span>
            </div>
            <textarea
              aria-label="Ask Spreadsheet AI"
              value={aiInput}
              onChange={(event) => setAiInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendAIMessage();
                }
              }}
              placeholder={`Ask ${modeCopy.title}…`}
              disabled={aiBusy || !aiSettings?.configured}
            />
            <button className="ai-send" aria-label="Send to Gemini" disabled={aiBusy || !aiInput.trim() || !aiSettings?.configured || (aiMode === "assist" && !aiGrant)} onClick={() => void sendAIMessage()}>{aiBusy ? "…" : "↑"}</button>
          </div>
          <div className="ai-panel-footer">Free-tier models only · <Link href="/gemini-setup">How Gemini works</Link></div>
        </aside>
      ) : null}
    </main>
  );
}
