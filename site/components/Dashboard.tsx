"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLogo } from "./AppLogo";
import { SpreadsheetApi } from "@/lib/api";
import type { GeminiSettings, SpreadsheetSummary, UserView } from "@/lib/types";
import { WorkbookFactory } from "@/lib/workbook";

export function Dashboard({ api }: { api?: SpreadsheetApi }) {
  const router = useRouter();
  const [client] = useState(() => api ?? new SpreadsheetApi());
  const [documents, setDocuments] = useState<SpreadsheetSummary[]>([]);
  const [user, setUser] = useState<UserView | null>(null);
  const [gemini, setGemini] = useState<GeminiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [currentUser, spreadsheets] = await Promise.all([client.currentUser(), client.list()]);
        setUser(currentUser);
        setDocuments(spreadsheets);
        try {
          setGemini(await client.geminiSettings());
        } catch {
          setGemini(null);
        }
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

  const createWithAI = async () => {
    if (!aiInput.trim()) {
      setAiError("Paste some data or describe the spreadsheet you want to create.");
      return;
    }
    if (!gemini?.configured) {
      setAiError("Gemini is not configured yet. Add an API key in Settings first.");
      return;
    }
    setCreating(true);
    setAiError("");
    try {
      const grant = await client.createAICreationGrant();
      const result = await client.createSpreadsheetWithAI(aiInput.trim(), grant.token);
      router.push(`/sheets/${result.spreadsheet.id}`);
    } catch (caught) {
      setAiError(caught instanceof Error ? caught.message : "Gemini could not create the spreadsheet.");
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
          <Link href="/settings" className="settings-link">Settings</Link>
          <span className="profile-name">{user?.display_name ?? ""}</span>
          <button className="icon-button" onClick={() => void logout()} title="Sign out" aria-label="Sign out">↗</button>
        </div>
      </header>
      <section className="dashboard-content">
        <div className="dashboard-heading">
          <div><p className="eyebrow">WORKSPACE</p><h1>Your spreadsheets</h1><p>Pick up where you left off, or start with a clean grid.</p></div>
          <div className="dashboard-actions">
            <button className="button secondary ai-create-button" onClick={() => { setAiError(""); setAiModalOpen(true); }}>✦ Create with AI</button>
            <button className="button primary" onClick={() => void createSpreadsheet()} disabled={creating}>+ New spreadsheet</button>
          </div>
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

      {aiModalOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !creating && setAiModalOpen(false)}>
          <section className="ai-create-modal" role="dialog" aria-modal="true" aria-labelledby="ai-create-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label="Close" onClick={() => setAiModalOpen(false)}>×</button>
            <span className="ai-spark">✦</span>
            <h2 id="ai-create-title">Create a spreadsheet with Gemini</h2>
            <p>Paste data, a table, or instructions. Gemini will structure it into a new workbook. Nothing is created until you choose <strong>Allow Gemini & create</strong>.</p>
            <textarea
              aria-label="Data or instructions for Gemini"
              value={aiInput}
              onChange={(event) => setAiInput(event.target.value)}
              placeholder={'Example:\nMonth,Income,Expenses\nJanuary,4200,2800\nFebruary,4550,3010\n\nAdd a savings column and totals.'}
            />
            {!gemini?.configured ? <p className="ai-inline-notice">Gemini is not configured. <Link href="/settings">Open Settings →</Link></p> : null}
            {aiError ? <p className="settings-message error">{aiError}</p> : null}
            <div className="modal-actions">
              <button className="button secondary" disabled={creating} onClick={() => setAiModalOpen(false)}>Cancel</button>
              <button className="button primary" disabled={creating || !gemini?.configured} onClick={() => void createWithAI()}>{creating ? "Creating…" : "Allow Gemini & create"}</button>
            </div>
            <p className="permission-footnote">This creates a short-lived, one-time creation grant. It does not give Gemini access to your existing spreadsheets.</p>
          </section>
        </div>
      ) : null}
    </main>
  );
}
