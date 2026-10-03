import type { SpreadsheetDocument, SpreadsheetSummary, UserView, WorkbookData } from "./types";

class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export class SpreadsheetApi {
  private readonly baseUrl: string;

  constructor(baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
    if (!response.ok) {
      const message = await response.text();
      throw new ApiError(response.status, message || response.statusText);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  async currentUser(): Promise<UserView> {
    return await this.request<UserView>("/auth/me");
  }

  async list(): Promise<SpreadsheetSummary[]> {
    return await this.request<SpreadsheetSummary[]>("/api/spreadsheets");
  }

  async get(id: string): Promise<SpreadsheetDocument> {
    return await this.request<SpreadsheetDocument>(`/api/spreadsheets/${encodeURIComponent(id)}`);
  }

  async create(title: string, workbook: WorkbookData): Promise<SpreadsheetDocument> {
    return await this.request<SpreadsheetDocument>("/api/spreadsheets", {
      method: "POST",
      body: JSON.stringify({ title, workbook }),
    });
  }

  async update(id: string, title: string, workbook: WorkbookData): Promise<SpreadsheetDocument> {
    return await this.request<SpreadsheetDocument>(`/api/spreadsheets/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ title, workbook }),
    });
  }

  async delete(id: string): Promise<void> {
    await this.request<void>(`/api/spreadsheets/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  async logout(): Promise<void> {
    await this.request<void>("/auth/logout", { method: "POST" });
  }

  loginUrl(returnTo = "/sheets"): string {
    return `${this.baseUrl}/auth/google/start?return_to=${encodeURIComponent(returnTo)}`;
  }
}

export { ApiError };
