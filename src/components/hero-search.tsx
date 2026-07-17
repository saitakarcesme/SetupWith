"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";

interface SearchApp {
  name: string;
  slug: string;
  category: string;
}

interface HeroSearchProps {
  apps: SearchApp[];
}

export function HeroSearch({ apps }: HeroSearchProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const results = normalizedQuery
    ? apps
        .filter(
          (app) =>
            app.name.toLowerCase().includes(normalizedQuery) ||
            app.category.toLowerCase().includes(normalizedQuery),
        )
        .slice(0, 5)
    : [];

  return (
    <div className="hero-search-wrap">
      <form className="hero-search" action="/apps">
        <Search size={22} strokeWidth={1.5} aria-hidden="true" />
        <label className="sr-only" htmlFor="hero-app-search">
          Search apps and tools
        </label>
        <input
          id="hero-app-search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="What do you want Codex to set up?"
          autoComplete="off"
        />
        <button type="submit" aria-label="Search the app catalog">
          <span>Browse</span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </form>
      {results.length > 0 ? (
        <div className="search-results" role="listbox" aria-label="Matching apps">
          {results.map((app) => (
            <Link key={app.slug} href={`/${app.slug}`} role="option" aria-selected="false">
              <span>{app.name}</span>
              <small>{app.category}</small>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          ))}
          <Link href={`/apps?q=${encodeURIComponent(query)}`} className="search-results-all">
            View all results
          </Link>
        </div>
      ) : null}
    </div>
  );
}
