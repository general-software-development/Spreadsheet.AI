import Link from "next/link";
import { AppLogo } from "@/components/AppLogo";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default function HomePage() {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  return (
    <main className="landing-shell">
      <nav className="landing-nav">
        <AppLogo />
        <div className="nav-links">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </nav>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">SECURE · FAST · FAMILIAR</div>
          <h1>Your ideas deserve a <span>better grid.</span></h1>
          <p>Create, edit, calculate, and securely store spreadsheets without the clutter. Your workbook content is encrypted before it reaches persistent storage.</p>
          <div className="hero-actions">
            <GoogleSignInButton clientId={googleClientId} />
            <a className="text-link" href="#features">See what’s inside →</a>
          </div>
          <p className="fine-print">By continuing, you agree to our <Link href="/terms">Terms</Link> and acknowledge our <Link href="/privacy">Privacy Policy</Link>.</p>
        </div>
        <div className="hero-sheet" aria-hidden="true">
          <div className="sheet-window-bar"><i /><i /><i /><span>Quarterly plan</span></div>
          <div className="mini-toolbar"><b>fx</b><span>=SUM(B2:B5)</span></div>
          <div className="mini-grid">
            {Array.from({ length: 35 }, (_, index) => <div key={index} className={index === 8 || index === 15 || index === 22 ? "active" : ""}>{index === 8 ? "42" : index === 15 ? "18" : index === 22 ? "60" : ""}</div>)}
          </div>
          <div className="floating-total"><span>Total</span><strong>120</strong><small>↑ 18.4%</small></div>
        </div>
      </section>
      <section id="features" className="feature-strip">
        <article><strong>01</strong><h2>Spreadsheet-native</h2><p>Cells, formulas, multiple sheets, keyboard-friendly editing.</p></article>
        <article><strong>02</strong><h2>Autosaved</h2><p>Your changes are stored continuously, so the latest version is ready anywhere.</p></article>
        <article><strong>03</strong><h2>Private by design</h2><p>Minimal account data, encrypted workbook payloads, and no advertising profile.</p></article>
      </section>
    </main>
  );
}
