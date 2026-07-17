"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { AppCard } from "@/components/app-card";
import { categories, type SetupApp } from "@/data/apps";

interface CatalogExplorerProps {
  apps: SetupApp[];
  initialQuery?: string;
  initialCategory?: string;
}

export function CatalogExplorer({ apps, initialQuery = "", initialCategory = "All" }: CatalogExplorerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<(typeof categories)[number]>(
    categories.includes(initialCategory as (typeof categories)[number])
      ? initialCategory as (typeof categories)[number]
      : "All",
  );
  const normalizedQuery = query.trim().toLowerCase();
  const visibleApps = apps.filter((app) => {
    const matchesCategory = category === "All" || app.category === category;
    const matchesQuery =
      !normalizedQuery ||
      app.name.toLowerCase().includes(normalizedQuery) ||
      app.description.toLowerCase().includes(normalizedQuery) ||
      app.category.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="catalog-explorer">
      <div className="catalog-toolbar">
        <label className="catalog-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Search catalog</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search 100 apps"
            autoComplete="off"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              <X size={15} aria-hidden="true" />
            </button>
          ) : null}
        </label>
        <div className="catalog-count" aria-live="polite">
          <SlidersHorizontal size={15} aria-hidden="true" />
          {visibleApps.length} / {apps.length}
        </div>
      </div>

      <div className="category-tabs" aria-label="Filter by category">
        {categories.map((item) => (
          <button
            type="button"
            key={item}
            className={category === item ? "active" : ""}
            onClick={() => setCategory(item)}
            aria-pressed={category === item}
          >
            {item}
          </button>
        ))}
      </div>

      {visibleApps.length > 0 ? (
        <div className="catalog-grid">
          {visibleApps.map((app) => (
            <AppCard key={app.slug} app={app} />
          ))}
        </div>
      ) : (
        <div className="catalog-empty">
          <span>00</span>
          <h2>No setup found.</h2>
          <p>Try another name, repository, or category.</p>
          <button type="button" onClick={() => { setQuery(""); setCategory("All"); }}>
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
