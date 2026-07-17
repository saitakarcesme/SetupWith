import Link from "next/link";
import { ArrowUpRight, GitBranch, Search } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="wordmark" href="/" aria-label="SetupWith home">
          <span className="wordmark-symbol" aria-hidden="true">
            <span />
            <span />
          </span>
          <span>setupwith</span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <Link href="/apps">Apps</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/security">Security</Link>
        </nav>

        <div className="header-actions">
          <Link className="header-search" href="/apps" aria-label="Search apps">
            <Search size={15} aria-hidden="true" />
            <span>Search</span>
            <kbd>⌘ K</kbd>
          </Link>
          <a
            className="icon-link"
            href="https://github.com/saitakarcesme/SetupWith"
            target="_blank"
            rel="noreferrer"
            aria-label="SetupWith on GitHub"
          >
            <GitBranch size={17} aria-hidden="true" />
          </a>
          <Link className="header-profile" href="/profile">
            Build profile
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
