import Link from "next/link";

export function AppLogo() {
  return (
    <Link className="brand" href="/">
      <span className="brand-mark" aria-hidden="true">S</span>
      <span>Spreadsheet<span className="brand-accent">.AI</span></span>
    </Link>
  );
}
