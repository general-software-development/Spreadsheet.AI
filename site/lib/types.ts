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

export type AIMode = "assist" | "interpret" | "explain";
export type AIContextScope = "current_sheet" | "workbook";

export interface GeminiSettings {
  configured: boolean;
  status: string;
  primary_model: string;
  fallback_model: string;
  validated_at: string | null;
}

export interface AIAccessGrant {
  token: string;
  spreadsheet_id: string | null;
  permission: string;
  expires_at: string;
}

export interface AIMessageResponse {
  mode: AIMode;
  model: string;
  message: string;
  sections: Record<string, string[]>;
  changed_ranges: string[];
  spreadsheet: SpreadsheetDocument | null;
}

export interface AICreateSpreadsheetResponse {
  model: string;
  message: string;
  spreadsheet: SpreadsheetDocument;
}
