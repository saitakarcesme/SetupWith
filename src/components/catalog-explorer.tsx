"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { AppCard } from "@/components/app-card";
import { BundleCard } from "@/components/bundle-card";
import {
  categories,
  experiences,
  type CatalogExperienceFilter,
  type SetupApp,
  type SetupBundle,
} from "@/data/apps";

interface CatalogExplorerProps {
  apps: SetupApp[];
  bundles: SetupBundle[];
  initialQuery?: string;
  initialCategory?: string;
  experience: CatalogExperienceFilter;
  onExperienceChange: (experience: CatalogExperienceFilter) => void;
}

export function CatalogExplorer({
  apps,
  bundles,
  initialQuery = "",
  initialCategory = "All",
  experience,
  onExperienceChange,
}: CatalogExplorerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<(typeof categories)[number]>(
    categories.includes(initialCategory as (typeof categories)[number])
      ? initialCategory as (typeof categories)[number]
      : "All",
  );
  const normalizedQuery = query.trim().toLowerCase();
  const appBySlug = new Map(apps.map((app) => [app.slug, app]));
  const experienceApps = apps.filter((app) => experience === "all" || app.vertical === experience);
  const availableCategories = categories.filter(
    (item) => item === "All" || experienceApps.some((app) => app.category === item),
  );
  const activeCategory = availableCategories.includes(category) ? category : "All";
  const visibleApps = experienceApps.filter((app) => {
    const matchesCategory = activeCategory === "All" || app.category === activeCategory;
    const matchesQuery =
      !normalizedQuery ||
      app.name.toLowerCase().includes(normalizedQuery) ||
      app.description.toLowerCase().includes(normalizedQuery) ||
      app.category.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });
  const visibleBundles = bundles.filter((bundle) => {
    const bundleApps = bundle.appSlugs
      .map((slug) => appBySlug.get(slug))
      .filter((app): app is SetupApp => Boolean(app));
    const matchesExperience = experience === "all" || bundle.vertical === experience || bundleApps.some((app) => app.vertical === experience);
    const matchesCategory = activeCategory === "All" || bundleApps.some((app) => app.category === activeCategory);
    const matchesQuery =
      !normalizedQuery ||
      bundle.name.toLowerCase().includes(normalizedQuery) ||
      bundle.description.toLowerCase().includes(normalizedQuery) ||
      bundle.category.toLowerCase().includes(normalizedQuery) ||
      bundleApps.some((app) => app.name.toLowerCase().includes(normalizedQuery));
    return matchesExperience && matchesCategory && matchesQuery;
  });

  function selectExperience(nextExperience: CatalogExperienceFilter) {
    setCategory("All");
    onExperienceChange(nextExperience);
  }

  return (
    <div className="catalog-explorer">
      <div className="experience-switcher" aria-label="Choose catalog experience" role="group">
        <span>Experience</span>
        <div>
          {experiences.map((item) => (
            <button
              type="button"
              key={item.id}
              className={experience === item.id ? "active" : ""}
              onClick={() => selectExperience(item.id)}
              aria-pressed={experience === item.id}
            >
              <i aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="catalog-toolbar">
        <label className="catalog-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Search catalog</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${experienceApps.length} apps and ${visibleBundles.length} bundles`}
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
          {visibleApps.length} apps · {visibleBundles.length} bundles
        </div>
      </div>

      <div className="category-tabs" aria-label="Filter by category" role="group">
        {availableCategories.map((item) => (
          <button
            type="button"
            key={item}
            className={activeCategory === item ? "active" : ""}
            onClick={() => setCategory(item)}
            aria-pressed={activeCategory === item}
          >
            {item}
          </button>
        ))}
      </div>

      {visibleBundles.length > 0 ? (
        <section className="bundle-catalog-section" aria-labelledby="bundle-catalog-title">
          <div className="bundle-section-heading">
            <div>
              <span className="eyebrow">MULTI-APP / GUIDED</span>
              <h2 id="bundle-catalog-title">Build a whole workspace.</h2>
            </div>
            <p>One coordinated prompt, shared preflight, safe install order, and component-by-component rollback.</p>
          </div>
          <div className="bundle-grid">
            {visibleBundles.map((bundle) => (
              <BundleCard
                key={bundle.slug}
                bundle={bundle}
                appNames={bundle.appSlugs.map((slug) => appBySlug.get(slug)?.name).filter((name): name is string => Boolean(name))}
              />
            ))}
          </div>
        </section>
      ) : null}

      {visibleApps.length > 0 ? (
        <section className="catalog-app-results" aria-labelledby="individual-setups-title">
          <div className="catalog-results-label">
            <h2 id="individual-setups-title">Individual setups</h2>
            <span>{visibleApps.length} results</span>
          </div>
          <div className="catalog-grid">
            {visibleApps.map((app) => (
              <AppCard key={app.slug} app={app} />
            ))}
          </div>
        </section>
      ) : visibleBundles.length === 0 ? (
        <div className="catalog-empty">
          <span>00</span>
          <h2>No setup found.</h2>
          <p>Try another name, official source, or category.</p>
          <button type="button" onClick={() => { setQuery(""); setCategory("All"); selectExperience("all"); }}>
            Reset filters
          </button>
        </div>
      ) : null}
    </div>
  );
}
