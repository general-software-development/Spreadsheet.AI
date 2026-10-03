"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SpreadsheetApi } from "@/lib/api";
import type { SpreadsheetDocument, WorkbookData } from "@/lib/types";
import { FormulaEngine, WorkbookFactory } from "@/lib/workbook";

const ROWS = 60;
const COLUMNS = 20;

export function SpreadsheetEditor({ id, api }: { id: string; api?: SpreadsheetApi }) {
  const [client] = useState(() => api ?? new SpreadsheetApi());
  const [document, setDocument] = useState<SpreadsheetDocument | null>(null);
  const [selectedCell, setSelectedCell] = useState("A1");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
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

  if (!document || !activeSheet) {
    return <main className="editor-loading">Loading spreadsheet…</main>;
  }

  const selectedRaw = activeSheet.cells[selectedCell] ?? "";
  const columnNames = Array.from({ length: COLUMNS }, (_, index) => FormulaEngine.columnName(index + 1));
  const workbook: WorkbookData = document.workbook;

  return (
    <main className="editor-shell">
      <header className="editor-topbar">
        <Link href="/sheets" className="back-button" aria-label="Back to spreadsheets">←</Link>
        <div className="editor-title-group">
          <input aria-label="Spreadsheet title" className="title-input" value={document.title} onChange={(event) => setTitle(event.target.value)} />
          <span className={`save-state ${saveState}`}>{saveState === "saving" ? "Saving…" : saveState === "error" ? "Save failed" : "Saved"}</span>
        </div>
        <div className="editor-actions"><span className="secure-pill">● Encrypted at rest</span></div>
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
    </main>
  );
}
