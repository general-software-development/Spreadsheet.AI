module.exports = [
"[project]/site/components/SpreadsheetEditor.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SpreadsheetEditor",
    ()=>SpreadsheetEditor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$site$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/site/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$site$2f$lib$2f$workbook$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/site/lib/workbook.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
const ROWS = 60;
const COLUMNS = 20;
function SpreadsheetEditor({ id, api }) {
    const [client] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>api ?? new __TURBOPACK__imported__module__$5b$project$5d2f$site$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SpreadsheetApi"]());
    const [document, setDocument] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [selectedCell, setSelectedCell] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("A1");
    const [saveState, setSaveState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("saved");
    const saveTimer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const latestDocument = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const load = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        try {
            const loaded = await client.get(id);
            latestDocument.current = loaded;
            setDocument(loaded);
        } catch  {
            window.location.href = "/sheets";
        }
    }, [
        client,
        id
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        void load();
        return ()=>{
            if (saveTimer.current) {
                clearTimeout(saveTimer.current);
                const pending = latestDocument.current;
                if (pending) {
                    void client.update(pending.id, pending.title, pending.workbook);
                }
            }
        };
    }, [
        client,
        load
    ]);
    const activeSheet = document?.workbook.sheets.find((sheet)=>sheet.id === document.workbook.activeSheetId) ?? document?.workbook.sheets[0];
    const engine = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>new __TURBOPACK__imported__module__$5b$project$5d2f$site$2f$lib$2f$workbook$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FormulaEngine"](activeSheet?.cells ?? {}), [
        activeSheet?.cells
    ]);
    const persist = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (nextDocument)=>{
        setSaveState("saving");
        try {
            const saved = await client.update(nextDocument.id, nextDocument.title, nextDocument.workbook);
            latestDocument.current = saved;
            setSaveState("saved");
        } catch  {
            setSaveState("error");
        }
    }, [
        client
    ]);
    const queueSave = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((nextDocument)=>{
        latestDocument.current = nextDocument;
        if (saveTimer.current) {
            clearTimeout(saveTimer.current);
        }
        saveTimer.current = setTimeout(()=>{
            void persist(nextDocument);
        }, 650);
    }, [
        persist
    ]);
    const updateDocument = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((updater)=>{
        setDocument((current)=>{
            if (!current) {
                return current;
            }
            const next = updater(current);
            queueSave(next);
            return next;
        });
    }, [
        queueSave
    ]);
    const setCell = (cellId, value)=>{
        updateDocument((current)=>({
                ...current,
                workbook: {
                    ...current.workbook,
                    sheets: current.workbook.sheets.map((sheet)=>sheet.id === current.workbook.activeSheetId ? {
                            ...sheet,
                            cells: {
                                ...sheet.cells,
                                [cellId]: value
                            }
                        } : sheet)
                }
            }));
    };
    const setTitle = (title)=>{
        updateDocument((current)=>({
                ...current,
                title: title || "Untitled spreadsheet"
            }));
    };
    const addSheet = ()=>{
        updateDocument((current)=>{
            const sheet = __TURBOPACK__imported__module__$5b$project$5d2f$site$2f$lib$2f$workbook$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["WorkbookFactory"].createSheet(`Sheet ${current.workbook.sheets.length + 1}`);
            return {
                ...current,
                workbook: {
                    ...current.workbook,
                    activeSheetId: sheet.id,
                    sheets: [
                        ...current.workbook.sheets,
                        sheet
                    ]
                }
            };
        });
    };
    const switchSheet = (sheetId)=>{
        updateDocument((current)=>({
                ...current,
                workbook: {
                    ...current.workbook,
                    activeSheetId: sheetId
                }
            }));
        setSelectedCell("A1");
    };
    const moveSelection = (cellId, columnDelta, rowDelta)=>{
        const match = cellId.match(/^([A-Z]+)(\d+)$/);
        if (!match) {
            return;
        }
        let column = 0;
        for (const character of match[1]){
            column = column * 26 + character.charCodeAt(0) - 64;
        }
        const nextColumn = Math.min(COLUMNS, Math.max(1, column + columnDelta));
        const nextRow = Math.min(ROWS, Math.max(1, Number(match[2]) + rowDelta));
        const nextCell = `${__TURBOPACK__imported__module__$5b$project$5d2f$site$2f$lib$2f$workbook$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FormulaEngine"].columnName(nextColumn)}${nextRow}`;
        globalThis.requestAnimationFrame(()=>{
            globalThis.document.querySelector(`[data-cell="${nextCell}"]`)?.focus();
        });
    };
    if (!document || !activeSheet) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
            className: "editor-loading",
            children: "Loading spreadsheet…"
        }, void 0, false, {
            fileName: "[project]/site/components/SpreadsheetEditor.tsx",
            lineNumber: 130,
            columnNumber: 12
        }, this);
    }
    const selectedRaw = activeSheet.cells[selectedCell] ?? "";
    const columnNames = Array.from({
        length: COLUMNS
    }, (_, index)=>__TURBOPACK__imported__module__$5b$project$5d2f$site$2f$lib$2f$workbook$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FormulaEngine"].columnName(index + 1));
    const workbook = document.workbook;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "editor-shell",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "editor-topbar",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: "/sheets",
                        className: "back-button",
                        "aria-label": "Back to spreadsheets",
                        children: "←"
                    }, void 0, false, {
                        fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                        lineNumber: 140,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "editor-title-group",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                "aria-label": "Spreadsheet title",
                                className: "title-input",
                                value: document.title,
                                onChange: (event)=>setTitle(event.target.value)
                            }, void 0, false, {
                                fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                                lineNumber: 142,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: `save-state ${saveState}`,
                                children: saveState === "saving" ? "Saving…" : saveState === "error" ? "Save failed" : "Saved"
                            }, void 0, false, {
                                fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                                lineNumber: 143,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                        lineNumber: 141,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "editor-actions",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "secure-pill",
                            children: "● Encrypted at rest"
                        }, void 0, false, {
                            fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                            lineNumber: 145,
                            columnNumber: 41
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                        lineNumber: 145,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                lineNumber: 139,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "toolbar",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "toolbar-label",
                        children: "Formula help"
                    }, void 0, false, {
                        fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                        lineNumber: 148,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "toolbar-divider"
                    }, void 0, false, {
                        fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                        lineNumber: 149,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "formula-tip",
                        children: "Use arithmetic, cell references, SUM, AVERAGE, MIN, and MAX"
                    }, void 0, false, {
                        fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                        lineNumber: 150,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "toolbar-spacer"
                    }, void 0, false, {
                        fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                        lineNumber: 151,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "formula-tip",
                        children: "Autosave is on"
                    }, void 0, false, {
                        fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                        lineNumber: 152,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                lineNumber: 147,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "formula-bar",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: selectedCell
                    }, void 0, false, {
                        fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                        lineNumber: 155,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "fx",
                        children: "fx"
                    }, void 0, false, {
                        fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                        lineNumber: 155,
                        columnNumber: 40
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        "aria-label": "Formula bar",
                        value: selectedRaw,
                        onChange: (event)=>setCell(selectedCell, event.target.value),
                        placeholder: "Type a value or formula, e.g. =SUM(A1:A5)"
                    }, void 0, false, {
                        fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                        lineNumber: 156,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                lineNumber: 154,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid-scroller",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "spreadsheet-grid",
                    style: {
                        gridTemplateColumns: `52px repeat(${COLUMNS}, minmax(112px, 1fr))`
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "corner-cell"
                        }, void 0, false, {
                            fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                            lineNumber: 160,
                            columnNumber: 11
                        }, this),
                        columnNames.map((column)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "column-header",
                                children: column
                            }, column, false, {
                                fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                                lineNumber: 161,
                                columnNumber: 40
                            }, this)),
                        Array.from({
                            length: ROWS
                        }, (_, rowIndex)=>{
                            const row = rowIndex + 1;
                            return [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "row-header",
                                    children: row
                                }, `row-${row}`, false, {
                                    fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                                    lineNumber: 165,
                                    columnNumber: 15
                                }, this),
                                ...columnNames.map((column)=>{
                                    const cellId = `${column}${row}`;
                                    const raw = activeSheet.cells[cellId] ?? "";
                                    const display = raw.startsWith("=") ? engine.evaluate(cellId) : raw;
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        className: `grid-cell ${selectedCell === cellId ? "selected" : ""}`,
                                        "data-cell": cellId,
                                        value: selectedCell === cellId ? raw : display,
                                        onFocus: ()=>setSelectedCell(cellId),
                                        onChange: (event)=>setCell(cellId, event.target.value),
                                        onKeyDown: (event)=>{
                                            if (event.key === "Enter" || event.key === "ArrowDown") {
                                                event.preventDefault();
                                                moveSelection(cellId, 0, 1);
                                            }
                                            if (event.key === "ArrowUp") {
                                                event.preventDefault();
                                                moveSelection(cellId, 0, -1);
                                            }
                                            if (event.key === "ArrowRight") {
                                                event.preventDefault();
                                                moveSelection(cellId, 1, 0);
                                            }
                                            if (event.key === "ArrowLeft") {
                                                event.preventDefault();
                                                moveSelection(cellId, -1, 0);
                                            }
                                        },
                                        "aria-label": `Cell ${cellId}`
                                    }, cellId, false, {
                                        fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                                        lineNumber: 171,
                                        columnNumber: 19
                                    }, this);
                                })
                            ];
                        })
                    ]
                }, void 0, true, {
                    fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                    lineNumber: 159,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                lineNumber: 158,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
                className: "sheet-tabs",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "add-sheet",
                        onClick: addSheet,
                        "aria-label": "Add sheet",
                        children: "＋"
                    }, void 0, false, {
                        fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                        lineNumber: 193,
                        columnNumber: 9
                    }, this),
                    workbook.sheets.map((sheet)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>switchSheet(sheet.id),
                            className: sheet.id === workbook.activeSheetId ? "active" : "",
                            children: sheet.name
                        }, sheet.id, false, {
                            fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                            lineNumber: 195,
                            columnNumber: 11
                        }, this)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "sheet-spacer"
                    }, void 0, false, {
                        fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                        lineNumber: 197,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "grid-size",
                        children: [
                            ROWS,
                            " × ",
                            COLUMNS
                        ]
                    }, void 0, true, {
                        fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                        lineNumber: 197,
                        columnNumber: 42
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/site/components/SpreadsheetEditor.tsx",
                lineNumber: 192,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/site/components/SpreadsheetEditor.tsx",
        lineNumber: 138,
        columnNumber: 5
    }, this);
}
}),
"[project]/site/lib/api.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ApiError",
    ()=>ApiError,
    "SpreadsheetApi",
    ()=>SpreadsheetApi
]);
class ApiError extends Error {
    status;
    constructor(status, message){
        super(message);
        this.status = status;
    }
}
class SpreadsheetApi {
    baseUrl;
    constructor(baseUrl = ("TURBOPACK compile-time value", "http://localhost:8000") ?? "http://localhost:8000"){
        this.baseUrl = baseUrl.replace(/\/$/, "");
    }
    async request(path, init) {
        const response = await fetch(`${this.baseUrl}${path}`, {
            ...init,
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                ...init?.headers
            }
        });
        if (!response.ok) {
            const message = await response.text();
            throw new ApiError(response.status, message || response.statusText);
        }
        if (response.status === 204) {
            return undefined;
        }
        return await response.json();
    }
    async signInWithGoogle(credential) {
        return await this.request("/auth/google", {
            method: "POST",
            headers: {
                "X-Google-Sign-In": "google-identity-services"
            },
            body: JSON.stringify({
                credential
            })
        });
    }
    async currentUser() {
        return await this.request("/auth/me");
    }
    async list() {
        return await this.request("/api/spreadsheets");
    }
    async get(id) {
        return await this.request(`/api/spreadsheets/${encodeURIComponent(id)}`);
    }
    async create(title, workbook) {
        return await this.request("/api/spreadsheets", {
            method: "POST",
            body: JSON.stringify({
                title,
                workbook
            })
        });
    }
    async update(id, title, workbook) {
        return await this.request(`/api/spreadsheets/${encodeURIComponent(id)}`, {
            method: "PUT",
            body: JSON.stringify({
                title,
                workbook
            })
        });
    }
    async delete(id) {
        await this.request(`/api/spreadsheets/${encodeURIComponent(id)}`, {
            method: "DELETE"
        });
    }
    async logout() {
        await this.request("/auth/logout", {
            method: "POST"
        });
    }
}
;
}),
"[project]/site/lib/workbook.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FormulaEngine",
    ()=>FormulaEngine,
    "WorkbookFactory",
    ()=>WorkbookFactory
]);
class WorkbookFactory {
    static create() {
        const sheet = WorkbookFactory.createSheet("Sheet 1");
        return {
            version: 1,
            activeSheetId: sheet.id,
            sheets: [
                sheet
            ]
        };
    }
    static createSheet(name) {
        return {
            id: globalThis.crypto?.randomUUID?.() ?? `sheet-${Date.now()}`,
            name,
            cells: {}
        };
    }
}
class ExpressionParser {
    index = 0;
    tokens;
    constructor(expression){
        this.tokens = expression.match(/\d+(?:\.\d+)?|[()+\-*/]/g) ?? [];
        if (this.tokens.join("") !== expression.replace(/\s+/g, "")) {
            throw new Error("Unsupported expression");
        }
    }
    parse() {
        const value = this.parseExpression();
        if (this.index !== this.tokens.length) {
            throw new Error("Unexpected token");
        }
        return value;
    }
    parseExpression() {
        let value = this.parseTerm();
        while(this.peek() === "+" || this.peek() === "-"){
            const operator = this.next();
            const right = this.parseTerm();
            value = operator === "+" ? value + right : value - right;
        }
        return value;
    }
    parseTerm() {
        let value = this.parseFactor();
        while(this.peek() === "*" || this.peek() === "/"){
            const operator = this.next();
            const right = this.parseFactor();
            value = operator === "*" ? value * right : value / right;
        }
        return value;
    }
    parseFactor() {
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
    peek() {
        return this.tokens[this.index];
    }
    next() {
        const token = this.tokens[this.index];
        this.index += 1;
        return token;
    }
}
class FormulaEngine {
    cells;
    constructor(cells){
        this.cells = cells;
    }
    evaluate(cellId) {
        return this.evaluateValue(cellId, new Set());
    }
    evaluateValue(cellId, visiting) {
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
        } catch  {
            return "#ERROR!";
        }
    }
    evaluateFormula(formula, visiting) {
        const functionMatch = formula.match(/^\s*(SUM|AVERAGE|MIN|MAX)\(([A-Z]+\d+):([A-Z]+\d+)\)\s*$/i);
        if (functionMatch) {
            const values = this.rangeValues(functionMatch[2], functionMatch[3], visiting);
            if (values.length === 0) {
                return "0";
            }
            const functionName = functionMatch[1].toUpperCase();
            const result = functionName === "SUM" ? values.reduce((sum, value)=>sum + value, 0) : functionName === "AVERAGE" ? values.reduce((sum, value)=>sum + value, 0) / values.length : functionName === "MIN" ? Math.min(...values) : Math.max(...values);
            return FormulaEngine.formatNumber(result);
        }
        const replaced = formula.replace(/\b([A-Z]+\d+)\b/gi, (reference)=>{
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
    rangeValues(start, end, visiting) {
        const startParts = FormulaEngine.cellParts(start);
        const endParts = FormulaEngine.cellParts(end);
        const values = [];
        for(let row = Math.min(startParts.row, endParts.row); row <= Math.max(startParts.row, endParts.row); row += 1){
            for(let column = Math.min(startParts.column, endParts.column); column <= Math.max(startParts.column, endParts.column); column += 1){
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
    static cellParts(id) {
        const match = id.toUpperCase().match(/^([A-Z]+)(\d+)$/);
        if (!match) {
            throw new Error("Invalid cell reference");
        }
        let column = 0;
        for (const character of match[1]){
            column = column * 26 + character.charCodeAt(0) - 64;
        }
        return {
            column,
            row: Number(match[2])
        };
    }
    static columnName(column) {
        let value = column;
        let name = "";
        while(value > 0){
            const remainder = (value - 1) % 26;
            name = String.fromCharCode(65 + remainder) + name;
            value = Math.floor((value - 1) / 26);
        }
        return name;
    }
    static formatNumber(value) {
        if (!Number.isFinite(value)) {
            return "#ERROR!";
        }
        return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(8)));
    }
}
}),
];

//# sourceMappingURL=site_1ovhoz4._.js.map