"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SpreadsheetApi } from "@/lib/api";
import type { GeminiSettings } from "@/lib/types";

export function GeminiSettingsPanel({ api }: { api?: SpreadsheetApi }) {
  const [client] = useState(() => api ?? new SpreadsheetApi());
  const [settings, setSettings] = useState<GeminiSettings | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setSettings(await client.geminiSettings());
      } catch {
        window.location.href = "/";
      }
    };
    void load();
  }, [client]);

  const run = async (operation: () => Promise<GeminiSettings>, successMessage: string) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await operation();
      setSettings(updated);
      setApiKey("");
      setMessage(successMessage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gemini settings could not be updated.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!apiKey.trim()) {
      setError("Enter a Gemini API key first.");
      return;
    }
    await run(async () => await client.saveGeminiKey(apiKey.trim()), "Gemini key saved and validated.");
  };

  const test = async () => {
    await run(async () => await client.testGeminiKey(), "Connection successful. The saved key can use a free-tier model.");
  };

  const remove = async () => {
    if (!window.confirm("Remove your saved Gemini API key?")) {
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await client.removeGeminiKey();
      setSettings(await client.geminiSettings());
      setMessage("Gemini key removed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gemini key could not be removed.");
    } finally {
      setBusy(false);
    }
  };

  const statusLabel = !settings?.configured
    ? "Not configured"
    : settings.status === "valid"
      ? "Configured"
      : settings.status === "invalid"
        ? "Invalid key"
        : "Unavailable";

  return (
    <main className="settings-shell">
      <header className="settings-topbar">
        <Link href="/sheets" className="back-button" aria-label="Back to spreadsheets">←</Link>
        <div><p className="eyebrow">SETTINGS</p><h1>Gemini AI</h1></div>
      </header>
      <section className="settings-card">
        <div className="settings-card-heading">
          <div>
            <h2>Connect your Gemini API key</h2>
            <p>The key is validated by the backend, encrypted before storage, and never returned to your browser after saving.</p>
          </div>
          <span className={`status-badge ${settings?.configured && settings.status === "valid" ? "ok" : "off"}`}>{statusLabel}</span>
        </div>
        <label className="field-label" htmlFor="gemini-key">Gemini API key</label>
        <div className="settings-key-row">
          <input
            id="gemini-key"
            className="settings-input"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={settings?.configured ? "Paste a new key to replace the saved key" : "Paste your Gemini API key"}
            autoComplete="off"
          />
          <button className="button primary" disabled={busy} onClick={() => void save()}>Save & validate</button>
        </div>
        <div className="settings-actions">
          <button className="button secondary" disabled={busy || !settings?.configured} onClick={() => void test()}>Test connection</button>
          <button className="text-button danger" disabled={busy || !settings?.configured} onClick={() => void remove()}>Remove key</button>
        </div>
        {message ? <p className="settings-message success">{message}</p> : null}
        {error ? <p className="settings-message error">{error}</p> : null}
      </section>

      <section className="settings-card compact">
        <div className="model-row">
          <div><span className="settings-kicker">PRIMARY FREE MODEL</span><strong>{settings?.primary_model ?? "gemini-3.8-flash"}</strong></div>
          <div><span className="settings-kicker">FREE FALLBACK</span><strong>{settings?.fallback_model ?? "gemini-3.5-flash-lite"}</strong></div>
        </div>
        <p className="settings-note">Spreadsheet.AI has a backend allowlist and will not switch to a model outside these free-tier model IDs. Your Google project still controls its own quota and billing configuration.</p>
      </section>

      <section className="settings-card compact">
        <h2>Privacy and access</h2>
        <p>Spreadsheet data is sent to Gemini only when you invoke an AI feature. Assist requires a separate read/write grant for each spreadsheet. Interpret and Explain are read-only.</p>
        <p>Gemini free-tier data may be used by Google to improve its products. Avoid sending data you do not want processed under Google&apos;s free-tier terms.</p>
        <Link href="/gemini-setup" className="text-link">Read the Gemini setup guide →</Link>
      </section>
    </main>
  );
}
