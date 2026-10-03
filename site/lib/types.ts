export type CellMap = Record<string, string>;

export interface SheetData {
  id: string;
  name: string;
  cells: CellMap;
}

export interface WorkbookData {
  version: number;
  activeSheetId: string;
  sheets: SheetData[];
}

export interface SpreadsheetSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface SpreadsheetDocument extends SpreadsheetSummary {
  workbook: WorkbookData;
}

export interface UserView {
  id: number;
  email: string;
  display_name: string;
}
