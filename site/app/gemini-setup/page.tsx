import Link from "next/link";
import { AppLogo } from "@/components/AppLogo";

export default function GeminiSetupPage() {
  return (
    <main className="legal-shell">
      <nav className="landing-nav"><AppLogo /><Link href="/settings">Back to Settings</Link></nav>
      <article className="legal-card setup-guide">
        <p className="eyebrow">SETUP GUIDE</p>
        <h1>Connect Gemini to Spreadsheet.AI</h1>
        <p className="legal-date">Free-tier models only</p>
        <p>Spreadsheet.AI uses your own Gemini API key. The key stays on the FastAPI backend, is encrypted at rest, and is never embedded into the frontend bundle.</p>

        <h2>1. Create a Gemini API key</h2>
        <p>Open <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio → API keys</a>, choose or create a Google Cloud project, and create an API key for the Gemini API.</p>

        <h2>2. Keep the project on the free tier</h2>
        <p>Spreadsheet.AI only requests <code>gemini-3.8-flash</code> and, if necessary, <code>gemini-3.5-flash-lite</code>. Both are explicitly allowlisted by the backend. Spreadsheet.AI never falls back to a paid-only model.</p>
        <p>Your Google project determines whether your requests are actually billed. If you have enabled paid billing or changed project-level settings, review those settings in Google AI Studio / Google Cloud.</p>

        <h2>3. Save the key in Spreadsheet.AI</h2>
        <p>Go to <Link href="/settings">Settings → Gemini AI</Link>, paste the key, then choose <strong>Save & validate</strong>. Spreadsheet.AI performs a small connectivity check before storing the key.</p>

        <h2>4. Understand the three AI modes</h2>
        <div className="setup-mode-grid">
          <section><strong>Assist</strong><p>Can read and edit a spreadsheet only after you explicitly grant read/write access to that specific spreadsheet. You can revoke access at any time.</p></section>
          <section><strong>Interpret</strong><p>Read-only. It examines the spreadsheet, separates observations from inferences, and gives multiple reasonable conclusions with limitations.</p></section>
          <section><strong>Explain</strong><p>Read-only. It teaches you how to read the spreadsheet step-by-step without drawing substantive conclusions for you.</p></section>
        </div>

        <h2>5. Create a spreadsheet with AI</h2>
        <p>From the spreadsheet dashboard, choose <strong>Create with AI</strong>, paste tabular data or instructions, and choose <strong>Allow Gemini & create</strong>. That click issues a short-lived one-time creation grant. Gemini cannot create a workbook before the grant exists.</p>

        <h2>Privacy note for the free tier</h2>
        <p>Google states that content submitted through the Gemini API free tier may be used to improve its products. Only send spreadsheet data you are comfortable processing under those terms. Spreadsheet.AI itself does not persist AI chat history in this implementation.</p>

        <h2>Troubleshooting</h2>
        <p><strong>Invalid key:</strong> create a new Gemini key and save it again. <strong>429 / quota:</strong> your project has reached a free-tier rate or usage limit; wait for quota to recover. <strong>Unavailable:</strong> retry later; Spreadsheet.AI may automatically try the allowlisted free fallback model.</p>
      </article>
    </main>
  );
}
