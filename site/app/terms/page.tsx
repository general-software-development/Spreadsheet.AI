import Link from "next/link";
import { AppLogo } from "@/components/AppLogo";

export default function TermsPage() {
  return (
    <main className="legal-shell">
      <nav className="landing-nav"><AppLogo /><Link href="/">Back to home</Link></nav>
      <article className="legal-card">
        <p className="eyebrow">LEGAL</p>
        <h1>Terms of Service</h1>
        <p className="legal-date">Effective: 3 October 2026</p>
        <p>These Terms govern use of Spreadsheet.AI. By using the service, you agree to use it lawfully and only with data you are authorised to store and process.</p>
        <h2>Your account</h2>
        <p>You are responsible for maintaining control of your Google account and for activity performed through your Spreadsheet.AI session. You must not attempt to bypass access controls, disrupt the service, or access another user’s data.</p>
        <h2>Your content</h2>
        <p>You retain ownership of the spreadsheet content you upload or create. You grant the service only the limited rights necessary to store, process, and return that content to you as part of operating Spreadsheet.AI.</p>
        <h2>Service availability</h2>
        <p>The service may change, be interrupted, or require maintenance. Reasonable care is used to preserve data, but you should maintain independent backups of information that is critical to you.</p>
        <h2>Acceptable use</h2>
        <p>You may not use the service to violate applicable law, infringe third-party rights, distribute malware, or deliberately overload or probe the service without authorisation.</p>
        <h2>Termination</h2>
        <p>Access may be suspended when necessary to protect the service, other users, or comply with law. You may stop using the service at any time and may request deletion of your account data subject to applicable retention duties.</p>
        <h2>Liability and governing law</h2>
        <p>Mandatory consumer and data-protection rights are not excluded. Any additional limitations, governing-law provisions, and operator identity should be completed by the deployer before public production use.</p>
      </article>
    </main>
  );
}
