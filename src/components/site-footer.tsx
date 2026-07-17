import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-statement">
          <p className="eyebrow">SETUPWITH / OPEN CATALOG</p>
          <h2>Software, installed with context.</h2>
          <p>Real sources. Purpose-built prompts. Your environment stays yours.</p>
        </div>
        <div className="footer-links">
          <div>
            <span>Product</span>
            <Link href="/apps">All apps</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/profile">Context profile</Link>
          </div>
          <div>
            <span>Trust</span>
            <Link href="/security">Security model</Link>
            <a href="https://github.com/saitakarcesme/SetupWith" target="_blank" rel="noreferrer">
              Source code <ArrowUpRight size={12} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} SetupWith</span>
        <span>100 tools / 100 tailored setup paths</span>
      </div>
    </footer>
  );
}
