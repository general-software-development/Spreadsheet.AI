import Link from "next/link";
import { AppLogo } from "@/components/AppLogo";

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <nav className="landing-nav"><AppLogo /><Link href="/">Back to home</Link></nav>
      <article className="legal-card">
        <p className="eyebrow">LEGAL</p>
        <h1>Privacy Policy</h1>
        <p className="legal-date">Effective: 3 October 2026</p>
        <p>Spreadsheet.AI is designed to process only the personal data needed to provide account access and spreadsheet storage. This notice explains how personal data is handled under the General Data Protection Regulation (GDPR).</p>
        <h2>Data we process</h2>
        <p>When you sign in with Google, we receive your Google account identifier, email address, and display name. We store these details to identify your account. We do not request your Google password. Spreadsheet titles and workbook contents are stored in encrypted form so that you can create, retrieve, and edit your files.</p>
        <h2>Purposes and legal bases</h2>
        <p>Account and workbook data are processed to perform the service you request (GDPR Article 6(1)(b)). Security logs may be processed on the basis of our legitimate interest in protecting the service (Article 6(1)(f)). We do not use spreadsheet contents for advertising or sell personal data.</p>
        <h2>Storage, security, and retention</h2>
        <p>Workbook payloads are encrypted at rest in the application database. Authentication sessions are stored as one-way SHA3-512 hashes. We retain account and workbook data while your account and files remain active, and delete data when it is no longer necessary, subject to applicable legal obligations.</p>
        <h2>Recipients and international transfers</h2>
        <p>Google processes data when you choose Google OAuth. Infrastructure providers may process limited service data on our behalf under appropriate contractual safeguards. If data is transferred outside the EEA, an applicable GDPR transfer mechanism must be used.</p>
        <h2>Your rights</h2>
        <p>Depending on the circumstances, you may request access, correction, erasure, restriction, portability, or object to processing. You may also lodge a complaint with your competent supervisory authority. Requests can be directed to the service operator using the contact details published with the deployed service.</p>
        <h2>Cookies and sessions</h2>
        <p>We use strictly necessary cookies for OAuth state validation and authenticated sessions. The OAuth-state cookie is short-lived. The normal session lasts up to 30 days unless you sign out earlier. These cookies are used to provide security and account access, not advertising.</p>
        <h2>Automated decision-making</h2>
        <p>Spreadsheet.AI does not use your account or workbook data to make decisions about you that produce legal or similarly significant effects.</p>
        <h2>Data minimisation</h2>
        <p>We deliberately avoid collecting profile fields, contacts, advertising identifiers, and other data that are not needed to provide the spreadsheet service.</p>
        <h2>Controller and contact</h2>
        <p>The data controller is the person or organisation operating the deployed Spreadsheet.AI service. Before a public production deployment, the operator must publish its legal identity, postal contact details, privacy contact channel, and—where applicable—Data Protection Officer details on this page.</p>
      </article>
    </main>
  );
}
