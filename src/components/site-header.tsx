"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, GitBranch, Menu, Search, X } from "lucide-react";

const primaryLinks = [
  { href: "/apps", label: "Apps" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/security", label: "Security" },
] as const;

const experienceLinks = [
  { href: "/apps?experience=software", label: "Software" },
  { href: "/apps?experience=ai", label: "AI Lab" },
  { href: "/apps?experience=gaming", label: "Gaming" },
  { href: "/apps?experience=entertainment", label: "Entertainment" },
  { href: "/apps?experience=work", label: "Work" },
  { href: "/apps?experience=creative", label: "Creative" },
  { href: "/apps?experience=social", label: "Social" },
  { href: "/apps?experience=browsers", label: "Browsers" },
  { href: "/apps?experience=hardware", label: "Hardware" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileNavOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMobileNavOpen(false);
      toggleRef.current?.focus();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileNavOpen]);

  function closeMobileNav() {
    setMobileNavOpen(false);
  }

  function isCurrent(href: string) {
    return pathname === href ? "page" as const : undefined;
  }

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="wordmark" href="/" aria-label="SetupWith home" onClick={closeMobileNav}>
          <span className="wordmark-symbol" aria-hidden="true">
            <span />
            <span />
          </span>
          <span>setupwith</span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {primaryLinks.map((link) => (
            <Link aria-current={isCurrent(link.href)} href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
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

        <button
          aria-controls="mobile-primary-navigation"
          aria-expanded={mobileNavOpen}
          className="mobile-nav-toggle"
          onClick={() => setMobileNavOpen((open) => !open)}
          ref={toggleRef}
          type="button"
        >
          <span>{mobileNavOpen ? "Close" : "Menu"}</span>
          {mobileNavOpen ? (
            <X aria-hidden="true" size={18} />
          ) : (
            <Menu aria-hidden="true" size={18} />
          )}
        </button>
      </div>

      <div className="mobile-nav-panel" hidden={!mobileNavOpen} id="mobile-primary-navigation">
        <div className="shell mobile-nav-inner">
          <nav className="mobile-nav-primary" aria-label="Primary navigation">
            {primaryLinks.map((link, index) => (
              <Link
                aria-current={isCurrent(link.href)}
                href={link.href}
                key={link.href}
                onClick={closeMobileNav}
              >
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <strong>{link.label}</strong>
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            ))}
          </nav>

          <nav className="mobile-experience-links" aria-label="Catalog experiences">
            {experienceLinks.map((link) => (
              <Link href={link.href} key={link.href} onClick={closeMobileNav}>
                {link.label}
              </Link>
            ))}
          </nav>

          <nav className="mobile-nav-secondary" aria-label="SetupWith resources">
            <Link href="/apps" onClick={closeMobileNav}>
              <Search aria-hidden="true" size={16} />
              Search apps
            </Link>
            <Link aria-current={isCurrent("/profile")} href="/profile" onClick={closeMobileNav}>
              Build profile
              <ArrowUpRight aria-hidden="true" size={15} />
            </Link>
            <a
              href="https://github.com/saitakarcesme/SetupWith"
              onClick={closeMobileNav}
              rel="noreferrer"
              target="_blank"
            >
              GitHub repository
              <GitBranch aria-hidden="true" size={16} />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
