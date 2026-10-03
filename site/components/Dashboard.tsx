"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLogo } from "./AppLogo";
import { SpreadsheetApi } from "@/lib/api";
import type { SpreadsheetSummary, UserView } from "@/lib/types";
import { WorkbookFactory } from "@/lib/workbook";

export function Dashboard({ api }: { api?: SpreadsheetApi }) {
  const router = useRouter();
  const [client] = useState(() => api ?? new SpreadsheetApi());
  const [documents, setDocuments] = useState<SpreadsheetSummary[]>([]);
  const [user, setUser] = useState<UserView | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [currentUser, spreadsheets] = await Promise.all([client.currentUser(), client.list()]);
        setUser(currentUser);
        setDocuments(spreadsheets);
      } catch {
        window.location.href = "/";
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [client]);

  const createSpreadsheet = async () => {
    setCreating(true);
    try {
      const document = await client.create("Untitled spreadsheet", WorkbookFactory.create());
      router.push(`/sheets/${document.id}`);
    } finally {
      setCreating(false);
    }
  };

  const deleteSpreadsheet = async (id: string) => {
    if (!window.confirm("Delete this spreadsheet? This cannot be undone.")) {
      return;
    }
    await client.delete(id);
    setDocuments((current) => current.filter((document) => document.id !== id));
  };

  const logout = async () => {
    await client.logout();
    window.location.href = "/";
  };

  return (
    <main className="dashboard-shell">
      <header className="dashboard-topbar">
        <AppLogo />
        <div className="profile-area">
          <span className="profile-name">{user?.display_name ?? ""}</span>
          <button className="icon-button" onClick={() => void logout()} title="Sign out" aria-label="Sign out">↗</button>
        </div>
      </header>
      <section className="dashboard-content">
        <div className="dashboard-heading">
          <div><p className="eyebrow">WORKSPACE</p><h1>Your spreadsheets</h1><p>Pick up where you left off, or start with a clean grid.</p></div>
          <button className="button primary" onClick={() => void createSpreadsheet()} disabled={creating}>+ New spreadsheet</button>
        </div>
        {loading ? <div className="loading-card">Loading your workspace…</div> : documents.length === 0 ? (
          <button className="empty-state" onClick={() => void createSpreadsheet()}>
            <span className="empty-icon">＋</span><strong>Create your first spreadsheet</strong><small>A blank workbook is one click away.</small>
          </button>
        ) : (
          <div className="document-grid">
            {documents.map((document) => (
              <article className="document-card" key={document.id}>
                <button className="document-preview" onClick={() => router.push(`/sheets/${document.id}`)}>
                  <div className="preview-grid">{Array.from({ length: 24 }, (_, index) => <i key={index} />)}</div>
                </button>
                <div className="document-meta">
                  <button className="document-title" onClick={() => router.push(`/sheets/${document.id}`)}>{document.title}</button>
                  <span>Edited {new Date(document.updated_at).toLocaleDateString()}</span>
                  <button className="delete-link" onClick={() => void deleteSpreadsheet(document.id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
